const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const NEWS_BASE = 'https://newsapi.org/v2';
const API_KEY = process.env.NEWS_API_KEY;
const ALLOWED_CATEGORIES = ['general', 'business', 'entertainment', 'health', 'science', 'sports', 'technology'];

// rate limiter removed (per request)

// If API_KEY is not configured, warn (endpoints that require it will return errors when used)
if (!API_KEY) {
  console.warn('WARNING: NEWS_API_KEY is not set. Endpoints that proxy NewsAPI will fail until configured.');
}

// Simple in-memory cache (key -> {expires, data})
const cache = new Map();
function setCache(key, data, ttl = 30) { // ttl in seconds
  cache.set(key, { expires: Date.now() + ttl * 1000, data });
}
function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() > v.expires) { cache.delete(key); return null; }
  return v.data;
}

async function proxyFetch(url) {
  const cached = getCache(url);
  if (cached) {
    console.log('news proxy cache hit', url);
    return cached;
  }

  if (!API_KEY) {
    const err = new Error('Missing NEWS_API_KEY on server');
    err.status = 500;
    throw err;
  }

  try {
    console.log('news proxy fetching', url);
    const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    if (!res.ok) {
      // attempt to parse response body for context (NewsAPI provides JSON errors sometimes)
      let errBody = null;
      try { errBody = await res.json(); } catch (e) { try { errBody = await res.text(); } catch (_) { errBody = null; } }
      const msg = `NewsAPI error ${res.status}: ${JSON.stringify(errBody)}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    setCache(url, data, 30);
    return data;
  } catch (e) {
    console.error('proxyFetch error', e);
    throw e;
  }
}

// GET /api/news/top?country=xx&category=yy&pageSize=10&page=1
router.get('/top', async (req, res) => {
  try {
    const { country = 'us', category = 'general', pageSize = 10, page = 1 } = req.query;
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Normalize/limit params
    const pSize = Math.min(50, parseInt(pageSize, 10) || 10);
    const p = Math.max(1, parseInt(page, 10) || 1);

    const url = `${NEWS_BASE}/top-headlines?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category)}&pageSize=${encodeURIComponent(pSize)}&page=${encodeURIComponent(p)}`;
    const data = await proxyFetch(url);
    res.json({ articles: data.articles || [], totalResults: data.totalResults || 0, page: p, pageSize: pSize });
  } catch (err) {
    console.error('news/top error', err);
    if (err.status === 401) return res.status(502).json({ error: 'News API authentication failed (check NEWS_API_KEY)' });
    if (err.status === 500 && err.message && err.message.includes('Missing NEWS_API_KEY')) return res.status(500).json({ error: 'Server misconfiguration: NEWS_API_KEY is not set' });
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/search?q=...&pageSize=20&page=1&sortBy=publishedAt
router.get('/search', async (req, res) => {
  try {
    const { q, language = 'en', sortBy = 'publishedAt', pageSize = 20, page = 1 } = req.query;
    console.log('news/search request', { q, language, sortBy, pageSize, page });
    if (!q) return res.status(400).json({ error: 'Missing query' });

    const pSize = Math.min(100, parseInt(pageSize, 10) || 20);
    const p = Math.max(1, parseInt(page, 10) || 1);

    const url = `${NEWS_BASE}/everything` +
      `?q=${q}` +
      `&language=en` +
      `&sortBy=relevancy` +
      `&pageSize=${encodeURIComponent(pSize)}` +
      `&page=${encodeURIComponent(p)}`;

    const data = await proxyFetch(url);
    res.json({ articles: data.articles || [], totalResults: data.totalResults || 0, page: p, pageSize: pSize });
  } catch (err) {
    console.error('news/search error', err);
    if (err.status === 401) return res.status(502).json({ error: 'News API authentication failed (check NEWS_API_KEY)' });
    if (err.status === 500 && err.message && err.message.includes('Missing NEWS_API_KEY')) return res.status(500).json({ error: 'Server misconfiguration: NEWS_API_KEY is not set' });
    res.status(502).json({ error: 'Failed to search news' });
  }
});


// GET /api/news/full?url=<article-url>
// Fetches the full article HTML, parses with Readability, and returns sanitized HTML for safe client rendering.
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');
const { URL } = require('url');


function isLikelyLocal(hostname) {
  if (!hostname) return true;
  const lc = hostname.toLowerCase();
  if (lc === 'localhost' || lc === '127.0.0.1' || lc === '::1') return true;
  // IP private ranges
  if (/^10\.|^127\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lc)) return true;
  return false;
}

router.get('/full', async (req, res) => {
  try {
    const { url } = req.query;
    console.log('news/full request', { url: url && url.slice(0, 200) });
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    let parsed;
    try { parsed = new URL(url); } catch (e) { return res.status(400).json({ error: 'Invalid url' }); }

    if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ error: 'Invalid protocol' });
    if (isLikelyLocal(parsed.hostname)) return res.status(400).json({ error: 'Refusing to fetch local/private address' });

    // small caching on same URL to reduce repeated scraping
    const cacheKey = `full:${url}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // Basic fetch with timeout and size guard
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s

    const resp = await fetch(url, { headers: { 'User-Agent': 'Globlit/1.0 (+https://example.com)', 'Accept-Language': 'en-US,en;q=0.9' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return res.status(502).json({ error: 'Failed to fetch article' });

    const contentLength = resp.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) return res.status(400).json({ error: 'Article too large' });

    const html = await resp.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsedArticle = reader.parse();
    if (!parsedArticle || !parsedArticle.content) return res.status(422).json({ error: 'Unable to extract article content' });

    // Sanitize HTML; allow images, headings, lists, links
    const clean = sanitizeHtml(parsedArticle.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title'],
      },
      transformTags: {
        'a': function (tagName, attribs) {
          // force links to open in new tab & noopener
          return { tagName: 'a', attribs: Object.assign({}, attribs, { target: '_blank', rel: 'noopener noreferrer' }) };
        }
      }
    });

    const payload = {
      title: parsedArticle.title || parsedArticle.excerpt || '',
      byline: parsedArticle.byline || '',
      content: clean,
      excerpt: parsedArticle.excerpt || '',
      length: parsedArticle.length || 0,
    };

    setCache(cacheKey, payload, 60 * 60 * 24); // cache 24h
    res.json(payload);
  } catch (err) {
    console.error('news/full error', err);
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Timeout fetching article' });
    res.status(502).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router;

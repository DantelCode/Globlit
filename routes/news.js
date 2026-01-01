const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const NEWS_BASE = 'https://newsapi.org/v2';
const API_KEY = process.env.NEWS_API_KEY;
const ALLOWED_CATEGORIES = ['general','business','entertainment','health','science','sports','technology'];

// rate limiter removed (per request)

// If API_KEY is not configured, respond with a clear 500 so it's easy to spot and fix during dev
if (!API_KEY) {
  console.error('NEWS_API_KEY is not set. News proxy endpoints will return 500 until configured.');
  router.use((req, res) => {
    res.status(500).json({ error: 'Server misconfiguration: NEWS_API_KEY is not set' });
  });
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

// GET /api/news/top?country=xx&category=yy&pageSize=10
router.get('/top', async (req, res) => {
  try {
    const { country = 'us', category = 'general', pageSize = 10 } = req.query;
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const url = `${NEWS_BASE}/top-headlines?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category)}&pageSize=${encodeURIComponent(pageSize)}`;
    const data = await proxyFetch(url);
    res.json({ articles: data.articles || [] });
  } catch (err) {
    console.error('news/top error', err);
    if (err.status === 401) return res.status(502).json({ error: 'News API authentication failed (check NEWS_API_KEY)' });
    if (err.status === 500 && err.message && err.message.includes('Missing NEWS_API_KEY')) return res.status(500).json({ error: 'Server misconfiguration: NEWS_API_KEY is not set' });
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/search?q=...&pageSize=20&sortBy=publishedAt
router.get('/search', async (req, res) => {
  try {
    const { q, language = 'en', sortBy = 'publishedAt', pageSize = 20 } = req.query;
    console.log('news/search request', { q, language, sortBy, pageSize });
    if (!q) return res.status(400).json({ error: 'Missing query' });

    const url = `${NEWS_BASE}/everything?q=${encodeURIComponent(q)}&language=${encodeURIComponent(language)}&sortBy=${encodeURIComponent(sortBy)}&pageSize=${encodeURIComponent(pageSize)}`;
    const data = await proxyFetch(url);
    res.json({ articles: data.articles || [] });
  } catch (err) {
    console.error('news/search error', err);
    if (err.status === 401) return res.status(502).json({ error: 'News API authentication failed (check NEWS_API_KEY)' });
    if (err.status === 500 && err.message && err.message.includes('Missing NEWS_API_KEY')) return res.status(500).json({ error: 'Server misconfiguration: NEWS_API_KEY is not set' });
    res.status(502).json({ error: 'Failed to search news' });
  }
});

module.exports = router;

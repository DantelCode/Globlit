/* ======================================================
   GLOBLIT – HOME LOGIC (News App)
   - NewsAPI proxy (server) integration
   - Search, topics, hot news, for-you feeds
   - Theme persistence
   - Profile dropdown (CSS checkbox) + username edit/save
   - Article reader, share, TTS
   - Notes: removed client-side API key and removed VALID_CATEGORIES
====================================================== */

/* ================== CONFIG ================== */
// Client should call a server-side proxy that uses the NEWS_API_KEY from env
const NEWS_API_BASE = "/api/news"; // Server endpoints (we'll add server-side routes)

// Categories supported by NewsAPI (used for top/headlines endpoints)
const CATEGORIES = ["general", "business", "entertainment", "health", "science", "sports", "technology"];

// backend endpoints (Node + MongoDB)
const API = {
  me: "/api/me",                 // GET -> { username }
  updateName: "/api/user/name", // POST { username }
  signout: "/signout"
};

/* ================== ELEMENTS ================== */
const body = document.body;
const searchInput = document.getElementById("searchInput");
const topicsNav = document.getElementById("topicsNav");
const hotFeedsEl = document.getElementById("hotFeeds");
const feedsEl = document.getElementById("feeds");
const feedText = document.getElementById("feedText");
const themeToggle = document.getElementById("themeToggle");

// article panel
const article = document.querySelector("article");
const backBtn = article.querySelector("header button");
const shareBtn = article.querySelector(".newsTools button:nth-child(1)");
const readBtn = article.querySelector(".newsTools button:nth-child(2)");
const articleImg = article.querySelector(".newsImg img");
const articleTitle = article.querySelector(".newsBrief p");
const articleSource = article.querySelector(".author p");
const articleDate = article.querySelector(".newsAuthor small");
const articleContent = article.querySelector(".content");

// profile
const usernameInput = document.getElementById("username");
const editBtn = document.querySelector(".user button");

/* ================== STATE ================== */
let country = "us";
let currentTopic = "general";
let currentArticle = null;
let speech;

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await loadUser();
  await detectCountry();
  await loadTopics();
  await loadHotNews();
  await loadFeeds();
});

/* ================== THEME ================== */
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") body.classList.add("dark");
  else body.classList.remove("dark");

  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light");
  });
}

/* ================== USER ================== */
async function loadUser() {
  try {
    const res = await fetch(API.me);
    if (!res.ok) return;
    const data = await res.json();
    usernameInput.value = data.username || "User";
  } catch (err) {
    console.error("loadUser error", err);
  }
}

editBtn.addEventListener("click", async () => {
  if (usernameInput.disabled) {
    usernameInput.disabled = false;
    usernameInput.focus();
    editBtn.textContent = "save";
  } else {
    const newName = usernameInput.value.trim();
    if (!newName) return;

    try {
      await fetch(API.updateName, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName })
      });

      usernameInput.disabled = true;
      editBtn.textContent = "edit";
    } catch (err) {
      console.error("updateName error", err);
      alert("Failed to update name");
    }
  }
});

/* ================== LOCATION ================== */
async function detectCountry() {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
        const data = await res.json();
        country = (data.countryCode || "US").toLowerCase();
      } catch (err) {
        console.error("detectCountry error", err);
      }
      resolve();
    }, () => resolve());
  });
}

function dedupeArticles(list) {
  const seen = new Set();
  return list.filter(a => {
    if (!a || !a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

function sortByDate(list) {
  return list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/* ================== NEWS API HELPERS (via server proxy) ================== */
// Returns { articles: Array, error: null|string }
async function fetchNews(endpoint) {
  try {
    const res = await fetch(`${NEWS_API_BASE}${endpoint}`);
    if (!res.ok) {
      let errBody = null;
      try { errBody = await res.json(); } catch (_) { errBody = null; }
      const message = errBody?.error || `news proxy error ${res.status}`;
      console.error("news proxy error", res.status, errBody);
      return { articles: [], error: message };
    }
    const data = await res.json();
    return { articles: data.articles || [], error: null };
  } catch (err) {
    console.error("fetchNews error", err);
    return { articles: [], error: String(err) };
  }
}

/* ================== TOPICS ================== */
async function loadTopics() {
  const topics = [
    ...CATEGORIES,
    "politics","world","finance","education","food","travel","fashion","music",
    "gaming","crypto","energy","climate","space"
  ];

  topicsNav.innerHTML = "";
  topics.slice(0, 20).forEach((t, i) => {
    const span = document.createElement("span");
    span.className = "topic" + (i === 0 ? " active" : "");
    span.textContent = t;
    span.onclick = async () => {
      document.querySelectorAll(".topic").forEach(x => x.classList.remove("active"));
      span.classList.add("active");
      currentTopic = t;
      feedText.textContent = t === "general" ? "For You" : t;
      await loadFeeds();
    };
    topicsNav.appendChild(span);
  });
}

/* ================== HOT NEWS ================== */
async function loadHotNews() {
  hotFeedsEl.innerHTML = "";

  // Use a reduced set of categories (supported by NewsAPI) to fetch top headlines
  const requests = CATEGORIES.map(cat =>
    fetchNews(`/top?country=${country}&category=${encodeURIComponent(cat)}&pageSize=5`)
  );

  const results = await Promise.all(requests);
  const anyError = results.find(r => r.error);
  if (anyError) {
    const msg = anyError.error || 'Failed to load hot news';
    const p = document.createElement('p');
    p.style.padding = '1rem';
    p.style.opacity = '.8';
    p.textContent = msg;
    hotFeedsEl.appendChild(p);
    return;
  }

  let articles = results.flatMap(r => r.articles || []);

  articles = dedupeArticles(articles)
    .filter(a => a.urlToImage && a.title)
    .slice(0, 12);

  articles.forEach(a => hotFeedsEl.appendChild(createHotCard(a)));
}

function createHotCard(a) {
  const div = document.createElement("div");
  div.className = "hotFeed";

  const img = document.createElement("img");
  img.src = a.urlToImage || '/assets/placeholder.jpg';
  img.alt = a.title || 'news image';

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const source = document.createElement("div");
  source.className = "source";

  const hotFeedImg = document.createElement("div");
  hotFeedImg.className = "hotFeedImg";
  const icon = document.createElement("img");
  icon.src = "/assets/news.png";
  icon.alt = "source";
  hotFeedImg.appendChild(icon);

  const small = document.createElement("small");
  small.textContent = a.source?.name || "";

  source.appendChild(hotFeedImg);
  source.appendChild(small);

  const h3 = document.createElement("h3");
  h3.textContent = a.title || "";

  overlay.appendChild(source);
  overlay.appendChild(h3);

  div.appendChild(img);
  div.appendChild(overlay);

  div.onclick = () => openArticle(a);
  return div;
}

/* ================== FEEDS ================== */
async function loadFeeds() {
  feedsEl.innerHTML = "";
  feedText.textContent = currentTopic === "general" ? "For You" : currentTopic;

  let articles = [];

  if (currentTopic === "general") {
    // Merge top headlines for supported categories
    const requests = CATEGORIES.map(cat =>
      fetchNews(`/top?country=${country}&category=${encodeURIComponent(cat)}&pageSize=6`)
    );

    const results = await Promise.all(requests);
    const anyError = results.find(r => r.error);
    if (anyError) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.8';
      p.textContent = anyError.error || 'Failed to load feeds';
      feedsEl.appendChild(p);
      return;
    }

    articles = results.flatMap(r => r.articles || []);

  } else if (CATEGORIES.includes(currentTopic)) {
    const { articles: a, error } = await fetchNews(`/top?country=${country}&category=${encodeURIComponent(currentTopic)}&pageSize=20`);
    if (error) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.8';
      p.textContent = error;
      feedsEl.appendChild(p);
      return;
    }
    articles = a;

  } else {
    // keyword topics use search/everything proxy
    const { articles: a, error } = await fetchNews(`/search?q=${encodeURIComponent(currentTopic)}&language=en&sortBy=relevancy&pageSize=20`);
    if (error) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.8';
      p.textContent = error;
      feedsEl.appendChild(p);
      return;
    }
    articles = a;
  }

  articles = sortByDate(dedupeArticles(articles));

  if (!articles.length) {
    const p = document.createElement('p');
    p.style.padding = '1rem';
    p.style.opacity = '.6';
    p.textContent = `No news found for "${currentTopic}"`;
    feedsEl.appendChild(p);
    return;
  }

  articles.forEach(a => feedsEl.appendChild(createFeed(a)));
}

function createFeed(a) {
  const div = document.createElement("div");
  div.className = "feed";

  const img = document.createElement("img");
  img.src = a.urlToImage || '/assets/placeholder.jpg';
  img.alt = a.title || 'feed image';

  const feedContent = document.createElement("div");
  feedContent.className = "feedContent";

  const strong = document.createElement("strong");
  strong.textContent = a.title || "";

  const p = document.createElement("p");
  p.textContent = a.description || "";

  const small = document.createElement("small");
  small.textContent = a.publishedAt ? new Date(a.publishedAt).toDateString() : "";

  feedContent.appendChild(strong);
  feedContent.appendChild(p);
  feedContent.appendChild(small);

  div.appendChild(img);
  div.appendChild(feedContent);

  div.onclick = () => openArticle(a);
  return div;
}

/* ================== SEARCH ================== */
let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) return loadFeeds();

  searchTimeout = setTimeout(async () => {
    feedsEl.innerHTML = "";
    feedText.textContent = `Results for \"${q}\"`;

    const { articles, error } = await fetchNews(`/search?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=20`);
    if (error) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.8';
      p.textContent = error;
      feedsEl.appendChild(p);
      return;
    }
    articles.forEach(a => feedsEl.appendChild(createFeed(a)));
  }, 500);
});

/* ================== ARTICLE VIEW ================== */
function openArticle(a) {
  currentArticle = a;
  article.style.display = "block";

  articleImg.src = a.urlToImage || "/assets/placeholder.jpg";
  articleImg.alt = a.title || 'article image';
  articleTitle.textContent = a.title || "";
  articleSource.textContent = a.source?.name || "";
  articleDate.textContent = a.publishedAt ? new Date(a.publishedAt).toDateString() : "";

  // Build content safely
  articleContent.innerHTML = "";
  const p = document.createElement('p');
  p.textContent = a.description || "";
  const aLink = document.createElement('a');
  aLink.href = a.url;
  aLink.target = '_blank';
  aLink.className = 'readFull';
  aLink.textContent = 'Read full article →';

  articleContent.appendChild(p);
  articleContent.appendChild(aLink);
}

backBtn.onclick = () => {
  article.style.display = "none";
  stopSpeech();
};

/* ================== SHARE ================== */
shareBtn.onclick = async () => {
  if (!currentArticle) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: currentArticle.title,
        text: currentArticle.description,
        url: currentArticle.url
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(currentArticle.url);
      alert("Link copied");
    } else {
      // Fallback
      prompt('Copy link', currentArticle.url);
    }
  } catch (err) {
    console.error('share error', err);
  }
};

/* ================== READ OUT ================== */
readBtn.onclick = () => {
  if (!currentArticle) return;

  if (speech) return stopSpeech();

  speech = new SpeechSynthesisUtterance(`${currentArticle.title}. ${currentArticle.description || ""}`);
  speech.lang = "en-US";
  speech.onend = stopSpeech;
  speechSynthesis.speak(speech);
};

function stopSpeech() {
  speechSynthesis.cancel();
  speech = null;
}


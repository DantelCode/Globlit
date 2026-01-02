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
const articleSource = article.querySelector(".author");
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
  await loadFeeds();

  // Close profile dropdown when clicking outside or pressing Escape
  const menuCheckbox = document.getElementById('menu_dp');
  const profileEl = document.querySelector('.profile');

  document.addEventListener('click', (e) => {
    if (!menuCheckbox || !menuCheckbox.checked) return;
    if (!profileEl || profileEl.contains(e.target)) return;
    menuCheckbox.checked = false;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuCheckbox && menuCheckbox.checked) {
      menuCheckbox.checked = false;
    }
  });
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
    const profileImg = document.querySelector('.profile .profile-img img');
    if (!res.ok) {
      usernameInput.value = "User";
      if (profileImg) profileImg.src = '/assets/avatar.png';
      return;
    }
    const data = await res.json();

    // username compatibility: backend may return `username` or `name`
    const name = data.username || data.name || "User";
    usernameInput.value = name;

    // profile image
    if (profileImg) {
      profileImg.src = data.avatar || '/assets/avatar.png';
      profileImg.alt = name;
    }

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
      const res = await fetch(API.updateName, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update name');
      }

      // reflect change in UI
      usernameInput.disabled = true;
      editBtn.textContent = "edit";

      // close dropdown if open
      const menuCheckbox = document.getElementById('menu_dp');
      if (menuCheckbox) menuCheckbox.checked = false;

    } catch (err) {
      console.error("updateName error", err);
      alert(err.message || "Failed to update name");
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

// Capitalize topic / label strings (handles multi-word topics)
function capitalize(str) {
  if (!str) return "";
  return String(str).replace(/\b\w/g, c => c.toUpperCase());
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
    "general", "business", "entertainment", "health", "science", "sports", "technology",
    "politics", "world", "finance", "education", "food", "travel", "fashion", "music",
    "gaming", "crypto", "energy", "climate", "space"
  ];

  topicsNav.innerHTML = "";
  topics.slice(0, 20).forEach((t, i) => {
    const span = document.createElement("span");
    span.className = "topic" + (i === 0 ? " active" : "");
    span.textContent = capitalize(t);
    span.onclick = async () => {
      document.querySelectorAll(".topic").forEach(x => x.classList.remove("active"));
      span.classList.add("active");
      currentTopic = t;
      feedText.textContent = t === "general" ? "For You" : capitalize(t);
      await loadFeeds();
    };
    topicsNav.appendChild(span);
  });
}

/* ================== FEEDS ================== */
async function loadFeeds() {
  feedsEl.innerHTML = "";
  feedText.textContent = currentTopic === "general" ? "For You" : capitalize(currentTopic);

  let articles = [];

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
  articleSource.textContent = `By: ${a.source?.name}` || "";
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


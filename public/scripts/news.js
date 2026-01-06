const NEWS_API_BASE = "/api/news"; // Config

// backend endpoints
const API = {
  me: "/api/me",                 // GET -> { username }
  updateName: "/api/user/name", // POST { username }
  signout: "/signout"
};

/* DOM Elements */
const body = document.body;
const searchInput = document.getElementById("searchInput");
const topicsNav = document.getElementById("topicsNav");
const hotFeedsEl = document.getElementById("hotFeeds");
const feedsEl = document.getElementById("feeds");
const feedText = document.getElementById("feedText");
const themeToggle = document.getElementById("themeToggle");
const home = document.querySelector(".home");
const historyBtn = document.getElementById("historyBtn");
const historyDialog = document.getElementById("historyDialog");
const historyList = document.getElementById("historyList");
const closeHistory = document.getElementById("closeHistory");

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
const editBtn = document.querySelector(".field button");
const dialog = document.getElementById("profileDialog");

/* ================== STATE ================== */
let country = {
  code: "ng",
  name: "Nigeria"
};
let currentTopic = "for you";
let currentArticle = null;
let speech;

let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
let touchDeltaY = 0;
let isSwipingArticle = false;

let articleHistory = [];
const MAX_HISTORY = 20;


/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await loadUser();
  await detectCountry();
  await loadTopics();
  await loadFeeds();

  // At page load
  article.style.display = "none";
  article.classList.add("closed");

  /* Open & Close Profile Dialog */
  document.querySelector(".profile").addEventListener('click', () => {
    dialog.showModal()
  });

  document.querySelector(".back-btn").addEventListener('click', () => {
    dialog.close()
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
    if (!res.ok) return;
    const data = await res.json();

    const name = data.username || "User";
    usernameInput.value = name;

    // profile image
    const profileImg = document.querySelector('.profile img');
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
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
        );
        const data = await res.json();

        country = {
          code: (data.countryCode || "NG").toLowerCase(),
          name: data.countryName || "Nigeria"
        };
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

/* ================== NEWS API HELPERS ================== */
async function fetchNews(endpoint) {
  try {
    const res = await fetch(`${NEWS_API_BASE}${endpoint}`);

    if (!res.ok) {
      let errBody = null;
      try { errBody = await res.json(); } catch (_) { errBody = null; }
      const message = errBody?.error || `news proxy error ${res.status}`;
      console.error("news proxy error", res.status, errBody);
      return { articles: [], totalResults: 0, page: 1, pageSize: 0, error: message };
    }

    const data = await res.json();

    return { articles: data.articles || [], totalResults: data.totalResults || 0, page: data.page || 1, pageSize: data.pageSize || 0, error: null };
  } catch (err) {
    console.error("fetchNews error", err);
    return { articles: [], totalResults: 0, page: 1, pageSize: 0, error: String(err) };
  }
}

/* ================== TOPICS ================== */
async function loadTopics() {
  const topics = [
    'for you', "business", "entertainment", "health", "science", "sports", "technology",
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
      searchQuery = '';
      currentTopic = t;
      feedText.textContent = t === "For You" ? "For You" : capitalize(t);
      await loadFeeds();
    };
    topicsNav.appendChild(span);
  });
}

/* ================== FEEDS (with infinite scroll) ================== */
let currentPage = 1;
const PAGE_SIZE = 20;
let isLoadingFeeds = false;
let hasMoreFeeds = true;
let accumulatedArticles = [];
let feedObserver = null;
let feedSentinel = null;
let searchQuery = '';

async function loadFeeds() {
  feedsEl.innerHTML = "";
  feedText.textContent = searchQuery ? `Results for "${searchQuery}"` : (currentTopic === country.name ? "For You" : capitalize(currentTopic));

  // reset pagination state
  currentPage = 1;
  hasMoreFeeds = true;
  accumulatedArticles = [];

  // create sentinel/load controls
  ensureFeedControls();

  await loadFeedsPage(currentPage);
}

async function loadFeedsPage(page) {
  if (isLoadingFeeds || !hasMoreFeeds) return;
  isLoadingFeeds = true;
  showLoadingFooter(true);

  try {
    let resp;
    if (searchQuery) {
      resp = await fetchNews(`/search?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&pageSize=${PAGE_SIZE}&page=${page}`);
    } else if (currentTopic === country.name) {
      resp = await fetchNews(
        `/top?country=${country.code}&category=general&pageSize=${PAGE_SIZE}&page=${page}`
      );
    } else {
      // Nigeria-focused relevance search
      resp = await fetchNews(
        `/search?q=${encodeURIComponent(`${currentTopic} Nigeria`)}&language=en&sortBy=relevancy&pageSize=${PAGE_SIZE}&page=${page}`
      );
    }


    if (resp.error) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.8';
      p.textContent = resp.error;
      feedsEl.appendChild(p);
      hasMoreFeeds = false;
      showLoadingFooter(false);
      isLoadingFeeds = false;
      return;
    }

    const newArticles = resp.articles || [];

    const deduped = dedupeArticles(accumulatedArticles.concat(newArticles)); // dedupe across already loaded articles

    const added = deduped.slice(accumulatedArticles.length); // determine which ones are new

    if (!deduped.length && page === 1) {
      const p = document.createElement('p');
      p.style.padding = '1rem';
      p.style.opacity = '.6';
      p.textContent = searchQuery ? `No results for "${searchQuery}"` : `No news found for "${currentTopic}"`;
      feedsEl.appendChild(p);
      hasMoreFeeds = false;
      showLoadingFooter(false);
      isLoadingFeeds = false;
      return;
    }

    added.forEach(a => feedsEl.insertBefore(createFeed(a), feedSentinel)); // append newly added feeds

    accumulatedArticles = deduped;
    currentPage = page;

    // determine if more pages exist
    if (resp.totalResults && typeof resp.totalResults === 'number') {
      hasMoreFeeds = accumulatedArticles.length < resp.totalResults;
    } else {
      hasMoreFeeds = newArticles.length === PAGE_SIZE; // fallback heuristic: if we got fewer than page size, assume end
    }

    updateLoadMoreVisibility(); // update load more button visibility

    // if we still can load more, observe sentinel
    if (hasMoreFeeds) observeSentinel();
    else disconnectObserver();

  } catch (err) {
    console.error('loadFeedsPage error', err);
    const p = document.createElement('p');
    p.style.padding = '1rem';
    p.style.opacity = '.8';
    p.textContent = String(err);
    feedsEl.appendChild(p);
    hasMoreFeeds = false;
  } finally {
    showLoadingFooter(false);
    isLoadingFeeds = false;
  }
}

function ensureFeedControls() {
  // create sentinel (end marker)
  if (!feedSentinel) {
    feedSentinel = document.createElement('div');
    feedSentinel.id = 'feed-sentinel';
    feedSentinel.style.minHeight = '1px';
  }
  feedsEl.appendChild(feedSentinel);

  // create load more container
  if (!document.getElementById('feed-loadmore')) {
    const cont = document.createElement('div');
    cont.id = 'feed-loadmore';
    cont.className = 'load-more';
    cont.style.display = 'none';

    const btn = document.createElement('button');
    btn.textContent = 'Load more';
    btn.className = 'btn-loadmore';
    btn.onclick = () => loadFeedsPage(currentPage + 1);

    cont.appendChild(btn);
    feedsEl.appendChild(cont);
  }
}

function showLoadingFooter(show) {
  const cont = document.getElementById('feed-loadmore');
  if (!cont) return;
  if (show) {
    cont.style.display = 'flex';
    cont.innerHTML = `<div class="spinner" aria-hidden="true"></div><div class="loading-text">Loading</div>`;
  } else {
    updateLoadMoreVisibility(); // replace with button if there are more
  }
}

function updateLoadMoreVisibility() {
  const cont = document.getElementById('feed-loadmore');
  if (!cont) return;
  if (hasMoreFeeds) {
    cont.style.display = 'flex';
    cont.innerHTML = '';
    const btn = document.createElement('button');
    btn.textContent = 'Load more';
    btn.className = 'btn-loadmore';
    btn.onclick = () => loadFeedsPage(currentPage + 1);
    cont.appendChild(btn);
  } else {
    cont.style.display = 'none';
    cont.innerHTML = '';
  }
}

function observeSentinel() {
  if (!('IntersectionObserver' in window)) return;
  if (feedObserver) return; // already observing

  feedObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && hasMoreFeeds && !isLoadingFeeds) {
        loadFeedsPage(currentPage + 1);
      }
    }
  }, { root: null, rootMargin: '400px', threshold: 0 });

  feedObserver.observe(feedSentinel);
}

function disconnectObserver() {
  if (feedObserver) {
    feedObserver.disconnect();
    feedObserver = null;
  }
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
  if (!q) {
    searchQuery = '';
    return loadFeeds();
  }

  searchTimeout = setTimeout(async () => {
    searchQuery = q;
    await loadFeeds();
  }, 500);
});

/* ================== ARTICLE VIEW ================== */
function toggleArticle(open, articleData = null) {
  if (open) {
    if (!articleData) return;

    currentArticle = articleData;

    // Populate article content
    articleImg.src = articleData.urlToImage || "/assets/placeholder.jpg";
    articleImg.alt = articleData.title || "article image";
    articleTitle.textContent = articleData.title || "";
    articleSource.textContent = `By: ${articleData.source?.name || ""}`;
    articleDate.textContent = articleData.publishedAt
      ? new Date(articleData.publishedAt).toDateString()
      : "";

    articleContent.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = articleData.description || "";
    const aLink = document.createElement("a");
    aLink.href = articleData.url;
    aLink.target = "_blank";
    aLink.className = "readFull";
    aLink.textContent = "Read full article →";
    articleContent.append(p, aLink);

    // Show article
    article.style.display = "block";
    article.classList.remove("closed");
    article.classList.add("open");

    // Resize home (desktop only)
    if (window.innerWidth > 800) {
      home.classList.add("article-open");
    }

  } else {
    if (!article.classList.contains("open")) return;

    article.classList.remove("open");
    article.classList.add("closed");

    home.classList.remove("article-open");
    stopSpeech();

    setTimeout(() => {
      article.style.display = "none";
      currentArticle = null;
    }, 400);
  }
}

function openArticle(a) {
  toggleArticle(true, a);

  // ---- HISTORY STACK ----
  articleHistory = articleHistory.filter(x => x.url !== a.url);
  articleHistory.unshift({
    title: a.title,
    source: a.source?.name || '',
    url: a.url,
    image: a.urlToImage,
    publishedAt: a.publishedAt
  });

  articleHistory = articleHistory.slice(0, MAX_HISTORY);

  history.pushState(
    { article: a.url },
    "",
    `?article=${encodeURIComponent(a.url)}`
  );
}

backBtn.onclick = () => toggleArticle(false);


/* ================== SWIPE TO CLOSE (MOBILE) ================== */
article.addEventListener("touchstart", (e) => {
  if (!article.classList.contains("open")) return;

  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchDeltaX = 0;
  touchDeltaY = 0;
  isSwipingArticle = true;

  article.style.transition = "none";
}, { passive: true });

article.addEventListener("touchmove", (e) => {
  if (!isSwipingArticle || !article.classList.contains("open")) return;

  const touch = e.touches[0];
  touchDeltaX = touch.clientX - touchStartX;
  touchDeltaY = touch.clientY - touchStartY;

  // Only allow swipe if horizontal OR vertical is dominant
  if (Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
    // Horizontal swipe (right to left or left to right)
    article.style.transform = `translateX(${Math.max(touchDeltaX, 0)}px)`;
  } else {
    // Vertical swipe (top to bottom)
    article.style.transform = `translateY(${Math.max(touchDeltaY, 0)}px)`;
  }
}, { passive: true });

article.addEventListener("touchend", () => {
  if (!isSwipingArticle) return;
  isSwipingArticle = false;

  const SWIPE_THRESHOLD = 120;

  const shouldClose =
    touchDeltaX > SWIPE_THRESHOLD ||
    touchDeltaY > SWIPE_THRESHOLD;

  article.style.transition = "transform 0.3s ease";

  if (shouldClose) {
    article.style.transform = "translateX(100%)";

    setTimeout(() => {
      article.style.transform = "";
      article.style.transition = "";
      toggleArticle(false);
    }, 300);
  } else {
    // Snap back
    article.style.transform = "";
  }
});


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

historyBtn.onclick = () => {
  renderHistory();
  historyDialog.showModal();
};

closeHistory.onclick = () => historyDialog.close();

function renderHistory() {
  historyList.innerHTML = "";

  if (!articleHistory.length) {
    historyList.innerHTML = `<p style="opacity:.6">No articles yet</p>`;
    return;
  }

  articleHistory.forEach(a => {
    const item = document.createElement("div");
    item.className = "history-item";

    item.innerHTML = `
      <img src="${a.image || '/assets/placeholder.jpg'}">
      <div>
        <strong>${a.title}</strong>
        <small>${a.source}</small>
      </div>
    `;

    item.onclick = () => {
      historyDialog.close();
      toggleArticle(true, a);
    };

    historyList.appendChild(item);
  });
}


window.addEventListener("resize", () => {
  if (!article.classList.contains("open")) return;

  if (window.innerWidth <= 800) {
    home.classList.remove("article-open");
  } else {
    home.classList.add("article-open");
  }
});

window.addEventListener("popstate", (e) => {
  if (article.classList.contains("open")) {
    toggleArticle(false);
  }
});

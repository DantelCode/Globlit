# Globlit (News App)

A fullstack news web app built with Node.js, Express, EJS and MongoDB. Uses NewsAPI.org for articles (server-side proxy to avoid exposing API keys).

---

## Setup

1. Copy `.env.example` to `.env` and fill values. Important keys:
   - `NEWS_API_KEY` – server-side NewsAPI key
   - `MONGO_URI` – MongoDB connection string (used for app data and session store)
   - `SESSION_SECRET` – random secret for express-session
2. Install dependencies: `npm install`
   - Note: after pulling these changes run `npm install` to ensure `connect-mongo` (session store) is installed.
3. Run in dev: `npm run dev`

## Quick overview of recent behavior changes

- Sessions are now persisted in MongoDB using `connect-mongo` when `MONGO_URI` is set. This keeps users logged in across reloads and server restarts. If `MONGO_URI` is missing, the app falls back to an in-memory session store (not suitable for production).
- The app uses Passport (Google OAuth) for auth. User records store `name`, `email`, and `avatar`.
- The client fetches `/api/me` to populate the profile avatar and username and to control the UI.
- Updating the username uses `POST /api/user/name` and stores the value in the user's `name` field.

## Environment

Make sure `.env` has the following (example in `.env.example`):

```
PORT=3000
NODE_ENV=development
NEWS_API_KEY=YOUR_NEWS_API_KEY
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
MONGO_URI=YOUR_MONGO_URI
SESSION_SECRET=your_random_secret_here
```

Notes
- If `MONGO_URI` and `SESSION_SECRET` are set, sessions will be stored using Mongo and cookies will be issued with `httpOnly` and `sameSite='lax'` (and `secure` when NODE_ENV=production).
- For production, use a strong `SESSION_SECRET`, enable HTTPS, and consider Redis as a session store if you need very high performance.

## Client-side / UI changes

- Replaced plain title with an accessible linked logo (inline globe SVG + text).
- Replaced emoji icons with lightweight inline SVGs (search, theme toggle, back/share/read buttons) for consistent rendering and accessibility.
- Profile dropdown is theme-aware and glassy (backdrop-filter) with improved hover states. It now closes when clicking outside or pressing Escape.
- Profile avatar and username are populated from `/api/me` on page load; editing the name calls `POST /api/user/name` and updates the DB and UI.
- Topic labels are capitalized automatically and the feed header shows a friendly "For You" for the general topic.
- Feed titles and summaries now use CSS line-clamp and truncation for a responsive, non-overflowing layout.

## CSS & maintenance

- Consolidated shared styles:
  - `.glass` base styles moved to `public/styles/globalStyles.css` to avoid duplication.
  - App base `body` properties (colors, fonts, transitions) consolidated into `globalStyles.css`.
- Removed duplicate selector blocks and cleaned up repeated declarations in `home.css` (reduces maintenance and accidental overrides).

## API (summary)

- `GET /api/me` → { username, email, avatar }
  - `username` is served from `user.name` (legacy `username` values are still supported where present).
- `POST /api/user/name` → update the user's name (validated, min length enforced)
- News endpoints:
  - `GET /api/news/top?...`
  - `GET /api/news/search?q=...`

## Testing checklist (local)

1. Add `.env` values (MONGO_URI, SESSION_SECRET, NEWS_API_KEY).
2. Install deps: `npm install` (ensure `connect-mongo` is present).
3. Start dev server: `npm run dev`.
4. Sign in with Google (auth routes already configured). After sign-in:
   - Confirm profile avatar and username appear in the header dropdown.
   - Reload the dashboard page — you should remain logged in (session persisted in Mongo).
   - Edit the username and click save — the dropdown should close and the new name should persist (refresh to confirm DB update).

## Production checklist & recommendations

- Use HTTPS and set `cookie.secure` to true (NODE_ENV=production).
- Use a robust session store (Mongo, Redis). If you need global session revocation, prefer Redis.
- Keep `SESSION_SECRET` strong and private (rotate when needed).
- Rate-limit the news proxy and cache responses where appropriate to avoid hitting NewsAPI limits.
- Consider log aggregation and monitoring for auth, sessions, and proxy errors.

---

## Changelog

- 2026-01-01: Removed client-side NewsAPI key and added server-side proxy (`/api/news`).
- 2026-01-01: Added basic rate limiting and caching on news proxy.
- 2026-01-01: Refactored `public/scripts/news.js` to use server proxy and safer DOM updates.
- 2026-01-01: Added `.env.example` and README updates.
- 2026-01-02: Added persistent sessions via `connect-mongo` with `SESSION_SECRET` enforcement and cookie settings; fallback to in-memory store with a warning if `MONGO_URI` is not set.
- 2026-01-02: Profile: expose avatar in `/api/me` and persist `name` via `POST /api/user/name` (frontend syncs avatar & name in UI).
- 2026-01-02: UI/UX: replaced emojis with SVG icons, added logo link, responsive feed clamping, topic capitalization, and improved profile dropdown (glassy effect, close on outside click/Escape).
- 2026-01-02: CSS: consolidated `.glass` and `body` styles into `globalStyles.css` and removed duplicate selectors to reduce maintenance.

---

If you'd like, I can also:
- Add a short `CHANGELOG.md` file with these entries.
- Add automated stylelint checks and a pre-commit hook to prevent duplicate selectors.
- Add a small integration test that verifies login persistence and `/api/me` behavior.

Tell me which you'd prefer next.

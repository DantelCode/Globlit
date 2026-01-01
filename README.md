# Globlit (News App)

A fullstack news web app built with Node.js, Express, EJS and MongoDB. Uses NewsAPI.org for articles (server-side proxy to avoid exposing API keys).

## Setup

1. Copy `.env.example` to `.env` and fill values (especially `NEWS_API_KEY`, `MONGO_URI`, `SESSION_SECRET`).
2. Install dependencies: `npm install`
3. Run in dev: `npm run dev`

## Notes

- Do not commit your `.env` file. Keep `NEWS_API_KEY` private.
- The client calls `/api/news` endpoints which proxy requests to NewsAPI with the server-side key.
- For production, consider adding better caching, rate limiting, and monitoring for the news proxy.

## Server routes (important)

- `GET /api/me` - current user
- `POST /api/user/name` - update username
- `GET /api/news/top?country=us&category=general&pageSize=10` - top headlines
- `GET /api/news/search?q=bitcoin&pageSize=20` - search

## Troubleshooting

- 401 from NewsAPI typically means the `NEWS_API_KEY` is missing, invalid, or the account has exceeded its quota. Ensure `NEWS_API_KEY` is set in your `.env` and has been copied correctly from NewsAPI.
- To test the news proxy locally: `curl "http://localhost:3000/api/news/top?country=us&category=general" -i` and check the server console for errors.

---

## Changelog

- 2026-01-01: Removed client-side NewsAPI key and added server-side proxy (`/api/news`).
- 2026-01-01: Added basic rate limiting and caching on news proxy.
- 2026-01-01: Refactored `public/scripts/news.js` to use server proxy and safer DOM updates.
- 2026-01-01: Added `.env.example` and README updates.


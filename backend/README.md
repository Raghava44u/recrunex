# ⚡ JobPulse — Fresh Jobs, Instantly

> A production-quality job search platform that surfaces jobs posted in the last 24 hours. Fast, beautiful, and addictive to use.

---

## 🏗️ Architecture

```
Frontend (Vanilla HTML/CSS/JS)
       ↓ fetch()
Backend (Node.js + Express)
       ↓ axios
The Muse API (job data)
```

**Key Design Decisions:**
- **No database** — The Muse API is the single source of truth
- **In-memory caching** — Server-side (7 min TTL) + client-side (5 min TTL) = minimal API calls
- **localStorage** — User's saved jobs and search history persist across sessions
- **Module pattern** — Each JS file is a self-contained IIFE module with a clear responsibility

---

## 📁 Folder Structure

```
job-search-app/
├── backend/
│   ├── server.js          ← Express API, caching, security
│   ├── package.json
│   └── .env               ← API key (never commit)
│
└── frontend/
    ├── index.html          ← Shell, semantic HTML
    ├── css/
    │   ├── main.css        ← Design system, layout, responsive
    │   ├── components.css  ← Job cards, modal, panel, badges
    │   └── animations.css  ← Keyframes, transitions, micro-interactions
    └── js/
        ├── config.js       ← Constants, search suggestions map
        ├── storage.js      ← localStorage abstraction (saved jobs, recents)
        ├── api.js          ← Backend client with client-side caching
        ├── ui.js           ← Pure rendering functions (XSS-safe)
        ├── search.js       ← Autocomplete, debounce, recent searches
        └── app.js          ← Main orchestrator, state, event delegation
```

---

## 🚀 Setup

### 1. Backend

```bash
cd backend
npm install
node server.js
# → API running at http://localhost:3001
```

### 2. Frontend

Open `frontend/index.html` in your browser — or use a live server:

```bash
# With VS Code Live Server: right-click index.html → "Open with Live Server"
# Or with npx:
npx serve frontend
```

**That's it.** No build step, no webpack, no bundler.

---

## ✨ Features

| Feature | Implementation |
|---|---|
| 🔍 Smart Search | Debounced input, AI-like query expansion |
| 🔥 Fresh Jobs | "🔥 New" badge for <24h jobs, "⚡ Fresh" for <48h |
| 💾 Save Jobs | localStorage, persistent across sessions |
| ⚡ Autocomplete | Prefix-matching + recent search suggestions |
| 🕐 Recent Searches | Stored in localStorage, clickable chips |
| 🌙 Dark Mode | CSS variable theming, persisted preference |
| 📱 Mobile-First | Responsive grid, touch-friendly |
| 💀 Skeleton Loaders | No blank screens — smooth perceived performance |
| 🔄 Load More | Paginated append, no full reload |
| 🎯 Trending Jobs | Pre-seeded popular roles, hot indicators |
| 🔒 Rate Limiting | 100 req/15min global, 30 req/min search |
| 🛡️ Helmet.js | Secure HTTP headers |
| 🚫 Input Sanitization | XSS protection on both ends |
| 📦 Caching | Server + client dual-layer, cache size bounded |

---

## 🔐 Security

- API key in `.env` — never exposed to frontend
- Helmet.js for HTTP security headers
- CORS restricted to localhost origins
- Rate limiting at both global and per-endpoint level
- Input length limits + character sanitization
- HTML escaping in all rendering functions (no `innerHTML` with raw data)

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary font | Syne (display) |
| Body font | DM Sans |
| Accent | `#7c5cfc` (electric violet) |
| Secondary | `#f97316` (electric orange) |
| Radius | 8 / 12 / 18 / 24 / 9999px |
| Theme | Dark-first, light variant via `[data-theme]` |

---

## 🧪 API Endpoints

```
GET /api/jobs?query=&location=&page=&level=&type=
GET /api/trending
GET /api/categories
GET /api/health
```

---

## 💡 Extension Ideas

- Email alerts for saved searches (add nodemailer + cron)
- Job similarity scores (TF-IDF on job descriptions)
- Salary range filtering (when available in API)
- Share job via link (encode job ID in URL params)
- PWA support (service worker for offline saved jobs)

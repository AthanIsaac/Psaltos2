# Psaltos

A web app for browsing and playing Coptic Orthodox hymns. Search by name or Coptic title, browse by cantor or liturgical season, and stream audio recordings with an integrated waveform player.

## Stack

- **Frontend** — React 18, React Router 6, WaveSurfer.js
- **Search** — Custom Smith-Waterman sequence matching algorithm + Fuse.js
- **Backend** — Express.js (audio proxy, contact form email via Nodemailer)

---

## Getting Started

The app requires **two processes** running simultaneously: the React frontend and the Express backend.

### 1. Clone & install

```bash
# Install frontend dependencies (run from repo root)
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
# Copy the example env file and fill in your values
cp .env.example .env
```

Edit `.env`:

| Variable | Description | Required |
|---|---|---|
| `REACT_APP_API_URL` | URL of the running backend | No (defaults to `http://localhost:5002`) |
| `EMAIL_USER` | Gmail address for contact form | Yes (for contact form) |
| `EMAIL_PASS` | Gmail App Password | Yes (for contact form) |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | No (defaults to `localhost:3000,3001`) |

> **Gmail App Password**: go to Google Account → Security → 2-Step Verification → App passwords.

Also create a `backend/.env` with `EMAIL_USER`, `EMAIL_PASS`, and `ALLOWED_ORIGINS`.

### 3. Start the backend

```bash
cd backend

# Production
npm start

# Development (auto-restarts on changes)
npm run dev
```

The backend starts on **port 5002** by default. You should see:

```
🎵 Psaltos Backend API running on port 5002
📡 Audio proxy endpoint: http://localhost:5002/api/audio/proxy?url=<AUDIO_URL>
📧 Contact form endpoint: http://localhost:5002/api/contact
🏥 Health check: http://localhost:5002/api/health
```

### 4. Start the frontend

In a separate terminal, from the repo root:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running both at once

If you want a single command, install `concurrently` and add this to the root `package.json` scripts:

```bash
npm install --save-dev concurrently
```

```json
"dev": "concurrently \"npm start\" \"cd backend && npm run dev\""
```

Then:

```bash
npm run dev
```

---

## Backend API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/audio/proxy?url=<mp3_url>` | GET | Proxies audio from tasbeha.org (handles CORS) |
| `/api/contact` | POST | Sends contact form email via Nodemailer |

---

## Project Structure

```
Psaltos2/
├── src/
│   ├── App.js                  # Router + context providers + error boundary
│   ├── Home.js                 # Main page (search, browse, recently played)
│   ├── Audio.js                # WaveSurfer player component
│   ├── AudioContext.js         # Global audio state + recently played
│   ├── MiniPlayer.js           # Persistent bottom player (swipe-to-skip)
│   ├── Navbar.js               # Top nav + sticky search bar
│   ├── smithWatermanSearch.js  # Custom sequence-matching search algorithm
│   ├── useKeyboardControls.js  # Space / ← / → keyboard shortcuts
│   ├── hooks/
│   │   ├── useSearch.js        # Search state + result caching
│   │   ├── useURLManagement.js # URL ↔ app state sync
│   │   └── useScrollDetection.js
│   ├── components/
│   │   ├── SearchComponents.js # Search results, dropdown, individual hymn
│   │   ├── BrowseComponents.js # Artist/season/hymn browsing UI
│   │   └── SharedComponents.js
│   ├── utils/
│   │   └── seasonUtils.js      # Season categorisation helpers
│   ├── hymns.json              # Hymn catalog (~11k entries)
│   └── artists.json            # Cantor metadata
├── backend/
│   ├── server.js               # Express API server
│   └── package.json
├── .env.example                # Required environment variables
└── package.json
```

---

## Features

- Full-text search with Smith-Waterman fuzzy matching and smart score cutoffs
- Browse by cantor (artist → season → hymns) or by liturgical season
- Waveform audio player with 10-second skip, playback speed control, and position persistence
- Persistent mini-player with swipe-to-skip on mobile
- Keyboard shortcuts: `Space` play/pause, `←`/`→` skip
- Recently played list (persisted in localStorage)
- Shareable deep links — `/hymn/:name/:artist/:mp3` auto-plays on load
- Dark/light theme toggle

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start frontend dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `cd backend && npm start` | Start backend (production) |
| `cd backend && npm run dev` | Start backend (dev, with nodemon) |

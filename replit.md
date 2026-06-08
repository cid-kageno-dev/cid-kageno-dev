# Portfolio Site — Cid Kageno

## Overview
A modern, animated personal developer portfolio for Cid Kageno, a Full Stack Developer and AI Systems Builder. Features a dark aesthetic with ambient animated backgrounds, scroll-triggered reveals, a typewriter hero, and an integrated "Ani Chat" AI assistant powered by a backend on Render.

## Design System
- **Theme**: Dark-first with purple/cyan gradient accents (`#7c6af7`, `#06b6d4`)
- **Typography**: Inter (UI) + JetBrains Mono (code/labels)
- **Animations**: Floating orb background, spinning avatar ring, typewriter effect, scroll reveal, glow effects
- **Components**: Glassmorphism navbar, gradient cards, animated stats, pill-style tech stack badges

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no build step
- **Backend**: Node.js (`server.js`) — static file server + API proxy
- **Auth**: Firebase Auth (Google, GitHub, Email/Password) via CDN
- **AI Chat**: Proxied via `/api/chat` to `https://ani-jms7.onrender.com/api/chat`
- **Data**: GitHub API proxied via `/api/github-repos`

## Project Structure
```
.
├── assets/           # Static assets (profile.png)
├── Ani/              # Ani Chat sub-application
│   ├── index.html
│   ├── main.js
│   └── style.css
├── components/       # Shared Web Components
│   ├── navbar.js     # <custom-navbar>
│   └── footer.js     # <custom-footer>
├── firebase-config.js # Firebase client config (public keys only)
├── auth.js           # Firebase Auth helpers
├── index.html        # Main portfolio page
├── style.css         # All styles
└── server.js         # Node.js server (port 5000)
```

## Running the Project
```
node server.js
```
Serves on port 5000. Handles static files and proxies `/api/github-repos` and `/api/chat`.

## Environment Variables
All Firebase config values are stored as Replit environment variables (shared):
- `FIREBASE_API_KEY` — used server-side for Firebase token verification
- `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc. — Firebase project config
- `GITHUB_TOKEN` — (optional) GitHub API token for higher rate limits

## Deployment
Runs as a Node.js server on Replit. The `Start application` workflow runs `node server.js`.

## User Preferences
- Keep the existing Firebase Auth setup (Google, GitHub, Email/Password sign-in)
- No framework rewrites — pure HTML/CSS/JS is intentional

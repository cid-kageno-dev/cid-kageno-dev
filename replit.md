# Portfolio Site — Cid Kageno

## Overview
A modern, animated personal developer portfolio for Cid Kageno, a Full Stack Developer and AI Systems Builder. Features a dark aesthetic with ambient animated backgrounds, scroll-triggered reveals, a typewriter hero, and an integrated "Ani Chat" AI assistant powered by a backend on Render.

## Design System
- **Theme**: Dark-first with purple/cyan gradient accents (`#7c6af7`, `#06b6d4`). Light mode activates automatically if the OS prefers it (or via `data-theme="light"` on `<html>`).
- **Typography**: Inter (UI) + JetBrains Mono (code/labels)
- **Animations**: Floating orb background, spinning avatar ring, typewriter effect, scroll reveal, glow effects
- **Components**: Glassmorphism navbar, gradient cards, animated stats, pill-style tech stack badges

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no build step
- **Backend**: Node.js + Express (`server.js`) — static file server + API proxy + OIDC auth
- **Auth**: Replit Auth via `openid-client` v6 (PKCE, server-side sessions). Browser adapter: `auth-client.js`
- **AI Chat**: Proxied via `/api/chat` to `https://ani-jms7.onrender.com/api/chat`
- **Data**: GitHub API proxied via `/api/github-repos`

## Project Structure
```
.
├── assets/              # Static assets (profile.png)
├── Ani/                 # Ani Chat sub-application
│   ├── index.html       # Login modal + chat UI (imports /auth-client.js)
│   ├── main.js          # Chat UI logic
│   └── style.css        # Ani-specific styles
├── components/          # Shared Web Components
│   ├── navbar.js        # <custom-navbar>
│   └── footer.js        # <custom-footer>
├── auth-client.js       # Replit Auth browser adapter (session-based, no tokens)
├── supabase-client.js   # DEPRECATED alias — kept for safety, points to auth-client.js logic
├── index.html           # Main portfolio page
├── style.css            # All styles (1522 lines)
├── server.js            # Express server (port 5000) — static files + auth + API proxies
└── package.json         # 3 deps: express, express-session, openid-client
```

## Running the Project
```
node server.js
```
Serves on port 5000. Handles static files, OIDC auth, proxies `/api/github-repos` and `/api/chat`.

## Auth Flow (Replit Auth — PKCE OIDC)
1. User visits `/Ani/` → auth modal blocks access
2. User clicks "Log in to Chat" → JS calls `signInWithGitHub()` → redirects to `/api/login`
3. Server builds PKCE code verifier/challenge, stores in `req.session.oidc`, redirects to Replit OIDC
4. Replit redirects back to `/api/callback` with auth code
5. Server exchanges code → stores `req.session.user = { id, name, email, picture }`
6. Browser lands on `/Ani/` → `onAuthChange` polls `/api/auth/user` → modal dismissed, chat unlocked
7. `/api/chat` reads `req.session.user.name` to pass the user's name to the AI backend

## Auth API Routes
- `GET /api/login` — starts PKCE OIDC flow
- `GET /api/callback` — handles OIDC redirect, sets session
- `GET /api/auth/user` — returns `{ user }` JSON (null if not logged in)
- `GET /api/logout` — destroys session, redirects to `/Ani/`

## Environment Variables
- `SESSION_SECRET` — required secret for express-session cookie signing
- `REPL_ID` — auto-injected by Replit runtime (used as OIDC client_id)
- `GITHUB_TOKEN` — (optional) GitHub API token for higher rate limits

## User Preferences
- No framework rewrites — pure HTML/CSS/JS is intentional
- No Replit DB, no email/password auth, no Google OAuth

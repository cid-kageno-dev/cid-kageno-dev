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
- **Backend**: Node.js + Express (`server.js`) — static file server + API proxy
- **Auth**: Supabase Auth (GitHub OAuth only) via ESM CDN (`esm.sh/@supabase/supabase-js@2`)
- **AI Chat**: Proxied via `/api/chat` to `https://ani-jms7.onrender.com/api/chat`
- **Data**: GitHub API proxied via `/api/github-repos`

## Project Structure
```
.
├── assets/              # Static assets (profile.png)
├── Ani/                 # Ani Chat sub-application
│   ├── index.html       # GitHub-only login modal + profile panel
│   ├── main.js          # Chat UI logic
│   └── style.css        # Ani-specific styles (unified with home palette)
├── components/          # Shared Web Components
│   ├── navbar.js        # <custom-navbar>
│   └── footer.js        # <custom-footer>
├── supabase-client.js   # Supabase client + auth helpers (CDN ESM module)
├── index.html           # Main portfolio page
├── style.css            # All styles
├── server.js            # Express server (port 5000) — static files + API proxy
├── package.json         # express only
└── vercel.json          # Vercel deployment config (routes all traffic to server.js)
```

## Running the Project
```
node server.js
```
Serves on port 5000. Handles static files, proxies `/api/github-repos` and `/api/chat`.

## Auth Flow
1. User visits `/Ani/` → auth modal blocks access (shown instantly via HTML classes)
2. User clicks "Continue with GitHub" → Supabase OAuth redirect to GitHub
3. GitHub redirects back to `/Ani/` with session in URL hash
4. `supabase.auth.onAuthStateChange` fires → modal dismissed, chat unlocked
5. `window.getAniIdToken()` returns `session.access_token` (Supabase JWT)
6. `/api/chat` verifies token via `GET ${SUPABASE_URL}/auth/v1/user`

## Supabase Setup Required
- In Supabase dashboard → **Auth → Providers → GitHub**: enable and paste GitHub OAuth App credentials
- GitHub OAuth App callback URL: `https://<your-domain>/Ani/`

## Environment Variables
- `SUPABASE_URL` — Supabase project URL (required)
- `SUPABASE_ANON_KEY` — Supabase publishable anon key (required)
- `GITHUB_TOKEN` — (optional) GitHub API token for higher rate limits

## User Preferences
- GitHub-only OAuth via Supabase — no email/password, no Google
- No framework rewrites — pure HTML/CSS/JS is intentional

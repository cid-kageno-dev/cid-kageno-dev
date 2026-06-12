# Portfolio Site — Cid Kageno

## Overview
A modern, animated personal developer portfolio for Cid Kageno, a Full Stack Developer and AI Systems Builder. Features a dark aesthetic with ambient animated backgrounds, scroll-triggered reveals, a typewriter hero, and an integrated "Ani Chat" AI assistant powered by a backend on Render.

## Design System
- **Theme**: Dark-first with purple/cyan gradient accents (`#7c6af7`, `#06b6d4`). Light mode activates automatically if the OS prefers it.
- **Typography**: Inter (UI) + JetBrains Mono (code/labels)
- **Animations**: Floating orb background, spinning avatar ring, typewriter effect, scroll reveal, glow effects

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+) — no build step
- **Backend**: Node.js + Express (`server.js`) — static file server + API proxy
- **Auth**: Supabase GitHub OAuth (browser-side via `@supabase/supabase-js` UMD CDN)
- **Database**: Supabase PostgreSQL — `chat_messages` table stores per-user chat history
- **AI Chat**: Proxied via `/api/chat` to `https://ani-jms7.onrender.com/api/chat`
- **Data**: GitHub API proxied via `/api/github-repos`

## Project Structure
```
.
├── assets/              # Static assets (profile.png)
├── Ani/                 # Ani Chat sub-application
│   ├── index.html       # Login modal + chat UI
│   ├── main.js          # Chat UI + Supabase history
│   └── style.css        # Ani-specific styles
├── components/          # Shared Web Components
├── supabase-client.js   # Supabase auth adapter (GitHub OAuth, onAuthChange, etc.)
├── auth-client.js       # Re-exports from supabase-client.js
├── index.html           # Main portfolio page
├── style.css            # All styles
├── server.js            # Express server (port 5000)
└── package.json         # deps: express, express-session, openid-client
```

## Running the Project
```
node server.js
```
Serves on port 5000. Exposes `/api/config` (public Supabase credentials), proxies `/api/github-repos` and `/api/chat`.

## Auth Flow (Supabase GitHub OAuth)
1. User visits `/Ani/` → auth modal blocks access
2. User clicks "Continue with GitHub" → `supabase.auth.signInWithOAuth({ provider: 'github' })`
3. GitHub → Supabase → redirects back to `/Ani/` with session in URL
4. `onAuthStateChange` fires → `window.loadChatHistory()` called → history loaded from Supabase
5. Messages saved to `chat_messages` table on every send/receive

## Supabase Setup Required
Run this SQL in your Supabase dashboard (SQL Editor):
```sql
create table if not exists chat_messages (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        default auth.uid() references auth.users not null,
  role       text        not null check (role in ('user', 'bot')),
  content    text        not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

create policy "Users read own messages"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "Users insert own messages"
  on chat_messages for insert
  with check (auth.uid() = user_id);
```

In Supabase dashboard: **Authentication → Providers → GitHub** — enable and add your GitHub OAuth App credentials.
Supabase callback URL to use in GitHub OAuth App: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

## Environment Variables
- `SUPABASE_URL` — Supabase project URL (set)
- `SUPABASE_ANON_KEY` — Supabase publishable/anon key (set)
- `SESSION_SECRET` — express-session secret
- `GITHUB_TOKEN` — (optional) GitHub API token for higher rate limits

## User Preferences
- No framework rewrites — pure HTML/CSS/JS is intentional
- No Replit DB, no email/password auth, no Google OAuth

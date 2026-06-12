---
name: Supabase auth migration
description: Firebase → Supabase GitHub-only OAuth; architecture constraints and gotchas for this pure HTML/JS project.
---

## Key decisions

**No Vite / no bundler** — Supabase JS loaded via `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'` in `supabase-client.js`. Client key (`sb_publishable_*` format) is hardcoded — it's a public key, same as Firebase config was.

**Auth modal timing fix** — `onAuthStateChange` fires async after CDN loads. Fix: bake `open gated` classes directly onto the overlay `<div>` in HTML so modal is visible on first paint. Auth callback only *removes* those classes when a session exists. Do NOT rely on JS to show the modal initially.

**onAuthChange dual-fire pattern** — calls `supabase.auth.getSession()` immediately (sync-ish) AND subscribes to `onAuthStateChange` to catch future sign-in/out events. Prevents the window where page is visible but auth state unknown.

**Server token verification** — `GET ${SUPABASE_URL}/auth/v1/user` with headers `{ Authorization: Bearer <token>, apikey: SUPABASE_ANON_KEY }`. Replaces Firebase's `identitytoolkit.googleapis.com` POST. User display name is in `data.user_metadata.full_name` or `.name`.

**Supabase user object** — `user.user_metadata.full_name` (set on signUp or profile update), `user.user_metadata.name` (from GitHub OAuth), `user.user_metadata.avatar_url` (from GitHub OAuth). Not `user.displayName` / `user.photoURL` like Firebase.

**Why:**
Firebase was the previous auth provider. Supabase was chosen by the user. The no-build-step constraint (pure HTML/JS) required CDN ESM instead of npm. GitHub-only OAuth simplifies the auth surface.

**How to apply:**
- Any future auth changes should stay in `supabase-client.js` and keep the CDN import pattern
- Keep the `open gated` classes on the overlay HTML element — do not move the modal show logic to JS
- Server-side token check is in the `/api/chat` route in `server.js`

## One-time Supabase dashboard setup still needed by user
1. Auth → Providers → GitHub → enable, paste GitHub OAuth App client ID + secret
2. GitHub OAuth App "Authorization callback URL": `https://<domain>/Ani/`

---
name: Replit Auth OIDC setup
description: How Replit Auth is implemented in this CJS Express app using openid-client v6 with PKCE.
---

## Rule
`openid-client` v6 is ESM-only. In a CJS `server.js`, load it exclusively via `await import('openid-client')` — never `require()`. PKCE (S256 code verifier/challenge) is required; `passport-openidconnect` v0.1.x does NOT support PKCE and will fail with Replit's OIDC server.

## How it works
- `setupOidc()` is called once at startup: `discovery(new URL('https://replit.com/oidc'), process.env.REPL_ID)` → stores `oidcConfig`.
- `/api/login`: generates `codeVerifier`, `codeChallenge`, `state` → stores in `req.session.oidc` → redirects to Replit.
- `/api/callback`: calls `authorizationCodeGrant(oidcConfig, callbackUrl, { pkceCodeVerifier, expectedState })` → stores user in `req.session.user`.
- `/api/auth/user`: returns `req.session.user` as JSON (browser adapter polls this).
- `/api/logout`: destroys session.

**Why:** `openid-client` v5→v6 was a breaking ESM-only rewrite. Dynamic import is the only CJS-compatible path. Replit's OIDC enforces PKCE so any strategy that omits the code_challenge will get an auth error.

**How to apply:** Any time Replit Auth needs to be added/modified in a CJS project, use `await import('openid-client')` and always include PKCE. The browser-side adapter lives in `auth-client.js` and exposes `signInWithGitHub`, `signOut`, `onAuthChange`, `getUserDisplayName`, `getUserAvatarUrl`.

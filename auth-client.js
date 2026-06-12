/**
 * auth-client.js — re-exports everything from supabase-client.js
 * Ani/index.html imports from /auth-client.js; this keeps one source of truth.
 */
export {
  signInWithGitHub,
  signOut,
  onAuthChange,
  getUserDisplayName,
  getUserAvatarUrl,
  getOAuthError,
  getAccessToken,
} from '/supabase-client.js';

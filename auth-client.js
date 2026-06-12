/**
 * auth-client.js — Replit Auth adapter
 * Replaces the old Supabase auth client with session-based Replit Auth.
 * The server handles all OIDC flows; the browser just reads /api/auth/user.
 */

let _cachedUser = undefined;
let _listeners = [];

async function _fetchUser() {
  try {
    const res = await fetch('/api/auth/user');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (_) {
    return null;
  }
}

function _notify(user) {
  for (const fn of _listeners) {
    try { fn(user, null); } catch (_) {}
  }
}

export async function signInWithGitHub() {
  window.location.href = '/api/login';
  return null;
}

export async function signOut() {
  _cachedUser = null;
  _notify(null);
  window.location.href = '/api/logout';
}

export function onAuthChange(callback) {
  _listeners.push(callback);

  // Fire immediately with current state
  if (_cachedUser !== undefined) {
    callback(_cachedUser, null);
  } else {
    _fetchUser().then(user => {
      _cachedUser = user;
      callback(user, null);
    });
  }
}

// No-op: Replit Auth tokens are server-side cookies — no browser token to return
export async function getAccessToken() {
  return null;
}

// Profile updates are not supported via OIDC without a separate API
export async function updateUserProfile(_updates) {
  // No-op for Replit Auth — profile is managed by Replit
}

export function getUserDisplayName(user) {
  if (!user) return 'User';
  return user.name || (user.email ? user.email.split('@')[0] : 'User');
}

export function getUserAvatarUrl(user) {
  return user?.picture || null;
}

export function getOAuthError() {
  const query = new URLSearchParams(location.search);
  const err   = query.get('error') || query.get('error_description');
  return err || null;
}

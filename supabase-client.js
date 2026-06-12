/**
 * supabase-client.js — Supabase Auth adapter
 * Uses the Supabase UMD global (window.supabase) loaded in HTML.
 * Credentials are fetched from /api/config (server injects env vars).
 */

let _client  = null;
let _promise = null;

async function getClient() {
  if (_client) return _client;
  if (!_promise) {
    _promise = fetch('/api/config')
      .then(r => r.json())
      .then(({ supabaseUrl, supabaseKey }) => {
        _client = window.supabase.createClient(supabaseUrl, supabaseKey);
        window._supabase = _client;
        return _client;
      });
  }
  return _promise;
}

function buildUser(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id:      u.id,
    name:    u.user_metadata?.full_name || u.user_metadata?.user_name || (u.email ? u.email.split('@')[0] : 'User'),
    email:   u.email || null,
    picture: u.user_metadata?.avatar_url || null,
  };
}

export async function signInWithGitHub() {
  const sb = await getClient();
  await sb.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + '/Ani/' },
  });
}

export async function signOut() {
  const sb = await getClient();
  window._aniUserId = null;
  await sb.auth.signOut();
}

export function onAuthChange(callback) {
  getClient().then(sb => {
    // Immediately fire with current session
    sb.auth.getSession().then(({ data: { session } }) => {
      const user = buildUser(session);
      window._aniUserId = user ? user.id : null;
      callback(user, null);
    });

    // Listen for future changes
    sb.auth.onAuthStateChange((_event, session) => {
      const user = buildUser(session);
      window._aniUserId = user ? user.id : null;
      callback(user, null);
    });
  });
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

export async function getAccessToken() {
  const sb = await getClient();
  const { data: { session } } = await sb.auth.getSession();
  return session?.access_token || null;
}

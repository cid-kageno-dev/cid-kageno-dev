/**
 * supabase-client.js — Supabase Auth adapter
 * Uses the Supabase UMD global (window.supabase) loaded in HTML.
 */

const SUPABASE_URL = 'https://uclgpxitnhzuftqulmrn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FxHFy0geZAUmZi-0yJ8AcA_-1hX4h1m';

let _client = null;

function getClient() {
  if (!_client) {
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window._supabase = _client;
  }
  return Promise.resolve(_client);
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const SUPABASE_URL      = 'https://uclgpxitnhzuftqulmrn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FxHFy0geZAUmZi-0yJ8AcA_-1hX4h1m';

const _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGitHub() {
  const { data, error } = await _client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${location.origin}/Ani/`,
      skipBrowserRedirect: true,
    }
  });
  if (error) throw error;
  if (data?.url) {
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }
}

export async function signOut() {
  const { error } = await _client.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  _client.auth.getSession().then(({ data: { session }, error }) => {
    if (error) console.error('[supabase] getSession error:', error);
    callback(session?.user ?? null, session);
  }).catch(err => console.error('[supabase] getSession threw:', err));

  _client.auth.onAuthStateChange((event, session) => {
    console.log('[supabase] auth event:', event, session?.user?.email ?? 'no user');
    callback(session?.user ?? null, session);
  });
}

// Returns any OAuth error embedded in the current URL hash/query
export function getOAuthError() {
  const hash  = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const desc  = hash.get('error_description') || query.get('error_description');
  const code  = hash.get('error_code')        || query.get('error_code');
  const err   = hash.get('error')             || query.get('error');
  if (!err && !desc) return null;
  return desc || code || err;
}

export async function getAccessToken() {
  const { data: { session } } = await _client.auth.getSession();
  return session?.access_token ?? null;
}

export async function updateUserProfile(updates) {
  const { error } = await _client.auth.updateUser({
    data: {
      ...(updates.displayName != null && { full_name: updates.displayName }),
      ...(updates.photoURL    != null && { avatar_url: updates.photoURL }),
    }
  });
  if (error) throw error;
}

export function getUserDisplayName(user) {
  return user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || (user?.email ? user.email.split('@')[0] : 'User');
}

export function getUserAvatarUrl(user) {
  return user?.user_metadata?.avatar_url
      || user?.user_metadata?.picture
      || null;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = 'https://uclgpxitnhzuftqulmrn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FxHFy0geZAUmZi-0yJ8AcA_-1hX4h1m';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${location.origin}/Ani/` }
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/Ani/` }
  });
  if (error) throw error;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName } }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, session);
  });
}

export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function updateUserProfile(updates) {
  const { error } = await supabase.auth.updateUser({
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

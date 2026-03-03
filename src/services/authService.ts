import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User } from '../types';

export { isSupabaseConfigured };

function mapUser(raw: { id: string; email?: string; user_metadata?: Record<string, string> } | null): User | null {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email || '',
    name: raw.user_metadata?.full_name || raw.user_metadata?.name || null,
    avatarUrl: raw.user_metadata?.avatar_url || null,
    createdAt: new Date().toISOString(),
  };
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign up failed — please try again.');
  return mapUser(data.user)!;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign in failed — please try again.');
  return mapUser(data.user)!;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return mapUser(data.session?.user ?? null);
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapUser(session?.user ?? null));
  });
  return () => subscription.unsubscribe();
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
}
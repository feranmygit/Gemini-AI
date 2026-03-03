import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Keys not set — running in guest mode.');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // ← picks up OAuth tokens from the URL automatically
      flowType: 'pkce',           // ← more secure OAuth flow, required for SPAs
    },
  }
);

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

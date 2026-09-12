import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  if (
    url.includes('dummy-project') ||
    url.includes('your-project-id') ||
    url.includes('your-supabase-url-here') ||
    anonKey.includes('your-supabase-anon-key') ||
    anonKey.includes('dummy-anon-key')
  ) {
    return false;
  }
  return true;
}

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-project.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isServiceKeyValid = !!(serviceKey && (serviceKey.startsWith('ey') || serviceKey.startsWith('sb_secret_')));
  const key = isServiceKeyValid ? serviceKey : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key');

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

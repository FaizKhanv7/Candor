import { createClient } from '@supabase/supabase-js';

// Server-only admin client — uses service role key, bypasses RLS.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

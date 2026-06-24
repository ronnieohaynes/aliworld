import { createClient } from '@supabase/supabase-js'

// NOTE: these come from .env.local locally, and MUST also be set in
// cloudflare pages env vars for the deployed build to work.
const url =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || ''
const anonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || ''

if ((!url || !anonKey) && typeof import.meta !== 'undefined' && import.meta.env) {
  // fail loud in dev so a missing env var isn't a silent mystery
  console.error('[supabase] missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url || 'http://127.0.0.1:54321', anonKey || 'anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

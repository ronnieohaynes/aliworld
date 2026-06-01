import { createClient } from '@supabase/supabase-js'

// NOTE: these come from .env.local locally, and MUST also be set in
// cloudflare pages env vars for the deployed build to work.
const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // fail loud in dev so a missing env var isn't a silent mystery
  console.error('[supabase] missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_COMING_SOON?: string
  readonly VITE_ANALYTICS_ADMIN_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

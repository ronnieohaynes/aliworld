/** Site origin + Vite base path (e.g. https://host/aliworld). */
export function getAuthRedirectBase(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  if (typeof window === 'undefined') return normalized || '/'
  return `${window.location.origin}${normalized}`
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAuthRedirectBase()}/reset`
}

export function isPasswordResetPath(): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '')
  return path.endsWith('/reset')
}

/** Supabase puts recovery / confirm tokens in the URL hash. */
export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.toLowerCase()
  const search = window.location.search.toLowerCase()
  return hash.includes('type=recovery') || search.includes('type=recovery')
}

export function clearAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.hash && !url.search) return
  url.hash = ''
  url.search = ''
  window.history.replaceState({}, document.title, url.pathname + url.search)
}

/** Public production hosts where dev mode must never register — hard block. */
export const DEV_BLOCKED_HOSTS = ['play.dannyali.com'] as const

export const DEV_MODE_SESSION_KEY = 'aliworld-dev-mode'

export function isDevAllowedOnHost(): boolean {
  if (typeof window === 'undefined') return false
  return !(DEV_BLOCKED_HOSTS as readonly string[]).includes(window.location.hostname)
}

export function readDevModeSession(): boolean {
  if (!isDevAllowedOnHost()) return false
  try {
    return sessionStorage.getItem(DEV_MODE_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function writeDevModeSession(enabled: boolean): void {
  if (!isDevAllowedOnHost()) return
  try {
    if (enabled) sessionStorage.setItem(DEV_MODE_SESSION_KEY, '1')
    else sessionStorage.removeItem(DEV_MODE_SESSION_KEY)
  } catch {
    // ignore quota / private mode
  }
}

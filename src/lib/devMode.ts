/** Public production hosts where dev mode must never register — hard block. */
export const DEV_BLOCKED_HOSTS = ['play.dannyali.com'] as const

export const DEV_MODE_SESSION_KEY = 'aliworld-dev-mode'

const devModeListeners = new Set<() => void>()

function emitDevModeChange(): void {
  for (const listener of devModeListeners) {
    listener()
  }
}

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

/** True when dev mode is enabled for this session (and host allows it). */
export function isDevModeEnabled(): boolean {
  return readDevModeSession()
}

export function subscribeDevMode(listener: () => void): () => void {
  devModeListeners.add(listener)
  return () => devModeListeners.delete(listener)
}

export function getDevModeEnabledSnapshot(): boolean {
  return isDevModeEnabled()
}

export function writeDevModeSession(enabled: boolean): void {
  if (!isDevAllowedOnHost()) return
  try {
    if (enabled) sessionStorage.setItem(DEV_MODE_SESSION_KEY, '1')
    else sessionStorage.removeItem(DEV_MODE_SESSION_KEY)
  } catch {
    // ignore quota / private mode
  }
  emitDevModeChange()
}

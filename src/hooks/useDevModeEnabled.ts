import { useSyncExternalStore } from 'react'
import { getDevModeEnabledSnapshot, subscribeDevMode } from '../lib/devMode'

export function useDevModeEnabled(): boolean {
  return useSyncExternalStore(
    subscribeDevMode,
    getDevModeEnabledSnapshot,
    getDevModeEnabledSnapshot,
  )
}

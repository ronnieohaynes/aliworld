/**
 * Hometown store, tracks which hometown the player has selected.
 *
 * Kept separate from playerStore so we don't have to rewrite that file.
 * Persisted in localStorage under 'aw_hometown' (simple string key).
 * On first boot, defaults to 'five'.
 */
import { DEFAULT_HOMETOWN_ID, type HometownId } from '../data/hometowns'

const STORAGE_KEY = 'aw_hometown'

function loadFromStorage(): HometownId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'five' || raw === 'san_bruno' || raw === 'hillside' || raw === 'five_gym') {
      return raw
    }
  } catch {
    // ignore
  }
  return DEFAULT_HOMETOWN_ID
}

let currentHometown: HometownId = loadFromStorage()
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export function getPlayerHometown(): HometownId {
  return currentHometown
}

export function setPlayerHometown(id: HometownId): void {
  if (id === currentHometown) return
  currentHometown = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
  notify()
}

export function subscribeHometownStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

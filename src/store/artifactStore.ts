import {
  FANNY_PACK_ARTIFACTS,
  isCollectibleArtifactId,
  type CollectibleArtifactId,
} from '../data/artifacts'

const STORAGE_KEY = 'aliworld:artifacts:v1'
export const ARTIFACT_COLLECT_ANIM_MS = 650

type ArtifactStoreState = {
  collected: Record<CollectibleArtifactId, boolean>
  newlyCollected: CollectibleArtifactId | null
}

function emptyCollectedMap(): Record<CollectibleArtifactId, boolean> {
  const map = {} as Record<CollectibleArtifactId, boolean>
  for (const artifact of FANNY_PACK_ARTIFACTS) {
    map[artifact.id] = false
  }
  return map
}

function loadCollectedFromStorage(): Record<CollectibleArtifactId, boolean> {
  const map = emptyCollectedMap()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return map
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return map
    for (const id of parsed) {
      if (typeof id === 'string' && isCollectibleArtifactId(id)) {
        map[id] = true
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return map
}

function saveCollectedToStorage(collected: Record<CollectibleArtifactId, boolean>): void {
  try {
    const ids = FANNY_PACK_ARTIFACTS.filter((a) => collected[a.id]).map((a) => a.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // storage unavailable
  }
}

let state: ArtifactStoreState = {
  collected: loadCollectedFromStorage(),
  newlyCollected: null,
}

let collectAnimTimer: number | undefined

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function clearCollectAnimTimer(): void {
  if (collectAnimTimer !== undefined) {
    window.clearTimeout(collectAnimTimer)
    collectAnimTimer = undefined
  }
}

function scheduleCollectAnimClear(id: CollectibleArtifactId): void {
  clearCollectAnimTimer()
  collectAnimTimer = window.setTimeout(() => {
    if (state.newlyCollected === id) {
      state = { ...state, newlyCollected: null }
      emit()
    }
    collectAnimTimer = undefined
  }, ARTIFACT_COLLECT_ANIM_MS)
}

export function subscribeArtifactStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getArtifactStoreSnapshot(): ArtifactStoreState {
  return state
}

export function hasArtifact(id: CollectibleArtifactId): boolean {
  return state.collected[id] === true
}

export function getCollectedArtifactIds(): CollectibleArtifactId[] {
  return FANNY_PACK_ARTIFACTS.filter((a) => state.collected[a.id]).map((a) => a.id)
}

/** Id currently playing the collect reveal animation, if any. */
export function getNewlyCollectedArtifact(): CollectibleArtifactId | null {
  return state.newlyCollected
}

/**
 * Mark an artifact collected and trigger brief reveal feedback (Fanny Pack slot lights up).
 * Safe to call from world pickups, NPC handoffs, or debug tools.
 */
export function collectArtifact(id: CollectibleArtifactId): boolean {
  if (!isCollectibleArtifactId(id) || state.collected[id]) return false

  state = {
    collected: { ...state.collected, [id]: true },
    newlyCollected: id,
  }
  saveCollectedToStorage(state.collected)
  emit()
  scheduleCollectAnimClear(id)
  return true
}

/** Clear all collected artifacts (debug / re-test). */
export function resetArtifactsForDebug(): void {
  clearCollectAnimTimer()
  state = {
    collected: emptyCollectedMap(),
    newlyCollected: null,
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

/** @deprecated Use resetArtifactsForDebug */
export const clearArtifactsForDebug = resetArtifactsForDebug

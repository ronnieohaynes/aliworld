/**
 * Gym head clear flags — keyed by head id (`5ive-gym1`, `5ive-gym2`, `hillcrest-gym1`, …).
 */

const STORAGE_KEY = 'aliworld:gym:v1'
const LEGACY_QUEST1_STORAGE_KEY = 'aliworld:quest1-five:v1'

export const FIVE_GYM1_ID = '5ive-gym1'

type GymState = {
  clearedHeads: Record<string, boolean>
}

export type GymSerialized = {
  clearedHeads?: Record<string, boolean>
}

function emptyGymState(): GymState {
  return { clearedHeads: {} }
}

function loadGymFromStorage(): GymState {
  const base = emptyGymState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as Partial<GymState>
        if (o.clearedHeads && typeof o.clearedHeads === 'object') {
          const clearedHeads: Record<string, boolean> = {}
          for (const [id, val] of Object.entries(o.clearedHeads)) {
            if (val === true) clearedHeads[id] = true
          }
          return { clearedHeads }
        }
      }
    }
  } catch {
    // ignore
  }

  // One-time migration from quest1 gymTier1Cleared.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_QUEST1_STORAGE_KEY)
    if (legacyRaw) {
      const parsed: unknown = JSON.parse(legacyRaw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as { gymTier1Cleared?: boolean; gym5ive1Cleared?: boolean }
        if (o.gym5ive1Cleared === true || o.gymTier1Cleared === true) {
          return { clearedHeads: { [FIVE_GYM1_ID]: true } }
        }
      }
    }
  } catch {
    // ignore
  }

  return base
}

function saveGymToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

let state: GymState = loadGymFromStorage()
let storeRevision = 0

const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

export function getGymRevision(): number {
  return storeRevision
}

export function subscribeGymStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isGymHeadCleared(headId: string): boolean {
  return state.clearedHeads[headId] === true
}

export function isGym5ive1Cleared(): boolean {
  return isGymHeadCleared(FIVE_GYM1_ID)
}

export function setGymHeadCleared(headId: string): void {
  if (state.clearedHeads[headId]) return
  state = {
    ...state,
    clearedHeads: { ...state.clearedHeads, [headId]: true },
  }
  saveGymToStorage()
  emit()
}

export function setGym5ive1Cleared(): void {
  setGymHeadCleared(FIVE_GYM1_ID)
}

export function serialize(): GymSerialized {
  return { clearedHeads: { ...state.clearedHeads } }
}

export function applyState(data: Partial<GymSerialized>): void {
  const clearedHeads: Record<string, boolean> = {}
  if (data.clearedHeads) {
    for (const [id, val] of Object.entries(data.clearedHeads)) {
      if (val === true) clearedHeads[id] = true
    }
  }
  // Account migration from quest1 gymTier1Cleared.
  const legacy = data as Partial<GymSerialized & { gymTier1Cleared?: boolean }>
  if (legacy.gymTier1Cleared === true) {
    clearedHeads[FIVE_GYM1_ID] = true
  }
  state = { clearedHeads }
  saveGymToStorage()
  emit()
}

export function resetState(): void {
  state = emptyGymState()
  emit()
}

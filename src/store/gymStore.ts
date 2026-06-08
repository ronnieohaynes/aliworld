/**
 * Gym head progress — wins per head and clear flags (`5ive-gym1`, `5ive-gym2`, …).
 */

import { FIVE_GYM1_WINS_TO_CLEAR } from '../data/fiveGym1Gauntlet'

const STORAGE_KEY = 'aliworld:gym:v1'
const LEGACY_QUEST1_STORAGE_KEY = 'aliworld:quest1-five:v1'

export const FIVE_GYM1_ID = '5ive-gym1'

type GymState = {
  /** Wins recorded per head id (0 … winsToClear). */
  headWins: Record<string, number>
  clearedHeads: Record<string, boolean>
  /** True after the player has entered the oceanview gym interior at least once. */
  oceanviewGymVisited: boolean
  /** Unlocked after e2 closing — southside gym door opens. */
  southsideGymUnlocked: boolean
  /** True after entering the southside gym interior at least once. */
  southsideGymVisited: boolean
}

export type GymSerialized = {
  headWins?: Record<string, number>
  clearedHeads?: Record<string, boolean>
  oceanviewGymVisited?: boolean
  southsideGymUnlocked?: boolean
  southsideGymVisited?: boolean
}

function emptyGymState(): GymState {
  return {
    headWins: {},
    clearedHeads: {},
    oceanviewGymVisited: false,
    southsideGymUnlocked: false,
    southsideGymVisited: false,
  }
}

function clampHeadWins(wins: number, max = FIVE_GYM1_WINS_TO_CLEAR): number {
  if (!Number.isFinite(wins) || wins < 0) return 0
  return Math.min(Math.floor(wins), max)
}

function normalizeHeadWins(raw: Record<string, unknown> | undefined): Record<string, number> {
  const headWins: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return headWins
  for (const [id, val] of Object.entries(raw)) {
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      headWins[id] = clampHeadWins(val)
    }
  }
  return headWins
}

function normalizeClearedHeads(raw: Record<string, unknown> | undefined): Record<string, boolean> {
  const clearedHeads: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') return clearedHeads
  for (const [id, val] of Object.entries(raw)) {
    if (val === true) clearedHeads[id] = true
  }
  return clearedHeads
}

function reconcileClearedFromWins(state: GymState): GymState {
  const headWins = { ...state.headWins }
  const clearedHeads = { ...state.clearedHeads }
  for (const [id, wins] of Object.entries(headWins)) {
    if (wins >= FIVE_GYM1_WINS_TO_CLEAR) {
      clearedHeads[id] = true
    }
  }
  if (clearedHeads[FIVE_GYM1_ID] && (headWins[FIVE_GYM1_ID] ?? 0) < FIVE_GYM1_WINS_TO_CLEAR) {
    headWins[FIVE_GYM1_ID] = FIVE_GYM1_WINS_TO_CLEAR
  }
  return {
    headWins,
    clearedHeads,
    oceanviewGymVisited: state.oceanviewGymVisited,
    southsideGymUnlocked: state.southsideGymUnlocked,
    southsideGymVisited: state.southsideGymVisited,
  }
}

function loadGymFromStorage(): GymState {
  const base = emptyGymState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as Partial<GymState>
        return reconcileClearedFromWins({
          headWins: normalizeHeadWins(o.headWins as Record<string, unknown> | undefined),
          clearedHeads: normalizeClearedHeads(o.clearedHeads as Record<string, unknown> | undefined),
          oceanviewGymVisited: o.oceanviewGymVisited === true,
          southsideGymUnlocked: o.southsideGymUnlocked === true,
          southsideGymVisited: o.southsideGymVisited === true,
        })
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
          return reconcileClearedFromWins({
            headWins: { [FIVE_GYM1_ID]: FIVE_GYM1_WINS_TO_CLEAR },
            clearedHeads: { [FIVE_GYM1_ID]: true },
            oceanviewGymVisited: true,
            southsideGymUnlocked: false,
            southsideGymVisited: false,
          })
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

export function getGymHeadWins(headId: string): number {
  return state.headWins[headId] ?? 0
}

export function isGymHeadCleared(headId: string): boolean {
  return state.clearedHeads[headId] === true
}

export function isGym5ive1Cleared(): boolean {
  return isGymHeadCleared(FIVE_GYM1_ID)
}

export function isOceanviewGymVisited(): boolean {
  return state.oceanviewGymVisited
}

export function setOceanviewGymVisited(): void {
  if (state.oceanviewGymVisited) return
  state = { ...state, oceanviewGymVisited: true }
  saveGymToStorage()
  emit()
}

export function isSouthsideGymUnlocked(): boolean {
  return state.southsideGymUnlocked
}

export function setSouthsideGymUnlocked(): void {
  if (state.southsideGymUnlocked) return
  state = { ...state, southsideGymUnlocked: true }
  saveGymToStorage()
  emit()
}

export function isSouthsideGymVisited(): boolean {
  return state.southsideGymVisited
}

export function setSouthsideGymVisited(): void {
  if (state.southsideGymVisited) return
  state = { ...state, southsideGymVisited: true }
  saveGymToStorage()
  emit()
}

/** Record a win; clears the head at exactly `FIVE_GYM1_WINS_TO_CLEAR`. Losses never reset wins. */
export function recordGymHeadWin(headId: string): void {
  if (isGymHeadCleared(headId)) return
  const wins = getGymHeadWins(headId)
  if (wins >= FIVE_GYM1_WINS_TO_CLEAR) return
  const next = wins + 1
  const headWins = { ...state.headWins, [headId]: next }
  const clearedHeads =
    next >= FIVE_GYM1_WINS_TO_CLEAR
      ? { ...state.clearedHeads, [headId]: true }
      : state.clearedHeads
  state = { ...state, headWins, clearedHeads }
  saveGymToStorage()
  emit()
}

export function recordGym5ive1Win(): void {
  recordGymHeadWin(FIVE_GYM1_ID)
}

/** @deprecated Use recordGymHeadWin — kept for save migration only. */
export function setGymHeadCleared(headId: string): void {
  if (state.clearedHeads[headId]) return
  state = reconcileClearedFromWins({
    headWins: { ...state.headWins, [headId]: FIVE_GYM1_WINS_TO_CLEAR },
    clearedHeads: { ...state.clearedHeads, [headId]: true },
    oceanviewGymVisited: state.oceanviewGymVisited,
    southsideGymUnlocked: state.southsideGymUnlocked,
    southsideGymVisited: state.southsideGymVisited,
  })
  saveGymToStorage()
  emit()
}

export function setGym5ive1Cleared(): void {
  setGymHeadCleared(FIVE_GYM1_ID)
}

export function serialize(): GymSerialized {
  return {
    headWins: { ...state.headWins },
    clearedHeads: { ...state.clearedHeads },
    oceanviewGymVisited: state.oceanviewGymVisited,
    southsideGymUnlocked: state.southsideGymUnlocked,
    southsideGymVisited: state.southsideGymVisited,
  }
}

export function applyState(data: Partial<GymSerialized>): void {
  const headWins = normalizeHeadWins(data.headWins as Record<string, unknown> | undefined)
  const clearedHeads = normalizeClearedHeads(data.clearedHeads as Record<string, unknown> | undefined)
  const legacy = data as Partial<GymSerialized & { gymTier1Cleared?: boolean }>
  if (legacy.gymTier1Cleared === true) {
    clearedHeads[FIVE_GYM1_ID] = true
  }
  state = reconcileClearedFromWins({
    headWins,
    clearedHeads,
    oceanviewGymVisited: data.oceanviewGymVisited === true,
    southsideGymUnlocked: data.southsideGymUnlocked === true,
    southsideGymVisited: data.southsideGymVisited === true,
  })
  saveGymToStorage()
  emit()
}

export function resetState(): void {
  state = emptyGymState()
  emit()
}

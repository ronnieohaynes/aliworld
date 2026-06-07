/**
 * Quest 2 — southside / blue store spine (crowd → crier → clerk → restocker).
 */

const STORAGE_KEY = 'aliworld:quest2:v1'

/** Flip true when episode 2 is ready to ship — gates quest 2, crowd/crier, southside travel. */
export const E2_ENABLED = true

export const TOWN_CRIER_NPC_ID = 'town-crier'
export const CLERK_NPC_ID = 'clerk'
export const RESTOCKER_NPC_ID = 'restocker'
export const CROWD_1_NPC_ID = 'crowd1'
export const CROWD_2_NPC_ID = 'crowd2'

type Quest2State = {
  crowdAddressed: boolean
  crierConverted: boolean
  /** Converted crier dispatched to the blue store as herald. */
  crierSentAhead: boolean
  clerkConverted: boolean
  restockerDefeated: boolean
  e2Seen: boolean
  /** Post-e2 secret move grant (once). */
  e2SecretMoveGranted: boolean
}

function emptyQuest2State(): Quest2State {
  return {
    crowdAddressed: false,
    crierConverted: false,
    crierSentAhead: false,
    clerkConverted: false,
    restockerDefeated: false,
    e2Seen: false,
    e2SecretMoveGranted: false,
  }
}

function loadQuest2FromStorage(): Quest2State {
  const base = emptyQuest2State()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<Quest2State>
    return {
      crowdAddressed: o.crowdAddressed === true,
      crierConverted: o.crierConverted === true,
      crierSentAhead: o.crierSentAhead === true,
      clerkConverted: o.clerkConverted === true,
      restockerDefeated: o.restockerDefeated === true,
      e2Seen: o.e2Seen === true,
      e2SecretMoveGranted: o.e2SecretMoveGranted === true,
    }
  } catch {
    return base
  }
}

function saveQuest2ToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
}

let state: Quest2State = loadQuest2FromStorage()
let storeRevision = 0

const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

/** Monotonic counter for useSyncExternalStore — never return mutable state as snapshot. */
export function getQuest2Revision(): number {
  return storeRevision
}

export function subscribeQuest2Store(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getQuest2Snapshot(): Quest2State {
  return state
}

export function isCrowdAddressed(): boolean {
  return state.crowdAddressed
}

export function setCrowdAddressed(): void {
  if (state.crowdAddressed) return
  state = { ...state, crowdAddressed: true }
  saveQuest2ToStorage()
  emit()
}

export function isCrierConverted(): boolean {
  return state.crierConverted
}

export function setCrierConverted(): void {
  if (state.crierConverted) return
  state = { ...state, crierConverted: true }
  saveQuest2ToStorage()
  emit()
}

export function isCrierSentAhead(): boolean {
  return state.crierSentAhead
}

export function setCrierSentAhead(): void {
  if (state.crierSentAhead) return
  state = { ...state, crierSentAhead: true }
  saveQuest2ToStorage()
  emit()
}

export function isClerkConverted(): boolean {
  return state.clerkConverted
}

export function setClerkConverted(): void {
  if (state.clerkConverted) return
  state = { ...state, clerkConverted: true }
  saveQuest2ToStorage()
  emit()
}

export function isRestockerDefeated(): boolean {
  return state.restockerDefeated
}

export function setRestockerDefeated(): void {
  if (state.restockerDefeated) return
  state = { ...state, restockerDefeated: true, e2Seen: true }
  saveQuest2ToStorage()
  emit()
}

export function isE2SecretMoveGranted(): boolean {
  return state.e2SecretMoveGranted
}

export function setE2SecretMoveGranted(): void {
  if (state.e2SecretMoveGranted) return
  state = { ...state, e2SecretMoveGranted: true }
  saveQuest2ToStorage()
  emit()
}

export function isE2Seen(): boolean {
  return state.e2Seen
}

export function setE2Seen(): void {
  if (state.e2Seen) return
  state = { ...state, e2Seen: true }
  saveQuest2ToStorage()
  emit()
}

export type Quest2Serialized = {
  crowdAddressed?: boolean
  crierConverted?: boolean
  crierSentAhead?: boolean
  clerkConverted?: boolean
  restockerDefeated?: boolean
  e2Seen?: boolean
  e2SecretMoveGranted?: boolean
}

export function serialize(): Quest2Serialized {
  return {
    crowdAddressed: state.crowdAddressed,
    crierConverted: state.crierConverted,
    crierSentAhead: state.crierSentAhead,
    clerkConverted: state.clerkConverted,
    restockerDefeated: state.restockerDefeated,
    e2Seen: state.e2Seen,
    e2SecretMoveGranted: state.e2SecretMoveGranted,
  }
}

export function applyState(data: Partial<Quest2Serialized>): void {
  const crierSentAhead =
    data.crierSentAhead === true ||
    (data.crierConverted === true &&
      (data.clerkConverted === true || data.restockerDefeated === true))
  const e2SecretMoveGranted =
    data.e2SecretMoveGranted === true || data.restockerDefeated === true
  state = {
    crowdAddressed: data.crowdAddressed === true,
    crierConverted: data.crierConverted === true,
    crierSentAhead,
    clerkConverted: data.clerkConverted === true,
    restockerDefeated: data.restockerDefeated === true,
    e2Seen: data.e2Seen === true,
    e2SecretMoveGranted,
  }
  saveQuest2ToStorage()
  emit()
}

export function resetState(): void {
  state = emptyQuest2State()
  emit()
}

/** Clear Quest 2 progress (debug / re-test). */
export function resetQuest2ForDebug(): void {
  state = emptyQuest2State()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

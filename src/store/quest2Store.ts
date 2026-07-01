/**
 * Quest 2, southside / blue store spine (crowd → crier → clerk → restocker).
 */

const STORAGE_KEY = 'aliworld:quest2:v1'

/** Flip true when episode 2 is ready to ship, gates quest 2, crowd/crier, southside travel. */
export const E2_ENABLED = true

/** Episode 3 content ships from quest3Store (E3_ENABLED). */
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
  /** Crier mob beat finished, crowd cleared before episode cards. */
  e2ClosingCrowdDismissed: boolean
  /** Full e2 closing sequence finished (crowd → episode card). */
  e2Complete: boolean
  e2CutscenePlayed: boolean
}

function emptyQuest2State(): Quest2State {
  return {
    crowdAddressed: false,
    crierConverted: false,
    crierSentAhead: false,
    clerkConverted: false,
    restockerDefeated: false,
    e2ClosingCrowdDismissed: false,
    e2Complete: false,
    e2CutscenePlayed: false,
  }
}

function loadQuest2FromStorage(): Quest2State {
  const base = emptyQuest2State()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<Quest2State> & { e2Seen?: boolean }
    return {
      crowdAddressed: o.crowdAddressed === true,
      crierConverted: o.crierConverted === true,
      crierSentAhead: o.crierSentAhead === true,
      clerkConverted: o.clerkConverted === true,
      restockerDefeated: o.restockerDefeated === true,
      e2ClosingCrowdDismissed:
        o.e2ClosingCrowdDismissed === true || o.e2Complete === true || o.e2Seen === true,
      e2Complete: o.e2Complete === true || o.e2Seen === true,
      e2CutscenePlayed: o.e2CutscenePlayed === true,
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

/** Monotonic counter for useSyncExternalStore, never return mutable state as snapshot. */
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
  state = { ...state, restockerDefeated: true }
  saveQuest2ToStorage()
  emit()
}

export function isE2ClosingCrowdDismissed(): boolean {
  return state.e2ClosingCrowdDismissed
}

export function setE2ClosingCrowdDismissed(): void {
  if (state.e2ClosingCrowdDismissed) return
  state = { ...state, e2ClosingCrowdDismissed: true }
  saveQuest2ToStorage()
  emit()
}

export function isE2Complete(): boolean {
  return state.e2Complete
}

export function setE2Complete(): void {
  if (state.e2Complete) return
  state = { ...state, e2Complete: true }
  saveQuest2ToStorage()
  emit()
}

export function isE2CutscenePlayed(): boolean {
  return state.e2CutscenePlayed
}

export function setE2CutscenePlayed(): void {
  if (state.e2CutscenePlayed) return
  state = { ...state, e2CutscenePlayed: true }
  saveQuest2ToStorage()
  emit()
}

/** @deprecated Legacy alias, use isE2Complete. */
export function isE2Seen(): boolean {
  return state.e2Complete
}

export type Quest2Serialized = {
  crowdAddressed?: boolean
  crierConverted?: boolean
  crierSentAhead?: boolean
  clerkConverted?: boolean
  restockerDefeated?: boolean
  e2ClosingCrowdDismissed?: boolean
  e2Complete?: boolean
  e2CutscenePlayed?: boolean
  /** Legacy, migrated to e2Complete on load. */
  e2Seen?: boolean
}

export function serialize(): Quest2Serialized {
  return {
    crowdAddressed: state.crowdAddressed,
    crierConverted: state.crierConverted,
    crierSentAhead: state.crierSentAhead,
    clerkConverted: state.clerkConverted,
    restockerDefeated: state.restockerDefeated,
    e2ClosingCrowdDismissed: state.e2ClosingCrowdDismissed,
    e2Complete: state.e2Complete,
    e2CutscenePlayed: state.e2CutscenePlayed,
  }
}

export function applyState(data: Partial<Quest2Serialized>): void {
  const crierSentAhead =
    data.crierSentAhead === true ||
    (data.crierConverted === true &&
      (data.clerkConverted === true || data.restockerDefeated === true))
  const e2Complete = data.e2Complete === true || data.e2Seen === true
  state = {
    crowdAddressed: data.crowdAddressed === true,
    crierConverted: data.crierConverted === true,
    crierSentAhead,
    clerkConverted: data.clerkConverted === true,
    restockerDefeated: data.restockerDefeated === true,
    e2ClosingCrowdDismissed:
      data.e2ClosingCrowdDismissed === true || e2Complete,
    e2Complete,
    e2CutscenePlayed: data.e2CutscenePlayed === true,
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

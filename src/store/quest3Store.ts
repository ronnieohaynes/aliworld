/**
 * Quest 3 — the stranger (three escalating single fights + mass conversion).
 */

const STORAGE_KEY = 'aliworld:quest3:v1'

/** Episode 3 content — on dev while E3 ships. */
export const E3_ENABLED = true

/** Episode 4 needs multi-enemy engine — gate only on dev. */
export const E4_ENABLED = false

export const STRANGER_INTERVIEWER_NPC_ID = 'stranger-interviewer'
export const STRANGER_PREACHER_NPC_ID = 'stranger-preacher'
export const STRANGER_MONK_NPC_ID = 'stranger-monk'
export const DANNY_OBSERVER_NPC_ID = 'danny-observer'

type Quest3State = {
  e3FieldIntroSeen: boolean
  e3SigilFlashed: boolean
  interviewerDefeated: boolean
  preacherDefeated: boolean
  monkDefeated: boolean
  e3MassConversionSeen: boolean
  e3MoveUnlocked: boolean
  e3CutscenePlayed: boolean
  e3Complete: boolean
}

function emptyQuest3State(): Quest3State {
  return {
    e3FieldIntroSeen: false,
    e3SigilFlashed: false,
    interviewerDefeated: false,
    preacherDefeated: false,
    monkDefeated: false,
    e3MassConversionSeen: false,
    e3MoveUnlocked: false,
    e3CutscenePlayed: false,
    e3Complete: false,
  }
}

function loadQuest3FromStorage(): Quest3State {
  const base = emptyQuest3State()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<Quest3State> & { e3Seen?: boolean }
    return {
      e3FieldIntroSeen: o.e3FieldIntroSeen === true,
      e3SigilFlashed: o.e3SigilFlashed === true,
      interviewerDefeated: o.interviewerDefeated === true,
      preacherDefeated: o.preacherDefeated === true,
      monkDefeated: o.monkDefeated === true,
      e3MassConversionSeen: o.e3MassConversionSeen === true,
      e3MoveUnlocked: o.e3MoveUnlocked === true,
      e3CutscenePlayed: o.e3CutscenePlayed === true,
      e3Complete: o.e3Complete === true || o.e3Seen === true,
    }
  } catch {
    return base
  }
}

function saveQuest3ToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
}

let state: Quest3State = loadQuest3FromStorage()
let storeRevision = 0

const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

export function getQuest3Revision(): number {
  return storeRevision
}

export function subscribeQuest3Store(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getQuest3Snapshot(): Quest3State {
  return state
}

export function isE3FieldIntroSeen(): boolean {
  return state.e3FieldIntroSeen
}

export function setE3FieldIntroSeen(): void {
  if (state.e3FieldIntroSeen) return
  state = { ...state, e3FieldIntroSeen: true }
  saveQuest3ToStorage()
  emit()
}

export function isE3SigilFlashed(): boolean {
  return state.e3SigilFlashed
}

export function setE3SigilFlashed(): void {
  if (state.e3SigilFlashed) return
  state = { ...state, e3SigilFlashed: true }
  saveQuest3ToStorage()
  emit()
}

export function isInterviewerDefeated(): boolean {
  return state.interviewerDefeated
}

export function setInterviewerDefeated(): void {
  if (state.interviewerDefeated) return
  state = { ...state, interviewerDefeated: true }
  saveQuest3ToStorage()
  emit()
}

export function isPreacherDefeated(): boolean {
  return state.preacherDefeated
}

export function setPreacherDefeated(): void {
  if (state.preacherDefeated) return
  state = { ...state, preacherDefeated: true }
  saveQuest3ToStorage()
  emit()
}

export function isMonkDefeated(): boolean {
  return state.monkDefeated
}

export function setMonkDefeated(): void {
  if (state.monkDefeated) return
  state = { ...state, monkDefeated: true }
  saveQuest3ToStorage()
  emit()
}

export function isE3MassConversionSeen(): boolean {
  return state.e3MassConversionSeen
}

export function setE3MassConversionSeen(): void {
  if (state.e3MassConversionSeen) return
  state = { ...state, e3MassConversionSeen: true }
  saveQuest3ToStorage()
  emit()
}

export function isE3MoveUnlocked(): boolean {
  return state.e3MoveUnlocked
}

export function setE3MoveUnlocked(): void {
  if (state.e3MoveUnlocked) return
  state = { ...state, e3MoveUnlocked: true }
  saveQuest3ToStorage()
  emit()
}

export function isE3CutscenePlayed(): boolean {
  return state.e3CutscenePlayed
}

export function setE3CutscenePlayed(): void {
  if (state.e3CutscenePlayed) return
  state = { ...state, e3CutscenePlayed: true }
  saveQuest3ToStorage()
  emit()
}

export function isE3Complete(): boolean {
  return state.e3Complete
}

export function setE3Complete(): void {
  if (state.e3Complete) return
  state = { ...state, e3Complete: true }
  saveQuest3ToStorage()
  emit()
}

export type Quest3Serialized = {
  e3FieldIntroSeen?: boolean
  e3SigilFlashed?: boolean
  interviewerDefeated?: boolean
  preacherDefeated?: boolean
  monkDefeated?: boolean
  e3MassConversionSeen?: boolean
  e3MoveUnlocked?: boolean
  e3CutscenePlayed?: boolean
  e3Complete?: boolean
  e3Seen?: boolean
}

export function serialize(): Quest3Serialized {
  return { ...state }
}

export function applyState(data: Partial<Quest3Serialized>): void {
  state = {
    e3FieldIntroSeen: data.e3FieldIntroSeen === true,
    e3SigilFlashed: data.e3SigilFlashed === true,
    interviewerDefeated: data.interviewerDefeated === true,
    preacherDefeated: data.preacherDefeated === true,
    monkDefeated: data.monkDefeated === true,
    e3MassConversionSeen: data.e3MassConversionSeen === true,
    e3MoveUnlocked: data.e3MoveUnlocked === true,
    e3CutscenePlayed: data.e3CutscenePlayed === true,
    e3Complete: data.e3Complete === true || data.e3Seen === true,
  }
  saveQuest3ToStorage()
  emit()
}

export function resetState(): void {
  state = emptyQuest3State()
  emit()
}

export function resetQuest3ForDebug(): void {
  state = emptyQuest3State()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

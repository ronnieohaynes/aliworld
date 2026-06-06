/**
 * 5ive Quest 1 — gating NPC conversations and Mark / Subway Pass gate.
 */

const STORAGE_KEY = 'aliworld:quest1-five:v1'

export const GATING_NPC_IDS = ['npc1', 'npc2', 'npc3', 'npc4'] as const
export type GatingNpcId = (typeof GATING_NPC_IDS)[number]

export const MARK_NPC_ID = 'mark'
export const WALKER_NPC_ID = 'walker'
export const JACLYN_NPC_ID = 'jaclyn'

type Quest1State = {
  talked: Record<GatingNpcId, boolean>
  markDefeated: boolean
  walkerConverted: boolean
  jaclynConverted: boolean
  cafeSceneSeen: boolean
  e1CutscenePlayed: boolean
  battleTutorialSeen: boolean
  walkerHeavyTutorialBeatSeen: boolean
  tutorialPhase2Seen: boolean
  worldIntroSeen: boolean
  mp3PlayerOwned: boolean
  episode1TitleCardSeen: boolean
}

function emptyQuest1State(): Quest1State {
  return {
    talked: emptyTalked(),
    markDefeated: false,
    walkerConverted: false,
    jaclynConverted: false,
    cafeSceneSeen: false,
    e1CutscenePlayed: false,
    battleTutorialSeen: false,
    walkerHeavyTutorialBeatSeen: false,
    tutorialPhase2Seen: false,
    worldIntroSeen: false,
    mp3PlayerOwned: false,
    episode1TitleCardSeen: false,
  }
}

function emptyTalked(): Record<GatingNpcId, boolean> {
  return {
    npc1: false,
    npc2: false,
    npc3: false,
    npc4: false,
  }
}

function loadQuest1FromStorage(): Quest1State {
  const base = emptyQuest1State()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<
      Quest1State & { talked?: Partial<Record<GatingNpcId, boolean>> }
    >
    const talked = emptyTalked()
    for (const id of GATING_NPC_IDS) {
      if (o.talked?.[id] === true) talked[id] = true
    }
    return {
      talked,
      markDefeated: o.markDefeated === true,
      walkerConverted: o.walkerConverted === true,
      jaclynConverted: o.jaclynConverted === true,
      cafeSceneSeen: o.cafeSceneSeen === true,
      e1CutscenePlayed: o.e1CutscenePlayed === true,
      battleTutorialSeen: o.battleTutorialSeen === true,
      walkerHeavyTutorialBeatSeen: o.walkerHeavyTutorialBeatSeen === true,
      tutorialPhase2Seen: o.tutorialPhase2Seen === true,
      worldIntroSeen: o.worldIntroSeen === true,
      mp3PlayerOwned: o.mp3PlayerOwned === true,
      episode1TitleCardSeen: o.episode1TitleCardSeen === true,
    }
  } catch {
    return base
  }
}

function saveQuest1ToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
}

let state: Quest1State = loadQuest1FromStorage()
let storeRevision = 0

const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

/** Monotonic counter for useSyncExternalStore — never return mutable state as snapshot. */
export function getQuest1Revision(): number {
  return storeRevision
}

export function subscribeQuest1Store(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getQuest1Snapshot(): Quest1State {
  return state
}

export function isGatingNpcId(npcId: string): npcId is GatingNpcId {
  return (GATING_NPC_IDS as readonly string[]).includes(npcId)
}

export function hasTalkedToGatingNpc(id: GatingNpcId): boolean {
  return state.talked[id] === true
}

export function hasTalkedToAllGatingNpcs(): boolean {
  return GATING_NPC_IDS.every((id) => state.talked[id])
}

export function markGatingNpcTalked(id: GatingNpcId): void {
  if (state.talked[id]) return
  state = {
    ...state,
    talked: { ...state.talked, [id]: true },
  }
  saveQuest1ToStorage()
  emit()
}

export function isMarkDefeated(): boolean {
  return state.markDefeated
}

export function setMarkDefeated(): void {
  if (state.markDefeated) return
  state = { ...state, markDefeated: true }
  saveQuest1ToStorage()
  emit()
}

export function isWalkerConverted(): boolean {
  return state.walkerConverted
}

export function setWalkerConverted(): void {
  if (state.walkerConverted) return
  state = { ...state, walkerConverted: true }
  saveQuest1ToStorage()
  emit()
}

export function isJaclynConverted(): boolean {
  return state.jaclynConverted
}

export function setJaclynConverted(): void {
  if (state.jaclynConverted) return
  state = { ...state, jaclynConverted: true }
  saveQuest1ToStorage()
  emit()
}

export function isCafeSceneSeen(): boolean {
  return state.cafeSceneSeen
}

export function setCafeSceneSeen(): void {
  if (state.cafeSceneSeen) return
  state = { ...state, cafeSceneSeen: true }
  saveQuest1ToStorage()
  emit()
}

export function isE1CutscenePlayed(): boolean {
  return state.e1CutscenePlayed
}

export function setE1CutscenePlayed(): void {
  if (state.e1CutscenePlayed) return
  state = { ...state, e1CutscenePlayed: true }
  saveQuest1ToStorage()
  emit()
}

export function isBattleTutorialSeen(): boolean {
  return state.battleTutorialSeen
}

export function setBattleTutorialSeen(): void {
  if (state.battleTutorialSeen) return
  state = { ...state, battleTutorialSeen: true }
  saveQuest1ToStorage()
  emit()
}

export function resetBattleTutorialSeen(): void {
  state = { ...state, battleTutorialSeen: false }
  saveQuest1ToStorage()
  emit()
}

export function isWalkerHeavyTutorialBeatSeen(): boolean {
  return state.walkerHeavyTutorialBeatSeen
}

export function setWalkerHeavyTutorialBeatSeen(): void {
  if (state.walkerHeavyTutorialBeatSeen) return
  state = { ...state, walkerHeavyTutorialBeatSeen: true }
  saveQuest1ToStorage()
  emit()
}

export function isTutorialPhase2Seen(): boolean {
  return state.tutorialPhase2Seen
}

export function setTutorialPhase2Seen(): void {
  if (state.tutorialPhase2Seen) return
  state = { ...state, tutorialPhase2Seen: true }
  saveQuest1ToStorage()
  emit()
}

export function isWorldIntroSeen(): boolean {
  return state.worldIntroSeen
}

export function setWorldIntroSeen(): void {
  if (state.worldIntroSeen) return
  state = { ...state, worldIntroSeen: true }
  saveQuest1ToStorage()
  emit()
}

export function hasMp3PlayerOwned(): boolean {
  return state.mp3PlayerOwned
}

export function setMp3PlayerOwned(): void {
  if (state.mp3PlayerOwned) return
  state = { ...state, mp3PlayerOwned: true }
  saveQuest1ToStorage()
  emit()
}

export function isEpisode1TitleCardSeen(): boolean {
  return state.episode1TitleCardSeen
}

export function setEpisode1TitleCardSeen(): void {
  if (state.episode1TitleCardSeen) return
  state = { ...state, episode1TitleCardSeen: true }
  saveQuest1ToStorage()
  emit()
}

export type Quest1Serialized = {
  markDefeated: boolean
  talkedGatingNpcs: Record<GatingNpcId, boolean>
  walkerConverted?: boolean
  jaclynConverted?: boolean
  cafeSceneSeen?: boolean
  e1CutscenePlayed?: boolean
  battleTutorialSeen?: boolean
  walkerHeavyTutorialBeatSeen?: boolean
  tutorialPhase2Seen?: boolean
  worldIntroSeen?: boolean
  mp3PlayerOwned?: boolean
  episode1TitleCardSeen?: boolean
}

export function serialize(): Quest1Serialized {
  return {
    markDefeated: state.markDefeated,
    talkedGatingNpcs: { ...state.talked },
    walkerConverted: state.walkerConverted,
    jaclynConverted: state.jaclynConverted,
    cafeSceneSeen: state.cafeSceneSeen,
    e1CutscenePlayed: state.e1CutscenePlayed,
    battleTutorialSeen: state.battleTutorialSeen,
    walkerHeavyTutorialBeatSeen: state.walkerHeavyTutorialBeatSeen,
    tutorialPhase2Seen: state.tutorialPhase2Seen,
    worldIntroSeen: state.worldIntroSeen,
    mp3PlayerOwned: state.mp3PlayerOwned,
    episode1TitleCardSeen: state.episode1TitleCardSeen,
  }
}

export function applyState(data: Partial<Quest1Serialized>): void {
  const talked = emptyTalked()
  if (data.talkedGatingNpcs) {
    for (const id of GATING_NPC_IDS) {
      if (data.talkedGatingNpcs[id] === true) talked[id] = true
    }
  }
  state = {
    markDefeated: data.markDefeated === true,
    talked,
    walkerConverted: data.walkerConverted === true,
    jaclynConverted: data.jaclynConverted === true,
    cafeSceneSeen: data.cafeSceneSeen === true,
    e1CutscenePlayed: data.e1CutscenePlayed === true,
    battleTutorialSeen: data.battleTutorialSeen === true,
    walkerHeavyTutorialBeatSeen: data.walkerHeavyTutorialBeatSeen === true,
    tutorialPhase2Seen: data.tutorialPhase2Seen === true,
    worldIntroSeen: data.worldIntroSeen === true,
    mp3PlayerOwned: data.mp3PlayerOwned === true,
    episode1TitleCardSeen: data.episode1TitleCardSeen === true,
  }
  emit()
}

export function resetState(): void {
  state = emptyQuest1State()
  emit()
}

/** Clear Quest 1 progress (debug / re-test). */
export function resetQuest1ForDebug(): void {
  state = emptyQuest1State()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

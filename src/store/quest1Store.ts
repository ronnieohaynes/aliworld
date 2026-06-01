/**
 * Daly City Quest 1 — gating NPC conversations and Mark / Subway Pass gate.
 */

const STORAGE_KEY = 'aliworld:quest1-daly-city:v1'

export const GATING_NPC_IDS = ['npc1', 'npc2', 'npc3', 'npc4'] as const
export type GatingNpcId = (typeof GATING_NPC_IDS)[number]

export const MARK_NPC_ID = 'mark'

type Quest1State = {
  talked: Record<GatingNpcId, boolean>
  markDefeated: boolean
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
  const base: Quest1State = { talked: emptyTalked(), markDefeated: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<Quest1State & { talked?: Partial<Record<GatingNpcId, boolean>> }>
    const talked = emptyTalked()
    for (const id of GATING_NPC_IDS) {
      if (o.talked?.[id] === true) talked[id] = true
    }
    return {
      talked,
      markDefeated: o.markDefeated === true,
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

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
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

export type Quest1Serialized = {
  markDefeated: boolean
  talkedGatingNpcs: Record<GatingNpcId, boolean>
}

export function serialize(): Quest1Serialized {
  return {
    markDefeated: state.markDefeated,
    talkedGatingNpcs: { ...state.talked },
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
  }
  emit()
}

export function resetState(): void {
  state = { talked: emptyTalked(), markDefeated: false }
  emit()
}

/** Clear Quest 1 progress (debug / re-test). */
export function resetQuest1ForDebug(): void {
  state = { talked: emptyTalked(), markDefeated: false }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

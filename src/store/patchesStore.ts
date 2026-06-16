/**
 * Jacket Patches, rewards for completing episodes of "Midnight's Story".
 *
 * Each patch grants the player a chunk of XP in a skill of their choosing.
 * The first patch grants 100 xp, doubling with each subsequent patch
 * (100, 200, 400, 800, 1600). A skill can only receive one patch, so there
 * are at most 5 patches total (attack / speed / defense / luck / hp).
 */

import { grantPlayerSkillXp } from './playerStore'
import type { SkillId } from './skillStore'

const STORAGE_KEY = 'aliworld:patches:v1'

export const PATCH_BASE_XP = 100

const ALL_SKILL_IDS: SkillId[] = ['attack', 'speed', 'defense', 'luck', 'hp']

export type PatchRecord = {
  skill: SkillId
  xp: number
}

type PatchesState = {
  patches: PatchRecord[]
}

function emptyPatchesState(): PatchesState {
  return { patches: [] }
}

function isSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && (ALL_SKILL_IDS as string[]).includes(value)
}

function loadPatchesFromStorage(): PatchesState {
  const base = emptyPatchesState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return base
    const o = parsed as Partial<PatchesState>
    if (!Array.isArray(o.patches)) return base
    const patches: PatchRecord[] = []
    for (const entry of o.patches) {
      if (!entry || typeof entry !== 'object') continue
      const { skill, xp } = entry as Partial<PatchRecord>
      if (!isSkillId(skill) || typeof xp !== 'number') continue
      patches.push({ skill, xp })
    }
    return { patches }
  } catch {
    return base
  }
}

function savePatchesToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable
  }
}

let state: PatchesState = loadPatchesFromStorage()
let storeRevision = 0

const listeners = new Set<() => void>()

function emit(): void {
  storeRevision++
  for (const listener of listeners) {
    listener()
  }
}

/** Monotonic counter for useSyncExternalStore, never return mutable state as snapshot. */
export function getPatchesRevision(): number {
  return storeRevision
}

export function subscribePatchesStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPatchesSnapshot(): PatchesState {
  return state
}

export function getAwardedPatches(): readonly PatchRecord[] {
  return state.patches
}

export function getPatchCount(): number {
  return state.patches.length
}

/** XP the NEXT patch (not yet awarded) would grant, doubles each time, starting at 100. */
export function getNextPatchXp(): number {
  return PATCH_BASE_XP * 2 ** state.patches.length
}

/** Skills that have not yet received a patch. */
export function getAvailablePatchSkills(): SkillId[] {
  const used = new Set(state.patches.map((p) => p.skill))
  return ALL_SKILL_IDS.filter((id) => !used.has(id))
}

export function hasPatchesRemaining(): boolean {
  return state.patches.length < ALL_SKILL_IDS.length
}

/**
 * Has the patch tied to the given episode index (1-based: episode 1's patch
 * is the 1st patch, episode 2's is the 2nd, etc.) already been awarded?
 */
export function isEpisodePatchAwarded(episodeIndex: number): boolean {
  return state.patches.length >= episodeIndex
}

/** Award the next patch, granting its XP to the chosen skill. Returns null if invalid/already used. */
export function awardPatch(skill: SkillId): { xp: number; levelUpLines: string[] } | null {
  if (!isSkillId(skill)) return null
  if (state.patches.some((p) => p.skill === skill)) return null
  if (!hasPatchesRemaining()) return null

  const xp = getNextPatchXp()
  const levelUpLines = grantPlayerSkillXp(skill, xp)
  state = { ...state, patches: [...state.patches, { skill, xp }] }
  savePatchesToStorage()
  emit()
  return { xp, levelUpLines }
}

export function resetPatchesForDebug(): void {
  state = emptyPatchesState()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  emit()
}

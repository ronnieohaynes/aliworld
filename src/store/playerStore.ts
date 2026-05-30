import {
  getUnlockedMoves,
  isMoveUnlocked,
  type PlayerMoveId,
} from '../data/moves'
import type { AccessoryBonuses, ArchetypeId, ResolveResult } from './battleStore'
import {
  awardMoveXp,
  computePlayerLevel,
  createDefaultSkills,
  playerLevelUpLine,
  type SkillsState,
} from './skillStore'

export type PlayerStoreState = {
  archetype: ArchetypeId
  accessories: AccessoryBonuses[]
  skills: SkillsState
  /** Four active battle slots — move ids unlocked via skill ladders. */
  equippedMoves: readonly [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId]
  /** Overworld / between-battle HP; null = use computed max on next battle. */
  hp: number | null
  showDebug: boolean
}

let state: PlayerStoreState = {
  archetype: 'atk',
  accessories: [],
  skills: createDefaultSkills(),
  equippedMoves: ['STRIKE', 'SLIP', 'HOLD', 'WHISPER'],
  hp: null,
  showDebug: false,
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getPlayerStoreState(): PlayerStoreState {
  return state
}

export function subscribePlayerStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPlayerSkills(): SkillsState {
  return state.skills
}

export function getEquippedMoves(): PlayerStoreState['equippedMoves'] {
  return state.equippedMoves
}

/** Slots filled with unlocked moves only (preserves slot order). */
export function getActiveEquippedMoves(): PlayerMoveId[] {
  return state.equippedMoves.filter((id) => isMoveUnlocked(id, state.skills))
}

/** Moves unlocked but not in any equipped slot — equip pool for loadout UI. */
export function getUnequippedUnlockedMoves(): PlayerMoveId[] {
  const unlocked = new Set(getUnlockedMoves(state.skills))
  for (const id of state.equippedMoves) unlocked.delete(id)
  return [...unlocked]
}

export function setEquippedMove(slot: 0 | 1 | 2 | 3, moveId: PlayerMoveId): void {
  if (!isMoveUnlocked(moveId, state.skills)) return
  const slots: [PlayerMoveId, PlayerMoveId, PlayerMoveId, PlayerMoveId] = [
    state.equippedMoves[0],
    state.equippedMoves[1],
    state.equippedMoves[2],
    state.equippedMoves[3],
  ]
  slots[slot] = moveId
  state = { ...state, equippedMoves: slots }
  emit()
}

export function setPlayerSkills(skills: SkillsState): void {
  state = { ...state, skills }
  emit()
}

export function getOverworldPlayerHp(): number | null {
  return state.hp
}

export function setOverworldPlayerHp(hp: number | null): void {
  state = { ...state, hp }
  emit()
}

export function setPlayerArchetype(archetype: ArchetypeId): void {
  state = { ...state, archetype }
  emit()
}

export type CombatXpResult = {
  skillLines: string[]
  playerLevelLine: string | null
  playerLevel: number
}

/** Apply combat XP to persistent skills; returns skill + combat level-up log lines. */
export function applyCombatSkillXp(r: ResolveResult): CombatXpResult {
  const prevPlayerLevel = computePlayerLevel(state.skills)
  const { skills, levelUpLines } = awardMoveXp(state.skills, r)
  state = { ...state, skills }
  emit()
  const playerLevel = computePlayerLevel(skills)
  const playerLevelLine =
    playerLevel > prevPlayerLevel ? playerLevelUpLine(playerLevel) : null
  return {
    skillLines: levelUpLines,
    playerLevelLine,
    playerLevel,
  }
}

export function getPlayerLevel(): number {
  return computePlayerLevel(state.skills)
}

export function getShowDebug(): boolean {
  return state.showDebug
}

export function toggleShowDebug(): void {
  state = { ...state, showDebug: !state.showDebug }
  emit()
}

export { computePlayerLevel, createDefaultSkills }
export type { SkillsState, SkillId } from './skillStore'
export type { PlayerMoveId } from '../data/moves'

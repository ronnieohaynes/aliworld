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
  /** Overworld / between-battle HP; null = use computed max on next battle. */
  hp: number | null
  showDebug: boolean
}

let state: PlayerStoreState = {
  archetype: 'atk',
  accessories: [],
  skills: createDefaultSkills(),
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

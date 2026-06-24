/** Edge bundle stub — combat replay never reads live player store. */
import type { SkillsState } from '../../src/store/skillStore.ts'

const DEFAULT_SKILLS: SkillsState = {
  attack: { level: 1, xp: 0 },
  speed: { level: 1, xp: 0 },
  defense: { level: 1, xp: 0 },
  luck: { level: 1, xp: 0 },
  hp: { level: 1, xp: 0 },
}

export function getPlayerStoreState() {
  return {
    archetype: 'atk' as const,
    accessories: [],
    skills: DEFAULT_SKILLS,
    equippedMoves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'] as const,
    hp: null,
    showDebug: false,
  }
}

export function getPlayerSkills(): SkillsState {
  return DEFAULT_SKILLS
}

export function getEquippedMoves() {
  return ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'] as const
}

export function setOverworldPlayerHp(_hp: number): void {}
export function getOverworldPlayerHp(): number | null {
  return null
}

export function applyCombatSkillXp() {
  return {
    skillLevelUps: [],
    newlyUnlockedMoves: [],
    playerLevelBefore: 1,
    playerLevel: 1,
    playerLevelLine: null,
    bonusCallouts: [],
  }
}

export type SkillLevelUp = { skill: string; from: number; to: number }

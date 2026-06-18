import type { MidnightVariantId } from './midnightVariants'
import type { ArchetypeId } from '../store/battleStore'
import {
  createDefaultSkills,
  type SkillId,
  type SkillsState,
} from '../store/skillStore'

export type SeededGhostDef = {
  id: string
  handle: string
  displayName: string
  variantId: MidnightVariantId
  level: number
  archetype: ArchetypeId
  primarySkill: SkillId
  /** Full character sprite vs named build flavor. */
  isFullCharacter: boolean
}

function skillsForSeed(primary: SkillId, level: number): SkillsState {
  const skills = createDefaultSkills()
  skills[primary].level = level
  skills.hp.level = level
  const secondary = Math.max(1, level - 2)
  for (const id of ['attack', 'speed', 'defense', 'luck'] as const) {
    if (id !== primary) skills[id].level = secondary
  }
  return skills
}

/** Build payload attached to each seeded ghost at runtime. */
export function buildSeedSkills(def: SeededGhostDef): SkillsState {
  return skillsForSeed(def.primarySkill, def.level)
}

const SEED_ROWS: Omit<SeededGhostDef, 'level'>[] = [
  { id: 'seed-01', handle: 'BLOCK_KID', displayName: 'block kid', variantId: 'default', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
  { id: 'seed-02', handle: 'SLIP_GIRL', displayName: 'slip girl', variantId: 'asian-f', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-03', handle: 'WALL_UP', displayName: 'wall up', variantId: 'latino-m', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-04', handle: 'LUCKY_NUM', displayName: 'lucky num', variantId: 'white-f', archetype: 'lck', primarySkill: 'luck', isFullCharacter: false },
  { id: 'seed-05', handle: 'MIDNIGHT_J', displayName: 'midnight j', variantId: 'filipino-m', archetype: 'atk', primarySkill: 'attack', isFullCharacter: true },
  { id: 'seed-06', handle: 'RILEY_GHOST', displayName: 'riley', variantId: 'player-riley-m', archetype: 'spd', primarySkill: 'speed', isFullCharacter: true },
  { id: 'seed-07', handle: 'BLNT_RUN', displayName: 'blnt', variantId: 'player-blnt', archetype: 'def', primarySkill: 'defense', isFullCharacter: true },
  { id: 'seed-08', handle: 'RON_SHADOW', displayName: 'ron', variantId: 'player-ron', archetype: 'atk', primarySkill: 'attack', isFullCharacter: true },
  { id: 'seed-09', handle: 'STUNNA_V', displayName: 'stunna', variantId: 'player-stunna', archetype: 'lck', primarySkill: 'luck', isFullCharacter: true },
  { id: 'seed-10', handle: 'FADI_ECHO', displayName: 'fadi', variantId: 'player-fadi', archetype: 'spd', primarySkill: 'speed', isFullCharacter: true },
  { id: 'seed-11', handle: 'HAY_FIVE', displayName: 'hay five', variantId: 'default', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
  { id: 'seed-12', handle: 'BAIT_LINE', displayName: 'bait line', variantId: 'asian-f', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-13', handle: 'FEINT_K', displayName: 'feint k', variantId: 'latino-m', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-14', handle: 'WHISPER_X', displayName: 'whisper x', variantId: 'white-f', archetype: 'lck', primarySkill: 'luck', isFullCharacter: false },
  { id: 'seed-15', handle: 'LOOP_RUN', displayName: 'loop run', variantId: 'filipino-m', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-16', handle: 'BRACE_UP', displayName: 'brace up', variantId: 'default', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-17', handle: 'STRIKE_R', displayName: 'strike r', variantId: 'player-riley-m', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
  { id: 'seed-18', handle: 'CROSS_W', displayName: 'cross w', variantId: 'player-blnt', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-19', handle: 'HOLD_FIRM', displayName: 'hold firm', variantId: 'player-ron', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-20', handle: 'ODDS_ON', displayName: 'odds on', variantId: 'player-stunna', archetype: 'lck', primarySkill: 'luck', isFullCharacter: false },
  { id: 'seed-21', handle: 'PRESSURE_P', displayName: 'pressure p', variantId: 'default', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
  { id: 'seed-22', handle: 'GUARD_G', displayName: 'guard g', variantId: 'asian-f', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-23', handle: 'RUSH_H', displayName: 'rush h', variantId: 'latino-m', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-24', handle: 'CHANCE_C', displayName: 'chance c', variantId: 'white-f', archetype: 'lck', primarySkill: 'luck', isFullCharacter: false },
  { id: 'seed-25', handle: 'HEAVY_H', displayName: 'heavy h', variantId: 'filipino-m', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
  { id: 'seed-26', handle: 'SHELL_S', displayName: 'shell s', variantId: 'player-fadi', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-27', handle: 'BLITZ_B', displayName: 'blitz b', variantId: 'player-riley-m', archetype: 'spd', primarySkill: 'speed', isFullCharacter: false },
  { id: 'seed-28', handle: 'FATE_F', displayName: 'fate f', variantId: 'player-blnt', archetype: 'lck', primarySkill: 'luck', isFullCharacter: false },
  { id: 'seed-29', handle: 'IRON_I', displayName: 'iron i', variantId: 'player-ron', archetype: 'def', primarySkill: 'defense', isFullCharacter: false },
  { id: 'seed-30', handle: 'FINAL_F', displayName: 'final f', variantId: 'player-stunna', archetype: 'atk', primarySkill: 'attack', isFullCharacter: false },
]

/** Levels assigned across bands 2–30 (six per band tier). */
const SEED_LEVELS = [
  2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, 30,
]

export const SEEDED_GHOSTS: readonly SeededGhostDef[] = SEED_ROWS.map((row, i) => ({
  ...row,
  level: SEED_LEVELS[i] ?? 10,
}))

export const AUTHORED_CHAMPION_SEED_ID = 'champion-fallback'

export const AUTHORED_CHAMPION: SeededGhostDef = {
  id: AUTHORED_CHAMPION_SEED_ID,
  handle: 'THE_CHAMP',
  displayName: 'the champion',
  variantId: 'cencere-test',
  level: 32,
  archetype: 'def',
  primarySkill: 'defense',
  isFullCharacter: true,
}

export function getSeededGhost(id: string): SeededGhostDef | undefined {
  if (id === AUTHORED_CHAMPION_SEED_ID) return AUTHORED_CHAMPION
  return SEEDED_GHOSTS.find((g) => g.id === id)
}

export function seededGhostsInBand(min: number, max: number): SeededGhostDef[] {
  return SEEDED_GHOSTS.filter((g) => g.level >= min && g.level <= max)
}

export function allSeededGhostIds(): string[] {
  return SEEDED_GHOSTS.map((g) => g.id)
}

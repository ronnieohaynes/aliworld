import type { LeanSkill } from './skillCounter'
import {
  createDefaultSkills,
  getSkillStatBonuses,
  type SkillsState,
} from '../store/skillStore'
import type { CombatStats } from './npcRegistry'

/** Baseline combat body at skill level 1 before level scaling. */
const NPC_BASE_STATS = {
  hp: 20,
  atk: 4,
  def: 2,
  spd: 4,
  lck: 3,
} as const

/** Extra max HP per NPC level (on top of skill HP bonus). */
const NPC_HP_PER_LEVEL = 5

export function npcSkillsForLevel(level: number, lean: LeanSkill): SkillsState {
  const skills = createDefaultSkills()
  const primary: keyof SkillsState =
    lean === 'none' ? 'attack' : lean
  skills[primary].level = level
  skills.hp.level = level
  const secondary = Math.max(1, level - 1)
  for (const id of ['attack', 'speed', 'defense', 'luck'] as const) {
    if (id !== primary) skills[id].level = secondary
  }
  return skills
}

/** NPC effective skill levels for move unlock gating — scaled higher than
 *  raw combat level since NPCs are experienced fighters. */
const NPC_MOVE_UNLOCK_SCALE = 5

export function npcMoveUnlockSkills(level: number, lean: LeanSkill): SkillsState {
  const skills = createDefaultSkills()
  const primary: keyof SkillsState =
    lean === 'none' ? 'attack' : lean
  skills[primary].level = Math.min(65, level * NPC_MOVE_UNLOCK_SCALE)
  skills.hp.level = Math.min(65, level * NPC_MOVE_UNLOCK_SCALE)
  for (const id of ['attack', 'speed', 'defense', 'luck'] as const) {
    if (id !== primary) skills[id].level = Math.max(1, Math.min(65, (level - 1) * NPC_MOVE_UNLOCK_SCALE))
  }
  return skills
}

/** NPC atk/def/spd/hp scaled like player skill bonuses for the same level meaning. */
export function computeNpcCombatStats(
  level: number,
  lean: LeanSkill,
  hpScale = 1,
): CombatStats {
  const skills = npcSkillsForLevel(level, lean)
  const bonus = getSkillStatBonuses(skills)
  const hp = Math.max(
    1,
    Math.round((NPC_BASE_STATS.hp + (level - 1) * NPC_HP_PER_LEVEL + bonus.maxHp) * hpScale),
  )
  return {
    hp,
    maxHp: hp,
    atk: NPC_BASE_STATS.atk + bonus.atk,
    def: NPC_BASE_STATS.def + bonus.def,
    spd: NPC_BASE_STATS.spd + bonus.spd,
    lck: NPC_BASE_STATS.lck + bonus.lck,
  }
}

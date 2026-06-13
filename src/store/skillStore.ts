import {
  SKILL_HP_BONUS_PER_LEVEL,
  SKILL_STAT_BONUS_LINEAR_CAP,
  SKILL_STAT_BONUS_TAIL_FACTOR,
} from '../data/moveBalance'
import { xpGrantsForMove, type MoveXpContext } from '../data/moves'
import type { ResolveResult } from './battleStore'

export type SkillId = 'attack' | 'speed' | 'defense' | 'luck' | 'hp'

export type SkillProgress = {
  level: number
  xp: number
}

export type SkillsState = Record<SkillId, SkillProgress>

const SKILL_IDS: SkillId[] = ['attack', 'speed', 'defense', 'luck', 'hp']

export const MAX_SKILL_LEVEL = 65
export const MAX_PLAYER_LEVEL = 100

/** Total XP required to reach max skill level (level 65). */
export function maxSkillXp(): number {
  return totalXpForLevel(MAX_SKILL_LEVEL)
}

const LEVEL_UP_LINES: Record<SkillId, (level: number) => string> = {
  attack: (n) => `attack sharpens. lvl ${n}.`,
  speed: (n) => `you move quicker. speed lvl ${n}.`,
  defense: (n) => `you harden. defense lvl ${n}.`,
  luck: (n) => `the dice warm to you. luck lvl ${n}.`,
  hp: (n) => `you can take more. hp lvl ${n}.`,
}

/** Total XP required to reach level L (level 1 = 0 xp). */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round((50 * level * (level + 1)) / 2)
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (level < MAX_SKILL_LEVEL && totalXpForLevel(level + 1) <= xp) {
    level++
  }
  return level
}

export function sumSkillLevels(skills: SkillsState): number {
  return SKILL_IDS.reduce((sum, id) => sum + skills[id].level, 0)
}

/** Combat level derived from skill levels (1–100, never stored). */
export function computePlayerLevel(skills: SkillsState): number {
  const total = sumSkillLevels(skills)
  const level = 1 + Math.floor(((total - 5) * 99) / 320)
  return Math.min(MAX_PLAYER_LEVEL, Math.max(1, level))
}

export function playerLevelUpLine(level: number): string {
  return `level ${level}. the world notices.`
}

export function createDefaultSkills(): SkillsState {
  const entry = (): SkillProgress => ({ level: 1, xp: 0 })
  return {
    attack: entry(),
    speed: entry(),
    defense: entry(),
    luck: entry(),
    hp: entry(),
  }
}

export type SkillStatBonuses = {
  atk: number
  spd: number
  def: number
  lck: number
  maxHp: number
}

/** Effective bonus steps from raw skill level — sub-linear past mid levels. */
export function skillBonusSteps(level: number): number {
  const raw = Math.max(0, level - 1)
  if (raw <= SKILL_STAT_BONUS_LINEAR_CAP) return raw
  const excess = raw - SKILL_STAT_BONUS_LINEAR_CAP
  return SKILL_STAT_BONUS_LINEAR_CAP + Math.floor(excess * SKILL_STAT_BONUS_TAIL_FACTOR)
}

/** Stat bonuses from skill levels (level 1 = no bonus). */
export function getSkillStatBonuses(skills: SkillsState): SkillStatBonuses {
  return {
    atk: skillBonusSteps(skills.attack.level),
    spd: skillBonusSteps(skills.speed.level),
    def: skillBonusSteps(skills.defense.level),
    lck: skillBonusSteps(skills.luck.level),
    maxHp: (skills.hp.level - 1) * SKILL_HP_BONUS_PER_LEVEL,
  }
}

function grantSkillXp(
  skills: SkillsState,
  skill: SkillId,
  amount: number,
): { skills: SkillsState; lines: string[] } {
  const rounded = Math.round(amount)
  if (rounded <= 0) {
    return { skills, lines: [] }
  }

  const prev = skills[skill]
  if (prev.level >= MAX_SKILL_LEVEL) {
    return { skills, lines: [] }
  }

  const xpCap = maxSkillXp()
  const xp = Math.min(xpCap, prev.xp + rounded)
  const level = levelFromXp(xp)
  const lines: string[] = []

  if (level > prev.level) {
    for (let l = prev.level + 1; l <= level; l++) {
      lines.push(LEVEL_UP_LINES[skill](l))
    }
  }

  return {
    skills: { ...skills, [skill]: { xp, level } },
    lines,
  }
}

function mergeGrant(
  skills: SkillsState,
  lines: string[],
  skill: SkillId,
  amount: number,
): { skills: SkillsState; lines: string[] } {
  const result = grantSkillXp(skills, skill, amount)
  return {
    skills: result.skills,
    lines: [...lines, ...result.lines],
  }
}

function toMoveXpContext(r: ResolveResult): MoveXpContext {
  return {
    pMove: r.pMove,
    playerDmg: r.playerDmg,
    incoming: r.incoming,
    rawIncoming: r.rawIncoming,
    damageBlocked: r.damageBlocked,
    damageAvoided: r.damageAvoided,
    dodged: r.dodged,
    braced: r.braced,
    crit: r.crit,
    enemyAttacks: r.enemyAttacks,
    shakeApplied: r.shakeApplied,
    bleedApplied: r.bleedApplied,
    stunApplied: r.stunApplied,
    slowApplied: r.slowApplied,
    missApplied: r.missApplied,
    doubleApplied: r.doubleApplied,
    reflectApplied: r.reflectApplied,
    healApplied: r.healApplied,
  }
}

export function grantSkillXpAmount(
  skills: SkillsState,
  skill: SkillId,
  amount: number,
): { skills: SkillsState; lines: string[] } {
  return grantSkillXp(skills, skill, amount)
}

/** Award move-based XP from a resolved combat turn. */
export function awardMoveXp(
  skills: SkillsState,
  r: ResolveResult,
  scaleAmount: (amount: number) => number = (n) => n,
): {
  skills: SkillsState
  levelUpLines: string[]
} {
  let next = skills
  let lines: string[] = []

  const xpCtx = toMoveXpContext(r)
  for (const grant of xpGrantsForMove(xpCtx)) {
    const amount = scaleAmount(grant.amount)
    ;({ skills: next, lines } = mergeGrant(next, lines, grant.skill, amount))
  }

  return { skills: next, levelUpLines: lines }
}

export { isMoveUnlocked } from '../data/moves'

export function getSkillLabels(): ReadonlyArray<{ id: SkillId; label: string }> {
  return SKILL_IDS.map((id) => ({
    id,
    label: id === 'hp' ? 'hp' : id,
  }))
}

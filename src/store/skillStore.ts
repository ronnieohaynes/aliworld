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

/** Stat bonuses from skill levels (level 1 = no bonus). */
export function getSkillStatBonuses(skills: SkillsState): SkillStatBonuses {
  return {
    atk: Math.max(0, skills.attack.level - 1),
    spd: Math.max(0, skills.speed.level - 1),
    def: Math.max(0, skills.defense.level - 1),
    lck: Math.max(0, skills.luck.level - 1),
    maxHp: Math.max(0, skills.hp.level - 1) * 2,
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

/** Award move-based XP from a resolved combat turn. */
export function awardMoveXp(skills: SkillsState, r: ResolveResult): {
  skills: SkillsState
  levelUpLines: string[]
} {
  let next = skills
  let lines: string[] = []

  switch (r.pMove) {
    case 'STRIKE': {
      const dealt = r.playerDmg
      ;({ skills: next, lines } = mergeGrant(next, lines, 'attack', dealt * 4))
      ;({ skills: next, lines } = mergeGrant(next, lines, 'hp', dealt * 1.3))
      break
    }
    case 'SLIP': {
      const speedXp = r.dodged ? 10 : 5
      const luckXp = r.dodged && r.playerDmg > 0 ? 10 : 5
      ;({ skills: next, lines } = mergeGrant(next, lines, 'speed', speedXp))
      ;({ skills: next, lines } = mergeGrant(next, lines, 'luck', luckXp))
      ;({ skills: next, lines } = mergeGrant(next, lines, 'hp', 3))
      break
    }
    case 'HOLD': {
      const defenseXp =
        r.enemyAttacks && r.incoming > 0 ? r.incoming * 4 : 3
      ;({ skills: next, lines } = mergeGrant(next, lines, 'defense', defenseXp))
      ;({ skills: next, lines } = mergeGrant(next, lines, 'hp', 3))
      break
    }
    case 'WHISPER': {
      ;({ skills: next, lines } = mergeGrant(next, lines, 'luck', 4))
      ;({ skills: next, lines } = mergeGrant(next, lines, 'hp', 2))
      break
    }
  }

  return { skills: next, levelUpLines: lines }
}

export function getSkillLabels(): ReadonlyArray<{ id: SkillId; label: string }> {
  return SKILL_IDS.map((id) => ({
    id,
    label: id === 'hp' ? 'hp' : id,
  }))
}

import { getPlayerSkills } from '../store/playerStore'
import type { SkillsState } from '../store/skillStore'

export type BuildName = {
  name: string
  color: string
}

type CombatSkill = 'attack' | 'speed' | 'defense' | 'luck'

const BALANCED: BuildName = {
  name: 'blank slate',
  color: '#f4e8c1',
}

/** Top skill must lead second by at least this much for a pure build. */
const PURE_THRESHOLD = 4

/** Second skill must lead third by at least this much for a combo build. */
const COMBO_THRESHOLD = 3

const SKILL_COLORS: Record<CombatSkill, string> = {
  attack: '#cc4444',
  speed: '#44cc66',
  defense: '#4488cc',
  luck: '#c084fc',
}

const PURE_NAMES: Record<CombatSkill, string> = {
  attack: 'glass cannon',
  defense: 'immovable wall',
  speed: 'speed demon',
  luck: 'wildcard',
}

const COMBO_NAMES: Record<string, string> = {
  'attack+speed': 'assassin',
  'attack+defense': 'bruiser',
  'attack+luck': 'crashout',
  'defense+speed': 'untouchable',
  'luck+speed': 'gambit',
  'defense+luck': 'fortress',
}

function pairKey(a: CombatSkill, b: CombatSkill): string {
  return [a, b].sort().join('+')
}

/** Derive build identity from combat skill levels (attack/speed/defense/luck). */
export function deriveBuildName(skills: SkillsState): BuildName {
  const ranked: { skill: CombatSkill; level: number }[] = (
    [
      { skill: 'attack' as const, level: skills.attack.level },
      { skill: 'speed' as const, level: skills.speed.level },
      { skill: 'defense' as const, level: skills.defense.level },
      { skill: 'luck' as const, level: skills.luck.level },
    ] satisfies { skill: CombatSkill; level: number }[]
  ).sort((a, b) => b.level - a.level)

  const top = ranked[0]!
  const second = ranked[1]!
  const third = ranked[2]!

  if (top.level - second.level >= PURE_THRESHOLD) {
    return {
      name: PURE_NAMES[top.skill],
      color: SKILL_COLORS[top.skill],
    }
  }

  if (second.level - third.level >= COMBO_THRESHOLD) {
    return {
      name: COMBO_NAMES[pairKey(top.skill, second.skill)] ?? BALANCED.name,
      color: SKILL_COLORS[top.skill],
    }
  }

  return BALANCED
}

export function getBuildName(): BuildName {
  return deriveBuildName(getPlayerSkills())
}

/** Server-side build name derivation, keep aligned with src/data/buildName.ts */

export type SkillProgress = { level: number; xp: number }
export type SkillsState = Record<'attack' | 'speed' | 'defense' | 'luck' | 'hp', SkillProgress>

export type BuildName = { name: string; color: string }

type CombatSkill = 'attack' | 'speed' | 'defense' | 'luck'

export type BuildLoopSkill = CombatSkill

const BALANCED: BuildName = { name: 'blank slate', color: '#f4e8c1' }
const PURE_THRESHOLD = 2
const COMBO_THRESHOLD = 3
const LOW_SKILL_GAP = 5
const FINAL_FORM_MIN = 40
const EQUILIBRIUM_SPREAD_MAX = 4

const SKILL_COLORS: Record<CombatSkill, string> = {
  attack: '#cc4444',
  speed: '#44cc66',
  defense: '#4488cc',
  luck: '#c084fc',
}

const PURE_NAMES: Record<CombatSkill, string> = {
  attack: 'heavy hands',
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

const LOW_STAT_BUILDS: Record<string, BuildName> = {
  'attack+defense': { name: 'glass cannon', color: '#cc4444' },
  'defense+attack': { name: 'deadbolt', color: '#4488cc' },
  'speed+defense': { name: 'paper ghost', color: '#44cc66' },
  luck: { name: 'longshot', color: '#c084fc' },
}

function pairKey(a: CombatSkill, b: CombatSkill): string {
  return [a, b].sort().join('+')
}

function rankedCombatSkills(skills: SkillsState): { skill: CombatSkill; level: number }[] {
  return (
    [
      { skill: 'attack' as const, level: skills.attack.level },
      { skill: 'speed' as const, level: skills.speed.level },
      { skill: 'defense' as const, level: skills.defense.level },
      { skill: 'luck' as const, level: skills.luck.level },
    ] satisfies { skill: CombatSkill; level: number }[]
  ).sort((a, b) => b.level - a.level)
}

function avgOtherLevels(skills: SkillsState, skill: CombatSkill): number {
  const others = rankedCombatSkills(skills).filter((s) => s.skill !== skill)
  return others.reduce((sum, s) => sum + s.level, 0) / others.length
}

function isLowSkill(skills: SkillsState, skill: CombatSkill): boolean {
  return skills[skill].level <= avgOtherLevels(skills, skill) - LOW_SKILL_GAP
}

function allFinalForm(skills: SkillsState): boolean {
  return (
    skills.attack.level >= FINAL_FORM_MIN &&
    skills.speed.level >= FINAL_FORM_MIN &&
    skills.defense.level >= FINAL_FORM_MIN &&
    skills.luck.level >= FINAL_FORM_MIN
  )
}

function isEquilibrium(skills: SkillsState): boolean {
  const levels = rankedCombatSkills(skills).map((s) => s.level)
  const spread = levels[0]! - levels[levels.length - 1]!
  const minLevel = levels[levels.length - 1]!
  return minLevel >= FINAL_FORM_MIN && spread <= EQUILIBRIUM_SPREAD_MAX
}

function deriveLowStatBuild(skills: SkillsState): BuildName | null {
  const ranked = rankedCombatSkills(skills)
  const top = ranked[0]!
  const second = ranked[1]!

  if (top.level - second.level < PURE_THRESHOLD) return null

  if (top.skill === 'attack') {
    if (isLowSkill(skills, 'defense')) return LOW_STAT_BUILDS['attack+defense']!
    return null
  }
  if (top.skill === 'defense' && isLowSkill(skills, 'attack')) return LOW_STAT_BUILDS['defense+attack']!
  if (top.skill === 'speed' && isLowSkill(skills, 'defense')) return LOW_STAT_BUILDS['speed+defense']!
  if (top.skill === 'luck') {
    const othersLow =
      isLowSkill(skills, 'attack') || isLowSkill(skills, 'defense') || isLowSkill(skills, 'speed')
    if (othersLow) return LOW_STAT_BUILDS.luck!
  }
  return null
}

export function deriveBuildName(skills: SkillsState): BuildName {
  if (allFinalForm(skills)) {
    if (isEquilibrium(skills)) return { name: 'equilibrium', color: '#f4e8c1' }
    return { name: 'final form', color: '#d4b87a' }
  }

  const lowStat = deriveLowStatBuild(skills)
  if (lowStat) return lowStat

  const ranked = rankedCombatSkills(skills)
  const top = ranked[0]!
  const second = ranked[1]!
  const third = ranked[2]!

  if (top.level - second.level >= PURE_THRESHOLD) {
    return { name: PURE_NAMES[top.skill], color: SKILL_COLORS[top.skill] }
  }

  if (second.level - third.level >= COMBO_THRESHOLD) {
    return {
      name: COMBO_NAMES[pairKey(top.skill, second.skill)] ?? BALANCED.name,
      color: SKILL_COLORS[top.skill],
    }
  }

  return BALANCED
}

/** Dominant skill for matchup counters; null when still blank slate. Keep aligned with src/data/buildName.ts */
export function deriveBuildLoopType(skills: SkillsState): BuildLoopSkill | null {
  const ranked = rankedCombatSkills(skills)
  const top = ranked[0]!
  const second = ranked[1]!
  const third = ranked[2]!

  if (top.level - second.level >= PURE_THRESHOLD) {
    return top.skill
  }

  if (second.level - third.level >= COMBO_THRESHOLD) {
    return top.skill
  }

  return null
}

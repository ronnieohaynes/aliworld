/** Edge-safe harvest helpers (mirrors client skill/build logic). */

type SkillProgress = { level: number; xp: number }
export type EdgeSkillsState = Record<'attack' | 'speed' | 'defense' | 'luck' | 'hp', SkillProgress>

const PURE_THRESHOLD = 3
const COMBO_THRESHOLD = 2

export type BuildLoopSkill = 'attack' | 'speed' | 'defense' | 'luck'

function rankedCombatSkills(skills: EdgeSkillsState): { skill: BuildLoopSkill; level: number }[] {
  const rows: { skill: BuildLoopSkill; level: number }[] = [
    { skill: 'attack', level: skills.attack.level },
    { skill: 'speed', level: skills.speed.level },
    { skill: 'defense', level: skills.defense.level },
    { skill: 'luck', level: skills.luck.level },
  ]
  rows.sort((a, b) => b.level - a.level)
  return rows
}

export function deriveBuildLoopType(skills: EdgeSkillsState): BuildLoopSkill | null {
  const ranked = rankedCombatSkills(skills)
  const top = ranked[0]!
  const second = ranked[1]!
  const third = ranked[2]!
  if (top.level - second.level >= PURE_THRESHOLD) return top.skill
  if (second.level - third.level >= COMBO_THRESHOLD) return top.skill
  return null
}

export function dominantCombatSkill(skills: EdgeSkillsState): BuildLoopSkill {
  return rankedCombatSkills(skills)[0]!.skill
}

export function computePlayerLevel(skills: EdgeSkillsState): number {
  const ids = ['attack', 'speed', 'defense', 'luck', 'hp'] as const
  const total = ids.reduce((sum, id) => sum + skills[id].level, 0)
  const level = 1 + Math.floor(((total - 5) * 99) / 320)
  return Math.min(100, Math.max(1, level))
}

export function defaultSkills(): EdgeSkillsState {
  const entry = (): SkillProgress => ({ level: 1, xp: 0 })
  return {
    attack: entry(),
    speed: entry(),
    defense: entry(),
    luck: entry(),
    hp: entry(),
  }
}

export function normalizeSkills(raw: unknown): EdgeSkillsState {
  const base = defaultSkills()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  for (const id of ['attack', 'speed', 'defense', 'luck', 'hp'] as const) {
    const val = o[id]
    if (val && typeof val === 'object') {
      const p = val as Partial<SkillProgress>
      base[id] = {
        level: typeof p.level === 'number' && p.level >= 1 ? Math.min(65, Math.floor(p.level)) : 1,
        xp: typeof p.xp === 'number' && p.xp >= 0 ? Math.floor(p.xp) : 0,
      }
    }
  }
  return base
}

export function skillsForSeed(primary: string, level: number): EdgeSkillsState {
  const skills = defaultSkills()
  const ids = ['attack', 'speed', 'defense', 'luck', 'hp'] as const
  const primaryKey = ids.includes(primary as (typeof ids)[number])
    ? (primary as (typeof ids)[number])
    : 'attack'
  skills[primaryKey].level = level
  skills.hp.level = level
  const secondary = Math.max(1, level - 2)
  for (const id of ['attack', 'speed', 'defense', 'luck'] as const) {
    if (id !== primaryKey) skills[id].level = secondary
  }
  return skills
}

export function buildNameFromSkills(skills: EdgeSkillsState): string {
  const type = deriveBuildLoopType(skills)
  if (!type) return 'blank slate'
  return `${type} build`
}

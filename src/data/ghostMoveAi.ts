import { deriveBuildLoopType, type BuildLoopSkill } from './buildName'
import type { PlayerMoveId } from './moveIds'
import { leanThemedMoves } from './ghostArchetypeMoves'
import type { LeanSkill } from './skillCounter'
import { getCombatRng } from './combatRng'

export type GhostMovePickOptions = {
  enemyHpRatio: number
  lastMove?: PlayerMoveId | null
  leanSkill: LeanSkill
}

/**
 * Competent build-flavored move picker for ghosts (and future gym AI).
 * HP heuristics (restocker-style), avoid immediate repeats, lean theme bias.
 */
export function chooseGhostMove(
  moves: readonly PlayerMoveId[],
  options: GhostMovePickOptions,
): PlayerMoveId {
  if (moves.length === 0) return 'STRIKE'
  if (moves.length === 1) return moves[0]!

  const { enemyHpRatio, lastMove, leanSkill } = options
  const pool = lastMove ? moves.filter((m) => m !== lastMove) : [...moves]
  const candidates = pool.length > 0 ? pool : [...moves]

  const lean = leanSkill === 'none' ? null : (leanSkill as BuildLoopSkill)
  const themed = lean ? leanThemedMoves(lean) : leanThemedMoves('none')

  // Defense-lean: ANCHOR bias when hurt (mirrors restocker heuristics).
  if (lean === 'defense' && candidates.includes('ANCHOR')) {
    const holdChance = enemyHpRatio < 0.35 ? 0.72 : enemyHpRatio < 0.6 ? 0.52 : 0.32
    if (getCombatRng().next() < holdChance) return 'ANCHOR'
  }

  // Attack-lean: pressure when ahead.
  if (lean === 'attack' && enemyHpRatio > 0.65) {
    const pressure = candidates.filter((m) => m === 'STRIKE' || m === 'CANNON' || m === 'FURY_SWEEP' || m === 'LOOP')
    if (pressure.length > 0 && getCombatRng().next() < 0.62) {
      return pressure[getCombatRng().nextInt(0, pressure.length - 1)]!
    }
  }

  // Lean theme bias (~45% when themed moves exist in pool).
  const themedInPool = candidates.filter((m) => themed.includes(m))
  if (themedInPool.length > 0 && getCombatRng().next() < 0.45) {
    return themedInPool[getCombatRng().nextInt(0, themedInPool.length - 1)]!
  }

  return candidates[getCombatRng().nextInt(0, candidates.length - 1)]!
}

/** Dominant combat skill when build type is blank-slate. */
export function dominantCombatSkillFromLevels(
  skills: Record<'attack' | 'speed' | 'defense' | 'luck', { level: number }>,
): BuildLoopSkill {
  const ranked: { skill: BuildLoopSkill; level: number }[] = [
    { skill: 'attack', level: skills.attack.level },
    { skill: 'speed', level: skills.speed.level },
    { skill: 'defense', level: skills.defense.level },
    { skill: 'luck', level: skills.luck.level },
  ]
  ranked.sort((a, b) => b.level - a.level)
  return ranked[0]!.skill
}

export function leanSkillFromSnapshot(
  buildType: BuildLoopSkill | null,
  skills: Record<'attack' | 'speed' | 'defense' | 'luck', { level: number }>,
): LeanSkill {
  if (buildType) return buildType
  return dominantCombatSkillFromLevels(skills)
}

/** Re-export for AI modules that need build typing from skills alone. */
export { deriveBuildLoopType }

/**
 * Skill XP curve, single tunable source for per-skill level costs (levels 1–65).
 * Reshape the curve here only; never touch combat formulas or move unlock levels.
 *
 * Move ladder unlocks are level-gated (10 / 22 / 38 / 52 / 65), this file only
 * controls how much XP each skill level costs, not when moves unlock.
 */

/** XP to advance FROM level `n` TO level `n + 1` (n = 1 … maxLevel − 1). */
export type SkillXpCurveBands = {
  /** Levels 1–5: small, fast (session-one onboarding). */
  onboarding: { throughFromLevel: number; start: number; step: number }
  /** Levels 6–10: still quick, last easy band before the wall. */
  warmup: { throughFromLevel: number; start: number; step: number }
  /** Levels 11–20: steep ramp (curve gets tremendously harder after 10). */
  ramp: { throughFromLevel: number; start: number; step: number }
  /** Levels 21–40: sustained grind toward mid-ladder unlocks. */
  grind: { throughFromLevel: number; start: number; step: number }
  /** Levels 41–max: long summit climb to cap / final rung. */
  summit: { start: number; step: number }
}

/** Edit band constants to reshape the full curve. */
export const SKILL_XP_CURVE_BANDS: SkillXpCurveBands = {
  onboarding: { throughFromLevel: 5, start: 50, step: 18 },
  warmup: { throughFromLevel: 10, start: 150, step: 28 },
  ramp: { throughFromLevel: 20, start: 380, step: 95 },
  grind: { throughFromLevel: 40, start: 1450, step: 185 },
  summit: { start: 5500, step: 420 },
}

function rawCostForAdvance(fromLevel: number): number {
  const { onboarding, warmup, ramp, grind, summit } = SKILL_XP_CURVE_BANDS
  if (fromLevel <= onboarding.throughFromLevel) {
    return onboarding.start + (fromLevel - 1) * onboarding.step
  }
  if (fromLevel <= warmup.throughFromLevel) {
    const offset = fromLevel - onboarding.throughFromLevel - 1
    return warmup.start + offset * warmup.step
  }
  if (fromLevel <= ramp.throughFromLevel) {
    const offset = fromLevel - warmup.throughFromLevel - 1
    return ramp.start + offset * ramp.step
  }
  if (fromLevel <= grind.throughFromLevel) {
    const offset = fromLevel - ramp.throughFromLevel - 1
    return grind.start + offset * grind.step
  }
  const offset = fromLevel - grind.throughFromLevel - 1
  return summit.start + offset * summit.step
}

function buildLevelUpCosts(maxLevel: number): readonly number[] {
  const costs: number[] = []
  for (let from = 1; from < maxLevel; from++) {
    costs.push(rawCostForAdvance(from))
  }
  for (let i = 1; i < costs.length; i++) {
    if (costs[i] <= costs[i - 1]) {
      costs[i] = costs[i - 1] + 1
    }
  }
  return costs
}

/** XP to advance from skill level `n` to `n + 1` (n ∈ 1 … maxLevel − 1). */
export function buildXpCurve(maxLevel: number): {
  xpForSkillLevel: (n: number) => number
  /** @deprecated Use xpForSkillLevel */
  xpForLevel: (n: number) => number
  cumulativeXpForLevel: (n: number) => number
  maxSkillXp: number
  levelUpCosts: readonly number[]
} {
  const levelUpCosts = buildLevelUpCosts(maxLevel)
  const cumulative: number[] = [0]
  for (const cost of levelUpCosts) {
    cumulative.push(cumulative[cumulative.length - 1]! + cost)
  }

  const xpForSkillLevel = (n: number): number => {
    if (!Number.isFinite(n) || n < 1 || n >= maxLevel) return 0
    return levelUpCosts[n - 1] ?? 0
  }

  return {
    levelUpCosts,
    maxSkillXp: cumulative[cumulative.length - 1] ?? 0,
    xpForSkillLevel,
    xpForLevel: xpForSkillLevel,
    cumulativeXpForLevel(n: number) {
      if (!Number.isFinite(n) || n <= 1) return 0
      const clamped = Math.min(maxLevel, Math.max(1, Math.floor(n)))
      return cumulative[clamped - 1] ?? 0
    },
  }
}

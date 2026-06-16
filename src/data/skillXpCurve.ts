/**
 * Skill XP curve v2 — single tunable source for per-level costs (levels 1–65).
 * Reshape the curve here only; never touch combat.
 */

/** XP to advance FROM level `n` TO level `n + 1` (n = 1 … maxLevel − 1). */
export type SkillXpCurveBands = {
  /** Levels 1–5: small, fast (session-one onboarding). */
  onboarding: { throughFromLevel: number; start: number; step: number }
  /** Levels 6–15: noticeably ramping. */
  early: { throughFromLevel: number; start: number; step: number }
  /** Levels 16–40: steady grind. */
  mid: { throughFromLevel: number; start: number; step: number }
  /** Levels 41–max: long climb toward cap. */
  late: { start: number; step: number }
}

/** Edit band constants to reshape the full curve. */
export const SKILL_XP_CURVE_BANDS: SkillXpCurveBands = {
  onboarding: { throughFromLevel: 5, start: 80, step: 20 },
  early: { throughFromLevel: 15, start: 185, step: 25 },
  mid: { throughFromLevel: 40, start: 430, step: 20 },
  late: { start: 950, step: 40 },
}

function rawCostForAdvance(fromLevel: number): number {
  const { onboarding, early, mid, late } = SKILL_XP_CURVE_BANDS
  if (fromLevel <= onboarding.throughFromLevel) {
    return onboarding.start + (fromLevel - 1) * onboarding.step
  }
  if (fromLevel <= early.throughFromLevel) {
    const offset = fromLevel - onboarding.throughFromLevel - 1
    return early.start + offset * early.step
  }
  if (fromLevel <= mid.throughFromLevel) {
    const offset = fromLevel - early.throughFromLevel - 1
    return mid.start + offset * mid.step
  }
  const offset = fromLevel - mid.throughFromLevel - 1
  return late.start + offset * late.step
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

/** XP to advance from level `n` to `n + 1` (n ∈ 1 … maxLevel − 1). */
export function buildXpCurve(maxLevel: number): {
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

  return {
    levelUpCosts,
    maxSkillXp: cumulative[cumulative.length - 1] ?? 0,
    xpForLevel(n: number) {
      if (!Number.isFinite(n) || n < 1 || n >= maxLevel) return 0
      return levelUpCosts[n - 1] ?? 0
    },
    cumulativeXpForLevel(n: number) {
      if (!Number.isFinite(n) || n <= 1) return 0
      const clamped = Math.min(maxLevel, Math.max(1, Math.floor(n)))
      return cumulative[clamped - 1] ?? 0
    },
  }
}

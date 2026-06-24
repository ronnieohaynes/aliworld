/** Practice / retired-gym combat XP daily limits (aligned with ghost day epoch). */

import { currentGhostDayKey } from './ghostDailyReset'

export { currentGhostDayKey as currentPracticeDayKey }

/** Full-rate practice combat XP per day before diminishing returns. */
export const PRACTICE_COMBAT_XP_DAILY_CAP = 360

/** After the cap, practice still pays at this rate until soft overflow is exhausted. */
export const PRACTICE_COMBAT_XP_DIMINISHED_MULT = 0.12

/** Extra practice XP band at diminished rate (then zero for the rest of the day). */
export const PRACTICE_COMBAT_XP_SOFT_OVERFLOW = 72

export type PracticeXpBudget = {
  dayKey: string
  xpToday: number
  dailyCap: number
  diminishedMult: number
  softOverflow: number
}

export function practiceXpBudgetFromServer(
  xpToday: number,
  dayKey = currentGhostDayKey(),
): PracticeXpBudget {
  return {
    dayKey,
    xpToday: Math.max(0, Math.floor(xpToday)),
    dailyCap: PRACTICE_COMBAT_XP_DAILY_CAP,
    diminishedMult: PRACTICE_COMBAT_XP_DIMINISHED_MULT,
    softOverflow: PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
  }
}

/** Effective multiplier for the next `rawXp` grant given today's tally + session tally. */
export function practiceCombatXpMultiplier(
  budget: PracticeXpBudget,
  sessionEarnedSoFar: number,
  rawXp: number,
): number {
  if (rawXp <= 0) return 0
  const tally = budget.xpToday + sessionEarnedSoFar
  const hardStop = budget.dailyCap + budget.softOverflow
  if (tally >= hardStop) return 0
  if (tally >= budget.dailyCap) return budget.diminishedMult
  const headroom = budget.dailyCap - tally
  if (rawXp <= headroom) return 1
  const fullPart = headroom
  const dimPart = rawXp - headroom
  const dimCap = hardStop - budget.dailyCap
  const dimUsed = Math.max(0, tally + headroom - budget.dailyCap)
  const dimHeadroom = Math.max(0, dimCap - dimUsed)
  const dimGrant = Math.min(dimPart, dimHeadroom)
  const effective = fullPart + dimGrant * budget.diminishedMult
  return effective / rawXp
}

export function practiceXpStatusLabel(budget: PracticeXpBudget): string {
  if (budget.xpToday >= budget.dailyCap + budget.softOverflow) {
    return 'practice xp capped for today'
  }
  if (budget.xpToday >= budget.dailyCap) {
    return 'practice xp diminished — almost capped for today'
  }
  const left = budget.dailyCap - budget.xpToday
  return `practice xp ${left} left at full rate today`
}

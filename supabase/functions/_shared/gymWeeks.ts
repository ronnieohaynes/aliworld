/**
 * Minimal gym week lineup mirror for edge functions.
 * Keep leader combat ids in sync with src/data/gymWeeks.ts GYM_WEEKS.
 */

import { getAbsoluteWeekIndex } from './gymWeekSchedule.ts'

export type GymWeekScoringMode = 'one-and-done' | 'clear-count'

export type GymWeekEdgeMeta = {
  id: string
  leaderCombatId: string
  scoringMode: GymWeekScoringMode
}

/** Ordered weekly lineups — append new weeks here. */
export const GYM_WEEKS_EDGE: readonly GymWeekEdgeMeta[] = [
  { id: '1', leaderCombatId: '5ive-gym1', scoringMode: 'one-and-done' },
  { id: '2', leaderCombatId: 'gym-week-2-leader', scoringMode: 'clear-count' },
] as const

export function getCurrentGymWeekEdge(nowMs = Date.now()): GymWeekEdgeMeta {
  const abs = getAbsoluteWeekIndex(nowMs)
  return GYM_WEEKS_EDGE[abs % GYM_WEEKS_EDGE.length]!
}

export function getGymWeekEdgeById(weekId: string): GymWeekEdgeMeta | undefined {
  return GYM_WEEKS_EDGE.find((w) => w.id === weekId)
}

/** Keep in sync with src/data/gymWeeks.ts gauntlet combat ids. */
export const GYM_GAUNTLET_COMBAT_IDS = [
  '5ive-gym1',
  'gym-week-1-h1',
  'gym-week-1-h2',
  'gym-week-1-h3',
  'gym-week-2-leader',
  'gym-week-2-h1',
  'gym-week-2-h2',
] as const

export function isGymGauntletCombatId(combatId: string): boolean {
  return (GYM_GAUNTLET_COMBAT_IDS as readonly string[]).includes(combatId)
}

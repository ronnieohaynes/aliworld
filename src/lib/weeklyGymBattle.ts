import { getGymRunCombatId, getGymWeekById, isGymGauntletCombatId } from '../data/gymWeeks'
import {
  beginGymRun,
  clearActiveGymRun,
  getActiveGymRun,
  getActiveGymRunCombatId,
  restartGymRun,
} from '../store/gymStore'

export type GymBattleOptions = {
  combatXpPolicy: 'normal' | 'none' | 'fixed-level'
  battleEndHealing: 'default' | 'full-on-win'
}

export function resolveGymBattleOptions(npcId: string): GymBattleOptions {
  if (!isGymGauntletCombatId(npcId)) {
    return { combatXpPolicy: 'normal', battleEndHealing: 'default' }
  }

  const run = getActiveGymRun()
  if (!run) {
    return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win' }
  }

  if (run.practice) {
    return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win' }
  }

  if (run.fightIndex >= 3) {
    return { combatXpPolicy: 'fixed-level', battleEndHealing: 'default' }
  }

  return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win' }
}

export function startWeeklyGymRun(weekId: string, practice: boolean): string | null {
  const week = getGymWeekById(weekId)
  if (!week) return null

  if (practice) {
    clearActiveGymRun()
    const run = beginGymRun(weekId, true)
    if (!run) return null
    return getGymRunCombatId(week, 0)
  }

  const existing = getActiveGymRun()
  if (existing && !existing.practice && existing.weekId === weekId) {
    return getActiveGymRunCombatId()
  }

  const run = beginGymRun(weekId, false)
  if (!run) return null
  return getActiveGymRunCombatId()
}

export function restartWeeklyGymRun(): string | null {
  restartGymRun()
  return getActiveGymRunCombatId()
}

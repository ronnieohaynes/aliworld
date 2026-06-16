import { isGymGauntletCombatId } from '../data/gymWeeks'
import {
  beginGymRun,
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
  if (practice) {
    beginGymRun(weekId, true)
  } else {
    const existing = getActiveGymRun()
    if (existing && !existing.practice && existing.weekId === weekId) {
      return getActiveGymRunCombatId()
    }
    beginGymRun(weekId, false)
  }
  return getActiveGymRunCombatId()
}

export function restartWeeklyGymRun(): string | null {
  restartGymRun()
  return getActiveGymRunCombatId()
}

import {
  getGymLeaderFightIndex,
  getGymRunCombatId,
  getGymWeekById,
  isGymGauntletCombatId,
} from '../data/gymWeeks'
import {
  beginGymRun,
  clearActiveGymRun,
  getActiveGymRun,
  getActiveGymRunCombatId,
  invalidateStaleGymRun,
  isCurrentWeeklyGymCleared,
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

  const week = getGymWeekById(run.weekId)
  if (!week) {
    return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win' }
  }

  const firstGauntletRunOfWeek = !isCurrentWeeklyGymCleared()
  const leaderIndex = getGymLeaderFightIndex(week)
  const onLeader = run.fightIndex >= leaderIndex

  if (firstGauntletRunOfWeek) {
    return {
      combatXpPolicy: 'fixed-level',
      battleEndHealing: onLeader ? 'default' : 'full-on-win',
    }
  }

  if (onLeader) {
    return { combatXpPolicy: 'none', battleEndHealing: 'default' }
  }

  return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win' }
}

export function startWeeklyGymRun(weekId: string, practice: boolean): string | null {
  invalidateStaleGymRun()
  const week = getGymWeekById(weekId)
  if (!week) return null

  if (practice) {
    clearActiveGymRun()
    const run = beginGymRun(weekId, true)
    if (!run) return null
    return getGymRunCombatId(week, 0)
  }

  clearActiveGymRun()
  const run = beginGymRun(weekId, false)
  if (!run) return null
  return getGymRunCombatId(week, 0)
}

export function restartWeeklyGymRun(): string | null {
  restartGymRun()
  return getActiveGymRunCombatId()
}

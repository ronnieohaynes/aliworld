import { isGhostCombatId } from '../data/ghostCombat'
import { getPendingGhostBattle } from '../store/ghostTrainingStore'

export type GhostBattleOptions = {
  combatXpPolicy: 'normal' | 'none' | 'fixed-level'
  battleEndHealing: 'default' | 'full-on-win'
  isolateNpcMemory: false
}

/** Independent daily sparring — full prize gets normal combat XP; grind rebattles are passive-only. */
export function resolveGhostBattleOptions(npcId: string): GhostBattleOptions | null {
  if (!isGhostCombatId(npcId)) return null
  const pending = getPendingGhostBattle()
  if (pending?.fightTier === 'grind') {
    return { combatXpPolicy: 'none', battleEndHealing: 'full-on-win', isolateNpcMemory: false }
  }
  return { combatXpPolicy: 'normal', battleEndHealing: 'full-on-win', isolateNpcMemory: false }
}

export { isGhostCombatId }

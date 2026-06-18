import { isGhostCombatId } from '../data/ghostCombat'

export type GhostBattleOptions = {
  combatXpPolicy: 'normal' | 'none' | 'fixed-level'
  battleEndHealing: 'default' | 'full-on-win'
}

/** Independent daily sparring — normal XP, full heal on win between fights. */
export function resolveGhostBattleOptions(npcId: string): GhostBattleOptions | null {
  if (!isGhostCombatId(npcId)) return null
  return { combatXpPolicy: 'normal', battleEndHealing: 'full-on-win' }
}

export { isGhostCombatId }

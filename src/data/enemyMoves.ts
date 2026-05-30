import type { StatusApplySpec } from './combatTypes'

/** Enemy move ids — shared pool for all NPCs (snag steals from this set). */
export const ENEMY_MOVE_IDS = ['STRIKE', 'LOOP', 'SLIP', 'WHISPER', 'HOLD'] as const
export type EnemyMoveId = (typeof ENEMY_MOVE_IDS)[number]

export type UpcomingMove = EnemyMoveId | 'STUNNED'

/**
 * Same conceptual shape as player MoveDefinition — side, telegraph, damage, statuses.
 * Enemy moves do not award XP or use skill ladders.
 */
export type EnemyMoveDefinition = {
  id: EnemyMoveId
  displayName: string
  telegraphLine: string
  isAttacking: boolean
  /** Multiplier on NPC atk when this move strikes. */
  damageMult: number
  onResolve: StatusApplySpec[]
}

export const ENEMY_MOVES: Record<EnemyMoveId, EnemyMoveDefinition> = {
  STRIKE: {
    id: 'STRIKE',
    displayName: 'STRIKE',
    telegraphLine: 'winds a strike.',
    isAttacking: true,
    damageMult: 1,
    onResolve: [],
  },
  LOOP: {
    id: 'LOOP',
    displayName: 'LOOP',
    telegraphLine: 'loops the rhythm.',
    isAttacking: true,
    damageMult: 1.3,
    onResolve: [],
  },
  SLIP: {
    id: 'SLIP',
    displayName: 'SLIP',
    telegraphLine: 'feints a slip.',
    isAttacking: true,
    damageMult: 0.7,
    onResolve: [],
  },
  WHISPER: {
    id: 'WHISPER',
    displayName: 'WHISPER',
    telegraphLine: 'murmurs something.',
    isAttacking: false,
    damageMult: 0,
    onResolve: [],
  },
  HOLD: {
    id: 'HOLD',
    displayName: 'HOLD',
    telegraphLine: 'holds ground.',
    isAttacking: false,
    damageMult: 0,
    onResolve: [],
  },
}

export const ATTACKING_ENEMY_MOVES: ReadonlySet<EnemyMoveId> = new Set(
  ENEMY_MOVE_IDS.filter((id) => ENEMY_MOVES[id].isAttacking),
)

export function getEnemyMoveDef(id: EnemyMoveId): EnemyMoveDefinition {
  return ENEMY_MOVES[id]
}

export function isAttackingEnemyMove(id: EnemyMoveId): boolean {
  return ENEMY_MOVES[id].isAttacking
}

export function telegraphLineForEnemyMove(id: EnemyMoveId): string {
  return ENEMY_MOVES[id].telegraphLine
}

export function computeEnemyStrikeDamage(eAtk: number, def: EnemyMoveDefinition): number {
  if (!def.isAttacking) return 0
  return Math.floor(eAtk * def.damageMult)
}

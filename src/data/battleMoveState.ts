import type { EnemyMoveId } from './enemyMoves'
import type { PlayerMoveId } from './moveIds'

export type BlackoutPhase = 'idle' | 'loading' | 'armed' | 'recharging'

/** Per-fight state for cap moves and steal, reset on battle INIT. */
export type BattleMoveState = {
  blackoutPhase: BlackoutPhase
  hyperdriveArmed: boolean
  hyperdriveSpent: boolean
  anchorBlocksStatus: boolean
  playerNextAttackImmune: boolean
  playerInvincibleBlocks: number
  enemyAccuracyMult: number
  enemyAccuracyTurns: number
  enemyDefShattered: boolean
  forceEnemyMove: EnemyMoveId | null
  lastEnemyMove: EnemyMoveId | null
  lastEnemyDamage: number
  /** SNAG: stolen enemy move per slot (replaces SNAG in that slot). */
  snagStolen: Partial<Record<number, EnemyMoveId>>
  oncePerBattleUsed: Partial<Record<PlayerMoveId, boolean>>
  /** DEVIL'S CUT, turns remaining where player hits heal. */
  devilsCutTurns: number
  devilsCutPct: number
  /** Pending counterweight mitigation for incoming this turn. */
  counterweightBlockPct: number | null
  counterweightReflectPct: number | null
  /** Set after brace vs an enemy hit; next damage move gets a bonus. */
  playerPerfectGuard: boolean
  /** BRICK_WALL, multiplier on next player damage after a full nullify. */
  nextHitAtkBonusMult: number
}

export function createBattleMoveState(): BattleMoveState {
  return {
    blackoutPhase: 'idle',
    hyperdriveArmed: false,
    hyperdriveSpent: false,
    anchorBlocksStatus: false,
    playerNextAttackImmune: false,
    playerInvincibleBlocks: 0,
    enemyAccuracyMult: 1,
    enemyAccuracyTurns: 0,
    enemyDefShattered: false,
    forceEnemyMove: null,
    lastEnemyMove: null,
    lastEnemyDamage: 0,
    snagStolen: {},
    oncePerBattleUsed: {},
    devilsCutTurns: 0,
    devilsCutPct: 0,
    counterweightBlockPct: null,
    counterweightReflectPct: null,
    playerPerfectGuard: false,
    nextHitAtkBonusMult: 1,
  }
}

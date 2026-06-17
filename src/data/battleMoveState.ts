import type { PlayerMoveId } from './moveIds'

export type BlackoutPhase = 'idle' | 'loading' | 'armed' | 'recharging'

/** Per-fight state for cap moves and steal — reset on battle INIT. */
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
  forceEnemyMove: PlayerMoveId | null
  forcePlayerMove: PlayerMoveId | null
  lastEnemyMove: PlayerMoveId | null
  lastEnemyDamage: number
  /** SNAG: stolen enemy move per slot (replaces SNAG in that slot). */
  snagStolen: Partial<Record<number, PlayerMoveId>>
  oncePerBattleUsed: Partial<Record<PlayerMoveId, boolean>>
  /** DEVIL'S CUT — turns remaining where player hits heal. */
  devilsCutTurns: number
  devilsCutPct: number
  /** Pending counterweight mitigation for incoming this turn. */
  counterweightBlockPct: number | null
  counterweightReflectPct: number | null
  /** Set after brace vs an enemy hit; next damage move gets a bonus. */
  playerPerfectGuard: boolean
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
    forcePlayerMove: null,
    lastEnemyMove: null,
    lastEnemyDamage: 0,
    snagStolen: {},
    oncePerBattleUsed: {},
    devilsCutTurns: 0,
    devilsCutPct: 0,
    counterweightBlockPct: null,
    counterweightReflectPct: null,
    playerPerfectGuard: false,
  }
}

/**
 * Shared combat vocabulary, player moves, enemy moves, and cap-tier systems
 * all reference these types only (no ad-hoc status names elsewhere).
 */

/** Fixed status set, do not add effects outside this list. */
export type StatusEffectId =
  | 'bleed'
  | 'shake'
  | 'stun'
  | 'brace'
  | 'slow'
  | 'miss'
  | 'double'
  | 'reflect'

export const STATUS_EFFECT_IDS: readonly StatusEffectId[] = [
  'bleed',
  'shake',
  'stun',
  'brace',
  'slow',
  'miss',
  'double',
  'reflect',
] as const

export type StatusTarget = 'player' | 'enemy'

/** Default duration (turns) when a move applies a status without an explicit value. */
export const STATUS_DEFAULT_TURNS: Record<StatusEffectId, number> = {
  bleed: 2,
  shake: 2,
  stun: 1,
  brace: 1,
  slow: 2,
  miss: 1,
  double: 1,
  reflect: 1,
}

export type ReflectBuff = {
  turns: number
  /** Fraction of post-mitigation incoming damage returned (0–1). */
  percent: number
}

export type CombatStatusState = {
  playerBrace: number
  /** Next successful player hit strikes twice (damage applied twice). */
  playerDouble: number
  playerReflect: ReflectBuff | null
  playerBleed: number
  playerBleedPotencyMult: number
  playerShake: number
  playerShakePotency: number
  playerStun: number
  playerSlow: number
  playerMiss: number
  enemyBrace: number
  enemyDouble: number
  enemyReflect: ReflectBuff | null
  enemyBleed: number
  /** Bleed chip multiplier while bleeding (1 = default). */
  enemyBleedPotencyMult: number
  enemyShake: number
  /** Shake outgoing damage mult while shaken (0 = use default). */
  enemyShakePotency: number
  enemyStun: number
  /** Enemy acts later/weaker while active (damage mult + initiative). */
  enemySlow: number
  /** Enemy loses their action while active (telegraph shows STUNNED-like skip). */
  enemyMiss: number
}

export function createEmptyCombatStatus(): CombatStatusState {
  return {
    playerBrace: 0,
    playerDouble: 0,
    playerReflect: null,
    playerBleed: 0,
    playerBleedPotencyMult: 1,
    playerShake: 0,
    playerShakePotency: 0,
    playerStun: 0,
    playerSlow: 0,
    playerMiss: 0,
    enemyBrace: 0,
    enemyDouble: 0,
    enemyReflect: null,
    enemyBleed: 0,
    enemyBleedPotencyMult: 1,
    enemyShake: 0,
    enemyShakePotency: 0,
    enemyStun: 0,
    enemySlow: 0,
    enemyMiss: 0,
  }
}

export type DeathClock = {
  id: string
  /** Turns until the hit lands (0 = resolves at next turn start). */
  turnsRemaining: number
  damage: number
  target: 'enemy' | 'player'
  /** Log fragment when the clock fires (e.g. "sealed fate"). */
  label?: string
  /** 1 = always hits; below 1 rolls on resolve (sealed fate). */
  hitChance?: number
  /** On miss, fraction of player's current HP lost (sealed fate). */
  missSelfDamagePct?: number
}

export type MoveCost =
  | { kind: 'none' }
  /** Charge turn, schedules an exposed follow-up (blackout). */
  | { kind: 'loadTurn' }
  /** Player does not act; enemy gets a free swing this turn. */
  | { kind: 'exposedTurn' }
  /** Skip the player's next action (hyperdrive after double-act). */
  | { kind: 'rechargeTurn' }
  | { kind: 'oncePerBattle' }
  | { kind: 'selfDamage'; percent: number }

export type StatusApplySpec =
  | StatusEffectId
  | { effect: StatusEffectId; turns?: number; reflectPercent?: number }

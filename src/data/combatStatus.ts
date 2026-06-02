import {
  createEmptyCombatStatus,
  STATUS_DEFAULT_TURNS,
  type CombatStatusState,
  type ReflectBuff,
  type StatusApplySpec,
  type StatusEffectId,
  type StatusTarget,
} from './combatTypes'
import {
  ENEMY_SHAKE_OUTGOING_MULT,
  ENEMY_SLOW_OUTGOING_MULT,
} from './moveBalance'

export { createEmptyCombatStatus }
export type { CombatStatusState, ReflectBuff, StatusEffectId }

const ENEMY_EFFECTS: ReadonlySet<StatusEffectId> = new Set([
  'bleed',
  'shake',
  'stun',
  'slow',
  'miss',
])

const PLAYER_EFFECTS: ReadonlySet<StatusEffectId> = new Set(['brace', 'double', 'reflect'])

export function statusTargetFor(effect: StatusEffectId): StatusTarget {
  if (ENEMY_EFFECTS.has(effect)) return 'enemy'
  if (PLAYER_EFFECTS.has(effect)) return 'player'
  return 'enemy'
}

export function normalizeStatusSpec(spec: StatusApplySpec): {
  effect: StatusEffectId
  turns: number
  reflectPercent: number
} {
  if (typeof spec === 'string') {
    return {
      effect: spec,
      turns: STATUS_DEFAULT_TURNS[spec],
      reflectPercent: 0.35,
    }
  }
  return {
    effect: spec.effect,
    turns: spec.turns ?? STATUS_DEFAULT_TURNS[spec.effect],
    reflectPercent: spec.reflectPercent ?? 0.35,
  }
}

export function applyStatusToCombat(
  status: CombatStatusState,
  spec: StatusApplySpec,
): CombatStatusState {
  const { effect, turns, reflectPercent } = normalizeStatusSpec(spec)
  const next = { ...status }

  switch (effect) {
    case 'bleed':
      next.enemyBleed = turns
      break
    case 'shake':
      next.enemyShake = turns
      break
    case 'stun':
      next.enemyStun = turns
      break
    case 'slow':
      next.enemySlow = turns
      break
    case 'miss':
      next.enemyMiss = turns
      break
    case 'brace':
      next.playerBrace = turns
      break
    case 'double':
      next.playerDouble = turns
      break
    case 'reflect':
      next.playerReflect = { turns, percent: reflectPercent }
      break
  }

  return next
}

/** Tick durations at end of round (existing combat cadence). */
export function tickCombatStatus(status: CombatStatusState): CombatStatusState {
  const next = { ...status }

  if (next.enemyShake > 0) next.enemyShake--
  if (next.enemyBleed > 0) next.enemyBleed--
  if (next.enemyStun > 0) next.enemyStun--
  if (next.enemySlow > 0) next.enemySlow--
  if (next.enemyMiss > 0) next.enemyMiss--
  if (next.playerBrace > 0) next.playerBrace--
  if (next.playerDouble > 0) next.playerDouble--
  if (next.playerReflect && next.playerReflect.turns > 0) {
    const turns = next.playerReflect.turns - 1
    next.playerReflect = turns > 0 ? { ...next.playerReflect, turns } : null
  }

  return next
}

export function enemyIsStunned(status: CombatStatusState): boolean {
  return status.enemyStun > 0
}

export function enemyLosesTurn(status: CombatStatusState): boolean {
  return status.enemyStun > 0 || status.enemyMiss > 0
}

/** Shake + slow weaken enemy outgoing damage (stack multiplicatively). */
export function enemyOutgoingDamageMult(status: CombatStatusState): number {
  let mult = 1
  if (status.enemyShake > 0) mult *= ENEMY_SHAKE_OUTGOING_MULT
  if (status.enemySlow > 0) mult *= ENEMY_SLOW_OUTGOING_MULT
  return mult
}

/** Slow — player wins initiative while enemy is slowed. */
export function playerActsFirstDespiteSpd(
  status: CombatStatusState,
  playerSpd: number,
  enemySpd: number,
): boolean {
  if (status.enemySlow > 0) return true
  return playerSpd >= enemySpd
}

export function getEnemyStatusLabels(status: CombatStatusState): string[] {
  const parts: string[] = []
  if (status.enemyStun > 0) parts.push('reeling')
  if (status.enemyMiss > 0) parts.push('missing')
  if (status.enemyShake > 0) parts.push('shaken')
  if (status.enemyBleed > 0) parts.push('bleeding')
  if (status.enemySlow > 0) parts.push('slowed')
  return parts
}

export function getPlayerStatusLabels(status: CombatStatusState): string[] {
  const parts: string[] = []
  if (status.playerBrace > 0) parts.push('braced')
  if (status.playerDouble > 0) parts.push('doubled')
  if (status.playerReflect) parts.push('reflecting')
  return parts
}

/** Map legacy flat battle fields ↔ canonical status blob. */
export function combatStatusFromLegacy(fields: {
  playerBrace: number
  enemyShake: number
  enemyBleed: number
  enemyStun: number
  enemySlow?: number
  enemyMiss?: number
  playerDouble?: number
  playerReflect?: ReflectBuff | null
}): CombatStatusState {
  return {
    playerBrace: fields.playerBrace,
    playerDouble: fields.playerDouble ?? 0,
    playerReflect: fields.playerReflect ?? null,
    enemyBleed: fields.enemyBleed,
    enemyShake: fields.enemyShake,
    enemyStun: fields.enemyStun,
    enemySlow: fields.enemySlow ?? 0,
    enemyMiss: fields.enemyMiss ?? 0,
  }
}

export function spreadCombatStatusToLegacy(status: CombatStatusState): {
  playerBrace: number
  enemyShake: number
  enemyBleed: number
  enemyStun: number
  enemySlow: number
  enemyMiss: number
  playerDouble: number
  playerReflect: ReflectBuff | null
} {
  return {
    playerBrace: status.playerBrace,
    enemyShake: status.enemyShake,
    enemyBleed: status.enemyBleed,
    enemyStun: status.enemyStun,
    enemySlow: status.enemySlow,
    enemyMiss: status.enemyMiss,
    playerDouble: status.playerDouble,
    playerReflect: status.playerReflect,
  }
}

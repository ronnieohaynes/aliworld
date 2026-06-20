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
  BLEED_TURNS_MAX,
  BLEED_TURNS_MIN,
  ENEMY_SHAKE_OUTGOING_MULT,
  ENEMY_SLOW_OUTGOING_MULT,
  speedInitiativeBonus,
} from './moveBalance'

export { createEmptyCombatStatus }
export type { CombatStatusState, ReflectBuff, StatusEffectId }

const DEBUFF_EFFECTS: ReadonlySet<StatusEffectId> = new Set([
  'bleed',
  'shake',
  'stun',
  'slow',
  'miss',
])

const BUFF_EFFECTS: ReadonlySet<StatusEffectId> = new Set(['brace', 'double', 'reflect'])

export function isDebuffEffect(effect: StatusEffectId): boolean {
  return DEBUFF_EFFECTS.has(effect)
}

export function isBuffEffect(effect: StatusEffectId): boolean {
  return BUFF_EFFECTS.has(effect)
}

export function rollBleedTurns(): number {
  return BLEED_TURNS_MIN + Math.floor(Math.random() * (BLEED_TURNS_MAX - BLEED_TURNS_MIN + 1))
}

/** @deprecated Use explicit target in applyStatusToCombat. */
export function statusTargetFor(effect: StatusEffectId): StatusTarget {
  if (DEBUFF_EFFECTS.has(effect)) return 'enemy'
  if (BUFF_EFFECTS.has(effect)) return 'player'
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
      turns: spec === 'bleed' ? rollBleedTurns() : STATUS_DEFAULT_TURNS[spec],
      reflectPercent: 0.35,
    }
  }
  return {
    effect: spec.effect,
    turns: spec.turns ?? (spec.effect === 'bleed' ? rollBleedTurns() : STATUS_DEFAULT_TURNS[spec.effect]),
    reflectPercent: spec.reflectPercent ?? 0.35,
  }
}

/** Apply a status to the named combatant. Same effect/duration rules for both sides. */
export function applyStatusToCombat(
  status: CombatStatusState,
  spec: StatusApplySpec,
  target: StatusTarget,
): CombatStatusState {
  const { effect, turns, reflectPercent } = normalizeStatusSpec(spec)
  const next = { ...status }
  const onEnemy = target === 'enemy'

  switch (effect) {
    case 'bleed':
      if (onEnemy) next.enemyBleed = turns
      else next.playerBleed = turns
      break
    case 'shake':
      if (onEnemy) next.enemyShake = turns
      else next.playerShake = turns
      break
    case 'stun':
      if (onEnemy) next.enemyStun = turns
      else next.playerStun = turns
      break
    case 'slow':
      if (onEnemy) next.enemySlow = turns
      else next.playerSlow = turns
      break
    case 'miss':
      if (onEnemy) next.enemyMiss = turns
      else next.playerMiss = turns
      break
    case 'brace':
      if (onEnemy) next.enemyBrace = turns
      else next.playerBrace = turns
      break
    case 'double':
      if (onEnemy) next.enemyDouble = turns
      else next.playerDouble = turns
      break
    case 'reflect':
      if (onEnemy) next.enemyReflect = { turns, percent: reflectPercent }
      else next.playerReflect = { turns, percent: reflectPercent }
      break
  }

  return next
}

/** Tick durations at end of round (existing combat cadence). */
export function tickCombatStatus(status: CombatStatusState): CombatStatusState {
  const next = { ...status }

  if (next.playerShake > 0) next.playerShake--
  if (next.playerShake <= 0) next.playerShakePotency = 0
  if (next.playerBleed > 0) next.playerBleed--
  if (next.playerBleed <= 0) next.playerBleedPotencyMult = 1
  if (next.playerStun > 0) next.playerStun--
  if (next.playerSlow > 0) next.playerSlow--
  if (next.playerMiss > 0) next.playerMiss--
  if (next.playerBrace > 0) next.playerBrace--
  if (next.playerDouble > 0) next.playerDouble--
  if (next.playerWeaken > 0) next.playerWeaken--
  if (next.playerReflect && next.playerReflect.turns > 0) {
    const turns = next.playerReflect.turns - 1
    next.playerReflect = turns > 0 ? { ...next.playerReflect, turns } : null
  }

  if (next.enemyShake > 0) next.enemyShake--
  if (next.enemyShake <= 0) next.enemyShakePotency = 0
  if (next.enemyBleed > 0) next.enemyBleed--
  if (next.enemyBleed <= 0) next.enemyBleedPotencyMult = 1
  if (next.enemyStun > 0) next.enemyStun--
  if (next.enemySlow > 0) next.enemySlow--
  if (next.enemyMiss > 0) next.enemyMiss--
  if (next.enemyBrace > 0) next.enemyBrace--
  if (next.enemyDouble > 0) next.enemyDouble--
  if (next.enemyReflect && next.enemyReflect.turns > 0) {
    const turns = next.enemyReflect.turns - 1
    next.enemyReflect = turns > 0 ? { ...next.enemyReflect, turns } : null
  }

  return next
}

export function enemyIsStunned(status: CombatStatusState): boolean {
  return status.enemyStun > 0
}

export function enemyLosesTurn(status: CombatStatusState): boolean {
  return status.enemyStun > 0 || status.enemyMiss > 0
}

export function playerLosesTurn(status: CombatStatusState): boolean {
  return status.playerStun > 0 || status.playerMiss > 0
}

function shakeOutgoingMult(shakeTurns: number, shakePotency: number): number {
  if (shakeTurns <= 0) return 1
  return shakePotency > 0 ? shakePotency : ENEMY_SHAKE_OUTGOING_MULT
}

/** Shake + slow weaken outgoing damage (stack multiplicatively). */
export function enemyOutgoingDamageMult(status: CombatStatusState): number {
  let mult = 1
  mult *= shakeOutgoingMult(status.enemyShake, status.enemyShakePotency)
  if (status.enemySlow > 0) mult *= ENEMY_SLOW_OUTGOING_MULT
  return mult
}

export function playerOutgoingDamageMult(status: CombatStatusState): number {
  let mult = 1
  mult *= shakeOutgoingMult(status.playerShake, status.playerShakePotency)
  if (status.playerSlow > 0) mult *= ENEMY_SLOW_OUTGOING_MULT
  return mult
}

/** Slow: advantaged side wins initiative while slow debuff is active on the other. */
export function playerActsFirstDespiteSpd(
  status: CombatStatusState,
  playerSpd: number,
  enemySpd: number,
  speedSkillLevel = 1,
): boolean {
  if (status.playerSlow > 0) return false
  if (status.enemySlow > 0) return true
  const effectivePlayerSpd = playerSpd + speedInitiativeBonus(speedSkillLevel)
  return effectivePlayerSpd >= enemySpd
}

export function getEnemyStatusLabels(status: CombatStatusState): string[] {
  const parts: string[] = []
  if (status.enemyStun > 0) parts.push('reeling')
  if (status.enemyMiss > 0) parts.push('missing')
  if (status.enemyShake > 0) parts.push('shaken')
  if (status.enemyBleed > 0) parts.push('bleeding')
  if (status.enemySlow > 0) parts.push('slowed')
  if (status.enemyBrace > 0) parts.push('braced')
  if (status.enemyDouble > 0) parts.push('doubled')
  if (status.enemyReflect) parts.push('reflecting')
  return parts
}

export function getPlayerStatusLabels(status: CombatStatusState): string[] {
  const parts: string[] = []
  if (status.playerStun > 0) parts.push('reeling')
  if (status.playerMiss > 0) parts.push('missing')
  if (status.playerShake > 0) parts.push('shaken')
  if (status.playerBleed > 0) parts.push('bleeding')
  if (status.playerSlow > 0) parts.push('slowed')
  if (status.playerBrace > 0) parts.push('braced')
  if (status.playerDouble > 0) parts.push('doubled')
  if (status.playerReflect) parts.push('reflecting')
  if (status.playerWeaken > 0) parts.push('weakened')
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
  enemyBleedPotencyMult?: number
  enemyShakePotency?: number
  playerBleed?: number
  playerShake?: number
  playerStun?: number
  playerSlow?: number
  playerMiss?: number
}): CombatStatusState {
  return {
    playerBrace: fields.playerBrace,
    playerDouble: fields.playerDouble ?? 0,
    playerReflect: fields.playerReflect ?? null,
    playerBleed: fields.playerBleed ?? 0,
    playerBleedPotencyMult: 1,
    playerShake: fields.playerShake ?? 0,
    playerShakePotency: 0,
    playerStun: fields.playerStun ?? 0,
    playerSlow: fields.playerSlow ?? 0,
    playerMiss: fields.playerMiss ?? 0,
    playerWeaken: 0,
    enemyBrace: 0,
    enemyDouble: 0,
    enemyReflect: null,
    enemyBleed: fields.enemyBleed,
    enemyBleedPotencyMult: fields.enemyBleedPotencyMult ?? 1,
    enemyShake: fields.enemyShake,
    enemyShakePotency: fields.enemyShakePotency ?? 0,
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
  playerBleed: number
  playerShake: number
  playerStun: number
  playerSlow: number
  playerMiss: number
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
    playerBleed: status.playerBleed,
    playerShake: status.playerShake,
    playerStun: status.playerStun,
    playerSlow: status.playerSlow,
    playerMiss: status.playerMiss,
  }
}

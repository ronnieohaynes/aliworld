import {
  enemyLosesTurn,
  enemyOutgoingDamageMult,
  type CombatStatusState,
} from './combatStatus'
import type { BattleMoveState } from './battleMoveState'
import type { DeathClock } from './combatTypes'
import {
  computeEnemyStrikeDamage,
  getEnemyMoveDef,
  type EnemyMoveId,
  type UpcomingMove,
} from './enemyMoves'

export type EnemyStrikeResolution = {
  actualMove: EnemyMoveId
  enemyStunned: boolean
  /** True whenever the enemy lands a strike with eDmg > 0 this turn. */
  enemyAttacks: boolean
  eDmg: number
}

/** Single source of truth for incoming enemy damage, dodge/brace read eDmg from here. */
export function resolveEnemyStrike(
  eMove: UpcomingMove,
  ctx: {
    eAtk: number
    combatStatus: CombatStatusState
    battleMove: Pick<BattleMoveState, 'enemyAccuracyTurns' | 'enemyAccuracyMult'>
  },
): EnemyStrikeResolution {
  const stunned = enemyLosesTurn(ctx.combatStatus) || eMove === 'STUNNED'
  if (stunned) {
    return { actualMove: 'STRIKE', enemyStunned: true, enemyAttacks: false, eDmg: 0 }
  }

  const actualMove = eMove as EnemyMoveId
  const def = getEnemyMoveDef(actualMove)
  if (!def.isAttacking) {
    return { actualMove, enemyStunned: false, enemyAttacks: false, eDmg: 0 }
  }

  if (
    ctx.battleMove.enemyAccuracyTurns > 0 &&
    Math.random() > ctx.battleMove.enemyAccuracyMult
  ) {
    return { actualMove, enemyStunned: false, enemyAttacks: false, eDmg: 0 }
  }

  const eDmg = computeEnemyIncomingDamage(actualMove, {
    eAtk: ctx.eAtk,
    status: ctx.combatStatus,
  })
  return {
    actualMove,
    enemyStunned: false,
    enemyAttacks: eDmg > 0,
    eDmg,
  }
}

export type DeathClockHit = {
  clock: DeathClock
  damage: number
  target: 'enemy' | 'player'
  /** True when hitChance roll failed (self-damage applied instead). */
  missed?: boolean
}

let deathClockSeq = 0

export function nextDeathClockId(): string {
  deathClockSeq += 1
  return `death-clock-${deathClockSeq}`
}

export type ScheduleDeathClockOptions = {
  hitChance?: number
  missSelfDamagePct?: number
}

/** Schedule a hit N turns from now (0 = next turn start). */
export function scheduleDeathClock(
  clocks: DeathClock[],
  damage: number,
  turnsUntil: number,
  target: DeathClock['target'] = 'enemy',
  label?: string,
  options?: ScheduleDeathClockOptions,
): DeathClock[] {
  return [
    ...clocks,
    {
      id: nextDeathClockId(),
      turnsRemaining: Math.max(0, turnsUntil),
      damage: Math.max(0, damage),
      target,
      label,
      hitChance: options?.hitChance,
      missSelfDamagePct: options?.missSelfDamagePct,
    },
  ]
}

/** Call at turn start, fires clocks at 0 and ticks the rest. */
export function resolveDeathClocksAtTurnStart(clocks: DeathClock[]): {
  clocks: DeathClock[]
  hits: DeathClockHit[]
} {
  const hits: DeathClockHit[] = []
  const remaining: DeathClock[] = []

  for (const clock of clocks) {
    if (clock.turnsRemaining <= 0) {
      const chance = clock.hitChance ?? 1
      if (Math.random() < chance) {
        hits.push({ clock, damage: clock.damage, target: clock.target })
      } else {
        hits.push({
          clock,
          damage: 0,
          target: 'player',
          missed: true,
        })
      }
      continue
    }
    remaining.push({ ...clock, turnsRemaining: clock.turnsRemaining - 1 })
  }

  return { clocks: remaining, hits }
}

/** Decrement all pending clocks at end of round (clocks set to land "in N turns"). */
export function tickDeathClocks(clocks: DeathClock[]): DeathClock[] {
  return clocks.map((c) => ({
    ...c,
    turnsRemaining: Math.max(0, c.turnsRemaining - 1),
  }))
}

export function scheduleExposedTurn(exposedTurns: number, add = 1): number {
  return exposedTurns + add
}

export function schedulePlayerSkipTurn(skipTurns: number, add = 1): number {
  return skipTurns + add
}

export type ReflectResult = {
  damageToPlayer: number
  damageToEnemy: number
}

/**
 * Return a portion of incoming damage to the attacker while reflect is active.
 * `percent` is taken from the active reflect buff on the player.
 */
export function splitIncomingWithReflect(
  incoming: number,
  reflect: CombatStatusState['playerReflect'],
): ReflectResult {
  if (!reflect || incoming <= 0) {
    return { damageToPlayer: incoming, damageToEnemy: 0 }
  }
  const reflected = Math.floor(incoming * reflect.percent)
  return {
    damageToPlayer: Math.max(0, incoming - reflected),
    damageToEnemy: reflected,
  }
}

export function splitOutgoingWithReflect(
  outgoing: number,
  reflect: CombatStatusState['enemyReflect'],
): ReflectResult {
  if (!reflect || outgoing <= 0) {
    return { damageToPlayer: 0, damageToEnemy: outgoing }
  }
  const reflected = Math.floor(outgoing * reflect.percent)
  return {
    damageToPlayer: reflected,
    damageToEnemy: Math.max(0, outgoing - reflected),
  }
}

/** Player's next hit lands twice, returns total damage to apply. */
export function applyDoubleHit(playerDmg: number, playerDouble: number): {
  totalDamage: number
  consumedDouble: boolean
} {
  if (playerDmg <= 0 || playerDouble <= 0) {
    return { totalDamage: playerDmg, consumedDouble: false }
  }
  return { totalDamage: playerDmg * 2, consumedDouble: true }
}

export type EnemyDamageContext = {
  eAtk: number
  status: CombatStatusState
}

/** Data-driven enemy strike before def mitigation. */
export function computeEnemyIncomingDamage(
  moveId: EnemyMoveId,
  ctx: EnemyDamageContext,
): number {
  if (enemyLosesTurn(ctx.status)) return 0
  const def = getEnemyMoveDef(moveId)
  if (!def.isAttacking) return 0
  const base = computeEnemyStrikeDamage(ctx.eAtk, def)
  let dmg = Math.floor(base * enemyOutgoingDamageMult(ctx.status))
  if (ctx.status.enemyDouble > 0) {
    dmg *= 2
  }
  return dmg
}

export type ExposedResolveInput = {
  eMove: UpcomingMove
  eAtk: number
  status: CombatStatusState
  displayName: string
}

/** Player does not act; enemy still swings if able (free swing). */
export function buildExposedResolveInput(input: ExposedResolveInput) {
  const stunned = enemyLosesTurn(input.status)
  const actualMove: EnemyMoveId =
    input.eMove === 'STUNNED' ? 'STRIKE' : (input.eMove as EnemyMoveId)
  const def = getEnemyMoveDef(actualMove)
  const enemyAttacks = !stunned && def.isAttacking
  const incoming = enemyAttacks
    ? computeEnemyIncomingDamage(actualMove, {
        eAtk: input.eAtk,
        status: input.status,
      })
    : 0

  return {
    actualMove,
    enemyAttacks: incoming > 0,
    enemyStunned: stunned,
    incoming,
    logLine: stunned
      ? `${input.displayName.toLowerCase()} can't move.`
      : enemyAttacks
        ? `you're exposed. ${incoming} taken.`
        : `you're exposed. nothing comes.`,
  }
}

export function deathClockHitLogLine(hit: DeathClockHit, enemyName: string): string {
  const label = hit.clock.label ?? 'sealed fate'
  const lower = enemyName.toLowerCase()
  if (hit.target === 'enemy') {
    return `${label} lands. ${lower} takes ${hit.damage}.`
  }
  return `${label} lands. you take ${hit.damage}.`
}

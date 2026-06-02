import type { DeathClock } from './combatTypes'
import type { BattleMoveState } from './battleMoveState'
import {
  BLACKOUT_ARMED_DAMAGE_MULT,
  COUNTERWEIGHT_BLOCK_PCT_MAX,
  COUNTERWEIGHT_BLOCK_PCT_MIN,
  COUNTERWEIGHT_REFLECT_CHANCE,
  COUNTERWEIGHT_REFLECT_PCT_MAX,
  COUNTERWEIGHT_REFLECT_PCT_MIN,
  FURY_SWEEP_DAMAGE_FLOOR,
  INVINCIBLE_BLOCK_COUNT,
  INVINCIBLE_SACRIFICE_PCT,
  LOOP_DAMAGE_MULT,
  PHENOMENA_DAMAGE_MULT_MAX,
  PHENOMENA_DAMAGE_MULT_MIN,
  PHENOMENA_HEAL_PCT_MAX,
  PHENOMENA_HEAL_PCT_MIN,
  REFRACT_DAMAGE_MULT,
  SEALED_FATE_DAMAGE_MULT,
  SEALED_FATE_HIT_CHANCE,
  SEALED_FATE_MISS_SELF_DAMAGE_PCT,
  SEALED_FATE_TURN_MAX,
  SEALED_FATE_TURN_MIN,
} from './moveBalance'
import { scheduleDeathClock } from './combatSystems'
import type { EnemyMoveId } from './enemyMoves'
import { getEnemyMoveDef } from './enemyMoves'
import type {
  MoveDefinition,
  MoveDamageProfile,
  PlayerMoveResolveOut,
} from './moveTypes'

export type { PlayerMoveResolveOut }

export type ResolveMoveContext = {
  atk: number
  eDmg: number
  /** Defense skill level — scales mitigation. */
  def: number
  /** Speed skill level — scales dodge and initiative. */
  spd: number
  enemyAttacks: boolean
  lck: number
  playerHp: number
  playerMaxHp: number
  enemyDef: number
  battle: BattleMoveState
  npcMovePool: EnemyMoveId[]
  moveSlot?: number
}

const jitter = (d: number) => Math.max(0, d + Math.floor((Math.random() - 0.5) * 3))

function rollCrit(lck: number, base: number, lckMult: number, extraRolls = 0): boolean {
  let success = Math.random() * 100 < lck * lckMult + base
  for (let i = 0; i < extraRolls; i++) {
    if (Math.random() * 100 < lck * lckMult + base) success = true
  }
  return success
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function applyMoveResolveStatuses(
  specs: MoveDefinition['onResolve'],
  out: PlayerMoveResolveOut,
): void {
  for (const spec of specs) {
    const effect = typeof spec === 'string' ? spec : spec.effect
    if (effect === 'shake') out.shakeApplied = true
    if (effect === 'bleed') out.bleedApplied = true
    if (effect === 'stun') out.stunApplied = true
    if (effect === 'brace') out.braced = true
    if (effect === 'slow') out.slowApplied = true
    if (effect === 'miss') out.missApplied = true
    if (effect === 'double') out.doubleApplied = true
    if (effect === 'reflect') out.reflectApplied = true
  }
}

function applyDamageProfile(
  profile: MoveDamageProfile,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
  enemyAttacks: boolean,
): void {
  const { atk, eDmg, lck } = ctx
  let dmg = Math.floor(atk * profile.damageMult)
  if (!enemyAttacks && profile.openingBonusMult != null) {
    dmg = Math.floor(dmg * profile.openingBonusMult)
  }
  if (profile.crit) {
    const c = profile.crit
    if (rollCrit(lck, c.base, c.lckMult, c.extraCritRolls ?? 0)) {
      out.crit = true
      dmg = Math.floor(dmg * c.damageMult)
      if (c.onCrit.includes('bleed')) out.bleedApplied = true
    }
  }
  if (profile.damageFloor != null) dmg = Math.max(profile.damageFloor, dmg)
  out.playerDmg = jitter(dmg)
  out.incoming = profile.takeEnemyHit !== false ? eDmg : 0
}

function applyFurySweep(
  profile: MoveDamageProfile,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
  enemyAttacks: boolean,
): void {
  const { atk, eDmg, lck } = ctx
  let dmg = Math.floor(atk * profile.damageMult)
  if (!enemyAttacks && profile.openingBonusMult) dmg = Math.floor(dmg * profile.openingBonusMult)
  const c = profile.crit!
  if (rollCrit(lck, c.base, c.lckMult, c.extraCritRolls ?? 0)) {
    out.crit = true
    dmg = Math.floor(dmg * c.damageMult)
    if (c.bleedOnCritOnly) out.bleedApplied = true
  }
  dmg = Math.max(profile.damageFloor ?? FURY_SWEEP_DAMAGE_FLOOR, dmg)
  out.playerDmg = jitter(dmg)
  out.incoming = profile.takeEnemyHit !== false ? eDmg : 0
}

export function applyStolenEnemyMove(
  enemyMoveId: EnemyMoveId,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
): void {
  const def = getEnemyMoveDef(enemyMoveId)
  if (!def.isAttacking) {
    out.playerDmg = jitter(Math.floor(ctx.atk * 0.4))
    out.incoming = 0
    return
  }
  out.playerDmg = jitter(Math.floor(ctx.atk * def.damageMult))
  out.incoming = ctx.enemyAttacks ? ctx.eDmg : 0
}

function rollPhenomena(ctx: ResolveMoveContext, out: PlayerMoveResolveOut): string {
  const roll = Math.floor(Math.random() * 9)
  switch (roll) {
    case 0:
      out.bleedApplied = true
      return 'phenomena: bleed.'
    case 1:
      out.shakeApplied = true
      return 'phenomena: shake.'
    case 2:
      out.stunApplied = true
      return 'phenomena: stun.'
    case 3:
      out.slowApplied = true
      return 'phenomena: slow.'
    case 4:
      out.missApplied = true
      return 'phenomena: they miss.'
    case 5:
      out.doubleApplied = true
      return 'phenomena: double.'
    case 6:
      out.reflectApplied = true
      return 'phenomena: reflect.'
    case 7: {
      const mult =
        PHENOMENA_DAMAGE_MULT_MIN +
        Math.random() * (PHENOMENA_DAMAGE_MULT_MAX - PHENOMENA_DAMAGE_MULT_MIN)
      out.playerDmg = jitter(Math.floor(ctx.atk * mult))
      out.incoming = ctx.enemyAttacks ? ctx.eDmg : 0
      return `phenomena: ${out.playerDmg} chaos damage.`
    }
    default: {
      const heal = Math.floor(
        ctx.playerMaxHp *
          (PHENOMENA_HEAL_PCT_MIN +
            Math.random() * (PHENOMENA_HEAL_PCT_MAX - PHENOMENA_HEAL_PCT_MIN)),
      )
      out.playerDmg = 0
      out.incoming = 0
      return `phenomena: you recover ${heal}.`
    }
  }
}

export type PostResolveEffects = {
  deathClocks: DeathClock[]
  selfDamage: number
  healPlayer: number
  phenomenaLine?: string
}

export function applyMoveBehavior(
  def: MoveDefinition,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
): PostResolveEffects {
  const post: PostResolveEffects = { deathClocks: [], selfDamage: 0, healPlayer: 0 }
  const { atk, eDmg, enemyAttacks, lck, battle } = ctx
  const behavior = def.behavior

  switch (behavior.kind) {
    case 'damage':
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks)
      break

    case 'fury-sweep':
      applyFurySweep(behavior.profile, ctx, out, enemyAttacks)
      break

    case 'dodge': {
      const d = behavior.profile
      if (enemyAttacks) {
        out.dodged = true
        out.incoming = 0
        out.playerDmg = jitter(Math.floor(atk * d.counterMult))
        if (Math.random() * 100 < d.stunChance.base + lck * d.stunChance.lckMult) {
          out.stunApplied = true
        }
        if (d.onDodgeReflectPct && ctx.eDmg > 0) {
          out.playerDmg += Math.max(1, Math.floor(ctx.eDmg * d.onDodgeReflectPct))
        }
      } else {
        out.incoming = 0
        out.playerDmg = jitter(Math.floor(atk * d.weakMult))
      }
      break
    }

    case 'brace': {
      const b = behavior.profile
      out.braced = true
      out.playerDmg = 0
      out.incoming = Math.floor(eDmg * b.incomingMult)
      if (b.blockStatus) battle.anchorBlocksStatus = true
      break
    }

    case 'dark-break': {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks)
      battle.enemyAccuracyMult = behavior.accuracyMult
      battle.enemyAccuracyTurns = randomInt(
        behavior.accuracyTurns.min,
        behavior.accuracyTurns.max,
      )
      break
    }

    case 'cannon': {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks)
      if (out.crit && Math.random() < behavior.defShatterChance) {
        battle.enemyDefShattered = true
      }
      break
    }

    case 'blackout': {
      if (battle.blackoutPhase === 'idle') {
        battle.blackoutPhase = 'loading'
        out.playerDmg = 0
        out.incoming = enemyAttacks ? eDmg : 0
      } else if (battle.blackoutPhase === 'armed') {
        out.playerDmg = jitter(Math.floor(atk * BLACKOUT_ARMED_DAMAGE_MULT))
        out.incoming = enemyAttacks ? eDmg : 0
        battle.blackoutPhase = 'recharging'
      } else {
        out.playerDmg = 0
        out.incoming = 0
      }
      break
    }

    case 'gravity-shift': {
      out.playerDmg = jitter(Math.floor(atk * 0.35))
      out.incoming = enemyAttacks ? eDmg : 0
      out.slowApplied = true
      break
    }

    case 'refract': {
      out.playerDmg = Math.max(0, Math.floor(battle.lastEnemyDamage * REFRACT_DAMAGE_MULT))
      out.incoming = enemyAttacks ? eDmg : 0
      break
    }

    case 'hyperdrive': {
      out.playerDmg = jitter(Math.floor(atk * 0.25))
      out.incoming = enemyAttacks ? eDmg : 0
      battle.hyperdriveArmed = true
      break
    }

    case 'counterweight': {
      out.playerDmg = 0
      battle.counterweightBlockPct =
        COUNTERWEIGHT_BLOCK_PCT_MIN +
        Math.random() * (COUNTERWEIGHT_BLOCK_PCT_MAX - COUNTERWEIGHT_BLOCK_PCT_MIN)
      if (Math.random() < COUNTERWEIGHT_REFLECT_CHANCE) {
        battle.counterweightReflectPct =
          COUNTERWEIGHT_REFLECT_PCT_MIN +
          Math.random() * (COUNTERWEIGHT_REFLECT_PCT_MAX - COUNTERWEIGHT_REFLECT_PCT_MIN)
      }
      out.incoming = enemyAttacks ? eDmg : 0
      break
    }

    case 'brick-wall': {
      out.playerDmg = 0
      out.incoming = 0
      battle.playerNextAttackImmune = true
      break
    }

    case 'invincible': {
      out.playerDmg = 0
      out.incoming = enemyAttacks ? eDmg : 0
      post.selfDamage = Math.floor(ctx.playerHp * INVINCIBLE_SACRIFICE_PCT)
      battle.playerInvincibleBlocks = INVINCIBLE_BLOCK_COUNT
      battle.oncePerBattleUsed.INVINCIBLE = true
      break
    }

    case 'loop': {
      applyDamageProfile(
        { damageMult: LOOP_DAMAGE_MULT, takeEnemyHit: true },
        ctx,
        out,
        enemyAttacks,
      )
      if (battle.lastEnemyMove) battle.forceEnemyMove = battle.lastEnemyMove
      break
    }

    case 'snag': {
      const pool = ctx.npcMovePool
      if (pool.length > 0 && ctx.moveSlot != null) {
        const stolen = pool[Math.floor(Math.random() * pool.length)]!
        battle.snagStolen[ctx.moveSlot] = stolen
        applyStolenEnemyMove(stolen, ctx, out)
      } else {
        out.playerDmg = jitter(Math.floor(atk * 0.3))
        out.incoming = enemyAttacks ? eDmg : 0
      }
      break
    }

    case 'phenomena': {
      post.phenomenaLine = rollPhenomena(ctx, out)
      const healMatch = post.phenomenaLine.match(/recover (\d+)/)
      if (healMatch) post.healPlayer = parseInt(healMatch[1]!, 10)
      break
    }

    case 'sealed-fate': {
      const turns = randomInt(SEALED_FATE_TURN_MIN, SEALED_FATE_TURN_MAX)
      const dmg = Math.floor(ctx.atk * SEALED_FATE_DAMAGE_MULT)
      post.deathClocks = scheduleDeathClock([], dmg, turns, 'enemy', 'sealed fate', {
        hitChance: SEALED_FATE_HIT_CHANCE,
        missSelfDamagePct: SEALED_FATE_MISS_SELF_DAMAGE_PCT,
      })
      out.playerDmg = 0
      out.incoming = enemyAttacks ? eDmg : 0
      break
    }
  }

  applyMoveResolveStatuses(def.onResolve, out)
  return post
}

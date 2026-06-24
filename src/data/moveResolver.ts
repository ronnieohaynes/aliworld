import type { DeathClock } from './combatTypes'
import type { BattleMoveState } from './battleMoveState'
import {
  BLACKOUT_ARMED_DAMAGE_MULT,
  BLACKOUT_RELEASE_DODGE_MULT,
  BLEED_TURNS_MAX,
  BLEED_TURNS_MIN,
  CROSS_SCALE,
  crossSecondaryBonus,
  crossSecondaryFlat,
  crossSecondaryMultiplier,
  DEVILS_CUT_DAMAGE_MULT,
  DEVILS_CUT_LIFESTEAL_BASE,
  DEVILS_CUT_LIFESTEAL_CAP,
  DEVILS_CUT_LIFESTEAL_PER_LCK,
  DEVILS_CUT_TURNS_MAX,
  DEVILS_CUT_TURNS_MIN,
  SECOND_WIND_HEAL_BASE_PCT,
  SECOND_WIND_HEAL_CAP_PCT,
  SECOND_WIND_HEAL_PER_DEF_PCT,
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
  braceIncomingMultiplier,
  EARLY_STRIKE_ATK_CONTRIB_MULT,
  earlyStrikeDamageScale,
  LCK_CRIT_STAT_SCALE,
  perfectGuardDamageBonus,
  speedDodgeSuccessChance,
} from './moveBalance'
import { resolvePlayerDodgeMove } from './dodgeResolver'
import { getCombatRng } from './combatRng'
import { scheduleDeathClock } from './combatSystems'
import type { PlayerMoveId } from './moveIds'
import { MOVES } from './moveDefinitions'
import type {
  MoveDefinition,
  MoveDamageProfile,
  PlayerMoveResolveOut,
} from './moveTypes'

export type { PlayerMoveResolveOut }

export type ResolveMoveContext = {
  atk: number
  /** Player attack skill level, scales early STRIKE damage down. */
  attackSkillLevel: number
  eDmg: number
  /** Raw defense skill level, mitigation tuned in moveBalance; matchup loop outweighs level gaps. */
  def: number
  /** Derived defense stat (archetype base + skill bonus), used as PARRY counter damage base. */
  defStat: number
  /** Speed skill level, scales dodge and initiative. */
  spd: number
  /** Luck skill level, cross-scale secondary hooks. */
  luckSkillLevel: number
  enemyAttacks: boolean
  lck: number
  playerHp: number
  playerMaxHp: number
  enemyDef: number
  battle: BattleMoveState
  npcMovePool: PlayerMoveId[]
  moveSlot?: number
}

const jitter = (d: number) => getCombatRng().jitter(d)

function applyPerfectGuardBonus(
  dmg: number,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
): number {
  if (dmg <= 0 || !ctx.battle.playerPerfectGuard) return dmg
  const bonus = perfectGuardDamageBonus(ctx.def)
  ctx.battle.playerPerfectGuard = false
  out.perfectGuardBonus = true
  return Math.floor(dmg * (1 + bonus))
}

function rollCrit(lck: number, base: number, lckMult: number, extraRolls = 0): boolean {
  const rng = getCombatRng()
  const chance = lck * lckMult * LCK_CRIT_STAT_SCALE + base
  let success = rng.next() * 100 < chance
  for (let i = 0; i < extraRolls; i++) {
    if (rng.next() * 100 < chance) success = true
  }
  return success
}

function randomInt(min: number, max: number): number {
  return getCombatRng().nextInt(min, max)
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
  opts?: { critChanceBonus?: number; critDamageMultScale?: number; damageMultScale?: number },
): void {
  const { atk, eDmg, lck, attackSkillLevel, battle } = ctx
  const earlyScale = earlyStrikeDamageScale(attackSkillLevel)
  const effectiveAtk =
    earlyScale < 1
      ? Math.max(1, Math.floor(atk * (EARLY_STRIKE_ATK_CONTRIB_MULT + (1 - EARLY_STRIKE_ATK_CONTRIB_MULT) * earlyScale)))
      : atk
  let dmg = Math.floor(effectiveAtk * profile.damageMult * (opts?.damageMultScale ?? 1))
  if (!enemyAttacks && profile.openingBonusMult != null) {
    dmg = Math.floor(dmg * profile.openingBonusMult)
  }
  if (earlyScale < 1) {
    dmg = Math.max(1, Math.floor(dmg * earlyScale))
  }
  if (profile.crit) {
    const c = profile.crit
    const critBase = c.base + (opts?.critChanceBonus ?? 0)
    if (rollCrit(lck, critBase, c.lckMult, c.extraCritRolls ?? 0)) {
      out.crit = true
      const critMult = c.damageMult * (opts?.critDamageMultScale ?? 1)
      dmg = Math.floor(dmg * critMult)
      if (c.onCrit.includes('bleed')) out.bleedApplied = true
    }
  }
  if (profile.damageFloor != null) dmg = Math.max(profile.damageFloor, dmg)
  if (battle.nextHitAtkBonusMult > 1) {
    dmg = Math.floor(dmg * battle.nextHitAtkBonusMult)
    battle.nextHitAtkBonusMult = 1
  }
  dmg = applyPerfectGuardBonus(dmg, ctx, out)
  out.playerDmg = jitter(dmg)
  out.incoming = profile.takeEnemyHit !== false && eDmg > 0 ? eDmg : 0
}

function applyFurySweep(
  profile: MoveDamageProfile,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
  enemyAttacks: boolean,
): void {
  const { atk, eDmg, lck, luckSkillLevel } = ctx
  let dmg = Math.floor(atk * profile.damageMult)
  if (!enemyAttacks && profile.openingBonusMult) dmg = Math.floor(dmg * profile.openingBonusMult)
  const c = profile.crit!
  if (rollCrit(lck, c.base, c.lckMult, c.extraCritRolls ?? 0)) {
    out.crit = true
    dmg = Math.floor(dmg * c.damageMult)
    if (c.bleedOnCritOnly) {
      out.bleedApplied = true
      out.bleedTurns = randomInt(BLEED_TURNS_MIN, BLEED_TURNS_MAX)
      out.bleedPotencyMult = crossSecondaryMultiplier(
        luckSkillLevel,
        CROSS_SCALE.FURY_BLEED_POTENCY_PER_LCK_LVL,
        CROSS_SCALE.FURY_BLEED_POTENCY_CAP,
      )
    }
  }
  dmg = Math.max(profile.damageFloor ?? FURY_SWEEP_DAMAGE_FLOOR, dmg)
  dmg = applyPerfectGuardBonus(dmg, ctx, out)
  out.playerDmg = jitter(dmg)
  out.incoming = profile.takeEnemyHit !== false && eDmg > 0 ? eDmg : 0
}

/** Native skill level for a stolen enemy move (SNAG cross-scale). */
function stolenMoveNativeSkillLevel(enemyMoveId: PlayerMoveId, ctx: ResolveMoveContext): number {
  switch (enemyMoveId) {
    case 'SLIP':
      return ctx.spd
    case 'HOLD':
      return ctx.def
    case 'WHISPER':
      return ctx.luckSkillLevel
    default:
      return ctx.attackSkillLevel
  }
}

/** Enemy strike landing this turn, dodge/brace always key off ctx.eDmg. */
function incomingEnemyHit(ctx: ResolveMoveContext): boolean {
  return ctx.eDmg > 0
}

export function applyStolenEnemyMove(
  enemyMoveId: PlayerMoveId,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
  stolenScale = 1,
): void {
  const moveDef = MOVES[enemyMoveId]
  if (!moveDef) {
    out.playerDmg = jitter(Math.floor(ctx.atk * 0.4 * stolenScale))
    out.incoming = 0
    return
  }
  const behavior = moveDef.behavior
  let damageMult = 1
  if ('profile' in behavior && behavior.profile && 'damageMult' in behavior.profile) {
    damageMult = behavior.profile.damageMult
  }
  let dmg = Math.floor(ctx.atk * damageMult * stolenScale)
  dmg = applyPerfectGuardBonus(dmg, ctx, out)
  out.playerDmg = jitter(dmg)
  out.incoming = incomingEnemyHit(ctx) ? ctx.eDmg : 0
}

function rollPhenomena(ctx: ResolveMoveContext, out: PlayerMoveResolveOut): string {
  const rollBias = crossSecondaryBonus(
    ctx.luckSkillLevel,
    CROSS_SCALE.PHENOMENA_ROLL_BIAS_PER_LCK_LVL,
    ctx.luckSkillLevel * CROSS_SCALE.PHENOMENA_ROLL_BIAS_PER_LCK_LVL,
  )
  const defFloor = crossSecondaryBonus(
    ctx.def,
    CROSS_SCALE.PHENOMENA_DEF_FLOOR_PER_DEF_LVL,
    CROSS_SCALE.PHENOMENA_DEF_FLOOR_CAP,
  )
  let roll = getCombatRng().nextInt(0, 8)
  if (rollBias > 0 && getCombatRng().next() < rollBias) {
    roll = Math.min(8, roll + 1)
  }
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
      const rng = getCombatRng()
      const mult =
        PHENOMENA_DAMAGE_MULT_MIN +
        defFloor +
        rng.next() * (PHENOMENA_DAMAGE_MULT_MAX - PHENOMENA_DAMAGE_MULT_MIN)
      out.playerDmg = jitter(Math.floor(ctx.atk * mult))
      out.incoming = incomingEnemyHit(ctx) ? ctx.eDmg : 0
      return `phenomena: ${out.playerDmg} chaos damage.`
    }
    default: {
      const heal = Math.floor(
        ctx.playerMaxHp *
          (PHENOMENA_HEAL_PCT_MIN +
            getCombatRng().next() * (PHENOMENA_HEAL_PCT_MAX - PHENOMENA_HEAL_PCT_MIN)),
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
  const {
    atk,
    attackSkillLevel,
    def: defSkillLevel,
    eDmg,
    enemyAttacks,
    lck,
    luckSkillLevel,
    spd,
    battle,
  } = ctx
  const behavior = def.behavior

  switch (behavior.kind) {
    case 'damage': {
      const opts =
        def.id === 'STRIKE'
          ? {
              critChanceBonus: crossSecondaryBonus(
                luckSkillLevel,
                CROSS_SCALE.STRIKE_CRIT_CHANCE_PER_LCK_LVL,
                luckSkillLevel * CROSS_SCALE.STRIKE_CRIT_CHANCE_PER_LCK_LVL,
              ),
            }
          : undefined
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks, opts)
      if (def.id === 'WHISPER') {
        out.shakePotency = crossSecondaryBonus(
          spd,
          CROSS_SCALE.WHISPER_SHAKE_WEAKEN_PER_SPD_LVL,
          CROSS_SCALE.WHISPER_SHAKE_WEAKEN_CAP,
        )
      }
      break
    }

    case 'fury-sweep':
      applyFurySweep(behavior.profile, ctx, out, enemyAttacks)
      break

    case 'dodge': {
      const dodge = resolvePlayerDodgeMove({
        moveId: def.id,
        profile: behavior.profile,
        incomingHit: incomingEnemyHit(ctx) ? ctx.eDmg : 0,
        atk,
        attackSkillLevel,
        speedSkillLevel: ctx.spd,
        defenseSkillLevel: defSkillLevel,
        luckSkillLevel,
        defStat: ctx.defStat,
        lckStat: lck,
      })
      out.dodged = dodge.dodged
      out.incoming = dodge.incoming
      out.playerDmg = dodge.playerDmg
      if (dodge.stunApplied) out.stunApplied = true
      break
    }

    case 'brace': {
      const b = behavior.profile
      out.braced = true
      out.playerDmg = 0
      out.incoming = incomingEnemyHit(ctx)
        ? Math.floor(ctx.eDmg * braceIncomingMultiplier(b.incomingMult, ctx.def))
        : 0
      if (incomingEnemyHit(ctx)) {
        battle.playerPerfectGuard = true
        if (def.id === 'HOLD') {
          out.braceChipDmg = crossSecondaryFlat(
            attackSkillLevel,
            CROSS_SCALE.HOLD_BRACE_CHIP_PER_ATK_LVL,
            CROSS_SCALE.HOLD_BRACE_CHIP_CAP,
          )
        }
        if (def.id === 'ANCHOR') {
          post.healPlayer = crossSecondaryFlat(
            luckSkillLevel,
            CROSS_SCALE.ANCHOR_BRACE_HEAL_PER_LCK_LVL,
            CROSS_SCALE.ANCHOR_BRACE_HEAL_CAP,
          )
        }
      }
      if (b.blockStatus) battle.anchorBlocksStatus = true
      break
    }

    case 'dark-break': {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks)
      battle.enemyAccuracyMult = behavior.accuracyMult
      const extraTurns = crossSecondaryFlat(
        spd,
        CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_PER_SPD_LVL,
        CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_CAP,
      )
      battle.enemyAccuracyTurns =
        randomInt(behavior.accuracyTurns.min, behavior.accuracyTurns.max) + extraTurns
      break
    }

    case 'cannon': {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks, {
        critDamageMultScale: crossSecondaryMultiplier(
          luckSkillLevel,
          CROSS_SCALE.CANNON_CRIT_DMG_PER_LCK_LVL,
          CROSS_SCALE.CANNON_CRIT_DMG_CAP,
        ),
      })
      if (out.crit && getCombatRng().next() < behavior.defShatterChance) {
        battle.enemyDefShattered = true
      }
      break
    }

    case 'blackout': {
      if (battle.blackoutPhase === 'idle') {
        battle.blackoutPhase = 'loading'
        out.playerDmg = 0
        out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      } else if (battle.blackoutPhase === 'armed') {
        const momentum = crossSecondaryMultiplier(
          spd,
          CROSS_SCALE.BLACKOUT_MOMENTUM_PER_SPD_LVL,
          CROSS_SCALE.BLACKOUT_MOMENTUM_CAP,
        )
        out.playerDmg = jitter(Math.floor(atk * BLACKOUT_ARMED_DAMAGE_MULT * momentum))
        if (incomingEnemyHit(ctx)) {
          if (getCombatRng().next() < speedDodgeSuccessChance(ctx.spd) * BLACKOUT_RELEASE_DODGE_MULT) {
            out.dodged = true
            out.incoming = 0
          } else {
            out.incoming = eDmg
          }
        } else {
          out.incoming = 0
        }
        battle.blackoutPhase = 'recharging'
      } else {
        out.playerDmg = 0
        out.incoming = 0
      }
      break
    }

    case 'gravity-shift': {
      out.playerDmg = jitter(Math.floor(atk * 0.35))
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      out.slowApplied = true
      const extraSlow = crossSecondaryFlat(
        luckSkillLevel,
        CROSS_SCALE.GRAVITY_SLOW_TURNS_PER_LCK_LVL,
        CROSS_SCALE.GRAVITY_SLOW_TURNS_CAP,
      )
      out.slowTurns =
        randomInt(behavior.slowTurns.min, behavior.slowTurns.max) +
        Math.floor(extraSlow)
      break
    }

    case 'refract': {
      const atkMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.REFRACT_ATK_PER_ATK_LVL,
        CROSS_SCALE.REFRACT_ATK_CAP,
      )
      out.playerDmg = Math.max(
        0,
        Math.floor(battle.lastEnemyDamage * REFRACT_DAMAGE_MULT * atkMult),
      )
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      break
    }

    case 'hyperdrive': {
      const setupMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.HYPERDRIVE_SETUP_ATK_PER_ATK_LVL,
        CROSS_SCALE.HYPERDRIVE_SETUP_ATK_CAP,
      )
      out.playerDmg = jitter(Math.floor(atk * 0.25 * setupMult))
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      battle.hyperdriveArmed = true
      break
    }

    case 'counterweight': {
      out.playerDmg = 0
      battle.counterweightBlockPct =
        COUNTERWEIGHT_BLOCK_PCT_MIN +
        getCombatRng().next() * (COUNTERWEIGHT_BLOCK_PCT_MAX - COUNTERWEIGHT_BLOCK_PCT_MIN)
      const reflectAtkBonus = crossSecondaryBonus(
        attackSkillLevel,
        CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL,
        CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_CAP,
      )
      if (getCombatRng().next() < COUNTERWEIGHT_REFLECT_CHANCE) {
        battle.counterweightReflectPct = Math.min(
          1,
          COUNTERWEIGHT_REFLECT_PCT_MIN +
            getCombatRng().next() * (COUNTERWEIGHT_REFLECT_PCT_MAX - COUNTERWEIGHT_REFLECT_PCT_MIN) +
            reflectAtkBonus,
        )
      }
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
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
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      const sacrificeRelief = crossSecondaryBonus(
        luckSkillLevel,
        CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL,
        CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_CAP,
      )
      post.selfDamage = Math.floor(
        ctx.playerHp * Math.max(0.01, INVINCIBLE_SACRIFICE_PCT - sacrificeRelief),
      )
      battle.playerInvincibleBlocks = INVINCIBLE_BLOCK_COUNT
      battle.oncePerBattleUsed.INVINCIBLE = true
      break
    }

    case 'loop': {
      const loopMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.LOOP_REPEAT_ATK_PER_ATK_LVL,
        CROSS_SCALE.LOOP_REPEAT_ATK_CAP,
      )
      applyDamageProfile(
        { damageMult: LOOP_DAMAGE_MULT * loopMult, takeEnemyHit: true },
        ctx,
        out,
        enemyAttacks,
      )
      break
    }

    case 'snag': {
      const pool = ctx.npcMovePool
      if (pool.length > 0 && ctx.moveSlot != null) {
        const stolen = pool[getCombatRng().nextInt(0, pool.length - 1)]!
        battle.snagStolen[ctx.moveSlot] = stolen
        const nativeLvl = stolenMoveNativeSkillLevel(stolen, ctx)
        const stolenScale = crossSecondaryMultiplier(
          nativeLvl,
          CROSS_SCALE.SNAG_STOLEN_PER_NATIVE_LVL,
          CROSS_SCALE.SNAG_STOLEN_CAP,
        )
        applyStolenEnemyMove(stolen, ctx, out, stolenScale)
      } else {
        out.playerDmg = jitter(Math.floor(atk * 0.3))
        out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
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
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      break
    }

    case 'second-wind': {
      const pct = Math.min(
        SECOND_WIND_HEAL_CAP_PCT,
        SECOND_WIND_HEAL_BASE_PCT +
          ctx.def * SECOND_WIND_HEAL_PER_DEF_PCT +
          crossSecondaryBonus(
            luckSkillLevel,
            CROSS_SCALE.SECOND_WIND_LCK_HEAL_PER_LVL,
            CROSS_SCALE.SECOND_WIND_LCK_HEAL_CAP,
          ),
      )
      post.healPlayer = Math.floor(ctx.playerMaxHp * pct)
      out.playerDmg = 0
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      battle.oncePerBattleUsed.SECOND_WIND = true
      break
    }

    case 'devils-cut': {
      out.playerDmg = jitter(Math.floor(atk * DEVILS_CUT_DAMAGE_MULT))
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0
      battle.devilsCutTurns = randomInt(DEVILS_CUT_TURNS_MIN, DEVILS_CUT_TURNS_MAX)
      battle.devilsCutPct = Math.min(
        DEVILS_CUT_LIFESTEAL_CAP,
        DEVILS_CUT_LIFESTEAL_BASE +
          ctx.lck * DEVILS_CUT_LIFESTEAL_PER_LCK +
          crossSecondaryBonus(
            attackSkillLevel,
            CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL,
            CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_CAP,
          ),
      )
      break
    }
  }

  applyMoveResolveStatuses(def.onResolve, out)
  return post
}

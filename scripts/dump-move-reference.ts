/**
 * Balance reference dump. Run: npx tsx scripts/dump-move-reference.ts
 */
import * as MB from '../src/data/moveBalance'
import { MOVES } from '../src/data/moveDefinitions'
import { ENEMY_MOVES, ENEMY_MOVE_IDS } from '../src/data/enemyMoves'
import { CROSS_SCALE, CROSS_SCALE_MAP } from '../src/data/moveBalance'
import { PLAYER_MOVE_IDS } from '../src/data/moveIds'
import { STATUS_DEFAULT_TURNS } from '../src/data/combatTypes'
import type { MoveBehavior } from '../src/data/moveTypes'
import type { StatusApplySpec } from '../src/data/combatTypes'

type Hook = { key: string; perLevel: number; cap: number; effect: string }

const CROSS_HOOKS: Record<string, Hook[]> = {
  STRIKE: [{ key: 'STRIKE_CRIT_CHANCE_PER_LCK_LVL', perLevel: 0.4, cap: Infinity, effect: '+crit chance % (luck); cap = luckLevel * perLevel' }],
  FURY_SWEEP: [
    { key: 'FURY_BLEED_TURNS_PER_LCK_LVL', perLevel: CROSS_SCALE.FURY_BLEED_TURNS_PER_LCK_LVL, cap: CROSS_SCALE.FURY_BLEED_TURNS_CAP, effect: '+bleed turns on crit (luck)' },
    { key: 'FURY_BLEED_POTENCY_PER_LCK_LVL', perLevel: CROSS_SCALE.FURY_BLEED_POTENCY_PER_LCK_LVL, cap: CROSS_SCALE.FURY_BLEED_POTENCY_CAP, effect: '+bleed chip mult on crit (luck)' },
  ],
  DARK_BREAK: [{ key: 'DARK_BREAK_EXTRA_TURNS_PER_SPD_LVL', perLevel: CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_PER_SPD_LVL, cap: CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_CAP, effect: '+accuracy-down turns (speed)' }],
  CANNON: [{ key: 'CANNON_CRIT_DMG_PER_LCK_LVL', perLevel: CROSS_SCALE.CANNON_CRIT_DMG_PER_LCK_LVL, cap: CROSS_SCALE.CANNON_CRIT_DMG_CAP, effect: '+crit damage mult (luck)' }],
  BLACKOUT: [{ key: 'BLACKOUT_MOMENTUM_PER_SPD_LVL', perLevel: CROSS_SCALE.BLACKOUT_MOMENTUM_PER_SPD_LVL, cap: CROSS_SCALE.BLACKOUT_MOMENTUM_CAP, effect: '+armed release hit damage (speed)' }],
  SLIP: [{ key: 'SLIP_COUNTER_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.SLIP_COUNTER_ATK_PER_ATK_LVL, cap: CROSS_SCALE.SLIP_COUNTER_ATK_CAP, effect: '+counter damage (attack)' }],
  PARRY: [{ key: 'PARRY_REFLECT_DEF_PER_DEF_LVL', perLevel: CROSS_SCALE.PARRY_REFLECT_DEF_PER_DEF_LVL, cap: CROSS_SCALE.PARRY_REFLECT_DEF_CAP, effect: '+dodge reflect % (defense)' }],
  GRAVITY_SHIFT: [{ key: 'GRAVITY_SLOW_TURNS_PER_LCK_LVL', perLevel: CROSS_SCALE.GRAVITY_SLOW_TURNS_PER_LCK_LVL, cap: CROSS_SCALE.GRAVITY_SLOW_TURNS_CAP, effect: '+slow turns (luck)' }],
  REFRACT: [{ key: 'REFRACT_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.REFRACT_ATK_PER_ATK_LVL, cap: CROSS_SCALE.REFRACT_ATK_CAP, effect: '+mirrored damage (attack)' }],
  HYPERDRIVE: [{ key: 'HYPERDRIVE_SETUP_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.HYPERDRIVE_SETUP_ATK_PER_ATK_LVL, cap: CROSS_SCALE.HYPERDRIVE_SETUP_ATK_CAP, effect: '+setup hit damage (attack)' }],
  HOLD: [{ key: 'HOLD_BRACE_CHIP_PER_ATK_LVL', perLevel: CROSS_SCALE.HOLD_BRACE_CHIP_PER_ATK_LVL, cap: CROSS_SCALE.HOLD_BRACE_CHIP_CAP, effect: '+brace chip damage on hit (attack)' }],
  ANCHOR: [{ key: 'ANCHOR_BRACE_HEAL_PER_LCK_LVL', perLevel: CROSS_SCALE.ANCHOR_BRACE_HEAL_PER_LCK_LVL, cap: CROSS_SCALE.ANCHOR_BRACE_HEAL_CAP, effect: '+heal HP on brace (luck)' }],
  SECOND_WIND: [{ key: 'SECOND_WIND_LCK_HEAL_PER_LVL', perLevel: CROSS_SCALE.SECOND_WIND_LCK_HEAL_PER_LVL, cap: CROSS_SCALE.SECOND_WIND_LCK_HEAL_CAP, effect: '+heal % of maxHp (luck)' }],
  COUNTERWEIGHT: [{ key: 'COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL, cap: CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_CAP, effect: '+reflect % on proc (attack)' }],
  BRICK_WALL: [{ key: 'BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL, cap: CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_CAP, effect: '+next player hit damage after nullify (attack)' }],
  INVINCIBLE: [{ key: 'INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL', perLevel: CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL, cap: CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_CAP, effect: '-sacrifice HP % (luck)' }],
  WHISPER: [{ key: 'WHISPER_SHAKE_WEAKEN_PER_SPD_LVL', perLevel: CROSS_SCALE.WHISPER_SHAKE_WEAKEN_PER_SPD_LVL, cap: CROSS_SCALE.WHISPER_SHAKE_WEAKEN_CAP, effect: '+shake weaken (lower enemy outgoing mult; speed)' }],
  LOOP: [{ key: 'LOOP_REPEAT_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.LOOP_REPEAT_ATK_PER_ATK_LVL, cap: CROSS_SCALE.LOOP_REPEAT_ATK_CAP, effect: '+loop strike damage (attack)' }],
  DEVILS_CUT: [{ key: 'DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL', perLevel: CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL, cap: CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_CAP, effect: '+lifesteal % (attack)' }],
  SNAG: [{ key: 'SNAG_STOLEN_PER_NATIVE_LVL', perLevel: CROSS_SCALE.SNAG_STOLEN_PER_NATIVE_LVL, cap: CROSS_SCALE.SNAG_STOLEN_CAP, effect: '+stolen move power (native skill of stolen enemy move)' }],
  PHENOMENA: [
    { key: 'PHENOMENA_ROLL_BIAS_PER_LCK_LVL', perLevel: CROSS_SCALE.PHENOMENA_ROLL_BIAS_PER_LCK_LVL, cap: Infinity, effect: '+chance to bump roll toward better outcome (luck)' },
    { key: 'PHENOMENA_DEF_FLOOR_PER_DEF_LVL', perLevel: CROSS_SCALE.PHENOMENA_DEF_FLOOR_PER_DEF_LVL, cap: CROSS_SCALE.PHENOMENA_DEF_FLOOR_CAP, effect: '+chaos damage floor (defense)' },
  ],
}

function formatStatus(spec: StatusApplySpec): Record<string, unknown> {
  if (typeof spec === 'string') return { effect: spec, turns: STATUS_DEFAULT_TURNS[spec] }
  return {
    effect: spec.effect,
    turns: spec.turns ?? STATUS_DEFAULT_TURNS[spec.effect],
    reflectPercent: spec.reflectPercent,
  }
}

function summarizeBehavior(b: MoveBehavior, moveId: string): Record<string, unknown> {
  const base: Record<string, unknown> = { kind: b.kind }

  switch (b.kind) {
    case 'damage': {
      const p = b.profile
      return {
        ...base,
        damageMult: p.damageMult,
        openingBonusMult: p.openingBonusMult,
        takeEnemyHit: p.takeEnemyHit,
        damageFloor: p.damageFloor,
        crit: p.crit,
        primaryFormula: 'jitter(floor(atk * damageMult * earlyStrikeScale)); openingBonus if !enemyAttacks',
        statusesFromCrit: p.crit?.onCrit ?? [],
        bleedOnCritOnly: p.crit?.bleedOnCritOnly,
      }
    }
    case 'fury-sweep':
      return {
        ...base,
        ...b.profile,
        primaryFormula: 'jitter(max(damageFloor, floor(atk * damageMult))); bleed on crit only',
      }
    case 'dodge':
      return {
        ...base,
        dodgeSuccess: 'speedDodgeSuccessChance(spd) = min(0.99, SPD_DODGE_BASE_CHANCE(0.68) + spd*0.02)',
        counterMult: b.profile.counterMult,
        weakMult: b.profile.weakMult,
        stunOnDodge: { formula: 'roll < base + lck*lckMult', ...b.profile.stunChance },
        onDodgeReflectPct: b.profile.onDodgeReflectPct,
        counterFormula: 'jitter(floor(atk * counterMult * (1 + spd dodge + spd counter + slip atk hook)))',
        whiffFormula: 'jitter(floor(atk * weakMult)); incoming jitter(floor(eDmg * weakMult))',
      }
    case 'brace':
      return {
        ...base,
        incomingMult: b.profile.incomingMult,
        blockStatus: b.profile.blockStatus,
        incomingFormula: 'floor(eDmg * braceIncomingMultiplier(incomingMult, def))',
        perfectGuard: true,
        holdChip: moveId === 'HOLD' ? 'crossSecondaryFlat(atk skill) on incoming hit' : undefined,
        anchorHeal: moveId === 'ANCHOR' ? 'crossSecondaryFlat(luck) HP on incoming hit' : undefined,
      }
    case 'dark-break':
      return {
        ...base,
        damageMult: b.profile.damageMult,
        enemyAccuracyMult: b.accuracyMult,
        enemyAccuracyTurns: `${b.accuracyTurns.min}–${b.accuracyTurns.max} + spd hook`,
        debuff: 'enemy accuracy reduced (multiplicative on their hits)',
      }
    case 'cannon':
      return {
        ...base,
        damageMult: b.profile.damageMult,
        crit: b.profile.crit,
        defShatterChance: b.defShatterChance,
        defShatterEffect: 'enemyDefShattered flag on crit proc',
      }
    case 'blackout':
      return {
        ...base,
        cost: 'loadTurn',
        phases: ['idle→loading (exposed)', 'armed→release', 'recharging'],
        releaseDamageMult: MB.BLACKOUT_ARMED_DAMAGE_MULT,
        releaseDodge: `speedDodgeSuccess * ${MB.BLACKOUT_RELEASE_DODGE_MULT}`,
        interruptible: MB.BLACKOUT_INTERRUPTIBLE,
      }
    case 'gravity-shift':
      return {
        ...base,
        chipDamageMult: 0.35,
        slowTurns: `${b.slowTurns.min}–${b.slowTurns.max} + luck hook`,
        enemySlowOutgoingMult: MB.ENEMY_SLOW_OUTGOING_MULT,
      }
    case 'refract':
      return { ...base, mirrors: 'floor(lastEnemyDamage * REFRACT_DAMAGE_MULT * atk hook)', REFRACT_DAMAGE_MULT: MB.REFRACT_DAMAGE_MULT }
    case 'hyperdrive':
      return {
        ...base,
        cost: 'rechargeTurn',
        setupDamageMult: 0.25,
        effect: 'hyperdriveArmed=true → next STRIKE damage x2; player skip next turn (exposed)',
      }
    case 'counterweight':
      return {
        ...base,
        blockPct: `${MB.COUNTERWEIGHT_BLOCK_PCT_MIN}–${MB.COUNTERWEIGHT_BLOCK_PCT_MAX}`,
        reflectChance: MB.COUNTERWEIGHT_REFLECT_CHANCE,
        reflectPct: `${MB.COUNTERWEIGHT_REFLECT_PCT_MIN}–${MB.COUNTERWEIGHT_REFLECT_PCT_MAX} + atk hook`,
        effect: 'arms block % for next heavy; chance to reflect portion',
      }
    case 'brick-wall':
      return { ...base, effect: 'nullify next incoming hit; next player damage gets atk followup mult' }
    case 'invincible':
      return {
        ...base,
        cost: 'oncePerBattle',
        sacrificePct: `max(0.01, ${MB.INVINCIBLE_SACRIFICE_PCT} - luck hook) of current HP`,
        blockCount: MB.INVINCIBLE_BLOCK_COUNT,
      }
    case 'loop':
      return { ...base, damageMult: MB.LOOP_DAMAGE_MULT, effect: 'forceEnemyMove = lastEnemyMove' }
    case 'snag':
      return {
        ...base,
        stealFrom: 'npc move pool',
        nonAttackFallback: 'jitter(floor(atk * 0.3))',
        stolenAttack: 'floor(atk * enemy.damageMult * stolenScale)',
        stolenNonAttack: 'jitter(floor(atk * 0.4 * stolenScale))',
      }
    case 'phenomena':
      return {
        ...base,
        rollOutcomes: [
          'bleed', 'shake', 'stun', 'slow', 'miss', 'double', 'reflect',
          `chaos dmg atk * ${MB.PHENOMENA_DAMAGE_MULT_MIN}–${MB.PHENOMENA_DAMAGE_MULT_MAX}`,
          `heal maxHp * ${MB.PHENOMENA_HEAL_PCT_MIN}–${MB.PHENOMENA_HEAL_PCT_MAX}`,
        ],
        rollChanceEach: '1/9 uniform (+ luck bias chance)',
      }
    case 'sealed-fate':
      return {
        ...base,
        deathClockDamage: `floor(atk * ${MB.SEALED_FATE_DAMAGE_MULT})`,
        deathClockTurns: `${MB.SEALED_FATE_TURN_MIN}–${MB.SEALED_FATE_TURN_MAX}`,
        hitChance: MB.SEALED_FATE_HIT_CHANCE,
        missSelfDamagePct: MB.SEALED_FATE_MISS_SELF_DAMAGE_PCT,
      }
    case 'second-wind':
      return {
        ...base,
        cost: 'oncePerBattle',
        healPct: `min(${MB.SECOND_WIND_HEAL_CAP_PCT}, ${MB.SECOND_WIND_HEAL_BASE_PCT} + def*${MB.SECOND_WIND_HEAL_PER_DEF_PCT} + luck hook) of maxHp`,
      }
    case 'devils-cut':
      return {
        ...base,
        damageMult: MB.DEVILS_CUT_DAMAGE_MULT,
        lifestealPct: `min(${MB.DEVILS_CUT_LIFESTEAL_CAP}, ${MB.DEVILS_CUT_LIFESTEAL_BASE} + lck*${MB.DEVILS_CUT_LIFESTEAL_PER_LCK} + atk hook)`,
        lifestealTurns: `${MB.DEVILS_CUT_TURNS_MIN}–${MB.DEVILS_CUT_TURNS_MAX}`,
      }
    default:
      return base
  }
}

function specialTags(behavior: MoveBehavior, moveId: string, onResolve: StatusApplySpec[]): string[] {
  const tags: string[] = []
  const k = behavior.kind
  if (k === 'dodge') tags.push('dodge', 'counter')
  if (k === 'brace') tags.push('brace', 'block')
  if (k === 'brick-wall') tags.push('nullify', 'cap-move')
  if (k === 'invincible') tags.push('nullify', 'once-per-battle', 'cap-move')
  if (k === 'second-wind') tags.push('heal', 'once-per-battle', 'cap-move')
  if (k === 'sealed-fate') tags.push('death-clock', 'cap-move')
  if (k === 'refract') tags.push('reflect-mirror')
  if (k === 'counterweight') tags.push('block', 'reflect')
  if (k === 'devils-cut') tags.push('lifesteal')
  if (k === 'loop') tags.push('force-repeat')
  if (k === 'snag') tags.push('steal-move')
  if (k === 'phenomena') tags.push('rng', 'cap-move')
  if (k === 'blackout') tags.push('charge-move', 'cap-move')
  if (k === 'hyperdrive') tags.push('charge-move', 'buff-next-strike')
  if (moveId === 'PARRY' && behavior.kind === 'dodge') tags.push('reflect')
  if (behavior.kind === 'damage' && behavior.profile.crit?.onCrit?.includes('bleed')) tags.push('bleed-on-crit')
  if (behavior.kind === 'fury-sweep') tags.push('bleed-on-crit')
  if (onResolve.some((s) => (typeof s === 'string' ? s : s.effect) === 'shake')) tags.push('shake')
  return [...new Set(tags)]
}

const playerMoves = PLAYER_MOVE_IDS.map((id) => {
  const m = MOVES[id]
  const scale = CROSS_SCALE_MAP[id]
  return {
    id: m.id,
    name: m.displayName,
    skillLadder: m.skill,
    ladderRung: m.ladderRung,
    unlockAtSkillLevel: m.unlockAtSkillLevel,
    cost: m.cost,
    primaryStat: scale.primary,
    secondaryStat: scale.secondary,
    secondaryHooks: (CROSS_HOOKS[id] ?? []).map((h) => ({
      ...h,
      secondaryShare: CROSS_SCALE.SECONDARY_SHARE,
      bonusFormula: 'min(cap, secondaryLevel * perLevel) * SECONDARY_SHARE (0.25)',
      multFormula: '1 + bonus (for damage/counter mult hooks)',
    })),
    behavior: summarizeBehavior(m.behavior, id),
    statusOnResolve: m.onResolve.map(formatStatus),
    specialBehavior: specialTags(m.behavior, id, m.onResolve),
    uiDescription: m.uiDescription,
  }
})

const enemyMoves = ENEMY_MOVE_IDS.map((id) => {
  const m = ENEMY_MOVES[id]
  const tags: string[] = []
  if (m.isAttacking) tags.push('attack')
  else if (id === 'HOLD') tags.push('brace', 'guard-counter-if-npc-has-guardCounter')
  else if (id === 'BAIT') tags.push('feint', 'invites-player-swing')
  else if (id === 'WHISPER') tags.push('non-attack', 'shake-not-yet-implemented-on-enemy-side')

  return {
    id: m.id,
    name: m.displayName,
    skillType: m.skillType,
    telegraphLine: m.telegraphLine,
    isAttacking: m.isAttacking,
    primaryStat: m.skillType === 'neutral' ? null : m.skillType,
    damageFormula: m.isAttacking ? `jitter(floor(npcAtk * ${m.damageMult}))` : null,
    damageMult: m.damageMult,
    statusOnResolve: m.onResolve.map(formatStatus),
    specialBehavior: tags,
    notes:
      id === 'LOOP' || id === 'HAYMAKER'
        ? `heavy telegraph; mult = ENEMY_LOOP_STRIKE_MULT (${MB.ENEMY_LOOP_STRIKE_MULT})`
        : id === 'HOLD'
          ? 'NPC guardCounter (per-fighter): chance riposte when player attacks into HOLD'
          : id === 'WHISPER'
            ? 'Enemy-side shake debuff not implemented yet (player WHISPER applies shake)'
            : undefined,
  }
})

console.log(
  JSON.stringify(
    {
      meta: {
        sources: ['moveDefinitions.ts', 'moveBalance.ts', 'enemyMoves.ts', 'moveResolver.ts', 'moveUnlock.ts'],
        ladderUnlockLevels: { rung1: 0, rung2: 10, rung3: 22, rung4: 38, rung5: 52, rung6: 65 },
        statusDefaultTurns: STATUS_DEFAULT_TURNS,
        bleedChip: `enemy maxHp * ${MB.BLEED_DAMAGE_MAX_HP_PCT} per turn (potency mult applies)`,
        crossScaleSecondaryShare: CROSS_SCALE.SECONDARY_SHARE,
      },
      playerMoves,
      enemyMoves,
    },
    null,
    2,
  ),
)

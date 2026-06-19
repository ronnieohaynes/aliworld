/** Tunable combat balance, adjust here during playtests.
 *  Leveling depth: display level is cosmetic; fights use skill bonuses below + counter loop.
 *  Build matchup + timing should beat a modest (~3–5 skill step) raw-stat gap. */

import type { PlayerMoveId } from './moveIds'

/** Sub-linear stat steps: full linear growth through this raw skill level, then tail factor. */
export const SKILL_STAT_BONUS_LINEAR_CAP = 18
export const SKILL_STAT_BONUS_TAIL_FACTOR = 0.72
/** Max HP per effective skill step (softened from 2, keeps attrition fights winnable). */
export const SKILL_HP_BONUS_PER_LEVEL = 3

export const BLACKOUT_INTERRUPTIBLE = true

/** Minimum player damage on fury sweep (worst roll still matters). */
export const FURY_SWEEP_DAMAGE_FLOOR = 6

export const FURY_SWEEP_CRIT_MULT = 1.2
export const FURY_SWEEP_CRIT_BASE = 8
export const FURY_SWEEP_CRIT_LCK_MULT = 2
export const FURY_SWEEP_DAMAGE_MULT = 1.15
export const BLEED_TURNS_MIN = 1
export const BLEED_TURNS_MAX = 3
export const FURY_SWEEP_BLEED_TURNS_MIN = BLEED_TURNS_MIN
export const FURY_SWEEP_BLEED_TURNS_MAX = BLEED_TURNS_MAX

export const DARK_BREAK_DAMAGE_MULT = 0.45
export const DARK_BREAK_ACCURACY_MULT = 0.5
export const DARK_BREAK_ACCURACY_TURNS_MIN = 2
export const DARK_BREAK_ACCURACY_TURNS_MAX = 3

export const CANNON_DAMAGE_MULT = 1.1
export const CANNON_CRIT_BASE = 28
export const CANNON_CRIT_LCK_MULT = 2.5
export const CANNON_CRIT_MULT = 1.5
export const CANNON_DEF_SHATTER_CHANCE = 0.05

export const BLACKOUT_ARMED_DAMAGE_MULT = 3.2
/** Dodge chance multiplier on blackout release (huge hit, not free, but answerable). */
export const BLACKOUT_RELEASE_DODGE_MULT = 0.62

export const SECOND_WIND_HEAL_BASE_PCT = 0.2
export const SECOND_WIND_HEAL_PER_DEF_PCT = 0.01
export const SECOND_WIND_HEAL_CAP_PCT = 0.4

export const DEVILS_CUT_TURNS_MIN = 2
export const DEVILS_CUT_TURNS_MAX = 3
export const DEVILS_CUT_DAMAGE_MULT = 0.42
export const DEVILS_CUT_LIFESTEAL_BASE = 0.1
export const DEVILS_CUT_LIFESTEAL_PER_LCK = 0.0035
export const DEVILS_CUT_LIFESTEAL_CAP = 0.2

export const PARRY_DODGE_COUNTER_MULT = 0.72
export const PARRY_DODGE_WEAK_MULT = 0.35
export const PARRY_ON_DODGE_REFLECT_PCT = 0.02

export const GRAVITY_SHIFT_SLOW_TURNS_MIN = 2
export const GRAVITY_SHIFT_SLOW_TURNS_MAX = 5

export const COUNTERWEIGHT_BLOCK_PCT_MIN = 0.5
export const COUNTERWEIGHT_BLOCK_PCT_MAX = 0.8
export const COUNTERWEIGHT_REFLECT_CHANCE = 0.35
export const COUNTERWEIGHT_REFLECT_PCT_MIN = 0.02
export const COUNTERWEIGHT_REFLECT_PCT_MAX = 0.1

export const INVINCIBLE_SACRIFICE_PCT = 0.5
export const INVINCIBLE_BLOCK_COUNT = 3

export const SEALED_FATE_TURN_MIN = 1
export const SEALED_FATE_TURN_MAX = 3
export const SEALED_FATE_DAMAGE_MULT = 3
/** Death clock lands this often; on miss, player pays missSelfDamagePct of current HP. */
export const SEALED_FATE_HIT_CHANCE = 0.99
export const SEALED_FATE_MISS_SELF_DAMAGE_PCT = 0.8

export const PHENOMENA_DAMAGE_MULT_MIN = 0.35
export const PHENOMENA_DAMAGE_MULT_MAX = 1.25
export const PHENOMENA_HEAL_PCT_MIN = 0.08
export const PHENOMENA_HEAL_PCT_MAX = 0.22

export const REFRACT_DAMAGE_MULT = 1

export const LOOP_DAMAGE_MULT = 0.55

/** Enemy outgoing damage multiplier while shaken (0–1). */
export const ENEMY_SHAKE_OUTGOING_MULT = 0.4
/** Enemy outgoing damage multiplier while slowed (0–1). */
export const ENEMY_SLOW_OUTGOING_MULT = 0.56
/** Bleed chip each turn as a fraction of enemy max hp. */
export const BLEED_DAMAGE_MAX_HP_PCT = 0.09
/** Shared enemy LOOP / HAYMAKER strike multiplier, telegraphed heavies. */
export const ENEMY_LOOP_STRIKE_MULT = 2

/** Combat XP scales with enemy level vs player level (clamp). */
export const XP_LEVEL_GAP_PER_LEVEL = 0.15
export const XP_LEVEL_MULT_MIN = 0.6
export const XP_LEVEL_MULT_MAX = 2

export function combatXpLevelMultiplier(enemyLevel: number, playerLevel: number): number {
  const gap = enemyLevel - playerLevel
  const raw = 1 + XP_LEVEL_GAP_PER_LEVEL * gap
  return Math.min(XP_LEVEL_MULT_MAX, Math.max(XP_LEVEL_MULT_MIN, raw))
}

/** Flatten early STRIKE damage so tutorial fights breathe (~4–6 turns). */
export const EARLY_STRIKE_SKILL_LEVEL_MAX = 3
export const EARLY_STRIKE_DAMAGE_FLOOR_MULT = 0.55
export const EARLY_STRIKE_ATK_CONTRIB_MULT = 0.65

export function earlyStrikeDamageScale(attackSkillLevel: number): number {
  if (attackSkillLevel > EARLY_STRIKE_SKILL_LEVEL_MAX) return 1
  const t = attackSkillLevel / EARLY_STRIKE_SKILL_LEVEL_MAX
  return EARLY_STRIKE_DAMAGE_FLOOR_MULT + (1 - EARLY_STRIKE_DAMAGE_FLOOR_MULT) * t
}

/** Defense skill, brace blocks more per level (multiplier reduction, capped). */
export const DEF_MITIGATION_PER_LEVEL = 0.025
/** Defense skill, passive incoming damage reduction per level (kept modest vs counter loop). */
export const DEF_PASSIVE_MITIGATION_PER_LEVEL = 0.009
/** Hard cap on total defense mitigation so builds never become invincible. */
export const DEF_MAX_MITIGATION = 0.6
/** Brace never shrinks incoming below this fraction of raw hit damage. */
export const DEF_BRACE_INCOMING_FLOOR = 0.1
/** Bonus damage on the next strike after a successful brace (per defense level). */
export const DEF_PERFECT_GUARD_BONUS_PER_LEVEL = 0.05
export const DEF_PERFECT_GUARD_BONUS_MAX = 0.35

/** Passive brace status multiplier at defense skill 1 (scales up with def). */
export const DEF_BRACE_STATUS_BASE_MULT = 0.6

export function defensePassiveMitigationFraction(defSkillLevel: number): number {
  return Math.min(DEF_MAX_MITIGATION, defSkillLevel * DEF_PASSIVE_MITIGATION_PER_LEVEL)
}

/** Scale active brace (HOLD) incoming multiplier down as defense rises. */
export function braceIncomingMultiplier(baseMult: number, defSkillLevel: number): number {
  const defBonus = Math.min(0.5, defSkillLevel * DEF_MITIGATION_PER_LEVEL)
  const scaled = baseMult * (1 - defBonus)
  return Math.max(DEF_BRACE_INCOMING_FLOOR, scaled)
}

/** Brace status chip mitigation, stronger at higher defense skill. */
export function braceStatusIncomingMultiplier(defSkillLevel: number): number {
  const bonus = Math.min(0.35, Math.max(0, defSkillLevel - 1) * DEF_MITIGATION_PER_LEVEL)
  return Math.max(DEF_BRACE_INCOMING_FLOOR, DEF_BRACE_STATUS_BASE_MULT - bonus)
}

export function perfectGuardDamageBonus(defSkillLevel: number): number {
  return Math.min(DEF_PERFECT_GUARD_BONUS_MAX, defSkillLevel * DEF_PERFECT_GUARD_BONUS_PER_LEVEL)
}

export function applyDefensePassiveMitigation(incoming: number, defSkillLevel: number): number {
  if (incoming <= 0) return 0
  const frac = defensePassiveMitigationFraction(defSkillLevel)
  return Math.max(1, Math.floor(incoming * (1 - frac)))
}

/** Speed skill, dodge reliability and counter scaling per level. */
export const SPD_DODGE_PER_LEVEL = 0.02
export const SPD_DODGE_MAX = 0.5
/** Extra counter damage multiplier per speed level (on top of dodge bonus). */
export const SPD_COUNTER_BONUS_PER_LEVEL = 0.09
export const SPD_COUNTER_BONUS_MAX = 0.8
/** Base dodge success before speed skill bonus (keeps early SLIP survivable). */
export const SPD_DODGE_BASE_CHANCE = 0.68
/** Speed skill bonus added to combat spd for initiative ties. */
export const SPD_INITIATIVE_WEIGHT = 1

export function speedDodgeBonus(spdSkillLevel: number): number {
  return Math.min(SPD_DODGE_MAX, spdSkillLevel * SPD_DODGE_PER_LEVEL)
}

export function speedCounterBonus(spdSkillLevel: number): number {
  return Math.min(SPD_COUNTER_BONUS_MAX, spdSkillLevel * SPD_COUNTER_BONUS_PER_LEVEL)
}

export function speedDodgeSuccessChance(spdSkillLevel: number): number {
  return Math.min(0.99, SPD_DODGE_BASE_CHANCE + speedDodgeBonus(spdSkillLevel))
}

export function speedInitiativeBonus(spdSkillLevel: number): number {
  return Math.max(0, spdSkillLevel - 1) * SPD_INITIATIVE_WEIGHT
}

/** Luck stat weight in crit rolls, makes luck investment show up in fight feel. */
export const LCK_CRIT_STAT_SCALE = 1.48

/** Move XP, scale rewards with what each skill actually accomplished.
 *  One multiplier per skill: every move in that skill applies the same rate
 *  to its damage-based outcome, with move identity expressed via flat bonuses. */
export const XP_DAMAGE_DEALT_MULT = 2
/** Higher than damage-dealt, defensive actions happen on fewer turns. */
export const XP_DAMAGE_BLOCKED_MULT = 5
export const XP_DAMAGE_AVOIDED_MULT = 5
/** Speed skill's shared rate for moves that deal damage as part of their effect
 *  (counter-trades, GRAVITY_SHIFT, REFRACT), distinct from the dodge-avoidance
 *  rate above, which uses XP_DAMAGE_AVOIDED_MULT. */
export const XP_SPEED_DAMAGE_MULT = 3
/** Flat XP for pure-utility moves (HYPERDRIVE, SNAG, SEALED_FATE, INVINCIBLE,
 *  SECOND_WIND, GRAVITY_SHIFT, BRICK_WALL) on top of any damage/block/avoid/heal
 *  XP they earn, these moves carry real strategic cost (recharge, once-per-
 *  battle) even on a turn where nothing damage-related happens. */
export const XP_UTILITY_MOVE_BONUS = 12
/** Flat bonus when brace/dodge succeeds so low-block turns still progress. */
export const XP_DEFENSE_SPEED_ACTION_BONUS = 10
export const XP_LUCK_PROC_BONUS = 16
/** Luck moves that chip damage, lower weight than attack damage XP. */
export const XP_LUCK_DAMAGE_MULT = 5
export const XP_FALLBACK_SMALL = 6

/** Bonus skill XP for skilled timing, meaningful boost, not a level shortcut. */
export const COUNTER_XP_BONUS = 14
export const PERFECT_GUARD_XP_BONUS = 16
export const ADVANTAGE_XP_BONUS = 12
export const TELEGRAPH_READ_XP_BONUS = 18

/** Soft skill counter loop, attack > speed > luck > defense > attack. */
export const COUNTER_ADVANTAGE_DMG_MULT = 1.22
export const COUNTER_DISADVANTAGE_DMG_MULT = 0.82
export const COUNTER_ADVANTAGE_INCOMING_MULT = 0.82
export const COUNTER_DISADVANTAGE_INCOMING_MULT = 1.22

// ---------------------------------------------------------------------------
// CROSS_SCALE, secondary stat hooks (~25% swing). Primary ladder stays ~75%.
// Tune per-move weights here; resolver reads these only (no hardcoded hooks).
// ---------------------------------------------------------------------------

export type CrossScaleSkill = 'attack' | 'speed' | 'defense' | 'luck'

/** Fraction of an effect's swing contributed by the secondary stat at cap investment. */
export const CROSS_SCALE_SECONDARY_SHARE = 0.25

export const CROSS_SCALE = {
  SECONDARY_SHARE: CROSS_SCALE_SECONDARY_SHARE,

  // ATTACK ladder, secondary hooks
  /** STRIKE: +crit chance % per luck skill level (small). */
  STRIKE_CRIT_CHANCE_PER_LCK_LVL: 0.4,
  /** FURY_SWEEP: extra bleed turns on crit (luck). */
  FURY_BLEED_TURNS_PER_LCK_LVL: 0.1,
  FURY_BLEED_TURNS_CAP: 2,
  /** FURY_SWEEP: bleed chip multiplier bonus (luck). */
  FURY_BLEED_POTENCY_PER_LCK_LVL: 0.015,
  FURY_BLEED_POTENCY_CAP: 0.35,
  /** DARK_BREAK: extra accuracy-down turns (speed). */
  DARK_BREAK_EXTRA_TURNS_PER_SPD_LVL: 0.06,
  DARK_BREAK_EXTRA_TURNS_CAP: 1,
  /** CANNON: crit damage multiplier bonus (luck). */
  CANNON_CRIT_DMG_PER_LCK_LVL: 0.022,
  CANNON_CRIT_DMG_CAP: 0.35,
  /** BLACKOUT: armed-hit damage momentum (speed). */
  BLACKOUT_MOMENTUM_PER_SPD_LVL: 0.014,
  BLACKOUT_MOMENTUM_CAP: 0.28,

  // SPEED ladder, secondary hooks
  /** SLIP: counter damage from attack skill investment. */
  SLIP_COUNTER_ATK_PER_ATK_LVL: 0.016,
  SLIP_COUNTER_ATK_CAP: 0.32,
  /** PARRY: reflect fraction + sting from defense skill. */
  PARRY_REFLECT_DEF_PER_DEF_LVL: 0.012,
  PARRY_REFLECT_DEF_CAP: 0.28,
  /** GRAVITY_SHIFT: slow duration (luck). */
  GRAVITY_SLOW_TURNS_PER_LCK_LVL: 0.08,
  GRAVITY_SLOW_TURNS_CAP: 1.5,
  /** REFRACT: mirrored damage (attack skill). */
  REFRACT_ATK_PER_ATK_LVL: 0.018,
  REFRACT_ATK_CAP: 0.32,
  /** HYPERDRIVE: setup-hit multiplier relief (attack skill). */
  HYPERDRIVE_SETUP_ATK_PER_ATK_LVL: 0.014,
  HYPERDRIVE_SETUP_ATK_CAP: 0.3,

  // DEFENSE ladder, secondary hooks
  /** HOLD: chip damage on successful brace (attack skill), 1–3 hp scale. */
  HOLD_BRACE_CHIP_PER_ATK_LVL: 0.22,
  HOLD_BRACE_CHIP_CAP: 3,
  /** ANCHOR: heal-on-brace (luck), small anti-stall. */
  ANCHOR_BRACE_HEAL_PER_LCK_LVL: 0.18,
  ANCHOR_BRACE_HEAL_CAP: 3,
  /** SECOND_WIND: heal pct bonus from luck skill. */
  SECOND_WIND_LCK_HEAL_PER_LVL: 0.004,
  SECOND_WIND_LCK_HEAL_CAP: 0.08,
  /** COUNTERWEIGHT: reflect pct bonus (attack skill). */
  COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL: 0.012,
  COUNTERWEIGHT_REFLECT_ATK_CAP: 0.05,
  /** BRICK_WALL: next-hit damage mult after nullify (attack skill). */
  BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL: 0.012,
  BRICK_WALL_FOLLOWUP_ATK_CAP: 0.22,
  /** INVINCIBLE: sacrifice hp pct relief (luck). */
  INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL: 0.009,
  INVINCIBLE_SACRIFICE_RELIEF_CAP: 0.14,

  // LUCK ladder, secondary hooks
  /** WHISPER: extra shake weaken, lower outgoing mult (speed). */
  WHISPER_SHAKE_WEAKEN_PER_SPD_LVL: 0.012,
  WHISPER_SHAKE_WEAKEN_CAP: 0.12,
  /** LOOP: repeat-window strike bonus (attack skill). */
  LOOP_REPEAT_ATK_PER_ATK_LVL: 0.016,
  LOOP_REPEAT_ATK_CAP: 0.3,
  /** SNAG: stolen move power per level of that move's native skill. */
  SNAG_STOLEN_PER_NATIVE_LVL: 0.014,
  SNAG_STOLEN_CAP: 0.28,
  /** PHENOMENA: roll floor bias (luck) + chaos dmg floor (defense). */
  PHENOMENA_ROLL_BIAS_PER_LCK_LVL: 0.12,
  PHENOMENA_DEF_FLOOR_PER_DEF_LVL: 0.01,
  PHENOMENA_DEF_FLOOR_CAP: 0.12,
  /** DEVIL'S CUT: lifesteal pct bonus (attack skill). */
  DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL: 0.0022,
  DEVILS_CUT_LIFESTEAL_ATK_CAP: 0.06,
} as const

/** Primary + secondary stat for UI tags and audits. SEALED_FATE has no secondary. */
export const CROSS_SCALE_MAP: Record<
  PlayerMoveId,
  { primary: CrossScaleSkill; secondary: CrossScaleSkill | null }
> = {
  STRIKE: { primary: 'attack', secondary: 'luck' },
  FURY_SWEEP: { primary: 'attack', secondary: 'luck' },
  DARK_BREAK: { primary: 'attack', secondary: 'speed' },
  CANNON: { primary: 'attack', secondary: 'luck' },
  BLACKOUT: { primary: 'attack', secondary: 'speed' },
  SLIP: { primary: 'speed', secondary: 'attack' },
  PARRY: { primary: 'speed', secondary: 'defense' },
  GRAVITY_SHIFT: { primary: 'speed', secondary: 'luck' },
  REFRACT: { primary: 'speed', secondary: 'attack' },
  HYPERDRIVE: { primary: 'speed', secondary: 'attack' },
  HOLD: { primary: 'defense', secondary: 'attack' },
  ANCHOR: { primary: 'defense', secondary: 'luck' },
  SECOND_WIND: { primary: 'defense', secondary: 'luck' },
  COUNTERWEIGHT: { primary: 'defense', secondary: 'attack' },
  BRICK_WALL: { primary: 'defense', secondary: 'attack' },
  INVINCIBLE: { primary: 'defense', secondary: 'luck' },
  WHISPER: { primary: 'luck', secondary: 'speed' },
  LOOP: { primary: 'luck', secondary: 'attack' },
  DEVILS_CUT: { primary: 'luck', secondary: 'attack' },
  SNAG: { primary: 'luck', secondary: null },
  PHENOMENA: { primary: 'luck', secondary: 'defense' },
  SEALED_FATE: { primary: 'luck', secondary: null },
}

const CROSS_SCALE_SKILL_LABEL: Record<CrossScaleSkill, string> = {
  attack: 'atk',
  speed: 'spd',
  defense: 'def',
  luck: 'lck',
}

/** UI line e.g. "scales: atk · lck" */
export function crossScaleUiLabel(moveId: PlayerMoveId): string | null {
  if (moveId === 'SNAG') return 'scales: lck · native'
  if (moveId === 'SEALED_FATE') return null
  const entry = CROSS_SCALE_MAP[moveId]
  const parts = [CROSS_SCALE_SKILL_LABEL[entry.primary]]
  if (entry.secondary) parts.push(CROSS_SCALE_SKILL_LABEL[entry.secondary])
  return `scales: ${parts.join(' · ')}`
}

/** Structured scale tags for stat-colored UI (primary first, then secondary). */
export function crossScaleUiParts(
  moveId: PlayerMoveId,
): { skill: CrossScaleSkill | 'native'; label: string }[] | null {
  if (moveId === 'SEALED_FATE') return null
  if (moveId === 'SNAG') {
    return [
      { skill: 'luck', label: 'lck' },
      { skill: 'native', label: 'native' },
    ]
  }
  const entry = CROSS_SCALE_MAP[moveId]
  const parts: { skill: CrossScaleSkill | 'native'; label: string }[] = [
    { skill: entry.primary, label: CROSS_SCALE_SKILL_LABEL[entry.primary] },
  ]
  if (entry.secondary) {
    parts.push({
      skill: entry.secondary,
      label: CROSS_SCALE_SKILL_LABEL[entry.secondary],
    })
  }
  return parts
}

/** Additive bonus capped, for crit %, heal pct, reflect pct slices. */
export function crossSecondaryBonus(
  secondaryLevel: number,
  perLevel: number,
  cap: number,
): number {
  return Math.min(cap, secondaryLevel * perLevel) * CROSS_SCALE.SECONDARY_SHARE
}

/** Multiplier 1 + bonus, for damage/counter/hit mult hooks. */
export function crossSecondaryMultiplier(
  secondaryLevel: number,
  perLevel: number,
  cap: number,
): number {
  return 1 + crossSecondaryBonus(secondaryLevel, perLevel, cap)
}

/** Small flat integer bonus, brace chip, extra turns, heal hp. */
export function crossSecondaryFlat(
  secondaryLevel: number,
  perLevel: number,
  cap: number,
): number {
  return Math.min(cap, Math.floor(secondaryLevel * perLevel * CROSS_SCALE.SECONDARY_SHARE))
}

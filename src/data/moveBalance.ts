/** Tunable combat balance — adjust here during playtests. */

export const BLACKOUT_INTERRUPTIBLE = true

/** Minimum player damage on fury sweep (worst roll still matters). */
export const FURY_SWEEP_DAMAGE_FLOOR = 6

export const FURY_SWEEP_CRIT_MULT = 1.2
export const FURY_SWEEP_CRIT_BASE = 8
export const FURY_SWEEP_CRIT_LCK_MULT = 2
export const FURY_SWEEP_DAMAGE_MULT = 1.15
export const FURY_SWEEP_BLEED_TURNS_MIN = 2
export const FURY_SWEEP_BLEED_TURNS_MAX = 5

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

export const PARRY_DODGE_COUNTER_MULT = 0.65
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
export const ENEMY_SHAKE_OUTGOING_MULT = 0.42
/** Enemy outgoing damage multiplier while slowed (0–1). */
export const ENEMY_SLOW_OUTGOING_MULT = 0.62
/** Bleed chip each turn as a fraction of enemy max hp. */
export const BLEED_DAMAGE_MAX_HP_PCT = 0.09
/** Shared enemy LOOP strike multiplier — mark's telegraphed heavy. */
export const ENEMY_LOOP_STRIKE_MULT = 2

/** Defense skill — brace blocks more per level (multiplier reduction, capped). */
export const DEF_MITIGATION_PER_LEVEL = 0.01
/** Defense skill — passive incoming damage reduction per level. */
export const DEF_PASSIVE_MITIGATION_PER_LEVEL = 0.004
/** Hard cap on total defense mitigation so builds never become invincible. */
export const DEF_MAX_MITIGATION = 0.6
/** Brace never shrinks incoming below this fraction of raw hit damage. */
export const DEF_BRACE_INCOMING_FLOOR = 0.1

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

/** Brace status chip mitigation — stronger at higher defense skill. */
export function braceStatusIncomingMultiplier(defSkillLevel: number): number {
  const bonus = Math.min(0.35, Math.max(0, defSkillLevel - 1) * DEF_MITIGATION_PER_LEVEL)
  return Math.max(DEF_BRACE_INCOMING_FLOOR, DEF_BRACE_STATUS_BASE_MULT - bonus)
}

export function applyDefensePassiveMitigation(incoming: number, defSkillLevel: number): number {
  if (incoming <= 0) return 0
  const frac = defensePassiveMitigationFraction(defSkillLevel)
  return Math.max(1, Math.floor(incoming * (1 - frac)))
}

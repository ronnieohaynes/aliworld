// src/data/battleMoveState.ts
function createBattleMoveState() {
  return {
    blackoutPhase: "idle",
    hyperdriveArmed: false,
    hyperdriveSpent: false,
    anchorBlocksStatus: false,
    playerNextAttackImmune: false,
    playerInvincibleBlocks: 0,
    enemyAccuracyMult: 1,
    enemyAccuracyTurns: 0,
    enemyDefShattered: false,
    forceEnemyMove: null,
    lastEnemyMove: null,
    lastEnemyDamage: 0,
    snagStolen: {},
    oncePerBattleUsed: {},
    devilsCutTurns: 0,
    devilsCutPct: 0,
    counterweightBlockPct: null,
    counterweightReflectPct: null,
    playerPerfectGuard: false,
    nextHitAtkBonusMult: 1
  };
}

// src/data/combatTypes.ts
var STATUS_DEFAULT_TURNS = {
  bleed: 2,
  // fallback only; applied bleed rolls 1–3 via rollBleedTurns()
  shake: 2,
  stun: 1,
  brace: 1,
  slow: 2,
  miss: 1,
  double: 1,
  reflect: 1
};
function createEmptyCombatStatus() {
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
    playerWeaken: 0,
    enemyBrace: 0,
    enemyDouble: 0,
    enemyReflect: null,
    enemyBleed: 0,
    enemyBleedPotencyMult: 1,
    enemyShake: 0,
    enemyShakePotency: 0,
    enemyStun: 0,
    enemySlow: 0,
    enemyMiss: 0
  };
}

// src/data/moveBalance.ts
var SKILL_STAT_BONUS_LINEAR_CAP = 18;
var SKILL_STAT_BONUS_TAIL_FACTOR = 0.72;
var SKILL_HP_BONUS_PER_LEVEL = 3;
var BLACKOUT_INTERRUPTIBLE = true;
var FURY_SWEEP_DAMAGE_FLOOR = 6;
var FURY_SWEEP_CRIT_MULT = 1.2;
var FURY_SWEEP_CRIT_BASE = 8;
var FURY_SWEEP_CRIT_LCK_MULT = 2;
var FURY_SWEEP_DAMAGE_MULT = 1.15;
var BLEED_TURNS_MIN = 1;
var BLEED_TURNS_MAX = 3;
var DARK_BREAK_DAMAGE_MULT = 1.4;
var DARK_BREAK_ACCURACY_MULT = 0.5;
var DARK_BREAK_ACCURACY_TURNS_MIN = 2;
var DARK_BREAK_ACCURACY_TURNS_MAX = 3;
var CANNON_DAMAGE_MULT = 1.5;
var CANNON_CRIT_BASE = 28;
var CANNON_CRIT_LCK_MULT = 2.5;
var CANNON_CRIT_MULT = 1.5;
var CANNON_DEF_SHATTER_CHANCE = 0.05;
var BLACKOUT_ARMED_DAMAGE_MULT = 3.2;
var BLACKOUT_RELEASE_DODGE_MULT = 0.62;
var SECOND_WIND_HEAL_BASE_PCT = 0.2;
var SECOND_WIND_HEAL_PER_DEF_PCT = 0.01;
var SECOND_WIND_HEAL_CAP_PCT = 0.4;
var DEVILS_CUT_TURNS_MIN = 2;
var DEVILS_CUT_TURNS_MAX = 3;
var DEVILS_CUT_DAMAGE_MULT = 0.6;
var DEVILS_CUT_LIFESTEAL_BASE = 0.1;
var DEVILS_CUT_LIFESTEAL_PER_LCK = 35e-4;
var DEVILS_CUT_LIFESTEAL_CAP = 0.2;
var PARRY_DODGE_COUNTER_MULT = 0.8;
var PARRY_DODGE_WEAK_MULT = 0.35;
var PARRY_ON_DODGE_REFLECT_PCT = 0.12;
var GRAVITY_SHIFT_SLOW_TURNS_MIN = 2;
var GRAVITY_SHIFT_SLOW_TURNS_MAX = 5;
var COUNTERWEIGHT_BLOCK_PCT_MIN = 0.5;
var COUNTERWEIGHT_BLOCK_PCT_MAX = 0.8;
var COUNTERWEIGHT_REFLECT_CHANCE = 0.35;
var COUNTERWEIGHT_REFLECT_PCT_MIN = 0.02;
var COUNTERWEIGHT_REFLECT_PCT_MAX = 0.1;
var INVINCIBLE_SACRIFICE_PCT = 0.5;
var INVINCIBLE_BLOCK_COUNT = 3;
var SEALED_FATE_TURN_MIN = 1;
var SEALED_FATE_TURN_MAX = 3;
var SEALED_FATE_DAMAGE_MULT = 3;
var SEALED_FATE_HIT_CHANCE = 0.99;
var SEALED_FATE_MISS_SELF_DAMAGE_PCT = 0.8;
var PHENOMENA_DAMAGE_MULT_MIN = 0.65;
var PHENOMENA_DAMAGE_MULT_MAX = 1.25;
var PHENOMENA_HEAL_PCT_MIN = 0.08;
var PHENOMENA_HEAL_PCT_MAX = 0.22;
var REFRACT_DAMAGE_MULT = 1;
var LOOP_DAMAGE_MULT = 0.55;
var ENEMY_SHAKE_OUTGOING_MULT = 0.4;
var ENEMY_SLOW_OUTGOING_MULT = 0.56;
var BLEED_DAMAGE_MAX_HP_PCT = 0.09;
var ENEMY_LOOP_STRIKE_MULT = 2;
var ENEMY_AI_TIER1_LEVEL = 3;
var ENEMY_AI_TIER2_LEVEL = 5;
var ENEMY_AI_TIER3_LEVEL = 8;
var ENEMY_WHISPER_PLAYER_WEAKEN_MULT = 0.6;
var EARLY_STRIKE_SKILL_LEVEL_MAX = 3;
var EARLY_STRIKE_DAMAGE_FLOOR_MULT = 0.55;
var EARLY_STRIKE_ATK_CONTRIB_MULT = 0.65;
function earlyStrikeDamageScale(attackSkillLevel) {
  if (attackSkillLevel > EARLY_STRIKE_SKILL_LEVEL_MAX) return 1;
  const t = attackSkillLevel / EARLY_STRIKE_SKILL_LEVEL_MAX;
  return EARLY_STRIKE_DAMAGE_FLOOR_MULT + (1 - EARLY_STRIKE_DAMAGE_FLOOR_MULT) * t;
}
var DEF_MITIGATION_PER_LEVEL = 0.025;
var DEF_PASSIVE_MITIGATION_PER_LEVEL = 0.012;
var DEF_MAX_MITIGATION = 0.5;
var DEF_BRACE_INCOMING_FLOOR = 0.1;
var DEF_PERFECT_GUARD_BONUS_PER_LEVEL = 0.05;
var DEF_PERFECT_GUARD_BONUS_MAX = 0.35;
var DEF_BRACE_STATUS_BASE_MULT = 0.6;
function defensePassiveMitigationFraction(defSkillLevel) {
  return Math.min(DEF_MAX_MITIGATION, defSkillLevel * DEF_PASSIVE_MITIGATION_PER_LEVEL);
}
function braceIncomingMultiplier(baseMult, defSkillLevel) {
  const defBonus = Math.min(0.5, defSkillLevel * DEF_MITIGATION_PER_LEVEL);
  const scaled = baseMult * (1 - defBonus);
  return Math.max(DEF_BRACE_INCOMING_FLOOR, scaled);
}
function braceStatusIncomingMultiplier(defSkillLevel) {
  const bonus = Math.min(0.35, Math.max(0, defSkillLevel - 1) * DEF_MITIGATION_PER_LEVEL);
  return Math.max(DEF_BRACE_INCOMING_FLOOR, DEF_BRACE_STATUS_BASE_MULT - bonus);
}
function perfectGuardDamageBonus(defSkillLevel) {
  return Math.min(DEF_PERFECT_GUARD_BONUS_MAX, defSkillLevel * DEF_PERFECT_GUARD_BONUS_PER_LEVEL);
}
function applyDefensePassiveMitigation(incoming, defSkillLevel) {
  if (incoming <= 0) return 0;
  const frac = defensePassiveMitigationFraction(defSkillLevel);
  return Math.max(1, Math.floor(incoming * (1 - frac)));
}
var SPD_DODGE_PER_LEVEL = 5e-3;
var SPD_DODGE_MAX = 0.32;
var SPD_COUNTER_BONUS_PER_LEVEL = 0.09;
var SPD_COUNTER_BONUS_MAX = 0.8;
var SPD_DODGE_BASE_CHANCE = 0.33;
var SPD_INITIATIVE_WEIGHT = 1;
function speedDodgeBonus(spdSkillLevel) {
  return Math.min(SPD_DODGE_MAX, Math.max(0, spdSkillLevel - 1) * SPD_DODGE_PER_LEVEL);
}
function speedCounterBonus(spdSkillLevel) {
  return Math.min(SPD_COUNTER_BONUS_MAX, spdSkillLevel * SPD_COUNTER_BONUS_PER_LEVEL);
}
function speedDodgeSuccessChance(spdSkillLevel) {
  return Math.min(0.99, SPD_DODGE_BASE_CHANCE + speedDodgeBonus(spdSkillLevel));
}
function speedInitiativeBonus(spdSkillLevel) {
  return Math.max(0, spdSkillLevel - 1) * SPD_INITIATIVE_WEIGHT;
}
var DEF_PARRY_COUNTER_BONUS_PER_LEVEL = 0.07;
var DEF_PARRY_COUNTER_BONUS_MAX = 0.7;
function defParryCounterBonus(defSkillLevel) {
  return Math.min(DEF_PARRY_COUNTER_BONUS_MAX, defSkillLevel * DEF_PARRY_COUNTER_BONUS_PER_LEVEL);
}
var LCK_DODGE_BASE_CHANCE = 0.4;
var LCK_DODGE_PER_LEVEL = 5e-3;
var LCK_DODGE_MAX = 0.32;
function luckDodgeSuccessChance(lckSkillLevel) {
  return Math.min(0.99, LCK_DODGE_BASE_CHANCE + Math.min(LCK_DODGE_MAX, Math.max(0, lckSkillLevel - 1) * LCK_DODGE_PER_LEVEL));
}
var LCK_CRIT_STAT_SCALE = 1.48;
var XP_DAMAGE_DEALT_MULT = 2;
var XP_DAMAGE_BLOCKED_MULT = 5;
var XP_DAMAGE_AVOIDED_MULT = 5;
var XP_SPEED_DAMAGE_MULT = 3;
var XP_UTILITY_MOVE_BONUS = 12;
var XP_LUCK_DAMAGE_MULT = 5;
var COUNTER_XP_BONUS = 14;
var PERFECT_GUARD_XP_BONUS = 16;
var ADVANTAGE_XP_BONUS = 12;
var TELEGRAPH_READ_XP_BONUS = 18;
var COUNTER_ADVANTAGE_DMG_MULT = 1.22;
var COUNTER_DISADVANTAGE_DMG_MULT = 0.82;
var COUNTER_ADVANTAGE_INCOMING_MULT = 0.82;
var COUNTER_DISADVANTAGE_INCOMING_MULT = 1.22;
var CROSS_SCALE_SECONDARY_SHARE = 0.25;
var CROSS_SCALE = {
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
  SECOND_WIND_LCK_HEAL_PER_LVL: 4e-3,
  SECOND_WIND_LCK_HEAL_CAP: 0.08,
  /** COUNTERWEIGHT: reflect pct bonus (attack skill). */
  COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL: 0.012,
  COUNTERWEIGHT_REFLECT_ATK_CAP: 0.05,
  /** BRICK_WALL: next-hit damage mult after nullify (attack skill). */
  BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL: 0.012,
  BRICK_WALL_FOLLOWUP_ATK_CAP: 0.22,
  /** INVINCIBLE: sacrifice hp pct relief (luck). */
  INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL: 9e-3,
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
  DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL: 22e-4,
  DEVILS_CUT_LIFESTEAL_ATK_CAP: 0.06
};
function crossSecondaryBonus(secondaryLevel, perLevel, cap) {
  return Math.min(cap, secondaryLevel * perLevel) * CROSS_SCALE.SECONDARY_SHARE;
}
function crossSecondaryMultiplier(secondaryLevel, perLevel, cap) {
  return 1 + crossSecondaryBonus(secondaryLevel, perLevel, cap);
}
function crossSecondaryFlat(secondaryLevel, perLevel, cap) {
  return Math.min(cap, Math.floor(secondaryLevel * perLevel * CROSS_SCALE.SECONDARY_SHARE));
}

// combat-core/rng.ts
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 1831565813;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
function createSeededRng(seed) {
  const normalized = seed >>> 0;
  const nextUnit = mulberry32(normalized);
  let drawCount = 0;
  const api = {
    seed: normalized,
    draws: () => drawCount,
    next: () => {
      drawCount += 1;
      return nextUnit();
    },
    nextInt: (min, max) => {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      if (hi < lo) return lo;
      return lo + Math.floor(api.next() * (hi - lo + 1));
    },
    jitter: (damage) => {
      const d = Math.floor(damage);
      if (d <= 0) return 0;
      return Math.max(0, d + Math.floor((api.next() - 0.5) * 3));
    }
  };
  return api;
}
function createMathRandomRng() {
  let drawCount = 0;
  const api = {
    seed: 0,
    draws: () => drawCount,
    next: () => {
      drawCount += 1;
      return Math.random();
    },
    nextInt: (min, max) => {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      if (hi < lo) return lo;
      return lo + Math.floor(api.next() * (hi - lo + 1));
    },
    jitter: (damage) => {
      const d = Math.floor(damage);
      if (d <= 0) return 0;
      return Math.max(0, d + Math.floor((api.next() - 0.5) * 3));
    }
  };
  return api;
}
var activeRng = createMathRandomRng();
function getCombatRng() {
  return activeRng;
}
function setCombatRng(rng) {
  activeRng = rng;
}
function randomCombatSeed() {
  return Math.floor(Math.random() * 2147483647);
}

// src/data/combatStatus.ts
var DEBUFF_EFFECTS = /* @__PURE__ */ new Set([
  "bleed",
  "shake",
  "stun",
  "slow",
  "miss"
]);
var BUFF_EFFECTS = /* @__PURE__ */ new Set(["brace", "double", "reflect"]);
function rollBleedTurns() {
  return getCombatRng().nextInt(BLEED_TURNS_MIN, BLEED_TURNS_MAX);
}
function statusTargetFor(effect) {
  if (DEBUFF_EFFECTS.has(effect)) return "enemy";
  if (BUFF_EFFECTS.has(effect)) return "player";
  return "enemy";
}
function normalizeStatusSpec(spec) {
  if (typeof spec === "string") {
    return {
      effect: spec,
      turns: spec === "bleed" ? rollBleedTurns() : STATUS_DEFAULT_TURNS[spec],
      reflectPercent: 0.35
    };
  }
  return {
    effect: spec.effect,
    turns: spec.turns ?? (spec.effect === "bleed" ? rollBleedTurns() : STATUS_DEFAULT_TURNS[spec.effect]),
    reflectPercent: spec.reflectPercent ?? 0.35
  };
}
function applyStatusToCombat(status, spec, target) {
  const { effect, turns, reflectPercent } = normalizeStatusSpec(spec);
  const next = { ...status };
  const onEnemy = target === "enemy";
  switch (effect) {
    case "bleed":
      if (onEnemy) next.enemyBleed = turns;
      else next.playerBleed = turns;
      break;
    case "shake":
      if (onEnemy) next.enemyShake = turns;
      else next.playerShake = turns;
      break;
    case "stun":
      if (onEnemy) next.enemyStun = turns;
      else next.playerStun = turns;
      break;
    case "slow":
      if (onEnemy) next.enemySlow = turns;
      else next.playerSlow = turns;
      break;
    case "miss":
      if (onEnemy) next.enemyMiss = turns;
      else next.playerMiss = turns;
      break;
    case "brace":
      if (onEnemy) next.enemyBrace = turns;
      else next.playerBrace = turns;
      break;
    case "double":
      if (onEnemy) next.enemyDouble = turns;
      else next.playerDouble = turns;
      break;
    case "reflect":
      if (onEnemy) next.enemyReflect = { turns, percent: reflectPercent };
      else next.playerReflect = { turns, percent: reflectPercent };
      break;
  }
  return next;
}
function tickCombatStatus(status) {
  const next = { ...status };
  if (next.playerShake > 0) next.playerShake--;
  if (next.playerShake <= 0) next.playerShakePotency = 0;
  if (next.playerBleed > 0) next.playerBleed--;
  if (next.playerBleed <= 0) next.playerBleedPotencyMult = 1;
  if (next.playerStun > 0) next.playerStun--;
  if (next.playerSlow > 0) next.playerSlow--;
  if (next.playerMiss > 0) next.playerMiss--;
  if (next.playerBrace > 0) next.playerBrace--;
  if (next.playerDouble > 0) next.playerDouble--;
  if (next.playerWeaken > 0) next.playerWeaken--;
  if (next.playerReflect && next.playerReflect.turns > 0) {
    const turns = next.playerReflect.turns - 1;
    next.playerReflect = turns > 0 ? { ...next.playerReflect, turns } : null;
  }
  if (next.enemyShake > 0) next.enemyShake--;
  if (next.enemyShake <= 0) next.enemyShakePotency = 0;
  if (next.enemyBleed > 0) next.enemyBleed--;
  if (next.enemyBleed <= 0) next.enemyBleedPotencyMult = 1;
  if (next.enemyStun > 0) next.enemyStun--;
  if (next.enemySlow > 0) next.enemySlow--;
  if (next.enemyMiss > 0) next.enemyMiss--;
  if (next.enemyBrace > 0) next.enemyBrace--;
  if (next.enemyDouble > 0) next.enemyDouble--;
  if (next.enemyReflect && next.enemyReflect.turns > 0) {
    const turns = next.enemyReflect.turns - 1;
    next.enemyReflect = turns > 0 ? { ...next.enemyReflect, turns } : null;
  }
  return next;
}
function enemyLosesTurn(status) {
  return status.enemyStun > 0 || status.enemyMiss > 0;
}
function playerLosesTurn(status) {
  return status.playerStun > 0 || status.playerMiss > 0;
}
function shakeOutgoingMult(shakeTurns, shakePotency) {
  if (shakeTurns <= 0) return 1;
  return shakePotency > 0 ? shakePotency : ENEMY_SHAKE_OUTGOING_MULT;
}
function enemyOutgoingDamageMult(status) {
  let mult = 1;
  mult *= shakeOutgoingMult(status.enemyShake, status.enemyShakePotency);
  if (status.enemySlow > 0) mult *= ENEMY_SLOW_OUTGOING_MULT;
  return mult;
}
function playerOutgoingDamageMult(status) {
  let mult = 1;
  mult *= shakeOutgoingMult(status.playerShake, status.playerShakePotency);
  if (status.playerSlow > 0) mult *= ENEMY_SLOW_OUTGOING_MULT;
  return mult;
}
function playerActsFirstDespiteSpd(status, playerSpd, enemySpd, speedSkillLevel = 1) {
  if (status.playerSlow > 0) return false;
  if (status.enemySlow > 0) return true;
  const effectivePlayerSpd = playerSpd + speedInitiativeBonus(speedSkillLevel);
  return effectivePlayerSpd >= enemySpd;
}

// src/data/moveUnlock.ts
var MOVE_SKILL_CAP_LEVEL = 65;
var LADDER_RUNG_UNLOCK_LEVEL = {
  1: 0,
  2: 10,
  3: 22,
  4: 38,
  5: 52,
  6: MOVE_SKILL_CAP_LEVEL
};
function unlockLevelForRung(rung) {
  return LADDER_RUNG_UNLOCK_LEVEL[rung];
}

// src/data/moveDefinitions.ts
function defenseMoveXp(r) {
  return r.damageBlocked * XP_DAMAGE_BLOCKED_MULT + XP_UTILITY_MOVE_BONUS;
}
function speedDodgeMoveXp(r) {
  return r.damageAvoided * XP_DAMAGE_AVOIDED_MULT + Math.floor(r.playerDmg * XP_SPEED_DAMAGE_MULT) + XP_UTILITY_MOVE_BONUS;
}
function def(partial) {
  return {
    ...partial,
    unlockAtSkillLevel: unlockLevelForRung(partial.ladderRung)
  };
}
var MOVES = {
  STRIKE: def({
    id: "STRIKE",
    displayName: "STRIKE",
    skill: "attack",
    ladderRung: 1,
    cost: { kind: "none" },
    behavior: {
      kind: "damage",
      profile: {
        damageMult: 1.3,
        openingBonusMult: 1.5,
        takeEnemyHit: true,
        crit: { base: 6, lckMult: 2, damageMult: 1.6, onCrit: [] }
      }
    },
    onResolve: [],
    xpGrants: [
      { skill: "attack", amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT }
    ],
    uiDescription: "hit the opening. trade if they swing.",
    uiClassName: "battle-screen__move--strike",
    playerLogLine: (r) => {
      if (r.enemyStunned || !r.enemyAttacks) {
        return `you struck the opening. ${r.playerDmg}!${r.crit ? " crit." : ""}`;
      }
      return `you traded blows. ${r.playerDmg} dealt, ${r.incoming} taken.`;
    }
  }),
  FURY_SWEEP: def({
    id: "FURY_SWEEP",
    displayName: "FURY SWEEP",
    skill: "speed",
    ladderRung: 2,
    cost: { kind: "none" },
    behavior: {
      kind: "fury-sweep",
      profile: {
        damageMult: FURY_SWEEP_DAMAGE_MULT,
        damageFloor: FURY_SWEEP_DAMAGE_FLOOR,
        takeEnemyHit: true,
        crit: {
          base: FURY_SWEEP_CRIT_BASE,
          lckMult: FURY_SWEEP_CRIT_LCK_MULT,
          damageMult: FURY_SWEEP_CRIT_MULT,
          extraCritRolls: 1,
          onCrit: ["bleed"],
          bleedOnCritOnly: true
        }
      }
    },
    onResolve: [],
    xpGrants: [
      { skill: "speed", amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT }
    ],
    uiDescription: "wild sweep. crit applies bleed, chip each turn.",
    uiClassName: "battle-screen__move--fury-sweep",
    playerLogLine: (r) => `fury sweep. ${r.playerDmg}!${r.crit ? " crit bleed." : ""}`
  }),
  DARK_BREAK: def({
    id: "DARK_BREAK",
    displayName: "DARK BREAK",
    skill: "attack",
    ladderRung: 3,
    cost: { kind: "none" },
    behavior: {
      kind: "dark-break",
      profile: { damageMult: DARK_BREAK_DAMAGE_MULT, takeEnemyHit: true },
      accuracyMult: DARK_BREAK_ACCURACY_MULT,
      accuracyTurns: { min: DARK_BREAK_ACCURACY_TURNS_MIN, max: DARK_BREAK_ACCURACY_TURNS_MAX }
    },
    onResolve: [],
    xpGrants: [
      { skill: "attack", amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT }
    ],
    uiDescription: "break their aim. low damage, high control.",
    uiClassName: "battle-screen__move--dark-break",
    playerLogLine: (r) => `dark break. ${r.playerDmg}. their aim falters.`
  }),
  CANNON: def({
    id: "CANNON",
    displayName: "CANNON",
    skill: "attack",
    ladderRung: 4,
    cost: { kind: "none" },
    behavior: {
      kind: "cannon",
      profile: {
        damageMult: CANNON_DAMAGE_MULT,
        takeEnemyHit: true,
        crit: {
          base: CANNON_CRIT_BASE,
          lckMult: CANNON_CRIT_LCK_MULT,
          damageMult: CANNON_CRIT_MULT,
          onCrit: []
        }
      },
      defShatterChance: CANNON_DEF_SHATTER_CHANCE
    },
    onResolve: [],
    xpGrants: [
      { skill: "attack", amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT }
    ],
    uiDescription: "high crit. might shatter their defense.",
    uiClassName: "battle-screen__move--cannon",
    playerLogLine: (r) => `cannon. ${r.playerDmg}!${r.crit ? " crit." : ""}`
  }),
  BLACKOUT: def({
    // answered by: HOLD/ANCHOR/BRICK_WALL (load exposed + release); SLIP/PARRY (exposed); release dodge (reduced)
    id: "BLACKOUT",
    displayName: "BLACKOUT",
    skill: "attack",
    ladderRung: 5,
    cost: { kind: "loadTurn" },
    behavior: { kind: "blackout" },
    onResolve: [],
    xpGrants: [
      { skill: "attack", amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT }
    ],
    uiDescription: "load. exposed. then the biggest hit.",
    uiClassName: "battle-screen__move--blackout",
    playerLogLine: (r) => {
      if (r.playerDmg > 0) return `blackout lands. ${r.playerDmg}!`;
      return "you load the blackout.";
    }
  }),
  SLIP: def({
    id: "SLIP",
    displayName: "SLIP",
    skill: "speed",
    ladderRung: 1,
    cost: { kind: "none" },
    behavior: {
      kind: "dodge",
      profile: {
        counterMult: 0.7,
        weakMult: 0.4,
        stunChance: { base: 14, lckMult: 1.5 }
      }
    },
    onResolve: [],
    xpGrants: [
      { skill: "speed", amount: speedDodgeMoveXp }
    ],
    uiDescription: "dodge and counter. avoid their incoming hit.",
    uiClassName: "battle-screen__move--slip",
    playerLogLine: (r) => {
      const name = r.displayName.toLowerCase();
      if (r.dodged) {
        return `you slipped it. counter for ${r.playerDmg}.${r.stunApplied ? ` ${name} reels.` : ""}`;
      }
      if (r.rawIncoming > 0) {
        const taken = r.incoming > 0 ? `${r.incoming} taken. ` : "";
        const counter = r.playerDmg > 0 ? `${r.playerDmg} back.` : "no counter.";
        return `slip too slow. ${taken}${counter}`;
      }
      return `nothing to slip. ${r.playerDmg}.`;
    }
  }),
  PARRY: def({
    id: "PARRY",
    displayName: "PARRY",
    skill: "defense",
    ladderRung: 1,
    cost: { kind: "none" },
    behavior: {
      kind: "dodge",
      profile: {
        counterMult: PARRY_DODGE_COUNTER_MULT,
        weakMult: PARRY_DODGE_WEAK_MULT,
        stunChance: { base: 18, lckMult: 2 },
        onDodgeReflectPct: PARRY_ON_DODGE_REFLECT_PCT
      }
    },
    onResolve: [],
    xpGrants: [
      { skill: "defense", amount: speedDodgeMoveXp }
    ],
    uiDescription: "read and punish. counter scales with def.",
    uiClassName: "battle-screen__move--parry",
    playerLogLine: (r) => r.dodged ? `parry. ${r.playerDmg} back.` : r.rawIncoming > 0 ? `parry whiff. ${r.incoming > 0 ? `${r.incoming} taken. ` : ""}${r.playerDmg > 0 ? `${r.playerDmg} back.` : "no counter."}` : `parry whiff. ${r.playerDmg}.`
  }),
  GRAVITY_SHIFT: def({
    id: "GRAVITY_SHIFT",
    displayName: "GRAVITY SHIFT",
    skill: "speed",
    ladderRung: 3,
    cost: { kind: "none" },
    behavior: {
      kind: "gravity-shift",
      slowTurns: { min: GRAVITY_SHIFT_SLOW_TURNS_MIN, max: GRAVITY_SHIFT_SLOW_TURNS_MAX }
    },
    onResolve: [{ effect: "slow", turns: 3 }],
    xpGrants: [
      { skill: "speed", amount: (r) => Math.floor(r.playerDmg * XP_SPEED_DAMAGE_MULT) + XP_UTILITY_MOVE_BONUS }
    ],
    uiDescription: "slow them down. you set the tempo.",
    uiClassName: "battle-screen__move--gravity-shift",
    playerLogLine: (r) => `gravity shift. ${r.playerDmg}. they slow.`
  }),
  REFRACT: def({
    id: "REFRACT",
    displayName: "REFRACT",
    skill: "speed",
    ladderRung: 4,
    cost: { kind: "none" },
    behavior: { kind: "refract" },
    onResolve: [],
    xpGrants: [
      { skill: "speed", amount: (r) => Math.floor(r.playerDmg * XP_SPEED_DAMAGE_MULT) }
    ],
    uiDescription: "mirror their last hit back.",
    uiClassName: "battle-screen__move--refract",
    playerLogLine: (r) => `refract. ${r.playerDmg} mirrored.`
  }),
  HYPERDRIVE: def({
    // answered by: punish recharge exposed turn (HOLD/SLIP/BRICK_WALL on exposed window)
    id: "HYPERDRIVE",
    displayName: "HYPERDRIVE",
    skill: "speed",
    ladderRung: 5,
    cost: { kind: "rechargeTurn" },
    behavior: { kind: "hyperdrive" },
    onResolve: [],
    xpGrants: [
      { skill: "speed", amount: (r) => Math.floor(r.playerDmg * XP_SPEED_DAMAGE_MULT) + XP_UTILITY_MOVE_BONUS }
    ],
    uiDescription: "double next turn. then you skip, exposed.",
    uiClassName: "battle-screen__move--hyperdrive",
    playerLogLine: (r) => r.playerDmg > 0 ? `hyperdrive. ${r.playerDmg}. next turn you fly.` : "hyperdrive primed."
  }),
  HOLD: def({
    id: "HOLD",
    displayName: "HOLD",
    skill: "defense",
    ladderRung: 1,
    cost: { kind: "none" },
    behavior: { kind: "brace", profile: { incomingMult: 0.3 } },
    onResolve: ["brace"],
    xpGrants: [
      { skill: "defense", amount: defenseMoveXp }
    ],
    uiDescription: "brace. take a fraction of the next hit.",
    uiClassName: "battle-screen__move--hold",
    playerLogLine: (r) => {
      if (r.rawIncoming > 0) return `you braced. ${r.incoming} chip.`;
      return `you set your feet. nothing comes.`;
    }
  }),
  ANCHOR: def({
    id: "ANCHOR",
    displayName: "ANCHOR",
    skill: "defense",
    ladderRung: 2,
    cost: { kind: "none" },
    behavior: {
      kind: "brace",
      profile: { incomingMult: 0.22, blockStatus: true }
    },
    onResolve: ["brace"],
    xpGrants: [
      { skill: "defense", amount: defenseMoveXp }
    ],
    uiDescription: "brace and shrug off status this turn.",
    uiClassName: "battle-screen__move--anchor",
    playerLogLine: (r) => r.rawIncoming > 0 ? `anchored. ${r.incoming} chip. status blocked.` : "anchored. nothing lands."
  }),
  SECOND_WIND: def({
    // answered by: burst before heal; once/fight, not an infinite stall loop
    id: "SECOND_WIND",
    displayName: "SECOND WIND",
    skill: "defense",
    ladderRung: 3,
    cost: { kind: "oncePerBattle" },
    behavior: { kind: "second-wind" },
    onResolve: [],
    xpGrants: [
      { skill: "defense", amount: (r) => r.healApplied * XP_DAMAGE_BLOCKED_MULT + XP_UTILITY_MOVE_BONUS }
    ],
    uiDescription: "breathe. get some back. once a fight.",
    uiClassName: "battle-screen__move--second-wind",
    playerLogLine: (r) => r.healApplied && r.healApplied > 0 ? `second wind. +${r.healApplied} back.` : "second wind."
  }),
  COUNTERWEIGHT: def({
    id: "COUNTERWEIGHT",
    displayName: "COUNTERWEIGHT",
    skill: "defense",
    ladderRung: 4,
    cost: { kind: "none" },
    behavior: {
      kind: "counterweight",
      blockPct: { min: 0.5, max: 0.8 },
      reflectChance: 0.35,
      reflectPct: { min: 0.02, max: 0.1 }
    },
    onResolve: [],
    xpGrants: [{ skill: "defense", amount: defenseMoveXp }],
    uiDescription: "block heavy. chance to send some back.",
    uiClassName: "battle-screen__move--counterweight",
    playerLogLine: () => "counterweight set."
  }),
  BRICK_WALL: def({
    id: "BRICK_WALL",
    displayName: "BRICK WALL",
    skill: "defense",
    ladderRung: 5,
    cost: { kind: "none" },
    behavior: { kind: "brick-wall" },
    onResolve: [],
    xpGrants: [
      {
        skill: "defense",
        amount: (r) => (r.damageAvoided + r.damageBlocked) * XP_DAMAGE_BLOCKED_MULT + XP_UTILITY_MOVE_BONUS
      }
    ],
    uiDescription: "nullify the next hit entirely.",
    uiClassName: "battle-screen__move--brick-wall",
    playerLogLine: () => "brick wall up."
  }),
  INVINCIBLE: def({
    // answered by: burst before blocks pop; once/fight
    id: "INVINCIBLE",
    displayName: "INVINCIBLE",
    skill: "defense",
    ladderRung: 6,
    cost: { kind: "oncePerBattle" },
    behavior: { kind: "invincible" },
    onResolve: [],
    xpGrants: [
      {
        skill: "defense",
        amount: (r) => (r.damageAvoided + r.damageBlocked) * XP_DAMAGE_BLOCKED_MULT + XP_UTILITY_MOVE_BONUS
      }
    ],
    uiDescription: "half your hp. block the next 3 hits. once per fight.",
    uiClassName: "battle-screen__move--invincible",
    playerLogLine: () => "invincible. for now."
  }),
  WHISPER: def({
    id: "WHISPER",
    displayName: "WHISPER",
    skill: "luck",
    ladderRung: 1,
    cost: { kind: "none" },
    behavior: {
      kind: "damage",
      profile: { damageMult: 0.5, takeEnemyHit: true }
    },
    onResolve: ["shake"],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT }
    ],
    uiDescription: "rattle them. their next hit lands softer.",
    uiClassName: "battle-screen__move--whisper",
    playerLogLine: (r) => {
      const name = r.displayName.toLowerCase();
      return `you whisper. ${name}'s rhythm breaks.`;
    }
  }),
  LOOP: def({
    id: "LOOP",
    displayName: "LOOP",
    skill: "luck",
    ladderRung: 2,
    cost: { kind: "none" },
    behavior: { kind: "loop" },
    onResolve: [],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT }
    ],
    uiDescription: "make them repeat their last move.",
    uiClassName: "battle-screen__move--loop",
    playerLogLine: (r) => `loop. ${r.playerDmg}. they repeat themselves.`
  }),
  DEVILS_CUT: def({
    // answered by: burst through modest lifesteal window (2–3 turns)
    id: "DEVILS_CUT",
    displayName: "DEVIL'S CUT",
    skill: "luck",
    ladderRung: 3,
    cost: { kind: "none" },
    behavior: { kind: "devils-cut" },
    onResolve: [],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT }
    ],
    uiDescription: "take your cut. hits feed you for a few turns.",
    uiClassName: "battle-screen__move--devils-cut",
    playerLogLine: (r) => `devil's cut. ${r.playerDmg}. your hits feed you.`
  }),
  SNAG: def({
    id: "SNAG",
    displayName: "SNAG",
    skill: "luck",
    ladderRung: 4,
    cost: { kind: "none" },
    behavior: { kind: "snag" },
    onResolve: [],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT + XP_UTILITY_MOVE_BONUS }
    ],
    uiDescription: "steal one of their moves for this fight.",
    uiClassName: "battle-screen__move--snag",
    playerLogLine: (r) => `snag. ${r.playerDmg}. their move is yours now.`
  }),
  PHENOMENA: def({
    id: "PHENOMENA",
    displayName: "PHENOMENA",
    skill: "luck",
    ladderRung: 5,
    cost: { kind: "none" },
    behavior: { kind: "phenomena" },
    onResolve: [],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT }
    ],
    uiDescription: "pure rng from the known pool.",
    uiClassName: "battle-screen__move--phenomena",
    playerLogLine: (r) => r.phenomenaLine ?? "phenomena."
  }),
  SEALED_FATE: def({
    // answered by: kill before clock; SECOND_WIND/out-sustain; miss self-damage gamble
    id: "SEALED_FATE",
    displayName: "SEALED FATE",
    skill: "luck",
    ladderRung: 6,
    cost: { kind: "none" },
    behavior: { kind: "sealed-fate" },
    onResolve: [],
    xpGrants: [
      { skill: "luck", amount: (r) => r.playerDmg * XP_LUCK_DAMAGE_MULT + XP_UTILITY_MOVE_BONUS }
    ],
    uiDescription: "death clock. huge hit soon or you pay.",
    uiClassName: "battle-screen__move--sealed-fate",
    playerLogLine: () => "sealed fate marked."
  })
};

// src/data/combatSystems.ts
var ATTACKING_BEHAVIOR_KINDS = /* @__PURE__ */ new Set([
  "damage",
  "fury-sweep",
  "dark-break",
  "cannon",
  "blackout",
  "loop",
  "gravity-shift",
  "refract",
  "hyperdrive",
  "devils-cut",
  "phenomena",
  "sealed-fate",
  "snag"
]);
function isAttackingPlayerMove(moveId) {
  const def2 = MOVES[moveId];
  return def2 ? ATTACKING_BEHAVIOR_KINDS.has(def2.behavior.kind) : false;
}
function resolveEnemyStrike(eMove, ctx) {
  const stunned = enemyLosesTurn(ctx.combatStatus) || eMove === "STUNNED";
  if (stunned) {
    return { actualMove: "STRIKE", enemyStunned: true, enemyAttacks: false, eDmg: 0 };
  }
  const actualMove = eMove;
  if (!isAttackingPlayerMove(actualMove)) {
    return { actualMove, enemyStunned: false, enemyAttacks: false, eDmg: 0 };
  }
  if (ctx.battleMove.enemyAccuracyTurns > 0 && getCombatRng().next() > ctx.battleMove.enemyAccuracyMult) {
    return { actualMove, enemyStunned: false, enemyAttacks: false, eDmg: 0 };
  }
  const eDmg = computeEnemyIncomingDamage(actualMove, {
    eAtk: ctx.eAtk,
    status: ctx.combatStatus
  });
  return {
    actualMove,
    enemyStunned: false,
    enemyAttacks: eDmg > 0,
    eDmg
  };
}
var deathClockSeq = 0;
function nextDeathClockId() {
  deathClockSeq += 1;
  return `death-clock-${deathClockSeq}`;
}
function scheduleDeathClock(clocks, damage, turnsUntil, target = "enemy", label, options) {
  return [
    ...clocks,
    {
      id: nextDeathClockId(),
      turnsRemaining: Math.max(0, turnsUntil),
      damage: Math.max(0, damage),
      target,
      label,
      hitChance: options?.hitChance,
      missSelfDamagePct: options?.missSelfDamagePct
    }
  ];
}
function resolveDeathClocksAtTurnStart(clocks) {
  const hits = [];
  const remaining = [];
  for (const clock of clocks) {
    if (clock.turnsRemaining <= 0) {
      const chance = clock.hitChance ?? 1;
      if (getCombatRng().next() < chance) {
        hits.push({ clock, damage: clock.damage, target: clock.target });
      } else {
        hits.push({
          clock,
          damage: 0,
          target: "player",
          missed: true
        });
      }
      continue;
    }
    remaining.push({ ...clock, turnsRemaining: clock.turnsRemaining - 1 });
  }
  return { clocks: remaining, hits };
}
function tickDeathClocks(clocks) {
  return clocks.map((c) => ({
    ...c,
    turnsRemaining: Math.max(0, c.turnsRemaining - 1)
  }));
}
function scheduleExposedTurn(exposedTurns, add = 1) {
  return exposedTurns + add;
}
function schedulePlayerSkipTurn(skipTurns, add = 1) {
  return skipTurns + add;
}
function splitIncomingWithReflect(incoming, reflect) {
  if (!reflect || incoming <= 0) {
    return { damageToPlayer: incoming, damageToEnemy: 0 };
  }
  const reflected = Math.floor(incoming * reflect.percent);
  return {
    damageToPlayer: Math.max(0, incoming - reflected),
    damageToEnemy: reflected
  };
}
function splitOutgoingWithReflect(outgoing, reflect) {
  if (!reflect || outgoing <= 0) {
    return { damageToPlayer: 0, damageToEnemy: outgoing };
  }
  const reflected = Math.floor(outgoing * reflect.percent);
  return {
    damageToPlayer: reflected,
    damageToEnemy: Math.max(0, outgoing - reflected)
  };
}
function invalidateCritWhenNoDamage(out, battleMove, enemyDefShatteredBefore) {
  if (out.playerDmg > 0 || !out.crit) return;
  out.crit = false;
  out.bleedApplied = false;
  out.bleedTurns = void 0;
  out.bleedPotencyMult = void 0;
  if (!enemyDefShatteredBefore && battleMove.enemyDefShattered) {
    battleMove.enemyDefShattered = false;
  }
}
function applyDoubleHit(playerDmg, playerDouble) {
  if (playerDmg <= 0 || playerDouble <= 0) {
    return { totalDamage: playerDmg, consumedDouble: false };
  }
  return { totalDamage: playerDmg * 2, consumedDouble: true };
}
function computeEnemyIncomingDamage(moveId, ctx) {
  if (enemyLosesTurn(ctx.status)) return 0;
  const moveDef = MOVES[moveId];
  if (!moveDef || !isAttackingPlayerMove(moveId)) return 0;
  const behavior = moveDef.behavior;
  let damageMult = 1;
  if ("profile" in behavior && behavior.profile && "damageMult" in behavior.profile) {
    damageMult = behavior.profile.damageMult;
  } else if (behavior.kind === "loop") {
    damageMult = 0.6;
  } else if (behavior.kind === "gravity-shift") {
    damageMult = 0.35;
  } else if (behavior.kind === "hyperdrive") {
    damageMult = 0.25;
  } else if (behavior.kind === "refract" || behavior.kind === "phenomena" || behavior.kind === "sealed-fate") {
    damageMult = 0;
  }
  const base = Math.floor(ctx.eAtk * damageMult);
  let dmg = Math.floor(base * enemyOutgoingDamageMult(ctx.status));
  if (ctx.status.enemyDouble > 0) {
    dmg *= 2;
  }
  return dmg;
}
function capDamageToRemainingHp(damage, remainingHp) {
  if (damage <= 0) return damage;
  return Math.min(damage, Math.max(0, remainingHp));
}
function deathClockHitLogLine(hit, enemyName) {
  const label = hit.clock.label ?? "sealed fate";
  const lower = enemyName.toLowerCase();
  if (hit.target === "enemy") {
    return `${label} lands. ${lower} takes ${hit.damage}.`;
  }
  return `${label} lands. you take ${hit.damage}.`;
}

// src/data/combatTurnCosts.ts
function applyMoveCostAfterResolve(cost, flags) {
  switch (cost.kind) {
    case "loadTurn":
      return {
        ...flags,
        playerExposedTurns: scheduleExposedTurn(flags.playerExposedTurns, 1)
      };
    case "rechargeTurn":
      return {
        ...flags,
        playerSkipTurns: schedulePlayerSkipTurn(flags.playerSkipTurns, 1)
      };
    case "exposedTurn":
      return {
        ...flags,
        playerExposedTurns: scheduleExposedTurn(flags.playerExposedTurns, 1)
      };
    default:
      return flags;
  }
}
function consumeTurnFlag(flags) {
  if (flags.playerExposedTurns > 0) {
    return {
      flags: { ...flags, playerExposedTurns: flags.playerExposedTurns - 1 },
      wasExposed: true,
      wasSkip: false
    };
  }
  if (flags.playerSkipTurns > 0) {
    return {
      flags: { ...flags, playerSkipTurns: flags.playerSkipTurns - 1 },
      wasExposed: true,
      wasSkip: true
    };
  }
  return { flags, wasExposed: false, wasSkip: false };
}

// src/data/enemyMoves.ts
var ENEMY_MOVE_IDS = [
  "STRIKE",
  "LOOP",
  "HAYMAKER",
  "SLIP",
  "WHISPER",
  "HOLD",
  "BAIT"
];
var ENEMY_MOVES = {
  STRIKE: {
    id: "STRIKE",
    displayName: "STRIKE",
    telegraphLine: "lines up a strike.",
    isAttacking: true,
    skillType: "attack",
    damageMult: 1,
    onResolve: []
  },
  LOOP: {
    id: "LOOP",
    displayName: "LOOP",
    telegraphLine: "draws back, a heavy loop is coming.",
    isAttacking: true,
    skillType: "attack",
    damageMult: ENEMY_LOOP_STRIKE_MULT,
    onResolve: []
  },
  HAYMAKER: {
    id: "HAYMAKER",
    displayName: "HAYMAKER",
    telegraphLine: "winds up, HAYMAKER incoming.",
    isAttacking: true,
    skillType: "attack",
    damageMult: ENEMY_LOOP_STRIKE_MULT,
    onResolve: []
  },
  SLIP: {
    id: "SLIP",
    displayName: "SLIP",
    telegraphLine: "feints a slip to your blind side.",
    isAttacking: true,
    skillType: "speed",
    damageMult: 0.7,
    onResolve: []
  },
  WHISPER: {
    id: "WHISPER",
    displayName: "WHISPER",
    telegraphLine: "murmurs something that crawls under your skin.",
    isAttacking: false,
    skillType: "luck",
    damageMult: 0,
    onResolve: ["shake"]
  },
  HOLD: {
    id: "HOLD",
    displayName: "HOLD",
    telegraphLine: "plants his feet and braces.",
    isAttacking: false,
    skillType: "defense",
    damageMult: 0,
    onResolve: []
  },
  BAIT: {
    id: "BAIT",
    displayName: "BAIT",
    telegraphLine: "invites you in, waiting for you to swing.",
    isAttacking: false,
    skillType: "speed",
    damageMult: 0,
    onResolve: []
  }
};
var ATTACKING_ENEMY_MOVES = new Set(
  ENEMY_MOVE_IDS.filter((id) => ENEMY_MOVES[id].isAttacking)
);

// src/data/moveIds.ts
var PLAYER_MOVE_IDS = [
  "STRIKE",
  "FURY_SWEEP",
  "DARK_BREAK",
  "CANNON",
  "BLACKOUT",
  "SLIP",
  "GRAVITY_SHIFT",
  "REFRACT",
  "HYPERDRIVE",
  "HOLD",
  // NPC-only — kept for type compatibility, not in any player ladder
  "PARRY",
  "ANCHOR",
  "SECOND_WIND",
  "COUNTERWEIGHT",
  "BRICK_WALL",
  "INVINCIBLE",
  "WHISPER",
  "LOOP",
  "DEVILS_CUT",
  "SNAG",
  "PHENOMENA",
  "SEALED_FATE"
];
var DEFAULT_EQUIPPED_MOVES = ["STRIKE", "SLIP", "PARRY", "WHISPER"];

// src/game/moveHighlightColors.ts
var ENEMY_ONLY_MOVE_IDS = ENEMY_MOVE_IDS.filter(
  (id) => !PLAYER_MOVE_IDS.includes(id)
);
function getMoveLogDisplayName(moveId) {
  const player = MOVES[moveId];
  if (player) return player.displayName;
  const enemy = ENEMY_MOVES[moveId];
  if (enemy) return enemy.displayName;
  return moveId;
}

// src/data/dodgeResolver.ts
var jitter = (d) => getCombatRng().jitter(d);
function enemyStatDodgeSuccessChance(spdStat) {
  return Math.min(0.65, 0.3 + spdStat * 0.02);
}
function playerDodgeSuccessChance(moveId, speedSkillLevel, luckSkillLevel) {
  return moveId === "PARRY" ? luckDodgeSuccessChance(luckSkillLevel) : speedDodgeSuccessChance(speedSkillLevel);
}
function resolvePlayerDodgeMove(input) {
  const d = input.profile;
  const slipAtkBonus = input.moveId === "SLIP" ? crossSecondaryBonus(
    input.attackSkillLevel,
    CROSS_SCALE.SLIP_COUNTER_ATK_PER_ATK_LVL,
    CROSS_SCALE.SLIP_COUNTER_ATK_CAP
  ) : 0;
  const parryReflectScale = input.moveId === "PARRY" ? crossSecondaryMultiplier(
    input.defenseSkillLevel,
    CROSS_SCALE.PARRY_REFLECT_DEF_PER_DEF_LVL,
    CROSS_SCALE.PARRY_REFLECT_DEF_CAP
  ) : 1;
  const dodgeChance = playerDodgeSuccessChance(
    input.moveId,
    input.speedSkillLevel,
    input.luckSkillLevel
  );
  if (input.incomingHit > 0) {
    if (getCombatRng().next() < dodgeChance) {
      const counterScale = input.moveId === "PARRY" ? 1 + defParryCounterBonus(input.defenseSkillLevel) : 1 + speedDodgeBonus(input.speedSkillLevel) + speedCounterBonus(input.speedSkillLevel) + slipAtkBonus;
      const counterBase = input.moveId === "PARRY" ? input.defStat : input.atk;
      let playerDmg = jitter(Math.floor(counterBase * d.counterMult * counterScale));
      let stunApplied = false;
      if (getCombatRng().next() * 100 < d.stunChance.base + input.lckStat * d.stunChance.lckMult) {
        stunApplied = true;
      }
      if (d.onDodgeReflectPct && input.incomingHit > 0) {
        playerDmg += Math.max(
          1,
          Math.floor(input.incomingHit * d.onDodgeReflectPct * parryReflectScale)
        );
      }
      return { dodged: true, incoming: 0, playerDmg, stunApplied };
    }
    return {
      dodged: false,
      incoming: jitter(Math.floor(input.incomingHit * d.weakMult)),
      playerDmg: jitter(Math.floor(input.atk * d.weakMult)),
      stunApplied: false
    };
  }
  return {
    dodged: false,
    incoming: 0,
    playerDmg: jitter(Math.floor(input.atk * d.weakMult)),
    stunApplied: false
  };
}
function resolveEnemyDodgeMove(input) {
  if (!input.playerActed || input.incomingPlayerDmg <= 0) return null;
  const d = input.profile;
  const dodgeChance = enemyStatDodgeSuccessChance(input.spdStat);
  if (getCombatRng().next() < dodgeChance) {
    const rawPlayerDmg = input.incomingPlayerDmg;
    const counterScale = 1 + input.spdStat * 0.015;
    let totalCounter = Math.max(1, Math.floor(input.atkStat * d.counterMult * counterScale));
    if (d.onDodgeReflectPct && rawPlayerDmg > 0) {
      totalCounter += Math.max(1, Math.floor(rawPlayerDmg * d.onDodgeReflectPct));
    }
    return {
      playerDmg: 0,
      enemyDodged: true,
      incomingCounter: totalCounter,
      enemyAttacks: true
    };
  }
  return {
    playerDmg: Math.max(1, Math.floor(input.incomingPlayerDmg * (1 - d.weakMult))),
    enemyDodged: false,
    incomingCounter: 0,
    enemyAttacks: false
  };
}

// src/data/moveResolver.ts
var jitter2 = (d) => getCombatRng().jitter(d);
function applyPerfectGuardBonus(dmg, ctx, out) {
  if (dmg <= 0 || !ctx.battle.playerPerfectGuard) return dmg;
  const bonus = perfectGuardDamageBonus(ctx.def);
  ctx.battle.playerPerfectGuard = false;
  out.perfectGuardBonus = true;
  return Math.floor(dmg * (1 + bonus));
}
function rollCrit(lck, base, lckMult, extraRolls = 0) {
  const rng = getCombatRng();
  const chance = lck * lckMult * LCK_CRIT_STAT_SCALE + base;
  let success = rng.next() * 100 < chance;
  for (let i = 0; i < extraRolls; i++) {
    if (rng.next() * 100 < chance) success = true;
  }
  return success;
}
function randomInt(min, max) {
  return getCombatRng().nextInt(min, max);
}
function applyMoveResolveStatuses(specs, out) {
  for (const spec of specs) {
    const effect = typeof spec === "string" ? spec : spec.effect;
    if (effect === "shake") out.shakeApplied = true;
    if (effect === "bleed") out.bleedApplied = true;
    if (effect === "stun") out.stunApplied = true;
    if (effect === "brace") out.braced = true;
    if (effect === "slow") out.slowApplied = true;
    if (effect === "miss") out.missApplied = true;
    if (effect === "double") out.doubleApplied = true;
    if (effect === "reflect") out.reflectApplied = true;
  }
}
function applyDamageProfile(profile, ctx, out, enemyAttacks, opts) {
  const { atk, eDmg, lck, attackSkillLevel, battle } = ctx;
  const earlyScale = earlyStrikeDamageScale(attackSkillLevel);
  const effectiveAtk = earlyScale < 1 ? Math.max(1, Math.floor(atk * (EARLY_STRIKE_ATK_CONTRIB_MULT + (1 - EARLY_STRIKE_ATK_CONTRIB_MULT) * earlyScale))) : atk;
  let dmg = Math.floor(effectiveAtk * profile.damageMult * (opts?.damageMultScale ?? 1));
  if (!enemyAttacks && profile.openingBonusMult != null) {
    dmg = Math.floor(dmg * profile.openingBonusMult);
  }
  if (earlyScale < 1) {
    dmg = Math.max(1, Math.floor(dmg * earlyScale));
  }
  if (profile.crit) {
    const c = profile.crit;
    const critBase = c.base + (opts?.critChanceBonus ?? 0);
    if (rollCrit(lck, critBase, c.lckMult, c.extraCritRolls ?? 0)) {
      out.crit = true;
      const critMult = c.damageMult * (opts?.critDamageMultScale ?? 1);
      dmg = Math.floor(dmg * critMult);
      if (c.onCrit.includes("bleed")) out.bleedApplied = true;
    }
  }
  if (profile.damageFloor != null) dmg = Math.max(profile.damageFloor, dmg);
  if (battle.nextHitAtkBonusMult > 1) {
    dmg = Math.floor(dmg * battle.nextHitAtkBonusMult);
    battle.nextHitAtkBonusMult = 1;
  }
  dmg = applyPerfectGuardBonus(dmg, ctx, out);
  out.playerDmg = jitter2(dmg);
  out.incoming = profile.takeEnemyHit !== false && eDmg > 0 ? eDmg : 0;
}
function applyFurySweep(profile, ctx, out, enemyAttacks) {
  const { atk, eDmg, lck, luckSkillLevel } = ctx;
  let dmg = Math.floor(atk * profile.damageMult);
  if (!enemyAttacks && profile.openingBonusMult) dmg = Math.floor(dmg * profile.openingBonusMult);
  const c = profile.crit;
  if (rollCrit(lck, c.base, c.lckMult, c.extraCritRolls ?? 0)) {
    out.crit = true;
    dmg = Math.floor(dmg * c.damageMult);
    if (c.bleedOnCritOnly) {
      out.bleedApplied = true;
      out.bleedTurns = randomInt(BLEED_TURNS_MIN, BLEED_TURNS_MAX);
      out.bleedPotencyMult = crossSecondaryMultiplier(
        luckSkillLevel,
        CROSS_SCALE.FURY_BLEED_POTENCY_PER_LCK_LVL,
        CROSS_SCALE.FURY_BLEED_POTENCY_CAP
      );
    }
  }
  dmg = Math.max(profile.damageFloor ?? FURY_SWEEP_DAMAGE_FLOOR, dmg);
  dmg = applyPerfectGuardBonus(dmg, ctx, out);
  out.playerDmg = jitter2(dmg);
  out.incoming = profile.takeEnemyHit !== false && eDmg > 0 ? eDmg : 0;
}
function stolenMoveNativeSkillLevel(enemyMoveId, ctx) {
  switch (enemyMoveId) {
    case "SLIP":
      return ctx.spd;
    case "HOLD":
      return ctx.def;
    case "WHISPER":
      return ctx.luckSkillLevel;
    default:
      return ctx.attackSkillLevel;
  }
}
function incomingEnemyHit(ctx) {
  return ctx.eDmg > 0;
}
function applyStolenEnemyMove(enemyMoveId, ctx, out, stolenScale = 1) {
  const moveDef = MOVES[enemyMoveId];
  if (!moveDef) {
    out.playerDmg = jitter2(Math.floor(ctx.atk * 0.4 * stolenScale));
    out.incoming = 0;
    return;
  }
  const behavior = moveDef.behavior;
  let damageMult = 1;
  if ("profile" in behavior && behavior.profile && "damageMult" in behavior.profile) {
    damageMult = behavior.profile.damageMult;
  }
  let dmg = Math.floor(ctx.atk * damageMult * stolenScale);
  dmg = applyPerfectGuardBonus(dmg, ctx, out);
  out.playerDmg = jitter2(dmg);
  out.incoming = incomingEnemyHit(ctx) ? ctx.eDmg : 0;
}
function rollPhenomena(ctx, out) {
  const rollBias = crossSecondaryBonus(
    ctx.luckSkillLevel,
    CROSS_SCALE.PHENOMENA_ROLL_BIAS_PER_LCK_LVL,
    ctx.luckSkillLevel * CROSS_SCALE.PHENOMENA_ROLL_BIAS_PER_LCK_LVL
  );
  const defFloor = crossSecondaryBonus(
    ctx.def,
    CROSS_SCALE.PHENOMENA_DEF_FLOOR_PER_DEF_LVL,
    CROSS_SCALE.PHENOMENA_DEF_FLOOR_CAP
  );
  let roll = getCombatRng().nextInt(0, 8);
  if (rollBias > 0 && getCombatRng().next() < rollBias) {
    roll = Math.min(8, roll + 1);
  }
  switch (roll) {
    case 0:
      out.bleedApplied = true;
      return "phenomena: bleed.";
    case 1:
      out.shakeApplied = true;
      return "phenomena: shake.";
    case 2:
      out.stunApplied = true;
      return "phenomena: stun.";
    case 3:
      out.slowApplied = true;
      return "phenomena: slow.";
    case 4:
      out.missApplied = true;
      return "phenomena: they miss.";
    case 5:
      out.doubleApplied = true;
      return "phenomena: double.";
    case 6:
      out.reflectApplied = true;
      return "phenomena: reflect.";
    case 7: {
      const rng = getCombatRng();
      const mult = PHENOMENA_DAMAGE_MULT_MIN + defFloor + rng.next() * (PHENOMENA_DAMAGE_MULT_MAX - PHENOMENA_DAMAGE_MULT_MIN);
      out.playerDmg = jitter2(Math.floor(ctx.atk * mult));
      out.incoming = incomingEnemyHit(ctx) ? ctx.eDmg : 0;
      return `phenomena: ${out.playerDmg} chaos damage.`;
    }
    default: {
      const heal = Math.floor(
        ctx.playerMaxHp * (PHENOMENA_HEAL_PCT_MIN + getCombatRng().next() * (PHENOMENA_HEAL_PCT_MAX - PHENOMENA_HEAL_PCT_MIN))
      );
      out.playerDmg = 0;
      out.incoming = 0;
      return `phenomena: you recover ${heal}.`;
    }
  }
}
function applyMoveBehavior(def2, ctx, out) {
  const post = { deathClocks: [], selfDamage: 0, healPlayer: 0 };
  const {
    atk,
    attackSkillLevel,
    def: defSkillLevel,
    eDmg,
    enemyAttacks,
    lck,
    luckSkillLevel,
    spd,
    battle
  } = ctx;
  const behavior = def2.behavior;
  switch (behavior.kind) {
    case "damage": {
      const opts = def2.id === "STRIKE" ? {
        critChanceBonus: crossSecondaryBonus(
          luckSkillLevel,
          CROSS_SCALE.STRIKE_CRIT_CHANCE_PER_LCK_LVL,
          luckSkillLevel * CROSS_SCALE.STRIKE_CRIT_CHANCE_PER_LCK_LVL
        )
      } : void 0;
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks, opts);
      if (def2.id === "WHISPER") {
        out.shakePotency = crossSecondaryBonus(
          spd,
          CROSS_SCALE.WHISPER_SHAKE_WEAKEN_PER_SPD_LVL,
          CROSS_SCALE.WHISPER_SHAKE_WEAKEN_CAP
        );
      }
      break;
    }
    case "fury-sweep":
      applyFurySweep(behavior.profile, ctx, out, enemyAttacks);
      break;
    case "dodge": {
      const dodge = resolvePlayerDodgeMove({
        moveId: def2.id,
        profile: behavior.profile,
        incomingHit: incomingEnemyHit(ctx) ? ctx.eDmg : 0,
        atk,
        attackSkillLevel,
        speedSkillLevel: ctx.spd,
        defenseSkillLevel: defSkillLevel,
        luckSkillLevel,
        defStat: ctx.defStat,
        lckStat: lck
      });
      out.dodged = dodge.dodged;
      out.incoming = dodge.incoming;
      out.playerDmg = dodge.playerDmg;
      if (dodge.stunApplied) out.stunApplied = true;
      break;
    }
    case "brace": {
      const b = behavior.profile;
      out.braced = true;
      out.playerDmg = 0;
      out.incoming = incomingEnemyHit(ctx) ? Math.floor(ctx.eDmg * braceIncomingMultiplier(b.incomingMult, ctx.def)) : 0;
      if (incomingEnemyHit(ctx)) {
        battle.playerPerfectGuard = true;
        if (def2.id === "HOLD") {
          out.braceChipDmg = crossSecondaryFlat(
            attackSkillLevel,
            CROSS_SCALE.HOLD_BRACE_CHIP_PER_ATK_LVL,
            CROSS_SCALE.HOLD_BRACE_CHIP_CAP
          );
        }
        if (def2.id === "ANCHOR") {
          post.healPlayer = crossSecondaryFlat(
            luckSkillLevel,
            CROSS_SCALE.ANCHOR_BRACE_HEAL_PER_LCK_LVL,
            CROSS_SCALE.ANCHOR_BRACE_HEAL_CAP
          );
        }
      }
      if (b.blockStatus) battle.anchorBlocksStatus = true;
      break;
    }
    case "dark-break": {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks);
      battle.enemyAccuracyMult = behavior.accuracyMult;
      const extraTurns = crossSecondaryFlat(
        spd,
        CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_PER_SPD_LVL,
        CROSS_SCALE.DARK_BREAK_EXTRA_TURNS_CAP
      );
      battle.enemyAccuracyTurns = randomInt(behavior.accuracyTurns.min, behavior.accuracyTurns.max) + extraTurns;
      break;
    }
    case "cannon": {
      applyDamageProfile(behavior.profile, ctx, out, enemyAttacks, {
        critDamageMultScale: crossSecondaryMultiplier(
          luckSkillLevel,
          CROSS_SCALE.CANNON_CRIT_DMG_PER_LCK_LVL,
          CROSS_SCALE.CANNON_CRIT_DMG_CAP
        )
      });
      if (out.crit && getCombatRng().next() < behavior.defShatterChance) {
        battle.enemyDefShattered = true;
      }
      break;
    }
    case "blackout": {
      if (battle.blackoutPhase === "idle") {
        battle.blackoutPhase = "loading";
        out.playerDmg = 0;
        out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      } else if (battle.blackoutPhase === "armed") {
        const momentum = crossSecondaryMultiplier(
          spd,
          CROSS_SCALE.BLACKOUT_MOMENTUM_PER_SPD_LVL,
          CROSS_SCALE.BLACKOUT_MOMENTUM_CAP
        );
        out.playerDmg = jitter2(Math.floor(atk * BLACKOUT_ARMED_DAMAGE_MULT * momentum));
        if (incomingEnemyHit(ctx)) {
          if (getCombatRng().next() < speedDodgeSuccessChance(ctx.spd) * BLACKOUT_RELEASE_DODGE_MULT) {
            out.dodged = true;
            out.incoming = 0;
          } else {
            out.incoming = eDmg;
          }
        } else {
          out.incoming = 0;
        }
        battle.blackoutPhase = "recharging";
      } else {
        out.playerDmg = 0;
        out.incoming = 0;
      }
      break;
    }
    case "gravity-shift": {
      out.playerDmg = jitter2(Math.floor(atk * 0.35));
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      out.slowApplied = true;
      const extraSlow = crossSecondaryFlat(
        luckSkillLevel,
        CROSS_SCALE.GRAVITY_SLOW_TURNS_PER_LCK_LVL,
        CROSS_SCALE.GRAVITY_SLOW_TURNS_CAP
      );
      out.slowTurns = randomInt(behavior.slowTurns.min, behavior.slowTurns.max) + Math.floor(extraSlow);
      break;
    }
    case "refract": {
      const atkMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.REFRACT_ATK_PER_ATK_LVL,
        CROSS_SCALE.REFRACT_ATK_CAP
      );
      out.playerDmg = Math.max(
        0,
        Math.floor(battle.lastEnemyDamage * REFRACT_DAMAGE_MULT * atkMult)
      );
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      break;
    }
    case "hyperdrive": {
      const setupMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.HYPERDRIVE_SETUP_ATK_PER_ATK_LVL,
        CROSS_SCALE.HYPERDRIVE_SETUP_ATK_CAP
      );
      out.playerDmg = jitter2(Math.floor(atk * 0.25 * setupMult));
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      battle.hyperdriveArmed = true;
      break;
    }
    case "counterweight": {
      out.playerDmg = 0;
      battle.counterweightBlockPct = COUNTERWEIGHT_BLOCK_PCT_MIN + getCombatRng().next() * (COUNTERWEIGHT_BLOCK_PCT_MAX - COUNTERWEIGHT_BLOCK_PCT_MIN);
      const reflectAtkBonus = crossSecondaryBonus(
        attackSkillLevel,
        CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_PER_ATK_LVL,
        CROSS_SCALE.COUNTERWEIGHT_REFLECT_ATK_CAP
      );
      if (getCombatRng().next() < COUNTERWEIGHT_REFLECT_CHANCE) {
        battle.counterweightReflectPct = Math.min(
          1,
          COUNTERWEIGHT_REFLECT_PCT_MIN + getCombatRng().next() * (COUNTERWEIGHT_REFLECT_PCT_MAX - COUNTERWEIGHT_REFLECT_PCT_MIN) + reflectAtkBonus
        );
      }
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      break;
    }
    case "brick-wall": {
      out.playerDmg = 0;
      out.incoming = 0;
      battle.playerNextAttackImmune = true;
      break;
    }
    case "invincible": {
      out.playerDmg = 0;
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      const sacrificeRelief = crossSecondaryBonus(
        luckSkillLevel,
        CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_PER_LCK_LVL,
        CROSS_SCALE.INVINCIBLE_SACRIFICE_RELIEF_CAP
      );
      post.selfDamage = Math.floor(
        ctx.playerHp * Math.max(0.01, INVINCIBLE_SACRIFICE_PCT - sacrificeRelief)
      );
      battle.playerInvincibleBlocks = INVINCIBLE_BLOCK_COUNT;
      battle.oncePerBattleUsed.INVINCIBLE = true;
      break;
    }
    case "loop": {
      const loopMult = crossSecondaryMultiplier(
        attackSkillLevel,
        CROSS_SCALE.LOOP_REPEAT_ATK_PER_ATK_LVL,
        CROSS_SCALE.LOOP_REPEAT_ATK_CAP
      );
      applyDamageProfile(
        { damageMult: LOOP_DAMAGE_MULT * loopMult, takeEnemyHit: true },
        ctx,
        out,
        enemyAttacks
      );
      break;
    }
    case "snag": {
      const pool = ctx.npcMovePool;
      if (pool.length > 0 && ctx.moveSlot != null) {
        const stolen = pool[getCombatRng().nextInt(0, pool.length - 1)];
        battle.snagStolen[ctx.moveSlot] = stolen;
        const nativeLvl = stolenMoveNativeSkillLevel(stolen, ctx);
        const stolenScale = crossSecondaryMultiplier(
          nativeLvl,
          CROSS_SCALE.SNAG_STOLEN_PER_NATIVE_LVL,
          CROSS_SCALE.SNAG_STOLEN_CAP
        );
        applyStolenEnemyMove(stolen, ctx, out, stolenScale);
      } else {
        out.playerDmg = jitter2(Math.floor(atk * 0.3));
        out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      }
      break;
    }
    case "phenomena": {
      post.phenomenaLine = rollPhenomena(ctx, out);
      const healMatch = post.phenomenaLine.match(/recover (\d+)/);
      if (healMatch) post.healPlayer = parseInt(healMatch[1], 10);
      break;
    }
    case "sealed-fate": {
      const turns = randomInt(SEALED_FATE_TURN_MIN, SEALED_FATE_TURN_MAX);
      const dmg = Math.floor(ctx.atk * SEALED_FATE_DAMAGE_MULT);
      post.deathClocks = scheduleDeathClock([], dmg, turns, "enemy", "sealed fate", {
        hitChance: SEALED_FATE_HIT_CHANCE,
        missSelfDamagePct: SEALED_FATE_MISS_SELF_DAMAGE_PCT
      });
      out.playerDmg = 0;
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      break;
    }
    case "second-wind": {
      const pct = Math.min(
        SECOND_WIND_HEAL_CAP_PCT,
        SECOND_WIND_HEAL_BASE_PCT + ctx.def * SECOND_WIND_HEAL_PER_DEF_PCT + crossSecondaryBonus(
          luckSkillLevel,
          CROSS_SCALE.SECOND_WIND_LCK_HEAL_PER_LVL,
          CROSS_SCALE.SECOND_WIND_LCK_HEAL_CAP
        )
      );
      post.healPlayer = Math.floor(ctx.playerMaxHp * pct);
      out.playerDmg = 0;
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      battle.oncePerBattleUsed.SECOND_WIND = true;
      break;
    }
    case "devils-cut": {
      out.playerDmg = jitter2(Math.floor(atk * DEVILS_CUT_DAMAGE_MULT));
      out.incoming = incomingEnemyHit(ctx) ? eDmg : 0;
      battle.devilsCutTurns = randomInt(DEVILS_CUT_TURNS_MIN, DEVILS_CUT_TURNS_MAX);
      battle.devilsCutPct = Math.min(
        DEVILS_CUT_LIFESTEAL_CAP,
        DEVILS_CUT_LIFESTEAL_BASE + ctx.lck * DEVILS_CUT_LIFESTEAL_PER_LCK + crossSecondaryBonus(
          attackSkillLevel,
          CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_PER_ATK_LVL,
          CROSS_SCALE.DEVILS_CUT_LIFESTEAL_ATK_CAP
        )
      );
      break;
    }
  }
  applyMoveResolveStatuses(def2.onResolve, out);
  return post;
}

// src/data/moves.ts
function getMoveDef(id) {
  return MOVES[id];
}
function enemyMoveOnResolveSpecs(eMove) {
  if (eMove === "STUNNED") return [];
  const legacy = ENEMY_MOVES[eMove];
  if (legacy) return legacy.onResolve;
  return MOVES[eMove]?.onResolve ?? [];
}
function applyPlayerMoveFromDef(def2, ctx, out) {
  return applyMoveBehavior(def2, ctx, out);
}
function mergeResolveIntoCombatStatus(status, out, blockStatus) {
  if (blockStatus) return status;
  let next = status;
  if (out.shakeApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: "shake",
        turns: out.shakePotency != null ? STATUS_DEFAULT_TURNS.shake : void 0
      },
      "enemy"
    );
    if (out.shakePotency != null) {
      next = {
        ...next,
        enemyShakePotency: Math.max(
          0.05,
          ENEMY_SHAKE_OUTGOING_MULT - out.shakePotency
        )
      };
    }
  }
  if (out.bleedApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: "bleed",
        turns: out.bleedTurns ?? rollBleedTurns()
      },
      "enemy"
    );
    if (out.bleedPotencyMult != null) {
      next = { ...next, enemyBleedPotencyMult: out.bleedPotencyMult };
    }
  }
  if (out.stunApplied) next = applyStatusToCombat(next, "stun", "enemy");
  if (out.braced) next = applyStatusToCombat(next, "brace", "player");
  if (out.slowApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: "slow",
        turns: out.slowTurns ?? STATUS_DEFAULT_TURNS.slow
      },
      "enemy"
    );
  }
  if (out.missApplied) next = applyStatusToCombat(next, "miss", "enemy");
  if (out.doubleApplied) next = applyStatusToCombat(next, "double", "player");
  if (out.reflectApplied) next = applyStatusToCombat(next, "reflect", "player");
  return next;
}
function mergeEnemyMoveIntoCombatStatus(status, eMove, blockStatus) {
  if (blockStatus || eMove === "STUNNED") return status;
  let next = status;
  for (const spec of enemyMoveOnResolveSpecs(eMove)) {
    const effect = typeof spec === "string" ? spec : spec.effect;
    const playerActorTarget = statusTargetFor(effect);
    const enemyActorTarget = playerActorTarget === "enemy" ? "player" : "enemy";
    next = applyStatusToCombat(next, spec, enemyActorTarget);
  }
  return next;
}
function previewEnemyStatusOnPlayer(eMove, blockStatus) {
  const flags = {
    playerShakeApplied: false,
    playerBleedApplied: false,
    playerStunApplied: false,
    playerSlowApplied: false,
    playerMissApplied: false
  };
  if (blockStatus || eMove === "STUNNED") return flags;
  for (const spec of enemyMoveOnResolveSpecs(eMove)) {
    const effect = typeof spec === "string" ? spec : spec.effect;
    if (effect === "shake") flags.playerShakeApplied = true;
    if (effect === "bleed") flags.playerBleedApplied = true;
    if (effect === "stun") flags.playerStunApplied = true;
    if (effect === "slow") flags.playerSlowApplied = true;
    if (effect === "miss") flags.playerMissApplied = true;
  }
  return flags;
}
var PLAYER_INCOMING_DEFENSE_KINDS = /* @__PURE__ */ new Set([
  "brace",
  "dodge",
  "brick-wall",
  "counterweight",
  "invincible"
]);
function playerIncomingDefenseKind(pMove) {
  const kind = getMoveDef(pMove).behavior.kind;
  return PLAYER_INCOMING_DEFENSE_KINDS.has(kind) ? kind : null;
}
function enemyOutgoingDefenseKind(eMove) {
  if (eMove === "STUNNED") return null;
  const def2 = MOVES[eMove];
  if (!def2) return null;
  const kind = def2.behavior.kind;
  return kind === "brace" || kind === "dodge" ? kind : null;
}
function playerDefendedAgainstIncoming(r) {
  if (!r.playerActed || r.rawIncoming <= 0 || r.eMove === "STUNNED") return false;
  if (!playerIncomingDefenseKind(r.pMove)) return false;
  return r.dodged || r.braced || r.damageBlocked > 0 || r.damageAvoided > 0;
}
function enemyDefendedAgainstOutgoing(r) {
  if (!r.playerActed || r.eMove === "STUNNED") return false;
  if (!enemyOutgoingDefenseKind(r.eMove)) return false;
  return r.enemyDodged || r.enemyBraced || r.enemyDamageBlocked > 0;
}
function combinedPlayerDefenseLogLine(r, displayName) {
  const lower = displayName.toLowerCase();
  const enemyMove = getMoveLogDisplayName(r.eMove);
  const playerMove = getMoveLogDisplayName(r.pMove);
  const prefix = `${lower}'s ${enemyMove} vs ${playerMove}.`;
  if (r.dodged) {
    if (r.pMove === "SLIP") {
      return `${prefix} counter for ${r.playerDmg}.${r.stunApplied ? ` ${lower} reels.` : ""}`;
    }
    if (r.pMove === "PARRY") {
      return `${prefix} ${r.playerDmg} back.`;
    }
    return `${prefix} dodged.${r.playerDmg > 0 ? ` ${r.playerDmg} back.` : ""}`;
  }
  if (r.pMove === "ANCHOR") {
    if (r.incoming > 0) return `${prefix} ${r.incoming} chip. status blocked.`;
    return `${prefix} blocked.`;
  }
  if (r.braced || r.pMove === "HOLD") {
    if (r.incoming > 0) return `${prefix} ${r.incoming} chip.`;
    return `${prefix} blocked.`;
  }
  if (r.incoming > 0) return `${prefix} ${r.incoming} taken.`;
  return `${prefix} blocked.`;
}
function combinedEnemyDefenseLogLine(r, displayName) {
  const lower = displayName.toLowerCase();
  const playerMove = getMoveLogDisplayName(r.pMove);
  const enemyMove = getMoveLogDisplayName(r.eMove);
  const prefix = `${playerMove} vs ${lower}'s ${enemyMove}.`;
  if (r.enemyDodged && r.playerDmg === 0) return `${prefix} whiff.`;
  return `${prefix} ${r.playerDmg}.`;
}
function combinedGuardCounterLogLine(r, displayName, playerHit) {
  const lower = displayName.toLowerCase();
  const playerMove = getMoveLogDisplayName(r.pMove);
  const enemyMove = getMoveLogDisplayName(r.eMove);
  return `${playerMove} vs ${lower}'s ${enemyMove}. counters. ${playerHit}.`;
}
function playerLogLineForMove(r) {
  return getMoveDef(r.pMove).playerLogLine(r);
}

// src/utils/publicAsset.ts
function publicAsset(path) {
  const base = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : "/";
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}

// src/data/npcs.ts
var NPC1_SPRITE = publicAsset("Assets/Characters/npcs/npc1-idle-sheet.png");
var NPC2_SPRITE = publicAsset("Assets/Characters/npcs/npc2-idle-sheet.png");
var NPC4_SPRITE = publicAsset("Assets/Characters/npcs/npc4-idle-sheet.png");
var NPC5_IDLE_SPRITE = `${publicAsset("Assets/Characters/npcs/npc5-idle.PNG")}?v=3`;
var ADAM_IDLE_SPRITE = `${publicAsset("Assets/Characters/npcs/Adam-idle.PNG")}?v=2`;
var MARK_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/mark-idle.png");
var JACLYN_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/jaclyn-idle.png");
var WALKER_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/Walker-idle.png");
var JASON_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/jason-idle.png");
var CLERK_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/clerk-idle.png");
var RESTOCKER_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/restocker-idle.png");
var TOWN_CRIER_IDLE_SPRITE = publicAsset("Assets/Characters/npcs/towncrier-idle.png");
var GATING_NPC_1 = {
  id: "npc1",
  name: "",
  x: 130,
  y: 360,
  lines: [
    "you're up. okay. okay okay okay.",
    "you don't know what you are yet. that's normal. move. just move first."
  ],
  color: "#7a7a96",
  spriteSrc: NPC1_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var GATING_NPC_2 = {
  id: "npc2",
  name: "",
  x: 340,
  y: 505,
  lines: [
    "everybody here's waiting on something. is it you?"
  ],
  color: "#7a7a96",
  spriteSrc: NPC2_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var GATING_NPC_3 = {
  id: "npc3",
  name: "",
  x: 1140,
  y: 520,
  lines: [
    "there's a man. don't say his name loud? okay.",
    "they put up notices about him. you'll find one."
  ],
  color: "#7a7a96",
  spriteSrc: NPC5_IDLE_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var GATING_NPC_4 = {
  id: "npc4",
  name: "",
  x: 70,
  y: 580,
  lines: [
    "the darkline's how you get anywhere. it goes through Mark, though.",
    "adam's got something for you. start there."
  ],
  color: "#7a7a96",
  spriteSrc: NPC4_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var GATING_NPCS = [
  GATING_NPC_1,
  GATING_NPC_2,
  GATING_NPC_3,
  GATING_NPC_4
];
var WALKER_NPC = {
  id: "walker",
  name: "walker",
  x: 800,
  y: 508,
  lines: [
    "i heard you spawned. cute.",
    "everybody thinks they're the one.",
    "if you are, show me then."
  ],
  linesConverted: [
    "oh.",
    "i get it now. i get it.",
    "tell me where to go. tell me what to say. i'll say it exactly.",
    "i told you. i told all of you. exactly like he said."
  ],
  color: "#7a7a96",
  spriteSrc: WALKER_IDLE_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var JACLYN_NPC = {
  id: "jaclyn",
  name: "jaclyn",
  x: 1060,
  y: 358,
  lines: [
    "i know what you did to walker.",
    "he was annoying but he was HIM. now he's... different.",
    "i'm not scared of you. i just don't think you should."
  ],
  linesConverted: [
    "...oh. you're right. of course you're right.",
    "why was i fighting this?"
  ],
  color: "#7a7a96",
  spriteSrc: JACLYN_IDLE_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var MARK_NPC = {
  id: "mark",
  name: "mark",
  x: 598,
  y: 795,
  linesBlocked: ["you better ask around."],
  lines: [
    "everybody wants through. nobody gets through.",
    "you're not the first to wear that jacket either.",
    { speaker: "jason", text: "just send it, mark." },
    "...yeah. send it."
  ],
  linesConverted: ["huh.", "goat yoga...where do you want me."],
  color: "#c084fc",
  spriteSrc: MARK_IDLE_SPRITE,
  spriteLayout: "horizontal-bbox",
  fixedFacing: "up"
};
var ADAM_NPC = {
  id: "adam",
  name: "adam",
  x: 560,
  y: 480,
  lines: [
    "tap interact to say what's up. like you just did.",
    "when someone gives you an artifact it shows up in your fanny pack.",
    "you'll need this."
  ],
  color: "#afa9ec",
  spriteSrc: ADAM_IDLE_SPRITE,
  spriteLayout: "horizontal-bbox"
};
var FIVE_OVERWORLD_NPCS = [
  ADAM_NPC,
  ...GATING_NPCS,
  WALKER_NPC,
  JACLYN_NPC,
  MARK_NPC
];

// src/data/buildName.ts
var BALANCED = {
  name: "blank slate",
  color: "#f4e8c1"
};
var BUILD_NAME_UNLOCK_GAP = 2;
var PURE_THRESHOLD = BUILD_NAME_UNLOCK_GAP;
var COMBO_THRESHOLD = 3;
var LOW_SKILL_GAP = 5;
var FINAL_FORM_MIN = 40;
var EQUILIBRIUM_SPREAD_MAX = 4;
var RED = "#cc4444";
var BLUE = "#4488cc";
var GREEN = "#44cc66";
var PURPLE = "#c084fc";
var GOLD = "#d4b87a";
var CREAM = "#f4e8c1";
var SKILL_COLORS = {
  attack: RED,
  speed: GREEN,
  defense: BLUE,
  luck: PURPLE
};
var PURE_NAMES = {
  attack: "heavy hands",
  defense: "immovable wall",
  speed: "speed demon",
  luck: "wildcard"
};
var COMBO_NAMES = {
  "attack+speed": "assassin",
  "attack+defense": "bruiser",
  "attack+luck": "crashout",
  "defense+speed": "untouchable",
  "luck+speed": "gambit",
  "defense+luck": "fortress"
};
var LOW_STAT_BUILDS = {
  "attack+defense": { name: "glass cannon", color: RED },
  "defense+attack": { name: "deadbolt", color: BLUE },
  "speed+defense": { name: "paper ghost", color: GREEN },
  luck: { name: "longshot", color: PURPLE }
};
function pairKey(a, b) {
  return [a, b].sort().join("+");
}
function rankedCombatSkills(skills) {
  return [
    { skill: "attack", level: skills.attack.level },
    { skill: "speed", level: skills.speed.level },
    { skill: "defense", level: skills.defense.level },
    { skill: "luck", level: skills.luck.level }
  ].sort((a, b) => b.level - a.level);
}
function avgOtherLevels(skills, skill) {
  const others = rankedCombatSkills(skills).filter((s) => s.skill !== skill);
  return others.reduce((sum, s) => sum + s.level, 0) / others.length;
}
function isLowSkill(skills, skill) {
  const level = skills[skill].level;
  return level <= avgOtherLevels(skills, skill) - LOW_SKILL_GAP;
}
function allFinalForm(skills) {
  return skills.attack.level >= FINAL_FORM_MIN && skills.speed.level >= FINAL_FORM_MIN && skills.defense.level >= FINAL_FORM_MIN && skills.luck.level >= FINAL_FORM_MIN;
}
function isEquilibrium(skills) {
  const levels = rankedCombatSkills(skills).map((s) => s.level);
  const spread = levels[0] - levels[levels.length - 1];
  const minLevel = levels[levels.length - 1];
  return minLevel >= FINAL_FORM_MIN && spread <= EQUILIBRIUM_SPREAD_MAX;
}
function deriveLowStatBuild(skills) {
  const ranked = rankedCombatSkills(skills);
  const top = ranked[0];
  const second = ranked[1];
  if (top.level - second.level < PURE_THRESHOLD) return null;
  if (top.skill === "attack") {
    if (isLowSkill(skills, "defense")) return LOW_STAT_BUILDS["attack+defense"];
    return null;
  }
  if (top.skill === "defense" && isLowSkill(skills, "attack")) {
    return LOW_STAT_BUILDS["defense+attack"];
  }
  if (top.skill === "speed" && isLowSkill(skills, "defense")) {
    return LOW_STAT_BUILDS["speed+defense"];
  }
  if (top.skill === "luck") {
    const othersLow = isLowSkill(skills, "attack") || isLowSkill(skills, "defense") || isLowSkill(skills, "speed");
    if (othersLow) return LOW_STAT_BUILDS.luck;
  }
  return null;
}
function deriveBuildName(skills) {
  if (allFinalForm(skills)) {
    if (isEquilibrium(skills)) {
      return { name: "equilibrium", color: CREAM };
    }
    return { name: "final form", color: GOLD };
  }
  const lowStat = deriveLowStatBuild(skills);
  if (lowStat) return lowStat;
  const ranked = rankedCombatSkills(skills);
  const top = ranked[0];
  const second = ranked[1];
  const third = ranked[2];
  if (top.level - second.level >= PURE_THRESHOLD) {
    return {
      name: PURE_NAMES[top.skill],
      color: SKILL_COLORS[top.skill]
    };
  }
  if (second.level - third.level >= COMBO_THRESHOLD) {
    return {
      name: COMBO_NAMES[pairKey(top.skill, second.skill)] ?? BALANCED.name,
      color: SKILL_COLORS[top.skill]
    };
  }
  return BALANCED;
}
function deriveBuildLoopType(skills) {
  const ranked = rankedCombatSkills(skills);
  const top = ranked[0];
  const second = ranked[1];
  const third = ranked[2];
  if (top.level - second.level >= PURE_THRESHOLD) {
    return top.skill;
  }
  if (second.level - third.level >= COMBO_THRESHOLD) {
    return top.skill;
  }
  return null;
}

// combat-core/xpBridge.ts
var skillXpApplier = null;
function registerSkillXpApplier(applier) {
  skillXpApplier = applier;
}
function applySkillXpToState(state2, r, log, combatXpPolicy) {
  if (combatXpPolicy === "none" || !skillXpApplier) {
    return { state: state2, log, xpBonusEvents: [] };
  }
  return skillXpApplier(state2, r, log);
}

// scripts/edge-stubs/playerStore.ts
var DEFAULT_SKILLS = {
  attack: { level: 1, xp: 0 },
  speed: { level: 1, xp: 0 },
  defense: { level: 1, xp: 0 },
  luck: { level: 1, xp: 0 },
  hp: { level: 1, xp: 0 }
};
function getPlayerStoreState() {
  return {
    archetype: "atk",
    accessories: [],
    skills: DEFAULT_SKILLS,
    equippedMoves: ["STRIKE", "SLIP", "WHISPER", "HOLD"],
    hp: null,
    showDebug: false
  };
}
function getPlayerSkills() {
  return DEFAULT_SKILLS;
}
function applyCombatSkillXp() {
  return {
    skillLevelUps: [],
    newlyUnlockedMoves: [],
    playerLevelBefore: 1,
    playerLevel: 1,
    playerLevelLine: null,
    bonusCallouts: []
  };
}

// src/data/skillCounter.ts
var BEATS = {
  attack: "speed",
  speed: "luck",
  luck: "defense",
  defense: "attack"
};
function getSkillCounterRelation(playerType, enemyLean) {
  if (!playerType || enemyLean === "none") return "neutral";
  if (playerType === enemyLean) return "neutral";
  if (BEATS[playerType] === enemyLean) return "advantage";
  if (BEATS[enemyLean] === playerType) return "disadvantage";
  return "neutral";
}
function applySkillCounterModifiers(out, relation) {
  if (relation === "neutral") return;
  if (relation === "advantage") {
    if (out.playerDmg > 0) {
      out.playerDmg = Math.max(1, Math.floor(out.playerDmg * COUNTER_ADVANTAGE_DMG_MULT));
    }
    if (out.incoming > 0) {
      out.incoming = Math.max(1, Math.floor(out.incoming * COUNTER_ADVANTAGE_INCOMING_MULT));
    }
    return;
  }
  if (out.playerDmg > 0) {
    out.playerDmg = Math.max(1, Math.floor(out.playerDmg * COUNTER_DISADVANTAGE_DMG_MULT));
  }
  if (out.incoming > 0) {
    out.incoming = Math.max(1, Math.floor(out.incoming * COUNTER_DISADVANTAGE_INCOMING_MULT));
  }
}

// src/data/timingBonusXp.ts
var COMBAT_SKILL_TONE = {
  attack: "attack",
  speed: "speed",
  defense: "defense",
  luck: "luck"
};
function bonusCallout(skill, text) {
  return {
    kind: "xp-bonus",
    text,
    target: "player",
    tone: COMBAT_SKILL_TONE[skill]
  };
}
function isHeavyTelegraphedMove(move) {
  if (move === "STUNNED") return false;
  const def2 = MOVES[move];
  if (!def2) return false;
  const b = def2.behavior;
  if (b.kind === "cannon" || b.kind === "blackout" || b.kind === "sealed-fate") return true;
  if ("profile" in b && b.profile && "damageMult" in b.profile) {
    return b.profile.damageMult >= 1.6;
  }
  return false;
}
function computeTimingBonusGrants(r, enemyLean, buildLoop = null) {
  if (!r.playerActed) return [];
  const grants = [];
  if (r.dodged && r.playerDmg > 0) {
    grants.push({
      skill: "speed",
      amount: COUNTER_XP_BONUS,
      callout: bonusCallout("speed", "+xp clean counter!")
    });
  }
  if (r.perfectGuardBonus) {
    grants.push({
      skill: "defense",
      amount: PERFECT_GUARD_XP_BONUS,
      callout: bonusCallout("defense", "+xp perfect guard!")
    });
  }
  const relation = getSkillCounterRelation(buildLoop, enemyLean);
  if (relation === "advantage" && r.playerDmg > 0 && buildLoop) {
    grants.push({
      skill: buildLoop,
      amount: ADVANTAGE_XP_BONUS,
      callout: bonusCallout(buildLoop, "+xp advantage!")
    });
  }
  if (isHeavyTelegraphedMove(r.eMove) && r.rawIncoming > 0 && (r.dodged || r.braced || r.damageBlocked > 0)) {
    const skill = r.dodged ? "speed" : "defense";
    grants.push({
      skill,
      amount: TELEGRAPH_READ_XP_BONUS,
      callout: bonusCallout(skill, "+xp read the telegraph!")
    });
  }
  return grants;
}

// src/data/ghostDailyReset.ts
var GHOST_DAILY_EPOCH_MS = Date.parse("2026-05-26T09:00:00.000Z");
var MS_PER_GHOST_DAY = 24 * 60 * 60 * 1e3;

// src/data/practiceDailyReset.ts
function practiceCombatXpMultiplier(budget, sessionEarnedSoFar, rawXp) {
  if (rawXp <= 0) return 0;
  const tally = budget.xpToday + sessionEarnedSoFar;
  const hardStop = budget.dailyCap + budget.softOverflow;
  if (tally >= hardStop) return 0;
  if (tally >= budget.dailyCap) return budget.diminishedMult;
  const headroom = budget.dailyCap - tally;
  if (rawXp <= headroom) return 1;
  const fullPart = headroom;
  const dimPart = rawXp - headroom;
  const dimCap = hardStop - budget.dailyCap;
  const dimUsed = Math.max(0, tally + headroom - budget.dailyCap);
  const dimHeadroom = Math.max(0, dimCap - dimUsed);
  const dimGrant = Math.min(dimPart, dimHeadroom);
  const effective = fullPart + dimGrant * budget.diminishedMult;
  return effective / rawXp;
}

// src/data/skillXpCurve.ts
var SKILL_XP_CURVE_BANDS = {
  onboarding: { throughFromLevel: 5, start: 50, step: 18 },
  warmup: { throughFromLevel: 10, start: 150, step: 28 },
  ramp: { throughFromLevel: 20, start: 380, step: 95 },
  grind: { throughFromLevel: 40, start: 1450, step: 185 },
  summit: { start: 5500, step: 420 }
};
function rawCostForAdvance(fromLevel) {
  const { onboarding, warmup, ramp, grind, summit } = SKILL_XP_CURVE_BANDS;
  if (fromLevel <= onboarding.throughFromLevel) {
    return onboarding.start + (fromLevel - 1) * onboarding.step;
  }
  if (fromLevel <= warmup.throughFromLevel) {
    const offset2 = fromLevel - onboarding.throughFromLevel - 1;
    return warmup.start + offset2 * warmup.step;
  }
  if (fromLevel <= ramp.throughFromLevel) {
    const offset2 = fromLevel - warmup.throughFromLevel - 1;
    return ramp.start + offset2 * ramp.step;
  }
  if (fromLevel <= grind.throughFromLevel) {
    const offset2 = fromLevel - ramp.throughFromLevel - 1;
    return grind.start + offset2 * grind.step;
  }
  const offset = fromLevel - grind.throughFromLevel - 1;
  return summit.start + offset * summit.step;
}
function buildLevelUpCosts(maxLevel) {
  const costs = [];
  for (let from = 1; from < maxLevel; from++) {
    costs.push(rawCostForAdvance(from));
  }
  for (let i = 1; i < costs.length; i++) {
    if (costs[i] <= costs[i - 1]) {
      costs[i] = costs[i - 1] + 1;
    }
  }
  return costs;
}
function buildXpCurve(maxLevel) {
  const levelUpCosts = buildLevelUpCosts(maxLevel);
  const cumulative = [0];
  for (const cost of levelUpCosts) {
    cumulative.push(cumulative[cumulative.length - 1] + cost);
  }
  const xpForSkillLevel = (n) => {
    if (!Number.isFinite(n) || n < 1 || n >= maxLevel) return 0;
    return levelUpCosts[n - 1] ?? 0;
  };
  return {
    levelUpCosts,
    maxSkillXp: cumulative[cumulative.length - 1] ?? 0,
    xpForSkillLevel,
    xpForLevel: xpForSkillLevel,
    cumulativeXpForLevel(n) {
      if (!Number.isFinite(n) || n <= 1) return 0;
      const clamped = Math.min(maxLevel, Math.max(1, Math.floor(n)));
      return cumulative[clamped - 1] ?? 0;
    }
  };
}

// src/store/skillStore.ts
var SKILL_IDS = ["attack", "speed", "defense", "luck", "hp"];
var MAX_SKILL_LEVEL = 65;
var MAX_PLAYER_LEVEL = 100;
var XP_CURVE = buildXpCurve(MAX_SKILL_LEVEL);
function sumSkillLevels(skills) {
  return SKILL_IDS.reduce((sum, id) => sum + skills[id].level, 0);
}
function computePlayerLevel(skills) {
  const total = sumSkillLevels(skills);
  const level = 1 + Math.floor((total - 5) * 99 / 320);
  return Math.min(MAX_PLAYER_LEVEL, Math.max(1, level));
}
function createDefaultSkills() {
  const entry2 = () => ({ level: 1, xp: 0 });
  return {
    attack: entry2(),
    speed: entry2(),
    defense: entry2(),
    luck: entry2(),
    hp: entry2()
  };
}
function skillBonusSteps(level) {
  const raw = Math.max(0, level - 1);
  if (raw <= SKILL_STAT_BONUS_LINEAR_CAP) return raw;
  const excess = raw - SKILL_STAT_BONUS_LINEAR_CAP;
  return SKILL_STAT_BONUS_LINEAR_CAP + Math.floor(excess * SKILL_STAT_BONUS_TAIL_FACTOR);
}
function getSkillStatBonuses(skills) {
  return {
    atk: skillBonusSteps(skills.attack.level),
    spd: skillBonusSteps(skills.speed.level),
    def: skillBonusSteps(skills.defense.level),
    lck: skillBonusSteps(skills.luck.level),
    maxHp: (skills.hp.level - 1) * SKILL_HP_BONUS_PER_LEVEL
  };
}

// src/store/battleXp.ts
function applyBattleSkillXpToState(state2, r, log) {
  if (state2.combatXpPolicy === "none") {
    return { state: state2, log, xpBonusEvents: [] };
  }
  let sessionEarned = state2.practiceXpSessionEarned;
  const practiceScale = state2.combatXpPolicy === "practice" && state2.practiceXpBudget ? (raw) => {
    const mult = practiceCombatXpMultiplier(
      state2.practiceXpBudget,
      sessionEarned,
      raw
    );
    const scaled = Math.max(0, Math.round(raw * mult));
    sessionEarned += scaled;
    return scaled;
  } : void 0;
  const timingBonuses = computeTimingBonusGrants(r, state2.npc.leanSkill, state2.buildLoop);
  const xpResult = applyCombatSkillXp(r, timingBonuses, {
    enemyLevel: state2.npc.level,
    playerLevel: computePlayerLevel(state2.skillsSnapshot),
    playerHpAfterHit: state2.playerHp,
    forceLevelXpMult: state2.combatXpPolicy === "fixed-level" ? 1 : void 0,
    practiceScale
  });
  const xpBonusEvents = xpResult.bonusCallouts.filter((e) => e.kind !== "xp-bonus");
  const hasLevelUp = xpResult.skillLevelUps.length > 0 || xpResult.playerLevelLine != null;
  const pendingLevelUpNotification = hasLevelUp ? {
    skillLevelUps: xpResult.skillLevelUps,
    newlyUnlockedMoves: xpResult.newlyUnlockedMoves,
    playerLevelBefore: xpResult.playerLevelBefore,
    playerLevelAfter: xpResult.playerLevel
  } : null;
  return {
    state: {
      ...state2,
      pendingLevelUpNotification,
      practiceXpSessionEarned: sessionEarned
    },
    log,
    xpBonusEvents
  };
}

// src/store/battleStore.ts
registerSkillXpApplier(applyBattleSkillXpToState);

// src/data/npcCombatStats.ts
var NPC_BASE_STATS = {
  hp: 20,
  atk: 4,
  def: 2,
  spd: 4,
  lck: 3
};
var NPC_HP_PER_LEVEL = 5;
function npcSkillsForLevel(level, lean) {
  const skills = createDefaultSkills();
  const primary = lean === "none" ? "attack" : lean;
  skills[primary].level = level;
  skills.hp.level = level;
  const secondary = Math.max(1, level - 1);
  for (const id of ["attack", "speed", "defense", "luck"]) {
    if (id !== primary) skills[id].level = secondary;
  }
  return skills;
}
var NPC_MOVE_UNLOCK_SCALE = 5;
function npcMoveUnlockSkills(level, lean) {
  const skills = createDefaultSkills();
  const primary = lean === "none" ? "attack" : lean;
  skills[primary].level = Math.min(65, level * NPC_MOVE_UNLOCK_SCALE);
  skills.hp.level = Math.min(65, level * NPC_MOVE_UNLOCK_SCALE);
  for (const id of ["attack", "speed", "defense", "luck"]) {
    if (id !== primary) skills[id].level = Math.max(1, Math.min(65, (level - 1) * NPC_MOVE_UNLOCK_SCALE));
  }
  return skills;
}
function computeNpcCombatStats(level, lean, hpScale = 1) {
  const skills = npcSkillsForLevel(level, lean);
  const bonus = getSkillStatBonuses(skills);
  const hp = Math.max(
    1,
    Math.round((NPC_BASE_STATS.hp + (level - 1) * NPC_HP_PER_LEVEL + bonus.maxHp) * hpScale)
  );
  return {
    hp,
    maxHp: hp,
    atk: NPC_BASE_STATS.atk + bonus.atk,
    def: NPC_BASE_STATS.def + bonus.def,
    spd: NPC_BASE_STATS.spd + bonus.spd,
    lck: NPC_BASE_STATS.lck + bonus.lck
  };
}

// src/data/devSpar.ts
var DEV_SPAR_NPC_ID = "dev-spar";
var DEV_SPAR_SPRITE = publicAsset("Assets/Characters/npcs/Walker-idle.png");
var DEV_SPAR_MOVES = ["STRIKE", "ANCHOR", "SLIP", "CANNON"];
var HP_MULT = 1.2;
var ATK_MULT = 1.2;
var DEF_MULT = 1.15;
var SPD_MULT = 1.15;
function isDevSparNpcId(npcId) {
  return npcId === DEV_SPAR_NPC_ID;
}
function dominantCombatSkill(skills) {
  const ranked = [
    { skill: "attack", level: skills.attack.level },
    { skill: "speed", level: skills.speed.level },
    { skill: "defense", level: skills.defense.level },
    { skill: "luck", level: skills.luck.level }
  ];
  ranked.sort((a, b) => b.level - a.level);
  return ranked[0].skill;
}
function sparLeanSkill(skills) {
  const playerType = deriveBuildLoopType(skills);
  if (!playerType) {
    return dominantCombatSkill(skills);
  }
  const beats = {
    attack: "speed",
    speed: "luck",
    luck: "defense",
    defense: "attack"
  };
  return beats[playerType];
}
function filterDevSparMoves(moves, level, lean) {
  const unlockSkills = npcMoveUnlockSkills(level, lean);
  const filtered = moves.filter((moveId) => {
    const def2 = MOVES[moveId];
    if (!def2) return false;
    const skillLevel = unlockSkills[def2.skill]?.level ?? 1;
    return skillLevel >= def2.unlockAtSkillLevel;
  });
  return filtered.length > 0 ? filtered : ["STRIKE"];
}
function buildDevSpar() {
  const player = getPlayerStoreState();
  const skills = getPlayerSkills();
  const playerStats = computePlayerStats(
    player.archetype ?? DEFAULT_ARCHETYPE,
    player.accessories ?? [],
    skills
  );
  const maxHp = Math.max(1, Math.round(playerStats.maxHp * HP_MULT));
  const atk = Math.max(1, Math.round(playerStats.atk * ATK_MULT));
  const def2 = Math.max(1, Math.round(playerStats.def * DEF_MULT));
  const spd = Math.max(1, Math.round(playerStats.spd * SPD_MULT));
  return {
    id: DEV_SPAR_NPC_ID,
    displayName: "sparring partner",
    level: computePlayerLevel(skills),
    stats: { hp: maxHp, maxHp, atk, def: def2, spd, lck: Math.max(1, Math.round(playerStats.lck * 1.1)) },
    moves: filterDevSparMoves([...DEV_SPAR_MOVES], computePlayerLevel(skills), sparLeanSkill(skills)),
    leanSkill: sparLeanSkill(skills),
    losingLine: "good. again?",
    spriteSrc: DEV_SPAR_SPRITE,
    battleLocation: "five",
    battleSizeMult: 1
  };
}

// src/data/ghostArchetypeMoves.ts
var ARCHETYPE_ENEMY_MOVES = {
  attack: ["STRIKE", "STRIKE", "CANNON", "LOOP", "WHISPER"],
  defense: ["ANCHOR", "ANCHOR", "CANNON", "STRIKE", "SLIP"],
  speed: ["SLIP", "STRIKE", "WHISPER", "FURY_SWEEP", "LOOP"],
  luck: ["WHISPER", "WHISPER", "SLIP", "STRIKE", "LOOP"],
  balanced: ["STRIKE", "ANCHOR", "SLIP", "WHISPER", "CANNON"]
};
function enemyMovesForBuild(buildType) {
  const key = buildType ?? "balanced";
  return [...ARCHETYPE_ENEMY_MOVES[key]];
}
function leanThemedMoves(lean) {
  switch (lean) {
    case "attack":
      return ["STRIKE", "CANNON", "LOOP"];
    case "defense":
      return ["ANCHOR", "CANNON"];
    case "speed":
      return ["SLIP", "WHISPER"];
    case "luck":
      return ["WHISPER", "LOOP"];
    default:
      return ["STRIKE", "SLIP", "ANCHOR", "WHISPER"];
  }
}

// src/data/ghostMoveAi.ts
function chooseGhostMove(moves, options) {
  if (moves.length === 0) return "STRIKE";
  if (moves.length === 1) return moves[0];
  const { enemyHpRatio, lastMove, leanSkill } = options;
  const pool = lastMove ? moves.filter((m) => m !== lastMove) : [...moves];
  const candidates = pool.length > 0 ? pool : [...moves];
  const lean = leanSkill === "none" ? null : leanSkill;
  const themed = lean ? leanThemedMoves(lean) : leanThemedMoves("none");
  if (lean === "defense" && candidates.includes("ANCHOR")) {
    const holdChance = enemyHpRatio < 0.35 ? 0.72 : enemyHpRatio < 0.6 ? 0.52 : 0.32;
    if (getCombatRng().next() < holdChance) return "ANCHOR";
  }
  if (lean === "attack" && enemyHpRatio > 0.65) {
    const pressure = candidates.filter((m) => m === "STRIKE" || m === "CANNON" || m === "FURY_SWEEP" || m === "LOOP");
    if (pressure.length > 0 && getCombatRng().next() < 0.62) {
      return pressure[getCombatRng().nextInt(0, pressure.length - 1)];
    }
  }
  const themedInPool = candidates.filter((m) => themed.includes(m));
  if (themedInPool.length > 0 && getCombatRng().next() < 0.45) {
    return themedInPool[getCombatRng().nextInt(0, themedInPool.length - 1)];
  }
  return candidates[getCombatRng().nextInt(0, candidates.length - 1)];
}
function dominantCombatSkillFromLevels(skills) {
  const ranked = [
    { skill: "attack", level: skills.attack.level },
    { skill: "speed", level: skills.speed.level },
    { skill: "defense", level: skills.defense.level },
    { skill: "luck", level: skills.luck.level }
  ];
  ranked.sort((a, b) => b.level - a.level);
  return ranked[0].skill;
}
function leanSkillFromSnapshot(buildType, skills) {
  if (buildType) return buildType;
  return dominantCombatSkillFromLevels(skills);
}

// src/data/seededGhosts.ts
function skillsForSeed(primary, level) {
  const skills = createDefaultSkills();
  skills[primary].level = level;
  skills.hp.level = level;
  const secondary = Math.max(1, level - 2);
  for (const id of ["attack", "speed", "defense", "luck"]) {
    if (id !== primary) skills[id].level = secondary;
  }
  return skills;
}
function buildSeedSkills(def2) {
  return skillsForSeed(def2.primarySkill, def2.level);
}
var SEED_ROWS = [
  { id: "seed-01", handle: "BLOCK_KID", displayName: "block kid", variantId: "default", archetype: "atk", primarySkill: "attack", isFullCharacter: false },
  { id: "seed-02", handle: "SLIP_GIRL", displayName: "slip girl", variantId: "asian-f", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-03", handle: "WALL_UP", displayName: "wall up", variantId: "latino-m", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-04", handle: "LUCKY_NUM", displayName: "lucky num", variantId: "white-f", archetype: "lck", primarySkill: "luck", isFullCharacter: false },
  { id: "seed-05", handle: "MIDNIGHT_J", displayName: "midnight j", variantId: "filipino-m", archetype: "atk", primarySkill: "attack", isFullCharacter: true },
  { id: "seed-06", handle: "RILEY_GHOST", displayName: "riley", variantId: "player-riley-m", archetype: "spd", primarySkill: "speed", isFullCharacter: true },
  { id: "seed-07", handle: "BLNT_RUN", displayName: "blnt", variantId: "player-blnt", archetype: "def", primarySkill: "defense", isFullCharacter: true },
  { id: "seed-08", handle: "RON_SHADOW", displayName: "ron", variantId: "player-ron", archetype: "atk", primarySkill: "attack", isFullCharacter: true },
  { id: "seed-09", handle: "STUNNA_V", displayName: "stunna", variantId: "player-stunna", archetype: "lck", primarySkill: "luck", isFullCharacter: true },
  { id: "seed-10", handle: "FADI_ECHO", displayName: "fadi", variantId: "player-fadi", archetype: "spd", primarySkill: "speed", isFullCharacter: true },
  { id: "seed-11", handle: "HAY_FIVE", displayName: "hay five", variantId: "default", archetype: "atk", primarySkill: "attack", isFullCharacter: false },
  { id: "seed-12", handle: "BAIT_LINE", displayName: "bait line", variantId: "asian-f", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-13", handle: "FEINT_K", displayName: "feint k", variantId: "latino-m", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-14", handle: "WHISPER_X", displayName: "whisper x", variantId: "white-f", archetype: "lck", primarySkill: "luck", isFullCharacter: false },
  { id: "seed-15", handle: "LOOP_RUN", displayName: "loop run", variantId: "filipino-m", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-16", handle: "BRACE_UP", displayName: "brace up", variantId: "default", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-17", handle: "STRIKE_R", displayName: "strike r", variantId: "player-riley-m", archetype: "atk", primarySkill: "attack", isFullCharacter: false },
  { id: "seed-18", handle: "CROSS_W", displayName: "cross w", variantId: "player-blnt", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-19", handle: "HOLD_FIRM", displayName: "hold firm", variantId: "player-ron", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-20", handle: "ODDS_ON", displayName: "odds on", variantId: "player-stunna", archetype: "lck", primarySkill: "luck", isFullCharacter: false },
  { id: "seed-21", handle: "PRESSURE_P", displayName: "pressure p", variantId: "default", archetype: "atk", primarySkill: "attack", isFullCharacter: false },
  { id: "seed-22", handle: "GUARD_G", displayName: "guard g", variantId: "asian-f", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-23", handle: "RUSH_H", displayName: "rush h", variantId: "latino-m", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-24", handle: "CHANCE_C", displayName: "chance c", variantId: "white-f", archetype: "lck", primarySkill: "luck", isFullCharacter: false },
  { id: "seed-25", handle: "HEAVY_H", displayName: "heavy h", variantId: "filipino-m", archetype: "atk", primarySkill: "attack", isFullCharacter: false },
  { id: "seed-26", handle: "SHELL_S", displayName: "shell s", variantId: "player-fadi", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-27", handle: "BLITZ_B", displayName: "blitz b", variantId: "player-riley-m", archetype: "spd", primarySkill: "speed", isFullCharacter: false },
  { id: "seed-28", handle: "FATE_F", displayName: "fate f", variantId: "player-blnt", archetype: "lck", primarySkill: "luck", isFullCharacter: false },
  { id: "seed-29", handle: "IRON_I", displayName: "iron i", variantId: "player-ron", archetype: "def", primarySkill: "defense", isFullCharacter: false },
  { id: "seed-30", handle: "FINAL_F", displayName: "final f", variantId: "player-stunna", archetype: "atk", primarySkill: "attack", isFullCharacter: false }
];
var SEED_LEVELS = [
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  30
];
var SEEDED_GHOSTS = SEED_ROWS.map((row, i) => ({
  ...row,
  level: SEED_LEVELS[i] ?? 10
}));
var AUTHORED_CHAMPION_SEED_ID = "champion-fallback";
var AUTHORED_CHAMPION = {
  id: AUTHORED_CHAMPION_SEED_ID,
  handle: "THE_CHAMP",
  displayName: "the champion",
  variantId: "cencere-test",
  level: 32,
  archetype: "def",
  primarySkill: "defense",
  isFullCharacter: true
};
function getSeededGhost(id) {
  if (id === AUTHORED_CHAMPION_SEED_ID) return AUTHORED_CHAMPION;
  return SEEDED_GHOSTS.find((g) => g.id === id);
}

// src/data/ghostCombat.ts
var GHOST_PREFIX = "ghost:";
function ghostCombatId(source, id) {
  return `${GHOST_PREFIX}${source}:${id}`;
}
function isGhostCombatId(npcId) {
  return npcId.startsWith(GHOST_PREFIX);
}
function parseGhostCombatId(npcId) {
  if (!isGhostCombatId(npcId)) return null;
  const rest = npcId.slice(GHOST_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  const source = rest.slice(0, colon);
  if (source !== "real" && source !== "seed" && source !== "champion") return null;
  return { source, id: rest.slice(colon + 1) };
}
var snapshotCache = /* @__PURE__ */ new Map();
function cacheGhostSnapshot(snapshot) {
  snapshotCache.set(ghostCombatId(snapshot.source, snapshot.id), snapshot);
}
function getCachedGhostSnapshot(combatId) {
  return snapshotCache.get(combatId);
}
function snapshotFromSeeded(def2, champion = false) {
  const skills = buildSeedSkills(def2);
  const buildType = deriveBuildLoopType(skills);
  return {
    source: champion ? "champion" : "seed",
    id: def2.id,
    handle: def2.handle,
    displayName: def2.displayName,
    archetype: def2.archetype,
    skills,
    movesEquipped: ["strike", "slip", "whisper", "hold"],
    level: def2.level,
    buildType,
    leanSkill: leanSkillFromSnapshot(buildType, skills),
    buildName: deriveBuildName(skills).name,
    variantId: def2.variantId,
    isFullCharacter: def2.isFullCharacter,
    champion
  };
}
function buildGhostCombatEntry(snapshot) {
  const championMult = snapshot.champion ? { hp: 1.55, atk: 1.35, def: 1.28, spd: 1.2 } : { hp: 1, atk: 1, def: 1, spd: 1 };
  const statsBase = computePlayerStats(snapshot.archetype, [], snapshot.skills);
  const maxHp = Math.max(1, Math.round(statsBase.maxHp * championMult.hp));
  const atk = Math.max(1, Math.round(statsBase.atk * championMult.atk));
  const def2 = Math.max(1, Math.round(statsBase.def * championMult.def));
  const spd = Math.max(1, Math.round(statsBase.spd * championMult.spd));
  const moves = enemyMovesForBuild(snapshot.buildType);
  const combatId = ghostCombatId(snapshot.source, snapshot.id);
  return {
    id: combatId,
    displayName: snapshot.displayName,
    level: snapshot.level,
    stats: { hp: maxHp, maxHp, atk, def: def2, spd, lck: Math.max(1, Math.round(statsBase.lck * (championMult.atk > 1 ? 1.1 : 1))) },
    moves,
    leanSkill: snapshot.leanSkill,
    losingLine: snapshot.champion ? "...impossible." : "good run.",
    winningLine: snapshot.champion ? "the ceiling holds." : "ghost wins.",
    midnightVariantId: snapshot.variantId,
    battleLocation: "five_gym",
    battleSizeMult: snapshot.champion ? 1.08 : 1,
    ...snapshot.champion ? { guardCounter: { chance: 0.42, damageMult: 2.1 }, enemyGuardPierce: 0.1 } : {}
  };
}
function resolveGhostCombatEntry(npcId) {
  const cached = getCachedGhostSnapshot(npcId);
  if (cached) return buildGhostCombatEntry(cached);
  const parsed = parseGhostCombatId(npcId);
  if (!parsed) throw new Error(`Invalid ghost combat id: ${npcId}`);
  if (parsed.source === "champion") {
    const snap = snapshotFromSeeded(AUTHORED_CHAMPION, true);
    cacheGhostSnapshot(snap);
    return buildGhostCombatEntry(snap);
  }
  if (parsed.source === "seed") {
    const def2 = getSeededGhost(parsed.id);
    if (!def2) throw new Error(`Unknown seeded ghost: ${parsed.id}`);
    const snap = snapshotFromSeeded(def2);
    cacheGhostSnapshot(snap);
    return buildGhostCombatEntry(snap);
  }
  throw new Error(`Ghost snapshot not loaded: ${npcId}`);
}

// supabase/functions/_shared/gymWeekSchedule.ts
var GYM_WEEK_TIMEZONE = "America/Los_Angeles";
var GYM_WEEK_DEADLINE_HOUR = 21;
var GYM_WEEK_DEADLINE_MINUTE = 0;
var GYM_WEEK_FIRST_DEADLINE_MS = zonedTimeToUtcMs(
  2026,
  6,
  21,
  GYM_WEEK_DEADLINE_HOUR,
  GYM_WEEK_DEADLINE_MINUTE,
  0,
  GYM_WEEK_TIMEZONE
);
var MS_MON_MIDNIGHT_TO_SUN_DEADLINE = (6 * 24 + GYM_WEEK_DEADLINE_HOUR) * 60 * 60 * 1e3 + GYM_WEEK_DEADLINE_MINUTE * 60 * 1e3;
var MS_PER_GYM_WEEK = 7 * 24 * 60 * 60 * 1e3;
function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(date);
  const read = (type) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second")
  };
}
function zonedTimeToUtcMs(year, month, day, hour, minute, second, timeZone) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i += 1) {
    const got = zonedParts(new Date(utc), timeZone);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const gotAsUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
    utc += desiredAsUtc - gotAsUtc;
  }
  return utc;
}
function getGymWeekStartMs(weekIndex) {
  const firstStart = GYM_WEEK_FIRST_DEADLINE_MS - MS_MON_MIDNIGHT_TO_SUN_DEADLINE;
  return firstStart + weekIndex * MS_PER_GYM_WEEK;
}

// src/data/gymWeeks.ts
var WEEK1_LEADER_NPC_ID = "5ive-gym1";
var GYM_WEEK_EPOCH_MS = getGymWeekStartMs(0);
var GYM_BATTLE_BG = publicAsset("Assets/battle-bg/5ive-gym.png");
var JEROME_SPRITE = publicAsset("Assets/Characters/npcs/5ive-gym1.png");
var NPC2_SPRITE2 = publicAsset("Assets/Characters/npcs/npc2-idle-sheet.png");
var JASON_SPRITE = publicAsset("Assets/Characters/npcs/jason-idle.png");
var JACLYN_SPRITE = publicAsset("Assets/Characters/npcs/jaclyn-idle.png");
var AGENT5_SPRITE = publicAsset("Assets/Characters/npcs/week2-gym.png");
var DARREN_SPRITE = publicAsset("Assets/Characters/npcs/npc10-idle.png");
var LYNN_SPRITE = publicAsset("Assets/Characters/npcs/npc11-idle.png");
var GYM_WEEKS = [
  {
    id: "1",
    weekNumber: 1,
    scoringMode: "one-and-done",
    leader: {
      combatId: WEEK1_LEADER_NPC_ID,
      npcId: WEEK1_LEADER_NPC_ID,
      displayName: "Jerome",
      name: "Jerome",
      level: 10,
      fixedHp: 120,
      moves: ["STRIKE", "PARRY", "PARRY", "PARRY", "CANNON", "LOOP", "LOOP"],
      leanSkill: "defense",
      guardCounter: { chance: 0.7, damageMult: 2.85 },
      enemyGuardPierce: 0.55,
      telegraphFlavor: {
        STRIKE: "cuts through",
        PARRY: "dares you to swing",
        CANNON: "loads up",
        LOOP: "the loop is coming"
      },
      spriteSrc: JEROME_SPRITE,
      spriteColumns: 4,
      battleBg: GYM_BATTLE_BG,
      battleSizeMult: 1.02,
      dialogue: {
        intro: "week one. four fights, one run, three henchmen, then me. one loss sends you back to the start.",
        inProgress: "one run. no breaks \u2014 finish the gauntlet or start over.",
        cleared: "week one's yours. come back next week, practice anytime.",
        loss: "come back when you're ready."
      }
    },
    henchmen: [
      {
        combatId: "gym-week-1-h1",
        displayName: "Bag Work",
        level: 4,
        fixedHp: 55,
        moves: ["STRIKE", "PARRY", "CANNON"],
        leanSkill: "defense",
        telegraphFlavor: {
          STRIKE: "sets a jab",
          PARRY: "opens up",
          CANNON: "winds up"
        },
        spriteSrc: NPC2_SPRITE2,
        spriteColumns: 4,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.95
      },
      {
        combatId: "gym-week-1-h2",
        displayName: "Sparring",
        level: 6,
        fixedHp: 70,
        moves: ["STRIKE", "PARRY", "PARRY", "LOOP"],
        leanSkill: "speed",
        telegraphFlavor: {
          STRIKE: "feints, then jabs",
          PARRY: "leaves a gap",
          LOOP: "draws the loop"
        },
        spriteSrc: JASON_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.98
      },
      {
        combatId: "gym-week-1-h3",
        displayName: "Corner",
        level: 8,
        fixedHp: 90,
        moves: ["STRIKE", "PARRY", "PARRY", "CANNON", "LOOP"],
        leanSkill: "attack",
        telegraphFlavor: {
          STRIKE: "cuts in",
          PARRY: "dares you forward",
          CANNON: "commits heavy",
          LOOP: "spins the loop"
        },
        spriteSrc: JACLYN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 1
      }
    ]
  },
  {
    id: "2",
    weekNumber: 2,
    scoringMode: "clear-count",
    announcement: "GYM CHALLENGE 2 IS LIVE! BEAT AGENT 5 AND HIS MINIONS AS MANY TIMES AS POSSIBLE FOR A PRIZE.",
    leader: {
      combatId: "gym-week-2-leader",
      npcId: "agent-5-gym",
      displayName: "Agent 5",
      name: "Agent 5",
      level: 14,
      fixedHp: 145,
      moves: ["STRIKE", "WHISPER", "LOOP", "CANNON", "PARRY", "PARRY"],
      leanSkill: "attack",
      guardCounter: { chance: 0.55, damageMult: 2.6 },
      enemyGuardPierce: 0.42,
      telegraphFlavor: {
        STRIKE: "cuts lucky",
        WHISPER: "whispers odds",
        LOOP: "the loop lands",
        CANNON: "loads heavy",
        PARRY: "dares you in"
      },
      spriteSrc: AGENT5_SPRITE,
      spriteColumns: 4,
      battleBg: GYM_BATTLE_BG,
      battleSizeMult: 1.05,
      losingLine: "...",
      dialogue: {
        intro: "...",
        inProgress: "one run. no breaks \u2014 finish the gauntlet or start over.",
        cleared: "another clear on the board. keep stacking \u2014 first clear got your seal.",
        loss: "back to darren. run it again."
      }
    },
    henchmen: [
      {
        combatId: "gym-week-2-h1",
        displayName: "Darren",
        level: 9,
        fixedHp: 95,
        moves: ["STRIKE", "STRIKE", "CANNON", "CANNON", "LOOP"],
        leanSkill: "attack",
        telegraphFlavor: {
          STRIKE: "hammers through",
          CANNON: "commits heavy",
          LOOP: "spins the loop"
        },
        spriteSrc: DARREN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 1
      },
      {
        combatId: "gym-week-2-h2",
        displayName: "Lynn",
        level: 11,
        fixedHp: 110,
        moves: ["SLIP", "SLIP", "PARRY", "PARRY", "STRIKE", "WHISPER"],
        leanSkill: "speed",
        telegraphFlavor: {
          SLIP: "slips inside",
          PARRY: "walls up",
          STRIKE: "quick jab",
          WHISPER: "feints lucky"
        },
        spriteSrc: LYNN_SPRITE,
        battleBg: GYM_BATTLE_BG,
        battleSizeMult: 0.98
      }
    ]
  }
];
function isGymGauntletCombatId(combatId) {
  for (const week of GYM_WEEKS) {
    if (week.leader.combatId === combatId) return true;
    for (const h of week.henchmen) {
      if (h.combatId === combatId) return true;
    }
  }
  return false;
}
function findGymWeekForCombatId(combatId) {
  for (const week of GYM_WEEKS) {
    if (week.leader.combatId === combatId) return week;
    if (week.henchmen.some((h) => h.combatId === combatId)) return week;
  }
  return void 0;
}

// src/store/enemyMemoryStore.ts
var STORAGE_KEY = "aliworld:enemy-memory:v1";
var EMPTY_NPC_MEMORY = { encounters: [], totalFights: 0 };
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function getNpcMemory(npcId) {
  const state2 = load();
  return state2[npcId] ?? { encounters: [], totalFights: 0 };
}
function moveFrequenciesFromMemory(mem) {
  const counts = {};
  let total = 0;
  for (const enc of mem.encounters) {
    for (const m of enc.playerMoves) {
      counts[m] = (counts[m] ?? 0) + 1;
      total++;
    }
  }
  if (total === 0) return {};
  const freqs = {};
  for (const [k, v] of Object.entries(counts)) {
    freqs[k] = v / total;
  }
  return freqs;
}

// src/data/enemyAI.ts
function aiTierForLevel(level) {
  if (level < ENEMY_AI_TIER1_LEVEL) return 0;
  if (level < ENEMY_AI_TIER2_LEVEL) return 1;
  if (level < ENEMY_AI_TIER3_LEVEL) return 2;
  return 3;
}
var COUNTER_MAP = {
  STRIKE: ["SLIP", "ANCHOR"],
  FURY_SWEEP: ["ANCHOR", "SLIP"],
  DARK_BREAK: ["STRIKE", "CANNON"],
  CANNON: ["ANCHOR", "SLIP"],
  BLACKOUT: ["STRIKE", "CANNON"],
  SLIP: ["PARRY", "WHISPER"],
  PARRY: ["PARRY", "WHISPER"],
  ANCHOR: ["WHISPER", "PARRY"],
  SECOND_WIND: ["CANNON", "LOOP"],
  COUNTERWEIGHT: ["PARRY", "WHISPER"],
  BRICK_WALL: ["PARRY", "WHISPER"],
  INVINCIBLE: ["PARRY", "WHISPER"],
  WHISPER: ["STRIKE", "CANNON"],
  LOOP: ["ANCHOR", "SLIP"],
  DEVILS_CUT: ["CANNON", "LOOP"],
  SNAG: ["STRIKE", "CANNON"],
  PHENOMENA: ["ANCHOR", "STRIKE"],
  SEALED_FATE: ["CANNON", "LOOP"],
  GRAVITY_SHIFT: ["STRIKE", "CANNON"],
  REFRACT: ["ANCHOR", "PARRY"],
  HYPERDRIVE: ["STRIKE", "CANNON"]
};
function buildBaseWeights(moves) {
  return moves.map((move) => ({ move, weight: 1 }));
}
function applyTier1Weights(weights, ctx) {
  for (const w of weights) {
    if (ctx.playerIsExposed && (w.move === "CANNON" || w.move === "LOOP")) {
      w.weight *= 2.5;
    }
    if (ctx.enemyHpPct < 0.3 && w.move === "ANCHOR") {
      w.weight *= 2;
    }
    if (ctx.turn === 1 && (w.move === "STRIKE" || w.move === "CANNON")) {
      w.weight *= 1.5;
    }
  }
}
function applyTier2Weights(weights, ctx) {
  applyTier1Weights(weights, ctx);
  for (const w of weights) {
    if (ctx.playerHpPct < 0.25 && (w.move === "CANNON" || w.move === "LOOP")) {
      w.weight *= 2;
    }
    if (ctx.playerIsBracing && w.move === "PARRY") {
      w.weight *= 3;
    }
    if (ctx.playerIsBracing && w.move === "WHISPER") {
      w.weight *= 2;
    }
    if (ctx.playerIsBracing && (w.move === "STRIKE" || w.move === "CANNON")) {
      w.weight *= 0.3;
    }
    if (ctx.enemyIsSlowed && w.move === "ANCHOR") {
      w.weight *= 1.5;
    }
    if (ctx.enemyIsShaken && w.move === "ANCHOR") {
      w.weight *= 1.8;
    }
    if (w.move === ctx.lastEnemyMove && ctx.turn > 2) {
      w.weight *= 0.6;
    }
  }
}
function applyPatternLearning(weights, memory, availableMoves, learnStrength) {
  const freqs = moveFrequenciesFromMemory(memory);
  if (Object.keys(freqs).length === 0) return;
  const available = new Set(availableMoves);
  for (const [playerMove, freq] of Object.entries(freqs)) {
    if (freq < 0.15) continue;
    const counters = COUNTER_MAP[playerMove];
    if (!counters) continue;
    for (const counter of counters) {
      if (!available.has(counter)) continue;
      const w = weights.find((x) => x.move === counter);
      if (w) {
        w.weight *= 1 + freq * learnStrength;
      }
    }
  }
}
function applyLastMoveCounter(weights, ctx, availableMoves, strength) {
  if (!ctx.lastPlayerMove) return;
  const counters = COUNTER_MAP[ctx.lastPlayerMove];
  if (!counters) return;
  const available = new Set(availableMoves);
  for (const counter of counters) {
    if (!available.has(counter)) continue;
    const w = weights.find((x) => x.move === counter);
    if (w) w.weight *= 1 + strength;
  }
}
function selectWeighted(weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let roll = getCombatRng().next() * total;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.move;
  }
  return weights[weights.length - 1].move;
}
function chooseMoveAI(_npcId, level, moves, ctx, memory) {
  if (moves.length === 0) return "STRIKE";
  if (moves.length === 1) return moves[0];
  const tier = aiTierForLevel(level);
  if (tier === 0) {
    return moves[getCombatRng().nextInt(0, moves.length - 1)];
  }
  const dedupedMoves = [...new Set(moves)];
  const weights = buildBaseWeights(dedupedMoves);
  for (const w of weights) {
    const count = moves.filter((m) => m === w.move).length;
    if (count > 1) w.weight = count;
  }
  if (tier >= 1) applyTier1Weights(weights, ctx);
  if (tier >= 2) {
    applyTier2Weights(weights, ctx);
    applyLastMoveCounter(weights, ctx, dedupedMoves, 0.8);
  }
  if (tier >= 3) {
    const learnStrength = Math.min(3, 0.5 + memory.totalFights * 0.25);
    applyPatternLearning(weights, memory, dedupedMoves, learnStrength);
    applyLastMoveCounter(weights, ctx, dedupedMoves, 1.5);
  }
  return selectWeighted(weights);
}

// src/data/npcRegistry.ts
var WALKER_SPRITE = publicAsset("Assets/Characters/npcs/Walker-idle.png");
var JACLYN_SPRITE2 = publicAsset("Assets/Characters/npcs/jaclyn-idle.png");
var MARK_SPRITE = publicAsset("Assets/Characters/npcs/mark-idle.png");
function filterMovesForNpcLevel(moves, level, lean) {
  const skills = npcMoveUnlockSkills(level, lean);
  const filtered = moves.filter((moveId) => {
    const def2 = MOVES[moveId];
    if (!def2) return false;
    const skillLevel = skills[def2.skill]?.level ?? 1;
    return skillLevel >= def2.unlockAtSkillLevel;
  });
  if (filtered.length > 0) return filtered;
  return ["STRIKE"];
}
function entry(base) {
  const { hpScale = 1, fixedHp, ...rest } = base;
  const stats = computeNpcCombatStats(rest.level, rest.leanSkill, hpScale);
  if (fixedHp != null) {
    stats.hp = fixedHp;
    stats.maxHp = fixedHp;
  }
  const moves = filterMovesForNpcLevel(rest.moves, rest.level, rest.leanSkill);
  return { ...rest, stats, moves };
}
var WALKER = entry({
  id: "walker",
  displayName: "walker",
  level: 2,
  moves: ["STRIKE", "FURY_SWEEP", "ANCHOR"],
  leanSkill: "none",
  telegraphFlavor: {
    STRIKE: "lines up",
    FURY_SWEEP: "winds up \u2014",
    ANCHOR: "plants his feet \u2014"
  },
  losingLine: "i get it now. tell me where to go.",
  winningLine: "not yet. keep going.",
  spriteSrc: WALKER_SPRITE,
  battleLocation: "five",
  battleSizeMult: 1.02
});
var JACLYN = entry({
  id: "jaclyn",
  displayName: "jaclyn",
  level: 3,
  moves: ["SLIP", "STRIKE", "FURY_SWEEP", "WHISPER"],
  leanSkill: "speed",
  telegraphFlavor: {
    SLIP: "feints \u2014",
    STRIKE: "cuts in \u2014",
    FURY_SWEEP: "commits \u2014",
    WHISPER: "murmurs \u2014"
  },
  losingLine: "...oh. you're right. of course you're right.",
  winningLine: "you weren't ready. come back.",
  spriteSrc: JACLYN_SPRITE2,
  battleLocation: "five",
  battleSizeMult: 0.92
});
var MARK = entry({
  id: "mark",
  displayName: "mark",
  level: 5,
  moves: ["ANCHOR", "ANCHOR", "DARK_BREAK", "STRIKE", "SLIP", "WHISPER"],
  leanSkill: "defense",
  telegraphFlavor: {
    ANCHOR: "roots in \u2014",
    DARK_BREAK: "draws back \u2014",
    STRIKE: "swings \u2014",
    SLIP: "feints \u2014",
    WHISPER: "murmurs \u2014"
  },
  losingLine: "huh. ...where do you want me.",
  winningLine: "i told you. the wall doesn't move.",
  spriteSrc: MARK_SPRITE,
  battleLocation: "five",
  battleSizeMult: 1.04
});
var TOWN_CRIER = entry({
  id: "town-crier",
  displayName: "town crier",
  level: 3,
  moves: ["WHISPER", "STRIKE", "SLIP", "WHISPER"],
  leanSkill: "luck",
  telegraphFlavor: {
    WHISPER: "spreads the word",
    STRIKE: "points",
    SLIP: "sidesteps"
  },
  losingLine: "...no. no, you're right. you were always right.",
  winningLine: "the crowd's not buying it.",
  spriteSrc: TOWN_CRIER_IDLE_SPRITE,
  battleLocation: "five",
  battleSizeMult: 0.98
});
var CLERK = entry({
  id: "clerk",
  displayName: "clerk",
  level: 4,
  moves: ["STRIKE", "STRIKE", "WHISPER", "FURY_SWEEP"],
  leanSkill: "attack",
  telegraphFlavor: {
    STRIKE: "swings",
    WHISPER: "lowers his voice",
    FURY_SWEEP: "commits \u2014"
  },
  losingLine: "the gift... it's priceless.",
  winningLine: "you're not taking this from me.",
  spriteSrc: CLERK_IDLE_SPRITE,
  battleLocation: "blue_store",
  battleSizeMult: 1
});
var RESTOCKER = entry({
  id: "restocker",
  displayName: "restocker",
  level: 9,
  hpScale: 1.72,
  moves: ["ANCHOR", "ANCHOR", "ANCHOR", "CANNON", "STRIKE", "SLIP", "LOOP", "WHISPER"],
  leanSkill: "defense",
  telegraphFlavor: {
    ANCHOR: "restocks",
    CANNON: "heaves \u2014",
    STRIKE: "swings",
    SLIP: "feints",
    LOOP: "draws back",
    WHISPER: "murmurs"
  },
  guardCounter: { chance: 0.5, damageMult: 2.4 },
  enemyGuardPierce: 0.14,
  losingLine: "it CAN stop...",
  winningLine: "this floor belongs to me.",
  spriteSrc: RESTOCKER_IDLE_SPRITE,
  battleLocation: "blue_store",
  battleSizeMult: 1.12
});
function buildGymFighterCombatEntry(fighter) {
  return entry({
    id: fighter.combatId,
    displayName: fighter.displayName,
    level: fighter.level,
    fixedHp: fighter.fixedHp,
    moves: [...fighter.moves],
    leanSkill: fighter.leanSkill,
    telegraphFlavor: fighter.telegraphFlavor,
    guardCounter: fighter.guardCounter,
    enemyGuardPierce: fighter.enemyGuardPierce,
    losingLine: fighter.losingLine ?? "",
    winningLine: fighter.winningLine,
    spriteSrc: fighter.spriteSrc,
    battleLocation: "five",
    battleBg: fighter.battleBg,
    battleSizeMult: fighter.battleSizeMult
  });
}
function buildGymGauntletCombatEntry(combatId) {
  const week = findGymWeekForCombatId(combatId);
  if (!week) return void 0;
  if (week.leader.combatId === combatId) {
    return buildGymFighterCombatEntry(week.leader);
  }
  const henchman = week.henchmen.find((h) => h.combatId === combatId);
  if (henchman) return buildGymFighterCombatEntry(henchman);
  return void 0;
}
var NPC_REGISTRY = {
  walker: WALKER,
  jaclyn: JACLYN,
  mark: MARK,
  "town-crier": TOWN_CRIER,
  clerk: CLERK,
  restocker: RESTOCKER
};
function getNpcCombatEntry(npcId) {
  if (isGhostCombatId(npcId)) {
    return resolveGhostCombatEntry(npcId);
  }
  if (isGymGauntletCombatId(npcId)) {
    return buildGymGauntletCombatEntry(npcId);
  }
  return NPC_REGISTRY[npcId];
}
function walkerTutorialForcedMove(npcId, turn, walkerHeavyTutorialActive) {
  if (!walkerHeavyTutorialActive || npcId !== "walker") return null;
  if (turn === 2) return "FURY_SWEEP";
  return null;
}
function chooseMove(npcId, turn, forced, options) {
  const tutorialForced = walkerTutorialForcedMove(
    npcId,
    turn,
    options?.walkerHeavyTutorial ?? false
  );
  if (tutorialForced) return tutorialForced;
  if (forced) return forced;
  const npc = isDevSparNpcId(npcId) ? buildDevSpar() : isGhostCombatId(npcId) ? resolveGhostCombatEntry(npcId) : getNpcCombatEntry(npcId);
  if (!npc || npc.moves.length === 0) return "STRIKE";
  if (isGhostCombatId(npcId)) {
    return chooseGhostMove(npc.moves, {
      enemyHpRatio: options?.enemyHpPct ?? 1,
      lastMove: options?.lastEnemyMove ?? null,
      leanSkill: npc.leanSkill
    });
  }
  const ctx = {
    turn,
    playerHpPct: options?.playerHpPct ?? 1,
    enemyHpPct: options?.enemyHpPct ?? 1,
    playerIsExposed: options?.playerIsExposed ?? false,
    playerIsBracing: options?.playerIsBracing ?? false,
    enemyIsSlowed: options?.enemyIsSlowed ?? false,
    enemyIsShaken: options?.enemyIsShaken ?? false,
    enemyIsBleeding: options?.enemyIsBleeding ?? false,
    lastPlayerMove: options?.lastPlayerMove ?? null,
    lastEnemyMove: options?.lastEnemyMove ?? null
  };
  const memory = options?.memoryOverride ?? getNpcMemory(npcId);
  return chooseMoveAI(npcId, npc.level, npc.moves, ctx, memory);
}

// src/store/quest1Store.ts
var STORAGE_KEY2 = "aliworld:quest1-five:v1";
var GATING_NPC_IDS = ["npc1", "npc2", "npc3", "npc4"];
function emptyQuest1State() {
  return {
    talked: emptyTalked(),
    markDefeated: false,
    walkerConverted: false,
    jaclynConverted: false,
    cafeSceneSeen: false,
    e1CutscenePlayed: false,
    battleTutorialSeen: false,
    walkerHeavyTutorialBeatSeen: false,
    tutorialPhase2Seen: false,
    xpTutorialSeen: false,
    worldIntroSeen: false,
    mp3PlayerOwned: false,
    episode1TitleCardSeen: false
  };
}
function emptyTalked() {
  return {
    npc1: false,
    npc2: false,
    npc3: false,
    npc4: false
  };
}
function loadQuest1FromStorage() {
  const base = emptyQuest1State();
  try {
    const raw = localStorage.getItem(STORAGE_KEY2);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return base;
    const o = parsed;
    const talked = emptyTalked();
    for (const id of GATING_NPC_IDS) {
      if (o.talked?.[id] === true) talked[id] = true;
    }
    return {
      talked,
      markDefeated: o.markDefeated === true,
      walkerConverted: o.walkerConverted === true,
      jaclynConverted: o.jaclynConverted === true,
      cafeSceneSeen: o.cafeSceneSeen === true,
      e1CutscenePlayed: o.e1CutscenePlayed === true,
      battleTutorialSeen: o.battleTutorialSeen === true,
      walkerHeavyTutorialBeatSeen: o.walkerHeavyTutorialBeatSeen === true,
      tutorialPhase2Seen: o.tutorialPhase2Seen === true,
      xpTutorialSeen: o.xpTutorialSeen === true,
      worldIntroSeen: o.worldIntroSeen === true,
      mp3PlayerOwned: o.mp3PlayerOwned === true,
      episode1TitleCardSeen: o.episode1TitleCardSeen === true
    };
  } catch {
    return base;
  }
}
var state = loadQuest1FromStorage();
function isWalkerHeavyTutorialBeatSeen() {
  return state.walkerHeavyTutorialBeatSeen;
}

// src/data/walkerHeavyTutorial.ts
function isWalkerHeavyTutorialActive(npcId) {
  if (npcId !== "walker") return false;
  return !isWalkerHeavyTutorialBeatSeen();
}

// src/data/battleFeedback.ts
function buildBattleFeedbackFromResolve(r) {
  const events = [];
  if (r.enemyDamageBlocked > 0) {
    events.push({
      kind: "blocked",
      text: `-${r.enemyDamageBlocked} blocked`,
      target: "enemy",
      tone: "defense"
    });
  }
  if (r.damageBlocked > 0) {
    events.push({
      kind: "blocked",
      text: `-${r.damageBlocked} blocked`,
      target: "player",
      tone: "defense"
    });
  }
  if (r.enemyDodged) {
    events.push({
      kind: "dodged",
      text: "dodged",
      target: "enemy",
      tone: "speed"
    });
  } else if (r.dodged) {
    events.push({
      kind: "dodged",
      text: "dodged",
      target: "player",
      tone: "speed"
    });
  }
  if (r.playerDmg > 0 && r.crit) {
    events.push({
      kind: "crit",
      text: "CRIT",
      target: "enemy",
      tone: "luck"
    });
  }
  if (r.healApplied > 0) {
    events.push({
      kind: "damage",
      text: `+${r.healApplied}`,
      target: "player",
      tone: "defense"
    });
  }
  if (r.perfectGuardBonus) {
    events.push({
      kind: "perfect-guard",
      text: "perfect guard!",
      target: "player",
      tone: "defense"
    });
  }
  if (r.stunApplied) {
    events.push({ kind: "status", text: "stun!", target: "enemy", tone: "stun" });
  }
  if (r.bleedApplied && r.playerDmg > 0) {
    events.push({ kind: "status", text: "bleed!", target: "enemy", tone: "bleed" });
  }
  if (r.shakeApplied) {
    events.push({ kind: "status", text: "shake!", target: "enemy", tone: "shake" });
  }
  if (r.slowApplied) {
    events.push({ kind: "status", text: "slow!", target: "enemy", tone: "slow" });
  }
  if (r.playerStunApplied) {
    events.push({ kind: "status", text: "stun!", target: "player", tone: "stun" });
  }
  if (r.playerBleedApplied) {
    events.push({ kind: "status", text: "bleed!", target: "player", tone: "bleed" });
  }
  if (r.playerShakeApplied) {
    events.push({ kind: "status", text: "shake!", target: "player", tone: "shake" });
  }
  if (r.playerSlowApplied) {
    events.push({ kind: "status", text: "slow!", target: "player", tone: "slow" });
  }
  if (r.playerMissApplied) {
    events.push({ kind: "status", text: "miss!", target: "player", tone: "stun" });
  }
  return events;
}
function appendBattleFeedback(current, r) {
  const next = buildBattleFeedbackFromResolve(r);
  if (next.length === 0) return current;
  return [...current, ...next];
}

// combat-core/battleEngine.ts
var ARCHETYPE_STATS = {
  lck: { hp: 45, maxHp: 45, atk: 4, def: 4, spd: 4, lck: 9 },
  atk: { hp: 50, maxHp: 50, atk: 9, def: 3, spd: 4, lck: 4 },
  def: { hp: 65, maxHp: 65, atk: 4, def: 9, spd: 3, lck: 4 },
  spd: { hp: 50, maxHp: 50, atk: 5, def: 4, spd: 9, lck: 4 }
};
var DEFAULT_ARCHETYPE = "atk";
var BATTLE_PACE_SCALE = 2.85;
var BATTLE_RESOLVE_DELAY_MS = Math.round(650 * BATTLE_PACE_SCALE);
var BATTLE_END_LOSE_DELAY_MS = Math.round(500 * BATTLE_PACE_SCALE);
var BATTLE_END_WIN_DELAY_MS = Math.round(600 * BATTLE_PACE_SCALE);
var BATTLE_LOG_MAX_ENTRIES = 6;
function computeBaseStats(archetype, accessories) {
  const base = { ...ARCHETYPE_STATS[archetype] };
  for (const item of accessories) {
    for (const [k, v] of Object.entries(item)) {
      if (v == null) continue;
      const key = k === "hp" ? "maxHp" : k;
      if (key in base) {
        ;
        base[key] = (base[key] || 0) + v;
      }
    }
  }
  for (const k of Object.keys(base)) {
    if (base[k] < 1) {
      ;
      base[k] = 1;
    }
  }
  return {
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    spd: base.spd,
    lck: base.lck
  };
}
function computePlayerStats(archetype, accessories, skills) {
  const base = computeBaseStats(archetype, accessories);
  const bonus = getSkillStatBonuses(skills);
  return {
    maxHp: base.maxHp + bonus.maxHp,
    atk: base.atk + bonus.atk,
    def: base.def + bonus.def,
    spd: base.spd + bonus.spd,
    lck: base.lck + bonus.lck
  };
}
function emptyResolveResult(eMove, pMove, enemyStunned, enemyAttacks) {
  return {
    playerDmg: 0,
    crit: false,
    incoming: 0,
    reflectedDmg: 0,
    dodged: false,
    braced: false,
    stunApplied: false,
    shakeApplied: false,
    bleedApplied: false,
    slowApplied: false,
    missApplied: false,
    doubleApplied: false,
    reflectApplied: false,
    playerShakeApplied: false,
    playerBleedApplied: false,
    playerStunApplied: false,
    playerSlowApplied: false,
    playerMissApplied: false,
    enemyAttacks,
    enemyStunned,
    playerActed: true,
    rawIncoming: 0,
    damageBlocked: 0,
    damageAvoided: 0,
    enemyDamageBlocked: 0,
    perfectGuardBonus: false,
    enemyDodged: false,
    enemyBraced: false,
    guardCountered: false,
    healApplied: 0,
    eMove,
    pMove
  };
}
function isDefensiveExposedMove(pMove) {
  const kind = getMoveDef(pMove).behavior.kind;
  return kind === "brace" || kind === "dodge" || kind === "brick-wall" || kind === "counterweight";
}
var PLAYER_DEFENSIVE_MOVE_KINDS = /* @__PURE__ */ new Set([
  "brace",
  "dodge",
  "brick-wall",
  "counterweight",
  "anchor",
  "second-wind",
  "invincible",
  "refract",
  "gravity-shift"
]);
function isPlayerAggressiveMove(pMove) {
  return !PLAYER_DEFENSIVE_MOVE_KINDS.has(getMoveDef(pMove).behavior.kind);
}
function isNpcGuardRiposteMove(actualMove) {
  if (actualMove === "ANCHOR" || actualMove === "HOLD" || actualMove === "PARRY") {
    return true;
  }
  const def2 = MOVES[actualMove];
  return def2?.behavior.kind === "brace" && def2.behavior.profile.blockStatus === true;
}
function applyNpcGuardCounter(state2, out, actualMove) {
  const counter = state2.npc.guardCounter;
  if (!counter || !isNpcGuardRiposteMove(actualMove)) return;
  if (!out.playerActed || !isPlayerAggressiveMove(out.pMove)) return;
  if (getCombatRng().next() >= counter.chance) return;
  const riposte = Math.max(1, Math.floor(state2.npc.stats.atk * counter.damageMult));
  out.guardCountered = true;
  out.playerDmg = Math.max(0, Math.floor(out.playerDmg * 0.1));
  out.incoming = Math.max(out.incoming, riposte);
  out.enemyAttacks = true;
}
function applyEnemyMoveBehavior(state2, out, actualMove) {
  const moveDef = MOVES[actualMove];
  if (!moveDef) return;
  const behavior = moveDef.behavior;
  switch (behavior.kind) {
    case "brace": {
      if (behavior.profile.blockStatus) {
        state2.battleMove.anchorBlocksStatus = true;
      }
      if (out.playerActed) {
        out.enemyBraced = true;
        if (out.playerDmg > 0) {
          out.playerDmg = Math.max(1, Math.floor(out.playerDmg * behavior.profile.incomingMult));
        }
      }
      break;
    }
    case "dodge": {
      const dodge = resolveEnemyDodgeMove({
        profile: behavior.profile,
        spdStat: state2.npc.stats.spd,
        atkStat: state2.npc.stats.atk,
        incomingPlayerDmg: out.playerDmg,
        playerActed: out.playerActed
      });
      if (dodge) {
        out.playerDmg = dodge.playerDmg;
        if (dodge.enemyDodged) out.enemyDodged = true;
        if (dodge.incomingCounter > 0) out.incoming = dodge.incomingCounter;
        if (dodge.enemyAttacks) out.enemyAttacks = true;
      }
      break;
    }
    case "loop": {
      const loopDmg = Math.max(1, Math.floor(state2.npc.stats.atk * LOOP_DAMAGE_MULT));
      out.incoming += loopDmg;
      out.enemyAttacks = true;
      break;
    }
    case "damage": {
      if (behavior.profile.damageMult < 0.6) {
        state2.combatStatus.playerWeaken = 2;
      }
      break;
    }
  }
}
function applyEnemyGuardPierce(state2, out, rawEDmg) {
  const pierce = state2.npc.enemyGuardPierce;
  if (!pierce || rawEDmg <= 0) return;
  if (out.dodged) {
    const through = Math.max(1, Math.floor(rawEDmg * pierce));
    out.incoming = Math.max(out.incoming, through);
    out.dodged = false;
    out.playerDmg = Math.max(0, Math.floor(out.playerDmg * 0.5));
    out.enemyAttacks = true;
    return;
  }
  if (out.incoming >= rawEDmg) return;
  const mitigated = rawEDmg - out.incoming;
  const restored = Math.floor(mitigated * pierce);
  if (restored > 0) {
    out.incoming += restored;
    out.enemyAttacks = true;
  }
}
function applyPostResolveEffects(state2, post) {
  if (post.selfDamage > 0) {
    const dealt = capDamageToRemainingHp(post.selfDamage, state2.playerHp);
    state2.playerHp = Math.max(0, state2.playerHp - dealt);
  }
  if (post.healPlayer > 0) {
    state2.playerHp = Math.min(state2.playerStats.maxHp, state2.playerHp + post.healPlayer);
  }
  if (post.deathClocks.length > 0) {
    state2.deathClocks = [...state2.deathClocks, ...post.deathClocks];
  }
}
var ENEMY_ATTACK_ANIM_KINDS = /* @__PURE__ */ new Set([
  "damage",
  "fury-sweep",
  "dark-break",
  "cannon",
  "blackout",
  "loop",
  "gravity-shift",
  "refract",
  "hyperdrive",
  "devils-cut",
  "phenomena",
  "sealed-fate",
  "snag"
]);
function isEnemyAttackAnimMove(eMove) {
  if (eMove === "STUNNED") return false;
  const def2 = MOVES[eMove];
  return def2 ? ENEMY_ATTACK_ANIM_KINDS.has(def2.behavior.kind) : false;
}
function withResolveFeedback(state2, r, enemyActedFirst) {
  let feedbackEvents = appendBattleFeedback([], r);
  if (feedbackEvents.length === 0) {
    if (r.playerActed && isPlayerAggressiveMove(r.pMove)) {
      feedbackEvents = [{ kind: "status", text: "", target: "enemy", tone: "attack" }];
    } else if (!r.enemyStunned && isEnemyAttackAnimMove(r.eMove)) {
      feedbackEvents = [{ kind: "status", text: "", target: "player", tone: "attack" }];
    }
  }
  if (feedbackEvents.length === 0) return state2;
  return { ...state2, feedbackEvents, feedbackSeq: state2.feedbackSeq + 1, feedbackEnemyActedFirst: enemyActedFirst };
}
function snapshotSkills(skills) {
  return {
    attack: { ...skills.attack },
    speed: { ...skills.speed },
    defense: { ...skills.defense },
    luck: { ...skills.luck },
    hp: { ...skills.hp }
  };
}
function mitigateIncoming(incoming, status, playerDef, defSkillLevel, battle, attackSkillLevel) {
  let dmg = incoming;
  if (dmg > 0 && battle.playerNextAttackImmune) {
    battle.playerNextAttackImmune = false;
    battle.nextHitAtkBonusMult = crossSecondaryMultiplier(
      attackSkillLevel,
      CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_PER_ATK_LVL,
      CROSS_SCALE.BRICK_WALL_FOLLOWUP_ATK_CAP
    );
    return 0;
  }
  if (dmg > 0 && battle.playerInvincibleBlocks > 0) {
    battle.playerInvincibleBlocks--;
    return 0;
  }
  if (dmg > 0 && battle.counterweightBlockPct != null) {
    dmg = Math.floor(dmg * (1 - battle.counterweightBlockPct));
    battle.counterweightBlockPct = null;
    if (battle.counterweightReflectPct != null && dmg > 0) {
    }
  }
  if (status.playerBrace > 0 && dmg > 0) {
    dmg = Math.floor(dmg * braceStatusIncomingMultiplier(defSkillLevel));
  }
  if (dmg > 0) {
    const defMod = battle.enemyDefShattered ? Math.max(0, Math.floor(playerDef / 4)) : Math.floor(playerDef / 3);
    dmg = Math.max(1, dmg - defMod);
  }
  if (dmg > 0) {
    dmg = applyDefensePassiveMitigation(dmg, defSkillLevel);
  }
  return dmg;
}
function resolveEnemyIncoming(state2, eMove) {
  return resolveEnemyStrike(eMove, {
    eAtk: state2.npc.stats.atk,
    combatStatus: state2.combatStatus,
    battleMove: state2.battleMove
  });
}
function buildResolveContext(state2, strike, slot) {
  const skills = state2.skillsSnapshot;
  return {
    atk: state2.playerStats.atk,
    attackSkillLevel: skills.attack.level,
    eDmg: strike.eDmg,
    def: skills.defense.level,
    defStat: state2.playerStats.def,
    spd: skills.speed.level,
    enemyAttacks: strike.enemyAttacks,
    lck: state2.playerStats.lck,
    luckSkillLevel: skills.luck.level,
    playerHp: state2.playerHp,
    playerMaxHp: state2.playerStats.maxHp,
    enemyDef: state2.npc.stats.def,
    battle: state2.battleMove,
    npcMovePool: state2.npc.moves,
    moveSlot: slot
  };
}
function finalizeIncomingXpMetrics(out, rawIncoming) {
  out.rawIncoming = rawIncoming;
  if (out.dodged && rawIncoming > 0) {
    out.damageAvoided = rawIncoming;
    out.damageBlocked = 0;
    return;
  }
  out.damageAvoided = 0;
  out.damageBlocked = rawIncoming > 0 ? Math.max(0, rawIncoming - out.incoming) : 0;
}
function finalizeEnemyDamageBlocked(out, rawOutgoing) {
  if (out.enemyDodged) {
    out.enemyDamageBlocked = 0;
    return;
  }
  out.enemyDamageBlocked = rawOutgoing > 0 ? Math.max(0, rawOutgoing - out.playerDmg) : 0;
}
function capResolveResultToRemainingHp(r, enemyHp, playerHp) {
  if (r.playerDmg > 0) {
    r.playerDmg = capDamageToRemainingHp(r.playerDmg, enemyHp);
  }
  if (r.incoming > 0) {
    r.incoming = capDamageToRemainingHp(r.incoming, playerHp);
  }
}
function resolvePlayerMoveBody(state2, pMove, eMove, slot) {
  const enemyDefShatteredBefore = state2.battleMove.enemyDefShattered;
  const strike = resolveEnemyIncoming(state2, eMove);
  const { enemyStunned, enemyAttacks, eDmg, actualMove } = strike;
  const out = emptyResolveResult(eMove, pMove, enemyStunned, enemyAttacks);
  out.enemyAttacks = enemyAttacks;
  const ctx = buildResolveContext(state2, { eDmg, enemyAttacks }, slot);
  const stolen = slot != null ? state2.battleMove.snagStolen[slot] : void 0;
  let post = {
    deathClocks: [],
    selfDamage: 0,
    healPlayer: 0
  };
  if (stolen) {
    applyStolenEnemyMove(stolen, ctx, out);
  } else {
    const def2 = getMoveDef(pMove);
    if (def2.cost.kind === "oncePerBattle" && state2.battleMove.oncePerBattleUsed[pMove]) {
      out.playerActed = true;
      out.playerDmg = 0;
      out.incoming = 0;
    } else {
      post = applyPlayerMoveFromDef(def2, ctx, out);
    }
  }
  if (state2.battleMove.hyperdriveArmed && out.playerActed && pMove !== "HYPERDRIVE") {
    out.playerDmg = out.playerDmg * 2;
    state2.battleMove.hyperdriveArmed = false;
    state2.battleMove.hyperdriveSpent = true;
  }
  applySkillCounterModifiers(
    out,
    getSkillCounterRelation(state2.buildLoop, state2.npc.leanSkill)
  );
  if (state2.combatStatus.playerWeaken > 0 && out.playerDmg > 0) {
    out.playerDmg = Math.max(1, Math.floor(out.playerDmg * ENEMY_WHISPER_PLAYER_WEAKEN_MULT));
  }
  const rawOutgoingVsEnemy = out.playerDmg;
  applyEnemyMoveBehavior(state2, out, actualMove);
  applyNpcGuardCounter(state2, out, actualMove);
  out.incoming = mitigateIncoming(
    out.incoming,
    state2.combatStatus,
    state2.playerStats.def,
    state2.skillsSnapshot.defense.level,
    state2.battleMove,
    state2.skillsSnapshot.attack.level
  );
  applyEnemyGuardPierce(state2, out, eDmg);
  out.enemyAttacks = eDmg > 0 || out.enemyAttacks;
  finalizeIncomingXpMetrics(out, eDmg > 0 ? eDmg : out.guardCountered ? out.incoming : 0);
  if (BLACKOUT_INTERRUPTIBLE && state2.battleMove.blackoutPhase === "loading" && out.incoming > 0) {
    state2.battleMove.blackoutPhase = "idle";
  }
  state2.battleMove.lastEnemyMove = actualMove;
  state2.battleMove.lastEnemyDamage = eDmg;
  if (post.phenomenaLine) out.phenomenaLine = post.phenomenaLine;
  if (out.playerDmg > 0) {
    out.playerDmg = Math.max(
      0,
      Math.floor(out.playerDmg * playerOutgoingDamageMult(state2.combatStatus))
    );
  }
  capResolveResultToRemainingHp(out, state2.enemyHp, state2.playerHp);
  finalizeEnemyDamageBlocked(out, rawOutgoingVsEnemy);
  invalidateCritWhenNoDamage(out, state2.battleMove, enemyDefShatteredBefore);
  return { out, post };
}
function resolveExposedTurn(state2, pMove, eMove) {
  if (isDefensiveExposedMove(pMove)) {
    const { out: out2, post } = resolvePlayerMoveBody(state2, pMove, eMove);
    if (post.healPlayer > 0) out2.healApplied = post.healPlayer;
    return { out: out2, post };
  }
  const strike = resolveEnemyIncoming(state2, eMove);
  const { enemyStunned, enemyAttacks, eDmg } = strike;
  const out = emptyResolveResult(eMove, pMove, enemyStunned, enemyAttacks);
  out.enemyAttacks = enemyAttacks;
  out.playerActed = false;
  applySkillCounterModifiers(
    out,
    getSkillCounterRelation(state2.buildLoop, state2.npc.leanSkill)
  );
  out.incoming = mitigateIncoming(
    eDmg,
    state2.combatStatus,
    state2.playerStats.def,
    state2.skillsSnapshot.defense.level,
    state2.battleMove,
    state2.skillsSnapshot.attack.level
  );
  finalizeIncomingXpMetrics(out, eDmg > 0 ? eDmg : 0);
  capResolveResultToRemainingHp(out, state2.enemyHp, state2.playerHp);
  if (state2.battleMove.blackoutPhase === "loading" && !BLACKOUT_INTERRUPTIBLE && out.incoming === 0) {
    state2.battleMove.blackoutPhase = "armed";
  } else if (state2.battleMove.blackoutPhase === "loading" && out.incoming > 0) {
    if (BLACKOUT_INTERRUPTIBLE) state2.battleMove.blackoutPhase = "idle";
  }
  return { out, post: { deathClocks: [], selfDamage: 0, healPlayer: 0 } };
}
function resolveMoves(state2, pMove, eMove, slot) {
  const { out, post } = resolvePlayerMoveBody(state2, pMove, eMove, slot);
  applyPostResolveEffects(state2, post);
  if (post.healPlayer > 0) out.healApplied = post.healPlayer;
  return out;
}
function appendLog(log, line) {
  const next = [...log, line];
  if (next.length > BATTLE_LOG_MAX_ENTRIES) next.shift();
  return next;
}
function withPlayerResolveStatuses(status, r, anchorBlocksStatus) {
  return mergeResolveIntoCombatStatus(status, r, anchorBlocksStatus);
}
function withEnemyResolveStatuses(status, r, anchorBlocksStatus) {
  return mergeEnemyMoveIntoCombatStatus(status, r.eMove, anchorBlocksStatus);
}
function applyPlayerResolveStatusesToWorking(working, r) {
  return {
    ...working,
    combatStatus: withPlayerResolveStatuses(
      working.combatStatus,
      r,
      working.battleMove.anchorBlocksStatus
    )
  };
}
function showTelegraph(state2) {
  if (enemyLosesTurn(state2.combatStatus)) return "STUNNED";
  const forced = state2.battleMove.forceEnemyMove;
  const pick = chooseMove(state2.npc.id, state2.turn, forced, {
    walkerHeavyTutorial: isWalkerHeavyTutorialActive(state2.npc.id),
    npcLevel: state2.npc.level,
    npcMoves: state2.npc.moves,
    playerHpPct: state2.playerHp / state2.playerStats.maxHp,
    enemyHpPct: state2.enemyHp / (state2.npc.stats.maxHp || 1),
    playerIsExposed: state2.playerExposedTurns > 0,
    playerIsBracing: state2.combatStatus.playerBrace > 0,
    enemyIsSlowed: state2.combatStatus.enemySlow > 0,
    enemyIsShaken: state2.combatStatus.enemyShake > 0,
    enemyIsBleeding: state2.combatStatus.enemyBleed > 0,
    lastPlayerMove: state2.playerMoveHistory.length > 0 ? state2.playerMoveHistory[state2.playerMoveHistory.length - 1] : null,
    lastEnemyMove: state2.enemyMoveHistory.length > 0 ? state2.enemyMoveHistory[state2.enemyMoveHistory.length - 1] : null,
    memoryOverride: state2.npcMemoryOverride
  });
  return pick;
}
function isPlayerCounterMove(pMove) {
  return getMoveDef(pMove).behavior.kind === "dodge";
}
function isEnemyCounterMove(eMove) {
  if (eMove === "STUNNED") return false;
  const def2 = MOVES[eMove];
  return def2?.behavior.kind === "dodge";
}
function enemyActsFirstInResolution(state2, r) {
  const speedBased = !playerActsFirstDespiteSpd(
    state2.combatStatus,
    state2.playerStats.spd,
    state2.npc.stats.spd,
    state2.skillsSnapshot.speed.level
  );
  if (!r) return speedBased;
  const pCounter = isPlayerCounterMove(r.pMove);
  const eCounter = isEnemyCounterMove(r.eMove);
  if (pCounter && !eCounter) return true;
  if (eCounter && !pCounter) return false;
  return speedBased;
}
function processTurnStart(state2) {
  const { clocks, hits } = resolveDeathClocksAtTurnStart(state2.deathClocks);
  if (hits.length === 0) {
    return { ...state2, deathClocks: clocks };
  }
  let enemyHp = state2.enemyHp;
  let playerHp = state2.playerHp;
  let log = state2.log;
  for (const hit of hits) {
    if (hit.missed) {
      const pct = hit.clock.missSelfDamagePct ?? 0.8;
      const selfDmg = capDamageToRemainingHp(
        Math.floor(state2.playerHp * pct),
        playerHp
      );
      playerHp = Math.max(0, playerHp - selfDmg);
      log = appendLog(log, "sealed fate slips. it cost you.");
      continue;
    }
    if (hit.target === "enemy") {
      const dealt = capDamageToRemainingHp(hit.damage, enemyHp);
      enemyHp = Math.max(0, enemyHp - dealt);
      log = appendLog(log, deathClockHitLogLine({ ...hit, damage: dealt }, state2.npc.displayName));
    } else {
      const dealt = capDamageToRemainingHp(hit.damage, playerHp);
      playerHp = Math.max(0, playerHp - dealt);
      log = appendLog(log, deathClockHitLogLine({ ...hit, damage: dealt }, state2.npc.displayName));
    }
  }
  return { ...state2, deathClocks: clocks, enemyHp, playerHp, log };
}
function applyEnemyResolutionPhase(state2, r, playerHp, enemyHp, log, options) {
  const lower = state2.npc.displayName.toLowerCase();
  let nextLog = log;
  let nextHp = playerHp;
  let nextEnemyHp = enemyHp;
  if (enemyHp <= 0) {
    return { playerHp, enemyHp, log, ended: false };
  }
  if (r.enemyStunned) {
    nextLog = appendLog(nextLog, `${lower} can't move.`);
  } else if (r.rawIncoming > 0 || r.incoming > 0) {
    let incoming = capDamageToRemainingHp(r.incoming, nextHp);
    const battle = state2.battleMove;
    if (battle.counterweightReflectPct != null) {
      const reflected = capDamageToRemainingHp(
        Math.max(1, Math.floor(incoming * battle.counterweightReflectPct)),
        nextEnemyHp
      );
      nextEnemyHp = Math.max(0, nextEnemyHp - reflected);
      r.reflectedDmg = reflected;
      battle.counterweightReflectPct = null;
      nextLog = appendLog(nextLog, `counterweight. ${reflected}.`);
    }
    const split = splitIncomingWithReflect(incoming, state2.combatStatus.playerReflect);
    const playerHit = capDamageToRemainingHp(split.damageToPlayer, nextHp);
    nextHp = Math.max(0, nextHp - playerHit);
    if (r.playerActed && r.eMove !== "STUNNED") {
      if (r.guardCountered) {
        nextLog = appendLog(
          nextLog,
          combinedGuardCounterLogLine(r, state2.npc.displayName, playerHit)
        );
      } else if (options?.logPlayerDefenseExchange && playerDefendedAgainstIncoming(r)) {
        nextLog = appendLog(
          nextLog,
          combinedPlayerDefenseLogLine(r, state2.npc.displayName)
        );
      } else if (!playerDefendedAgainstIncoming(r)) {
        const moveName = getMoveLogDisplayName(r.eMove);
        nextLog = appendLog(
          nextLog,
          `${lower}'s ${moveName}, ${playerHit}.`
        );
      }
    }
    if (split.damageToEnemy > 0) {
      const enemyHit = capDamageToRemainingHp(split.damageToEnemy, nextEnemyHp);
      nextEnemyHp = Math.max(0, nextEnemyHp - enemyHit);
      r.reflectedDmg = (r.reflectedDmg ?? 0) + enemyHit;
      nextLog = appendLog(nextLog, `reflect. ${enemyHit}.`);
    }
    if (!r.playerActed) {
      nextLog = appendLog(
        nextLog,
        playerHit > 0 ? `you're exposed. ${playerHit} taken.` : `you're exposed. nothing comes.`
      );
    }
  } else if (!r.playerActed) {
    nextLog = appendLog(nextLog, `you're exposed. nothing comes.`);
  }
  if (nextHp <= 0) {
    return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: true, result: "lose" };
  }
  if (state2.combatStatus.playerBleed > 0) {
    const potency = state2.combatStatus.playerBleedPotencyMult ?? 1;
    const rawBleed = Math.max(
      1,
      Math.floor(state2.playerStats.maxHp * BLEED_DAMAGE_MAX_HP_PCT * potency)
    );
    if (nextHp > 0) {
      const b = capDamageToRemainingHp(rawBleed, nextHp);
      nextHp = Math.max(0, nextHp - b);
      nextLog = appendLog(nextLog, `you bleed. ${b} damage.`);
    } else {
      nextLog = appendLog(nextLog, "you bleed.");
    }
  }
  return { playerHp: nextHp, enemyHp: nextEnemyHp, log: nextLog, ended: false };
}
function applyPlayerResolutionPhase(state2, r, enemyHp, playerHp, log, options) {
  const lower = state2.npc.displayName.toLowerCase();
  let nextEnemyHp = enemyHp;
  let nextPlayerHp = playerHp;
  let nextLog = log;
  let working = state2;
  let combatStatus = state2.combatStatus;
  let damageToEnemy = r.playerDmg;
  let reflectToPlayer = 0;
  if (r.playerActed && damageToEnemy > 0) {
    const split = splitOutgoingWithReflect(damageToEnemy, combatStatus.enemyReflect);
    damageToEnemy = split.damageToEnemy;
    if (split.damageToPlayer > 0) {
      const reflectDealt = capDamageToRemainingHp(split.damageToPlayer, nextPlayerHp);
      nextPlayerHp = Math.max(0, nextPlayerHp - reflectDealt);
      r.reflectedDmg = (r.reflectedDmg ?? 0) + reflectDealt;
      reflectToPlayer = reflectDealt;
    }
    const doubled = applyDoubleHit(damageToEnemy, combatStatus.playerDouble);
    damageToEnemy = doubled.totalDamage;
    if (doubled.consumedDouble) {
      combatStatus = { ...combatStatus, playerDouble: 0 };
    }
  }
  if (damageToEnemy > 0) {
    damageToEnemy = capDamageToRemainingHp(damageToEnemy, nextEnemyHp);
    r.playerDmg = damageToEnemy;
    nextEnemyHp = Math.max(0, nextEnemyHp - damageToEnemy);
  }
  if (r.playerActed && damageToEnemy > 0 && working.battleMove.devilsCutTurns > 0 && working.battleMove.devilsCutPct > 0) {
    const steal = Math.max(
      1,
      Math.floor(damageToEnemy * working.battleMove.devilsCutPct)
    );
    nextPlayerHp = Math.min(
      working.playerStats.maxHp,
      nextPlayerHp + steal
    );
    r.healApplied += steal;
  }
  if (r.playerActed) {
    let logLine = null;
    if (playerDefendedAgainstIncoming(r)) {
      if (options?.logPlayerDefenseExchange !== false) {
        logLine = combinedPlayerDefenseLogLine(r, state2.npc.displayName);
      }
    } else if (enemyDefendedAgainstOutgoing(r)) {
      logLine = combinedEnemyDefenseLogLine(r, state2.npc.displayName);
    } else {
      logLine = playerLogLineForMove({
        ...r,
        displayName: state2.npc.displayName,
        phenomenaLine: r.phenomenaLine
      });
    }
    if (logLine) nextLog = appendLog(nextLog, logLine);
    if (reflectToPlayer > 0) {
      nextLog = appendLog(nextLog, `reflect. ${reflectToPlayer}.`);
    }
  }
  working = { ...working, combatStatus };
  const winLocked = nextEnemyHp <= 0;
  if (winLocked) {
    nextLog = appendLog(nextLog, `${lower} is finished.`);
  }
  let xpBonusEvents = [];
  if (r.playerActed) {
    const afterXp = applySkillXpToState2(
      { ...working, enemyHp: nextEnemyHp, playerHp: nextPlayerHp, log: nextLog },
      r,
      nextLog
    );
    working = afterXp.state;
    nextLog = afterXp.log;
    nextPlayerHp = working.playerHp;
    xpBonusEvents = afterXp.xpBonusEvents;
  }
  if (winLocked) {
    working = applyPlayerResolveStatusesToWorking(working, r);
    return {
      enemyHp: nextEnemyHp,
      playerHp: nextPlayerHp,
      log: nextLog,
      working,
      ended: true,
      result: "win",
      bleedDamage: 0,
      bleedActualHpChange: 0,
      xpBonusEvents
    };
  }
  let bleedDamage = 0;
  let bleedActualHpChange = 0;
  if (state2.combatStatus.enemyBleed > 0) {
    const potency = state2.combatStatus.enemyBleedPotencyMult ?? 1;
    let rawBleed = Math.max(1, Math.floor(state2.enemyMaxHp * BLEED_DAMAGE_MAX_HP_PCT * potency));
    if (state2.runItBackMode) rawBleed *= 2;
    if (nextEnemyHp > 0) {
      const b = capDamageToRemainingHp(rawBleed, nextEnemyHp);
      nextEnemyHp = Math.max(0, nextEnemyHp - b);
      nextLog = appendLog(nextLog, `${lower} bleeds. ${b} damage.`);
      bleedActualHpChange = b;
    } else {
      nextLog = appendLog(nextLog, `${lower} bleeds.`);
    }
    bleedDamage = bleedActualHpChange;
  }
  const braceChip = r.braceChipDmg ?? 0;
  if (r.playerActed && braceChip > 0 && nextEnemyHp > 0) {
    const chip = capDamageToRemainingHp(braceChip, nextEnemyHp);
    nextEnemyHp = Math.max(0, nextEnemyHp - chip);
    nextLog = appendLog(nextLog, `brace chip. ${chip}.`);
  }
  if (nextEnemyHp <= 0) {
    nextLog = appendLog(nextLog, `${lower} is finished.`);
    working = applyPlayerResolveStatusesToWorking(working, r);
    return {
      enemyHp: nextEnemyHp,
      playerHp: nextPlayerHp,
      log: nextLog,
      working,
      ended: true,
      result: "win",
      bleedDamage,
      bleedActualHpChange,
      xpBonusEvents
    };
  }
  working = applyPlayerResolveStatusesToWorking(working, r);
  return {
    enemyHp: nextEnemyHp,
    playerHp: nextPlayerHp,
    log: nextLog,
    working,
    ended: false,
    bleedDamage,
    bleedActualHpChange,
    xpBonusEvents
  };
}
function finalizeTurn(state2, r) {
  const battleMove = { ...state2.battleMove };
  let combatStatus = tickCombatStatus(state2.combatStatusAtTurnStart ?? state2.combatStatus);
  combatStatus = mergeResolveIntoCombatStatus(
    combatStatus,
    r,
    battleMove.anchorBlocksStatus
  );
  combatStatus = mergeEnemyMoveIntoCombatStatus(
    combatStatus,
    r.eMove,
    battleMove.anchorBlocksStatus
  );
  if (r.incoming > 0 && state2.combatStatus.enemyDouble > 0) {
    combatStatus = { ...combatStatus, enemyDouble: 0 };
  }
  battleMove.anchorBlocksStatus = false;
  if (battleMove.enemyAccuracyTurns > 0) {
    battleMove.enemyAccuracyTurns--;
    if (battleMove.enemyAccuracyTurns <= 0) battleMove.enemyAccuracyMult = 1;
  }
  battleMove.forceEnemyMove = null;
  let turnFlags = {
    playerExposedTurns: state2.playerExposedTurns,
    playerSkipTurns: state2.playerSkipTurns
  };
  const moveDef = getMoveDef(r.pMove);
  turnFlags = applyMoveCostAfterResolve(moveDef.cost, turnFlags);
  if (r.pMove === "BLACKOUT" && battleMove.blackoutPhase === "recharging") {
    turnFlags = applyMoveCostAfterResolve({ kind: "rechargeTurn" }, turnFlags);
    turnFlags = applyMoveCostAfterResolve({ kind: "exposedTurn" }, turnFlags);
  }
  if (battleMove.hyperdriveSpent) {
    turnFlags = applyMoveCostAfterResolve({ kind: "rechargeTurn" }, turnFlags);
    turnFlags = applyMoveCostAfterResolve({ kind: "exposedTurn" }, turnFlags);
    battleMove.hyperdriveSpent = false;
  }
  if (battleMove.blackoutPhase === "loading" && !r.playerActed) {
    battleMove.blackoutPhase = "armed";
  }
  if (battleMove.blackoutPhase === "recharging") {
    battleMove.blackoutPhase = "idle";
  }
  if (battleMove.devilsCutTurns > 0) {
    battleMove.devilsCutTurns = Math.max(0, battleMove.devilsCutTurns - 1);
    if (battleMove.devilsCutTurns <= 0) battleMove.devilsCutPct = 0;
  }
  const turn = state2.turn + 1;
  const upcomingMove = showTelegraph({
    npc: state2.npc,
    turn,
    combatStatus,
    battleMove,
    playerHp: state2.playerHp,
    enemyHp: state2.enemyHp,
    enemyMaxHp: state2.enemyMaxHp,
    playerStats: state2.playerStats,
    playerMoveHistory: state2.playerMoveHistory,
    enemyMoveHistory: state2.enemyMoveHistory,
    playerExposedTurns: turnFlags.playerExposedTurns,
    npcMemoryOverride: state2.npcMemoryOverride
  });
  let enemyHp = state2.enemyHp;
  let log = state2.log;
  if (state2.npc.id === "restocker" && r.eMove === "HOLD" && !r.enemyStunned && enemyHp < state2.npc.stats.maxHp) {
    const heal = Math.max(1, Math.floor(state2.npc.stats.maxHp * 0.14));
    enemyHp = Math.min(state2.npc.stats.maxHp, enemyHp + heal);
    log = appendLog(log, `restocker restocks. +${heal}.`);
  }
  return {
    ...state2,
    turn,
    upcomingMove,
    combatStatus,
    combatStatusAtTurnStart: void 0,
    battleMove,
    enemyHp,
    log,
    playerExposedTurns: turnFlags.playerExposedTurns,
    playerSkipTurns: turnFlags.playerSkipTurns,
    deathClocks: tickDeathClocks(state2.deathClocks),
    phase: "player",
    result: null,
    feedbackEvents: []
  };
}
function applySkillXpToState2(state2, r, log) {
  return applySkillXpToState(state2, r, log, state2.combatXpPolicy);
}
function beginTurnResolve(state2, pMove, slot) {
  const priorLogLen = state2.log.length;
  let working = processTurnStart(state2);
  working = {
    ...working,
    combatStatusAtTurnStart: working.combatStatus
  };
  working = { ...working, log: working.log.slice(priorLogLen) };
  const eMove = state2.upcomingMove !== "STUNNED" ? state2.upcomingMove : null;
  working = {
    ...working,
    playerMoveHistory: [...working.playerMoveHistory, pMove],
    enemyMoveHistory: eMove ? [...working.enemyMoveHistory, eMove] : [...working.enemyMoveHistory]
  };
  const consumed = consumeTurnFlag({
    playerExposedTurns: working.playerExposedTurns,
    playerSkipTurns: working.playerSkipTurns
  });
  working = {
    ...working,
    playerExposedTurns: consumed.flags.playerExposedTurns,
    playerSkipTurns: consumed.flags.playerSkipTurns
  };
  const statusStunned = playerLosesTurn(working.combatStatus);
  const resolved = consumed.wasExposed || statusStunned ? resolveExposedTurn(working, pMove, working.upcomingMove) : {
    out: resolveMoves(working, pMove, working.upcomingMove, slot),
    post: { deathClocks: [], selfDamage: 0, healPlayer: 0 }
  };
  if (consumed.wasExposed || statusStunned) {
    applyPostResolveEffects(working, resolved.post);
  }
  let r = {
    ...resolved.out,
    ...previewEnemyStatusOnPlayer(
      resolved.out.eMove,
      working.battleMove.anchorBlocksStatus
    )
  };
  if (statusStunned) {
    r = { ...r, playerActed: false };
  }
  if (working.runItBackMode) {
    r = {
      ...r,
      playerDmg: Math.round(r.playerDmg * 2),
      incoming: Math.round(r.incoming * 2),
      rawIncoming: Math.round(r.rawIncoming * 2)
    };
  }
  const playerUsedLoop = pMove === "LOOP";
  const enemyUsedLoop = eMove === "LOOP";
  if (playerUsedLoop || enemyUsedLoop) {
    r = {
      ...r,
      playerDmg: Math.round(r.playerDmg * 2),
      incoming: Math.round(r.incoming * 2),
      rawIncoming: Math.round(r.rawIncoming * 2)
    };
  }
  capResolveResultToRemainingHp(r, working.enemyHp, working.playerHp);
  const enemyFirst = enemyActsFirstInResolution(working, r);
  working = withResolveFeedback(working, r, enemyFirst);
  const pending = { r, enemyFirst };
  if (enemyFirst) {
    const enemyPhase = applyEnemyResolutionPhase(
      working,
      r,
      working.playerHp,
      working.enemyHp,
      working.log,
      { logPlayerDefenseExchange: true }
    );
    if (enemyPhase.ended) {
      const bleedB = working.combatStatus.enemyBleed > 0 ? Math.max(1, Math.floor(state2.enemyMaxHp * BLEED_DAMAGE_MAX_HP_PCT)) * (working.runItBackMode ? 2 : 1) : 0;
      const effectiveDmg = r.playerActed ? r.playerDmg : 0;
      if (effectiveDmg + bleedB >= working.enemyHp) {
        return {
          ...working,
          playerHp: 0,
          enemyHp: 0,
          log: [...enemyPhase.log, "both fighters fall."],
          pendingResolve: null,
          resolveStep: "idle",
          phase: "ended",
          result: "draw"
        };
      }
      return {
        ...working,
        playerHp: enemyPhase.playerHp,
        enemyHp: enemyPhase.enemyHp,
        log: enemyPhase.log,
        pendingResolve: null,
        resolveStep: "idle",
        phase: "ended",
        result: enemyPhase.result ?? "lose"
      };
    }
    return {
      ...working,
      playerHp: enemyPhase.playerHp,
      enemyHp: enemyPhase.enemyHp,
      log: enemyPhase.log,
      combatStatus: withEnemyResolveStatuses(
        working.combatStatus,
        r,
        working.battleMove.anchorBlocksStatus
      ),
      pendingResolve: pending,
      resolveStep: "pause_after_first",
      phase: "busy"
    };
  }
  const playerPhase = applyPlayerResolutionPhase(
    working,
    r,
    working.enemyHp,
    working.playerHp,
    working.log
  );
  const followUpFeedback = [
    ...playerPhase.working.feedbackEvents,
    ...playerPhase.bleedDamage > 0 ? [
      { kind: "damage", text: `-${playerPhase.bleedDamage}`, target: "enemy", tone: "bleed" }
    ] : [],
    ...playerPhase.xpBonusEvents
  ];
  const playerPhaseWorking = followUpFeedback.length > 0 ? {
    ...playerPhase.working,
    feedbackEvents: followUpFeedback,
    feedbackSeq: state2.feedbackSeq + 1,
    feedbackBleedDamage: playerPhase.bleedActualHpChange
  } : { ...playerPhase.working, feedbackBleedDamage: playerPhase.bleedActualHpChange };
  if (playerPhase.ended) {
    if (r.incoming > 0 && playerPhase.playerHp - r.incoming <= 0) {
      return {
        ...playerPhaseWorking,
        enemyHp: 0,
        playerHp: 0,
        log: [...playerPhase.log, "both fighters fall."],
        pendingResolve: null,
        resolveStep: "idle",
        phase: "ended",
        result: "draw"
      };
    }
    return {
      ...playerPhaseWorking,
      enemyHp: playerPhase.enemyHp,
      playerHp: playerPhase.playerHp,
      log: playerPhase.log,
      pendingResolve: null,
      resolveStep: "idle",
      phase: "ended",
      result: playerPhase.result ?? "win"
    };
  }
  return {
    ...playerPhaseWorking,
    enemyHp: playerPhase.enemyHp,
    playerHp: playerPhase.playerHp,
    log: playerPhase.log,
    pendingResolve: pending,
    resolveStep: "pause_after_first",
    phase: "busy"
  };
}
function applySecondResolve(state2) {
  const pending = state2.pendingResolve;
  if (!pending || state2.phase !== "busy") return state2;
  const { r, enemyFirst } = pending;
  if (enemyFirst) {
    const playerPhase = applyPlayerResolutionPhase(
      state2,
      r,
      state2.enemyHp,
      state2.playerHp,
      state2.log,
      { logPlayerDefenseExchange: false }
    );
    const playerPhaseWorking = playerPhase.bleedDamage > 0 ? {
      ...playerPhase.working,
      // Preserve the crit/status events already queued for this turn (e.g. "CRIT"
      // and "bleed!" from withResolveFeedback) and append the bleed damage text
      // after them, so nothing from the original hit gets dropped.
      feedbackEvents: [
        ...playerPhase.working.feedbackEvents,
        { kind: "damage", text: `-${playerPhase.bleedDamage}`, target: "enemy", tone: "bleed" }
      ],
      feedbackSeq: playerPhase.working.feedbackSeq + 1,
      feedbackBleedDamage: playerPhase.bleedActualHpChange
    } : { ...playerPhase.working, feedbackBleedDamage: playerPhase.bleedActualHpChange };
    if (playerPhase.ended) {
      return {
        ...playerPhaseWorking,
        enemyHp: playerPhase.enemyHp,
        playerHp: playerPhase.playerHp,
        log: playerPhase.log,
        pendingResolve: null,
        resolveStep: "idle",
        phase: "ended",
        result: playerPhase.result ?? "win"
      };
    }
    return {
      ...playerPhaseWorking,
      enemyHp: playerPhase.enemyHp,
      playerHp: playerPhase.playerHp,
      log: playerPhase.log,
      pendingResolve: pending,
      resolveStep: "pause_after_second",
      phase: "busy"
    };
  }
  if (state2.enemyHp <= 0) {
    return {
      ...state2,
      pendingResolve: pending,
      resolveStep: "pause_after_second",
      phase: "busy"
    };
  }
  const enemyPhase = applyEnemyResolutionPhase(
    state2,
    r,
    state2.playerHp,
    state2.enemyHp,
    state2.log
  );
  if (enemyPhase.ended) {
    return {
      ...state2,
      playerHp: enemyPhase.playerHp,
      enemyHp: enemyPhase.enemyHp,
      log: enemyPhase.log,
      pendingResolve: null,
      resolveStep: "idle",
      phase: "ended",
      result: enemyPhase.result ?? "lose"
    };
  }
  return {
    ...state2,
    playerHp: enemyPhase.playerHp,
    enemyHp: enemyPhase.enemyHp,
    log: enemyPhase.log,
    combatStatus: withEnemyResolveStatuses(
      state2.combatStatus,
      r,
      state2.battleMove.anchorBlocksStatus
    ),
    pendingResolve: pending,
    resolveStep: "pause_after_second",
    phase: "busy"
  };
}
function finishTurnResolve(state2) {
  const pending = state2.pendingResolve;
  if (!pending || state2.phase !== "busy") return state2;
  const finalized = finalizeTurn(state2, pending.r);
  const phase = finalized.pendingLevelUpNotification ? "busy" : "player";
  return {
    ...finalized,
    pendingResolve: null,
    resolveStep: "idle",
    phase
  };
}
function createInitialBattleState(npcId, options) {
  const combatSeed = options?.combatSeed ?? randomCombatSeed();
  setCombatRng(createSeededRng(combatSeed));
  const npc = isDevSparNpcId(npcId) ? buildDevSpar() : isGhostCombatId(npcId) ? resolveGhostCombatEntry(npcId) : (() => {
    const resolvedId = getNpcCombatEntry(npcId) ? npcId : "walker";
    const entry2 = getNpcCombatEntry(resolvedId);
    if (!entry2) {
      throw new Error(`Unknown combat NPC: ${npcId}`);
    }
    return { ...entry2 };
  })();
  const archetype = options?.archetype ?? DEFAULT_ARCHETYPE;
  const accessories = options?.accessories ?? [];
  if (!options?.skills) {
    throw new Error("createInitialBattleState requires options.skills (use client battleStore wrapper)");
  }
  const skills = snapshotSkills(options.skills);
  const buildLoop = deriveBuildLoopType(skills);
  const playerStats = computePlayerStats(archetype, accessories, skills);
  const storedHp = options?.carryHp;
  const playerHp = storedHp != null ? Math.max(1, Math.min(playerStats.maxHp, Math.floor(storedHp))) : playerStats.maxHp;
  const combatStatus = createEmptyCombatStatus();
  const battleMove = createBattleMoveState();
  const playerMoveHistory = [];
  const enemyMoveHistory = [];
  const upcomingMove = showTelegraph({
    npc,
    turn: 0,
    combatStatus,
    battleMove,
    playerHp,
    enemyHp: npc.stats.hp,
    enemyMaxHp: npc.stats.maxHp,
    playerStats,
    playerMoveHistory,
    enemyMoveHistory,
    playerExposedTurns: 0,
    npcMemoryOverride: options?.isolateNpcMemory ? EMPTY_NPC_MEMORY : null
  });
  return {
    npc,
    playerStats,
    playerHp,
    enemyHp: npc.stats.hp,
    enemyMaxHp: npc.stats.maxHp,
    archetype,
    accessories,
    turn: 0,
    upcomingMove,
    combatStatus,
    playerExposedTurns: 0,
    playerSkipTurns: 0,
    deathClocks: [],
    battleMove,
    battleEquipped: options?.equippedMoves ?? DEFAULT_EQUIPPED_MOVES,
    log: [],
    phase: "player",
    result: null,
    pendingResolve: null,
    resolveStep: "idle",
    feedbackEvents: [],
    feedbackSeq: 0,
    feedbackEnemyActedFirst: false,
    feedbackBleedDamage: 0,
    pendingLevelUpNotification: null,
    runItBackMode: options?.runItBack ?? false,
    combatXpPolicy: options?.combatXpPolicy ?? "normal",
    battleEndHealing: options?.battleEndHealing ?? "default",
    practiceXpBudget: options?.practiceXpBudget ?? null,
    practiceXpSessionEarned: 0,
    combatSeed,
    skillsSnapshot: skills,
    buildLoop,
    npcMemoryOverride: options?.isolateNpcMemory ? EMPTY_NPC_MEMORY : null,
    playerMoveHistory,
    enemyMoveHistory
  };
}
function battleReducer(state2, action) {
  switch (action.type) {
    case "INIT":
      return createInitialBattleState(action.npcId, {
        archetype: action.archetype,
        accessories: action.accessories,
        carryHp: action.carryHp,
        runItBack: action.runItBack,
        combatXpPolicy: action.combatXpPolicy,
        battleEndHealing: action.battleEndHealing,
        practiceXpBudget: action.practiceXpBudget,
        combatSeed: action.combatSeed,
        isolateNpcMemory: action.isolateNpcMemory
      });
    case "PLAYER_MOVE":
      if (state2.phase !== "player") return state2;
      return beginTurnResolve(state2, action.move, action.slot);
    case "RESOLVE_SECOND":
      return applySecondResolve(state2);
    case "RESOLVE_FINISH":
      return finishTurnResolve(state2);
    case "END_BATTLE":
      return { ...state2, phase: "ended", result: action.result };
    case "DISMISS_LEVEL_UP":
      return {
        ...state2,
        pendingLevelUpNotification: null,
        phase: state2.phase === "ended" ? "ended" : "player"
      };
    default:
      return state2;
  }
}

// combat-core/runBattle.ts
function advanceBusyState(state2) {
  if (state2.phase !== "busy") return state2;
  if (state2.pendingLevelUpNotification) {
    return battleReducer(state2, { type: "DISMISS_LEVEL_UP" });
  }
  if (state2.resolveStep === "pause_after_first") {
    return battleReducer(state2, { type: "RESOLVE_SECOND" });
  }
  if (state2.resolveStep === "pause_after_second") {
    return battleReducer(state2, { type: "RESOLVE_FINISH" });
  }
  return state2;
}
function runBattle(options) {
  let state2 = createInitialBattleState(options.npcId, {
    combatSeed: options.seed,
    skills: options.skills,
    equippedMoves: options.equippedMoves,
    archetype: options.archetype,
    isolateNpcMemory: options.isolateNpcMemory ?? false,
    combatXpPolicy: "none",
    runItBack: options.runItBack ?? false
  });
  let moveIndex = 0;
  let guard = 0;
  const maxSteps = 500;
  while (state2.phase !== "ended" && guard < maxSteps) {
    guard += 1;
    if (state2.phase === "busy") {
      const next = advanceBusyState(state2);
      if (next === state2) break;
      state2 = next;
      continue;
    }
    const move = options.playerMoves[moveIndex] ?? options.playerMoves[options.playerMoves.length - 1] ?? "STRIKE";
    moveIndex += 1;
    state2 = battleReducer(state2, { type: "PLAYER_MOVE", move });
  }
  if (state2.phase !== "ended" || state2.result == null) {
    throw new Error(`Combat simulation did not end (phase=${state2.phase}, guard=${guard})`);
  }
  return {
    result: state2.result,
    turns: state2.turn,
    playerHp: state2.playerHp,
    enemyHp: state2.enemyHp,
    rngDraws: getCombatRng().draws(),
    logDigest: state2.log.join("\n")
  };
}
export {
  runBattle
};

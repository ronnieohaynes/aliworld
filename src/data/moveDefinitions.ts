import {
  CANNON_CRIT_BASE,
  CANNON_CRIT_LCK_MULT,
  CANNON_CRIT_MULT,
  CANNON_DAMAGE_MULT,
  CANNON_DEF_SHATTER_CHANCE,
  DARK_BREAK_ACCURACY_MULT,
  DARK_BREAK_ACCURACY_TURNS_MAX,
  DARK_BREAK_ACCURACY_TURNS_MIN,
  DARK_BREAK_DAMAGE_MULT,
  FURY_SWEEP_CRIT_BASE,
  FURY_SWEEP_CRIT_LCK_MULT,
  FURY_SWEEP_CRIT_MULT,
  FURY_SWEEP_DAMAGE_FLOOR,
  FURY_SWEEP_DAMAGE_MULT,
  GRAVITY_SHIFT_SLOW_TURNS_MAX,
  GRAVITY_SHIFT_SLOW_TURNS_MIN,
  PARRY_DODGE_COUNTER_MULT,
  PARRY_DODGE_WEAK_MULT,
  PARRY_ON_DODGE_REFLECT_PCT,
  XP_DAMAGE_AVOIDED_MULT,
  XP_DAMAGE_BLOCKED_MULT,
  XP_DAMAGE_DEALT_MULT,
  XP_DEFENSE_SPEED_ACTION_BONUS,
  XP_FALLBACK_SMALL,
  XP_LUCK_DAMAGE_MULT,
  XP_LUCK_PROC_BONUS,
} from './moveBalance'
import type { PlayerMoveId } from './moveIds'
import { unlockLevelForRung } from './moveUnlock'
import type { MoveDefinition, MoveXpContext } from './moveTypes'

/**
 * Counter-web audit — every big move needs an answer (see behavior + comments on caps).
 * STRIKE — answered by: enemy skip/stun, HOLD/SLIP
 * FURY_SWEEP — answered by: burst before bleed stacks, ANCHOR/bleed out-sustain
 * DARK_BREAK — answered by: kill before accuracy debuff stacks, tempo
 * CANNON — answered by: brace, dodge, def shatter is rng
 * BLACKOUT — answered by: HOLD/ANCHOR/BRICK_WALL on load exposed + release; SLIP/PARRY exposed; release dodge (reduced)
 * SLIP/PARRY — answered by: enemy skip, trade damage
 * GRAVITY_SHIFT — answered by: burst while slowed, ANCHOR
 * REFRACT — answered by: don't heavy-hit before refract, stun/skip
 * HYPERDRIVE — answered by: punish recharge exposed turn (brace/dodge/skip)
 * HOLD/ANCHOR — answered by: skip turns, burst through brace, ANCHOR vs status
 * SECOND_WIND — answered by: burst before heal, once/fight limits stall
 * COUNTERWEIGHT/BRICK_WALL — answered by: skip/feint, multi-hit, wait out wall
 * INVINCIBLE — answered by: burst before pop, once/fight
 * WHISPER/LOOP — answered by: ANCHOR cleanses shake, kill before loop value
 * DEVILS_CUT — answered by: burst through modest lifesteal window
 * SNAG — answered by: deny value by killing fast
 * PHENOMENA — answered by: ANCHOR vs status procs, rng
 * SEALED_FATE — answered by: kill before clock, SECOND_WIND/out-sustain, clock miss gamble
 * Enemy status on player (stun/bleed/shake) — not implemented yet; future enemy-design lever.
 *   When added: ANCHOR cleanses, brace reduces chip.
 */

function luckProcCount(r: MoveXpContext): number {
  let count = 0
  if (r.crit) count++
  if (r.shakeApplied) count++
  if (r.bleedApplied) count++
  if (r.stunApplied) count++
  if (r.slowApplied) count++
  if (r.missApplied) count++
  if (r.doubleApplied) count++
  if (r.reflectApplied) count++
  return count
}

function defenseMoveXp(r: MoveXpContext): number {
  if (r.damageBlocked > 0) {
    return r.damageBlocked * XP_DAMAGE_BLOCKED_MULT + XP_DEFENSE_SPEED_ACTION_BONUS
  }
  return r.braced ? XP_DEFENSE_SPEED_ACTION_BONUS : XP_FALLBACK_SMALL
}

function speedDodgeMoveXp(r: MoveXpContext): number {
  if (r.damageAvoided > 0) {
    return (
      r.damageAvoided * XP_DAMAGE_AVOIDED_MULT +
      XP_DEFENSE_SPEED_ACTION_BONUS +
      (r.dodged && r.playerDmg > 0 ? Math.floor(r.playerDmg * 0.5) : 0)
    )
  }
  return XP_FALLBACK_SMALL
}

function def(
  partial: Omit<MoveDefinition, 'unlockAtSkillLevel'> & { ladderRung: MoveDefinition['ladderRung'] },
): MoveDefinition {
  return {
    ...partial,
    unlockAtSkillLevel: unlockLevelForRung(partial.ladderRung),
  }
}

export const MOVES: Record<PlayerMoveId, MoveDefinition> = {
  STRIKE: def({
    id: 'STRIKE',
    displayName: 'STRIKE',
    skill: 'attack',
    ladderRung: 1,
    cost: { kind: 'none' },
    behavior: {
      kind: 'damage',
      profile: {
        damageMult: 1.3,
        openingBonusMult: 1.5,
        takeEnemyHit: true,
        crit: { base: 6, lckMult: 2, damageMult: 1.6, onCrit: ['bleed'] },
      },
    },
    onResolve: [],
    xpGrants: [
      { skill: 'attack', amount: (r) => r.playerDmg * XP_DAMAGE_DEALT_MULT },
      { skill: 'hp', amount: (r) => r.playerDmg * 1.3 },
    ],
    uiDescription: 'hit the opening. trade if they swing.',
    uiClassName: 'battle-screen__move--strike',
    playerLogLine: (r) => {
      if (r.enemyStunned || !r.enemyAttacks) {
        return `you struck the opening. ${r.playerDmg}!${r.crit ? ' crit.' : ''}`
      }
      return `you traded blows. ${r.playerDmg} dealt, ${r.incoming} taken.`
    },
  }),

  FURY_SWEEP: def({
    id: 'FURY_SWEEP',
    displayName: 'FURY SWEEP',
    skill: 'attack',
    ladderRung: 2,
    cost: { kind: 'none' },
    behavior: {
      kind: 'fury-sweep',
      profile: {
        damageMult: FURY_SWEEP_DAMAGE_MULT,
        damageFloor: FURY_SWEEP_DAMAGE_FLOOR,
        takeEnemyHit: true,
        crit: {
          base: FURY_SWEEP_CRIT_BASE,
          lckMult: FURY_SWEEP_CRIT_LCK_MULT,
          damageMult: FURY_SWEEP_CRIT_MULT,
          extraCritRolls: 1,
          onCrit: ['bleed'],
          bleedOnCritOnly: true,
        },
      },
    },
    onResolve: [],
    xpGrants: [
      { skill: 'attack', amount: (r) => r.playerDmg * 3 },
      { skill: 'hp', amount: (r) => r.playerDmg },
    ],
    uiDescription: 'wild sweep. crit applies bleed — chip each turn.',
    uiClassName: 'battle-screen__move--fury-sweep',
    playerLogLine: (r) =>
      `fury sweep. ${r.playerDmg}!${r.crit ? ' crit bleed.' : ''}`,
  }),

  DARK_BREAK: def({
    id: 'DARK_BREAK',
    displayName: 'DARK BREAK',
    skill: 'attack',
    ladderRung: 3,
    cost: { kind: 'none' },
    behavior: {
      kind: 'dark-break',
      profile: { damageMult: DARK_BREAK_DAMAGE_MULT, takeEnemyHit: true },
      accuracyMult: DARK_BREAK_ACCURACY_MULT,
      accuracyTurns: { min: DARK_BREAK_ACCURACY_TURNS_MIN, max: DARK_BREAK_ACCURACY_TURNS_MAX },
    },
    onResolve: [],
    xpGrants: [
      { skill: 'attack', amount: 6 },
      { skill: 'luck', amount: 4 },
    ],
    uiDescription: 'break their aim. low damage, high control.',
    uiClassName: 'battle-screen__move--dark-break',
    playerLogLine: (r) =>
      `dark break. ${r.playerDmg}. their aim falters.`,
  }),

  CANNON: def({
    id: 'CANNON',
    displayName: 'CANNON',
    skill: 'attack',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: {
      kind: 'cannon',
      profile: {
        damageMult: CANNON_DAMAGE_MULT,
        takeEnemyHit: true,
        crit: {
          base: CANNON_CRIT_BASE,
          lckMult: CANNON_CRIT_LCK_MULT,
          damageMult: CANNON_CRIT_MULT,
          onCrit: [],
        },
      },
      defShatterChance: CANNON_DEF_SHATTER_CHANCE,
    },
    onResolve: [],
    xpGrants: [
      { skill: 'attack', amount: (r) => r.playerDmg * 3.5 },
      { skill: 'hp', amount: 2 },
    ],
    uiDescription: 'high crit. might shatter their defense.',
    uiClassName: 'battle-screen__move--cannon',
    playerLogLine: (r) =>
      `cannon. ${r.playerDmg}!${r.crit ? ' crit.' : ''}`,
  }),

  BLACKOUT: def({
    // answered by: HOLD/ANCHOR/BRICK_WALL (load exposed + release); SLIP/PARRY (exposed); release dodge (reduced)
    id: 'BLACKOUT',
    displayName: 'BLACKOUT',
    skill: 'attack',
    ladderRung: 5,
    cost: { kind: 'loadTurn' },
    behavior: { kind: 'blackout' },
    onResolve: [],
    xpGrants: [{ skill: 'attack', amount: 12 }],
    uiDescription: 'load. exposed. then the biggest hit.',
    uiClassName: 'battle-screen__move--blackout',
    playerLogLine: (r) => {
      if (r.playerDmg > 0) return `blackout lands. ${r.playerDmg}!`
      return 'you load the blackout.'
    },
  }),

  SLIP: def({
    id: 'SLIP',
    displayName: 'SLIP',
    skill: 'speed',
    ladderRung: 1,
    cost: { kind: 'none' },
    behavior: {
      kind: 'dodge',
      profile: {
        counterMult: 0.7,
        weakMult: 0.4,
        stunChance: { base: 20, lckMult: 2 },
      },
    },
    onResolve: [],
    xpGrants: [
      { skill: 'speed', amount: speedDodgeMoveXp },
      {
        skill: 'luck',
        amount: (r) => (r.stunApplied ? XP_LUCK_PROC_BONUS : 0),
      },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'dodge and counter. avoid their incoming hit.',
    uiClassName: 'battle-screen__move--slip',
    playerLogLine: (r) => {
      const name = r.displayName.toLowerCase()
      if (r.dodged) {
        return `you slipped it. counter for ${r.playerDmg}.${r.stunApplied ? ` ${name} reels.` : ''}`
      }
      if (r.rawIncoming > 0) {
        const taken = r.incoming > 0 ? `${r.incoming} taken. ` : ''
        const counter = r.playerDmg > 0 ? `${r.playerDmg} back.` : 'no counter.'
        return `slip too slow. ${taken}${counter}`
      }
      return `nothing to slip. ${r.playerDmg}.`
    },
  }),

  PARRY: def({
    id: 'PARRY',
    displayName: 'PARRY',
    skill: 'speed',
    ladderRung: 2,
    cost: { kind: 'none' },
    behavior: {
      kind: 'dodge',
      profile: {
        counterMult: PARRY_DODGE_COUNTER_MULT,
        weakMult: PARRY_DODGE_WEAK_MULT,
        stunChance: { base: 8, lckMult: 1 },
        onDodgeReflectPct: PARRY_ON_DODGE_REFLECT_PCT,
      },
    },
    onResolve: [],
    xpGrants: [
      { skill: 'speed', amount: speedDodgeMoveXp },
      { skill: 'defense', amount: (r) => (r.dodged ? XP_FALLBACK_SMALL : 0) },
    ],
    uiDescription: 'deflect and sting. tiny reflect on dodge.',
    uiClassName: 'battle-screen__move--parry',
    playerLogLine: (r) =>
      r.dodged
        ? `parry. ${r.playerDmg} back.`
        : `parry whiff. ${r.playerDmg}.`,
  }),

  GRAVITY_SHIFT: def({
    id: 'GRAVITY_SHIFT',
    displayName: 'GRAVITY SHIFT',
    skill: 'speed',
    ladderRung: 3,
    cost: { kind: 'none' },
    behavior: {
      kind: 'gravity-shift',
      slowTurns: { min: GRAVITY_SHIFT_SLOW_TURNS_MIN, max: GRAVITY_SHIFT_SLOW_TURNS_MAX },
    },
    onResolve: [{ effect: 'slow', turns: 3 }],
    xpGrants: [
      { skill: 'speed', amount: (r) => 12 + r.playerDmg },
      { skill: 'luck', amount: 4 },
    ],
    uiDescription: 'slow them down. you set the tempo.',
    uiClassName: 'battle-screen__move--gravity-shift',
    playerLogLine: (r) =>
      `gravity shift. ${r.playerDmg}. they slow.`,
  }),

  REFRACT: def({
    id: 'REFRACT',
    displayName: 'REFRACT',
    skill: 'speed',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: { kind: 'refract' },
    onResolve: [],
    xpGrants: [
      { skill: 'speed', amount: (r) => Math.max(14, r.playerDmg * 2.5) },
    ],
    uiDescription: 'mirror their last hit back.',
    uiClassName: 'battle-screen__move--refract',
    playerLogLine: (r) =>
      `refract. ${r.playerDmg} mirrored.`,
  }),

  HYPERDRIVE: def({
    // answered by: punish recharge exposed turn (HOLD/SLIP/BRICK_WALL on exposed window)
    id: 'HYPERDRIVE',
    displayName: 'HYPERDRIVE',
    skill: 'speed',
    ladderRung: 5,
    cost: { kind: 'rechargeTurn' },
    behavior: { kind: 'hyperdrive' },
    onResolve: [],
    xpGrants: [{ skill: 'speed', amount: 22 }],
    uiDescription: 'double next turn. then you skip — exposed.',
    uiClassName: 'battle-screen__move--hyperdrive',
    playerLogLine: (r) =>
      r.playerDmg > 0
        ? `hyperdrive. ${r.playerDmg}. next turn you fly.`
        : 'hyperdrive primed.',
  }),

  HOLD: def({
    id: 'HOLD',
    displayName: 'HOLD',
    skill: 'defense',
    ladderRung: 1,
    cost: { kind: 'none' },
    behavior: { kind: 'brace', profile: { incomingMult: 0.3 } },
    onResolve: ['brace'],
    xpGrants: [
      { skill: 'defense', amount: defenseMoveXp },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'brace. take a fraction of the next hit.',
    uiClassName: 'battle-screen__move--hold',
    playerLogLine: (r) => {
      if (r.rawIncoming > 0) return `you braced. ${r.incoming} chip.`
      return `you set your feet. nothing comes.`
    },
  }),

  ANCHOR: def({
    id: 'ANCHOR',
    displayName: 'ANCHOR',
    skill: 'defense',
    ladderRung: 2,
    cost: { kind: 'none' },
    behavior: {
      kind: 'brace',
      profile: { incomingMult: 0.3, blockStatus: true },
    },
    onResolve: ['brace'],
    xpGrants: [
      { skill: 'defense', amount: defenseMoveXp },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'brace and shrug off status this turn.',
    uiClassName: 'battle-screen__move--anchor',
    playerLogLine: (r) =>
      r.rawIncoming > 0
        ? `anchored. ${r.incoming} chip. status blocked.`
        : 'anchored. nothing lands.',
  }),

  SECOND_WIND: def({
    // answered by: burst before heal; once/fight — not an infinite stall loop
    id: 'SECOND_WIND',
    displayName: 'SECOND WIND',
    skill: 'defense',
    ladderRung: 3,
    cost: { kind: 'oncePerBattle' },
    behavior: { kind: 'second-wind' },
    onResolve: [],
    xpGrants: [
      { skill: 'defense', amount: (r) => Math.max(14, r.healApplied) },
      { skill: 'hp', amount: (r) => Math.max(8, Math.floor(r.healApplied * 0.5)) },
    ],
    uiDescription: 'breathe. get some back. once a fight.',
    uiClassName: 'battle-screen__move--second-wind',
    playerLogLine: (r) =>
      r.healApplied && r.healApplied > 0
        ? `second wind. +${r.healApplied} back.`
        : 'second wind.',
  }),

  COUNTERWEIGHT: def({
    id: 'COUNTERWEIGHT',
    displayName: 'COUNTERWEIGHT',
    skill: 'defense',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: {
      kind: 'counterweight',
      blockPct: { min: 0.5, max: 0.8 },
      reflectChance: 0.35,
      reflectPct: { min: 0.02, max: 0.1 },
    },
    onResolve: [],
    xpGrants: [{ skill: 'defense', amount: defenseMoveXp }],
    uiDescription: 'block heavy. chance to send some back.',
    uiClassName: 'battle-screen__move--counterweight',
    playerLogLine: () => 'counterweight set.',
  }),

  BRICK_WALL: def({
    id: 'BRICK_WALL',
    displayName: 'BRICK WALL',
    skill: 'defense',
    ladderRung: 5,
    cost: { kind: 'none' },
    behavior: { kind: 'brick-wall' },
    onResolve: [],
    xpGrants: [
      {
        skill: 'defense',
        amount: (r) =>
          r.damageAvoided > 0 || r.damageBlocked > 0
            ? (r.damageAvoided + r.damageBlocked) * XP_DAMAGE_BLOCKED_MULT +
              XP_DEFENSE_SPEED_ACTION_BONUS
            : XP_DEFENSE_SPEED_ACTION_BONUS,
      },
    ],
    uiDescription: 'nullify the next hit entirely.',
    uiClassName: 'battle-screen__move--brick-wall',
    playerLogLine: () => 'brick wall up.',
  }),

  INVINCIBLE: def({
    // answered by: burst before blocks pop; once/fight
    id: 'INVINCIBLE',
    displayName: 'INVINCIBLE',
    skill: 'defense',
    ladderRung: 6,
    cost: { kind: 'oncePerBattle' },
    behavior: { kind: 'invincible' },
    onResolve: [],
    xpGrants: [{ skill: 'defense', amount: 24 }],
    uiDescription: 'half your hp. block the next 3 hits. once per fight.',
    uiClassName: 'battle-screen__move--invincible',
    playerLogLine: () => 'invincible. for now.',
  }),

  WHISPER: def({
    id: 'WHISPER',
    displayName: 'WHISPER',
    skill: 'luck',
    ladderRung: 1,
    cost: { kind: 'none' },
    behavior: {
      kind: 'damage',
      profile: { damageMult: 0.5, takeEnemyHit: true },
    },
    onResolve: ['shake'],
    xpGrants: [
      {
        skill: 'luck',
        amount: (r) =>
          XP_DEFENSE_SPEED_ACTION_BONUS +
          (r.shakeApplied ? XP_LUCK_PROC_BONUS : 0) +
          r.playerDmg * XP_LUCK_DAMAGE_MULT,
      },
      { skill: 'hp', amount: 2 },
    ],
    uiDescription: 'rattle them. their next hit lands softer.',
    uiClassName: 'battle-screen__move--whisper',
    playerLogLine: (r) => {
      const name = r.displayName.toLowerCase()
      return `you whisper. ${name}'s rhythm breaks.`
    },
  }),

  LOOP: def({
    id: 'LOOP',
    displayName: 'LOOP',
    skill: 'luck',
    ladderRung: 2,
    cost: { kind: 'none' },
    behavior: { kind: 'loop' },
    onResolve: [],
    xpGrants: [
      { skill: 'luck', amount: (r) => 16 + r.playerDmg * XP_LUCK_DAMAGE_MULT },
    ],
    uiDescription: 'make them repeat their last move.',
    uiClassName: 'battle-screen__move--loop',
    playerLogLine: (r) =>
      `loop. ${r.playerDmg}. they repeat themselves.`,
  }),

  DEVILS_CUT: def({
    // answered by: burst through modest lifesteal window (2–3 turns)
    id: 'DEVILS_CUT',
    displayName: "DEVIL'S CUT",
    skill: 'luck',
    ladderRung: 3,
    cost: { kind: 'none' },
    behavior: { kind: 'devils-cut' },
    onResolve: [],
    xpGrants: [
      { skill: 'luck', amount: (r) => 14 + r.playerDmg * XP_LUCK_DAMAGE_MULT },
      { skill: 'hp', amount: 6 },
    ],
    uiDescription: 'take your cut. hits feed you for a few turns.',
    uiClassName: 'battle-screen__move--devils-cut',
    playerLogLine: (r) =>
      `devil's cut. ${r.playerDmg}. your hits feed you.`,
  }),

  SNAG: def({
    id: 'SNAG',
    displayName: 'SNAG',
    skill: 'luck',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: { kind: 'snag' },
    onResolve: [],
    xpGrants: [{ skill: 'luck', amount: 22 }],
    uiDescription: 'steal one of their moves for this fight.',
    uiClassName: 'battle-screen__move--snag',
    playerLogLine: (r) =>
      `snag. ${r.playerDmg}. their move is yours now.`,
  }),

  PHENOMENA: def({
    id: 'PHENOMENA',
    displayName: 'PHENOMENA',
    skill: 'luck',
    ladderRung: 5,
    cost: { kind: 'none' },
    behavior: { kind: 'phenomena' },
    onResolve: [],
    xpGrants: [
      {
        skill: 'luck',
        amount: (r) =>
          XP_DEFENSE_SPEED_ACTION_BONUS +
          luckProcCount(r) * XP_LUCK_PROC_BONUS +
          r.playerDmg * XP_LUCK_DAMAGE_MULT,
      },
    ],
    uiDescription: 'pure rng from the known pool.',
    uiClassName: 'battle-screen__move--phenomena',
    playerLogLine: (r) => r.phenomenaLine ?? 'phenomena.',
  }),

  SEALED_FATE: def({
    // answered by: kill before clock; SECOND_WIND/out-sustain; miss self-damage gamble
    id: 'SEALED_FATE',
    displayName: 'SEALED FATE',
    skill: 'luck',
    ladderRung: 6,
    cost: { kind: 'none' },
    behavior: { kind: 'sealed-fate' },
    onResolve: [],
    xpGrants: [{ skill: 'luck', amount: 24 }],
    uiDescription: 'death clock. huge hit soon or you pay.',
    uiClassName: 'battle-screen__move--sealed-fate',
    playerLogLine: () => 'sealed fate marked.',
  }),
}

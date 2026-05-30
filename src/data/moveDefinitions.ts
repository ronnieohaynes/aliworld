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
} from './moveBalance'
import type { PlayerMoveId } from './moveIds'
import { unlockLevelForRung } from './moveUnlock'
import type { MoveDefinition } from './moveTypes'

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
      { skill: 'attack', amount: (r) => r.playerDmg * 4 },
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
    uiDescription: 'wild sweep. bleed on crit. always hits something.',
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
      { skill: 'speed', amount: (r) => (r.dodged ? 10 : 5) },
      { skill: 'luck', amount: (r) => (r.dodged && r.playerDmg > 0 ? 10 : 5) },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'dodge and counter. break their rhythm.',
    uiClassName: 'battle-screen__move--slip',
    playerLogLine: (r) => {
      const name = r.displayName.toLowerCase()
      if (r.dodged) {
        return `you slipped it. counter for ${r.playerDmg}.${r.stunApplied ? ` ${name} reels.` : ''}`
      }
      return `you slipped nothing. ${r.playerDmg}.`
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
      { skill: 'speed', amount: (r) => (r.dodged ? 9 : 4) },
      { skill: 'defense', amount: 3 },
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
      { skill: 'speed', amount: 8 },
      { skill: 'luck', amount: 3 },
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
      { skill: 'speed', amount: 7 },
      { skill: 'attack', amount: (r) => r.playerDmg * 2 },
    ],
    uiDescription: 'mirror their last hit back.',
    uiClassName: 'battle-screen__move--refract',
    playerLogLine: (r) =>
      `refract. ${r.playerDmg} mirrored.`,
  }),

  HYPERDRIVE: def({
    id: 'HYPERDRIVE',
    displayName: 'HYPERDRIVE',
    skill: 'speed',
    ladderRung: 5,
    cost: { kind: 'rechargeTurn' },
    behavior: { kind: 'hyperdrive' },
    onResolve: [],
    xpGrants: [{ skill: 'speed', amount: 14 }],
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
      {
        skill: 'defense',
        amount: (r) => (r.enemyAttacks && r.incoming > 0 ? r.incoming * 4 : 3),
      },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'brace. take less. set your feet.',
    uiClassName: 'battle-screen__move--hold',
    playerLogLine: (r) => {
      if (r.enemyAttacks) return `you braced. ${r.incoming} chip.`
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
      { skill: 'defense', amount: 8 },
      { skill: 'hp', amount: 3 },
    ],
    uiDescription: 'brace and shrug off status this turn.',
    uiClassName: 'battle-screen__move--anchor',
    playerLogLine: (r) =>
      r.enemyAttacks
        ? `anchored. ${r.incoming} chip. status blocked.`
        : 'anchored. nothing lands.',
  }),

  COUNTERWEIGHT: def({
    id: 'COUNTERWEIGHT',
    displayName: 'COUNTERWEIGHT',
    skill: 'defense',
    ladderRung: 3,
    cost: { kind: 'none' },
    behavior: {
      kind: 'counterweight',
      blockPct: { min: 0.5, max: 0.8 },
      reflectChance: 0.35,
      reflectPct: { min: 0.02, max: 0.1 },
    },
    onResolve: [],
    xpGrants: [{ skill: 'defense', amount: 10 }],
    uiDescription: 'block heavy. chance to send some back.',
    uiClassName: 'battle-screen__move--counterweight',
    playerLogLine: () => 'counterweight set.',
  }),

  BRICK_WALL: def({
    id: 'BRICK_WALL',
    displayName: 'BRICK WALL',
    skill: 'defense',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: { kind: 'brick-wall' },
    onResolve: [],
    xpGrants: [{ skill: 'defense', amount: 11 }],
    uiDescription: 'nullify the next hit entirely.',
    uiClassName: 'battle-screen__move--brick-wall',
    playerLogLine: () => 'brick wall up.',
  }),

  INVINCIBLE: def({
    id: 'INVINCIBLE',
    displayName: 'INVINCIBLE',
    skill: 'defense',
    ladderRung: 5,
    cost: { kind: 'oncePerBattle' },
    behavior: { kind: 'invincible' },
    onResolve: [],
    xpGrants: [{ skill: 'defense', amount: 15 }],
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
      { skill: 'luck', amount: 4 },
      { skill: 'hp', amount: 2 },
    ],
    uiDescription: 'rattle them. soften their next hit.',
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
      { skill: 'luck', amount: 7 },
      { skill: 'attack', amount: (r) => r.playerDmg * 2 },
    ],
    uiDescription: 'make them repeat their last move.',
    uiClassName: 'battle-screen__move--loop',
    playerLogLine: (r) =>
      `loop. ${r.playerDmg}. they repeat themselves.`,
  }),

  SNAG: def({
    id: 'SNAG',
    displayName: 'SNAG',
    skill: 'luck',
    ladderRung: 3,
    cost: { kind: 'none' },
    behavior: { kind: 'snag' },
    onResolve: [],
    xpGrants: [{ skill: 'luck', amount: 10 }],
    uiDescription: 'steal one of their moves for this fight.',
    uiClassName: 'battle-screen__move--snag',
    playerLogLine: (r) =>
      `snag. ${r.playerDmg}. their move is yours now.`,
  }),

  PHENOMENA: def({
    id: 'PHENOMENA',
    displayName: 'PHENOMENA',
    skill: 'luck',
    ladderRung: 4,
    cost: { kind: 'none' },
    behavior: { kind: 'phenomena' },
    onResolve: [],
    xpGrants: [{ skill: 'luck', amount: 8 }],
    uiDescription: 'pure rng from the known pool.',
    uiClassName: 'battle-screen__move--phenomena',
    playerLogLine: (r) => r.phenomenaLine ?? 'phenomena.',
  }),

  SEALED_FATE: def({
    id: 'SEALED_FATE',
    displayName: 'SEALED FATE',
    skill: 'luck',
    ladderRung: 5,
    cost: { kind: 'none' },
    behavior: { kind: 'sealed-fate' },
    onResolve: [],
    xpGrants: [{ skill: 'luck', amount: 12 }],
    uiDescription: 'death clock. huge hit soon or you pay.',
    uiClassName: 'battle-screen__move--sealed-fate',
    playerLogLine: () => 'sealed fate marked.',
  }),
}

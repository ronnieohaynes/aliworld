import type { MoveCost, StatusApplySpec, StatusEffectId } from './combatTypes'
import type { SkillId } from '../store/skillStore'
import type { PlayerMoveId } from './moveIds'

export type { MoveCost, StatusApplySpec, StatusEffectId } from './combatTypes'

export type MoveSkill = 'attack' | 'speed' | 'defense' | 'luck'

export type MoveCrit = {
  base: number
  lckMult: number
  damageMult: number
  /** Extra independent crit rolls (fury sweep = 2). */
  extraCritRolls?: number
  onCrit: StatusEffectId[]
  /** Bleed only when crit succeeds (fury sweep). */
  bleedOnCritOnly?: boolean
  bleedTurns?: { min: number; max: number }
}

export type MoveDamageProfile = {
  damageMult: number
  openingBonusMult?: number
  crit?: MoveCrit
  takeEnemyHit?: boolean
  damageFloor?: number
}

export type MoveDodgeProfile = {
  counterMult: number
  weakMult: number
  stunChance: { base: number; lckMult: number }
  /** Parry, reflect this fraction of enemy hit back on successful dodge. */
  onDodgeReflectPct?: number
}

export type MoveBraceProfile = {
  incomingMult: number
  /** Anchor, immune to new status effects this turn. */
  blockStatus?: boolean
}

export type MoveBehavior =
  | { kind: 'damage'; profile: MoveDamageProfile }
  | { kind: 'fury-sweep'; profile: MoveDamageProfile }
  | { kind: 'dodge'; profile: MoveDodgeProfile }
  | { kind: 'brace'; profile: MoveBraceProfile }
  | { kind: 'dark-break'; profile: MoveDamageProfile; accuracyMult: number; accuracyTurns: { min: number; max: number } }
  | { kind: 'cannon'; profile: MoveDamageProfile; defShatterChance: number }
  | { kind: 'blackout' }
  | { kind: 'gravity-shift'; slowTurns: { min: number; max: number } }
  | { kind: 'refract' }
  | { kind: 'hyperdrive' }
  | { kind: 'counterweight'; blockPct: { min: number; max: number }; reflectChance: number; reflectPct: { min: number; max: number } }
  | { kind: 'brick-wall' }
  | { kind: 'invincible' }
  | { kind: 'loop' }
  | { kind: 'snag' }
  | { kind: 'phenomena' }
  | { kind: 'sealed-fate' }
  | { kind: 'second-wind' }
  | { kind: 'devils-cut' }

export type MoveXpContext = {
  pMove: PlayerMoveId
  playerDmg: number
  incoming: number
  rawIncoming: number
  damageBlocked: number
  damageAvoided: number
  dodged: boolean
  braced: boolean
  crit: boolean
  enemyAttacks: boolean
  shakeApplied: boolean
  bleedApplied: boolean
  stunApplied: boolean
  slowApplied: boolean
  missApplied: boolean
  doubleApplied: boolean
  reflectApplied: boolean
  healApplied: number
}

export type MoveXpGrant = {
  skill: SkillId
  amount: number | ((r: MoveXpContext) => number)
}

export type PlayerLogContext = {
  pMove: PlayerMoveId
  playerDmg: number
  incoming: number
  /** Raw enemy strike before player mitigation, for honest dodge/brace lines. */
  rawIncoming: number
  crit: boolean
  dodged: boolean
  braced: boolean
  stunApplied: boolean
  enemyAttacks: boolean
  enemyStunned: boolean
  displayName: string
  phenomenaLine?: string
  healApplied?: number
}

export type PlayerMoveResolveOut = {
  playerDmg: number
  crit: boolean
  incoming: number
  dodged: boolean
  braced: boolean
  stunApplied: boolean
  shakeApplied: boolean
  bleedApplied: boolean
  slowApplied: boolean
  missApplied: boolean
  doubleApplied: boolean
  reflectApplied: boolean
  perfectGuardBonus?: boolean
  /** Optional status overrides from cross-scale (bleed/slow/shake). */
  bleedTurns?: number
  bleedPotencyMult?: number
  slowTurns?: number
  shakePotency?: number
  /** HOLD chip / brace side damage (not incoming). */
  braceChipDmg?: number
}

export type MoveDefinition = {
  id: PlayerMoveId
  displayName: string
  skill: MoveSkill
  ladderRung: 1 | 2 | 3 | 4 | 5 | 6
  unlockAtSkillLevel: number
  cost: MoveCost
  behavior: MoveBehavior
  onResolve: StatusApplySpec[]
  xpGrants: MoveXpGrant[]
  playerLogLine: (ctx: PlayerLogContext) => string
  uiDescription: string
  uiClassName: string
}

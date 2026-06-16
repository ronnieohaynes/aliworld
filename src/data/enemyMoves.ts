import type { StatusApplySpec } from './combatTypes'
import { ENEMY_LOOP_STRIKE_MULT } from './moveBalance'

/** Enemy move ids, shared pool for all NPCs (snag steals from this set). */
export const ENEMY_MOVE_IDS = [
  'STRIKE',
  'LOOP',
  'HAYMAKER',
  'SLIP',
  'WHISPER',
  'HOLD',
  'BAIT',
] as const
export type EnemyMoveId = (typeof ENEMY_MOVE_IDS)[number]

export type UpcomingMove = EnemyMoveId | 'STUNNED'

export type EnemyMoveSkillType = 'attack' | 'speed' | 'defense' | 'luck' | 'neutral'

/**
 * Same conceptual shape as player MoveDefinition, side, telegraph, damage, statuses.
 * Enemy moves do not award XP or use skill ladders.
 */
export type EnemyMoveDefinition = {
  id: EnemyMoveId
  displayName: string
  telegraphLine: string
  isAttacking: boolean
  /** Which skill type this move belongs to, used for telegraph color. */
  skillType: EnemyMoveSkillType
  /** Multiplier on NPC atk when this move strikes. */
  damageMult: number
  onResolve: StatusApplySpec[]
}

export const ENEMY_MOVES: Record<EnemyMoveId, EnemyMoveDefinition> = {
  STRIKE: {
    id: 'STRIKE',
    displayName: 'STRIKE',
    telegraphLine: 'lines up a strike.',
    isAttacking: true,
    skillType: 'attack',
    damageMult: 1,
    onResolve: [],
  },
  LOOP: {
    id: 'LOOP',
    displayName: 'LOOP',
    telegraphLine: 'draws back, a heavy loop is coming.',
    isAttacking: true,
    skillType: 'attack',
    damageMult: ENEMY_LOOP_STRIKE_MULT,
    onResolve: [],
  },
  HAYMAKER: {
    id: 'HAYMAKER',
    displayName: 'HAYMAKER',
    telegraphLine: 'winds up, HAYMAKER incoming.',
    isAttacking: true,
    skillType: 'attack',
    damageMult: ENEMY_LOOP_STRIKE_MULT,
    onResolve: [],
  },
  SLIP: {
    id: 'SLIP',
    displayName: 'SLIP',
    telegraphLine: 'feints a slip to your blind side.',
    isAttacking: true,
    skillType: 'speed',
    damageMult: 0.7,
    onResolve: [],
  },
  WHISPER: {
    id: 'WHISPER',
    displayName: 'WHISPER',
    telegraphLine: 'murmurs something that crawls under your skin.',
    isAttacking: false,
    skillType: 'luck',
    damageMult: 0,
    onResolve: [],
  },
  HOLD: {
    id: 'HOLD',
    displayName: 'HOLD',
    telegraphLine: 'plants his feet and braces.',
    isAttacking: false,
    skillType: 'defense',
    damageMult: 0,
    onResolve: [],
  },
  BAIT: {
    id: 'BAIT',
    displayName: 'BAIT',
    telegraphLine: 'invites you in, waiting for you to swing.',
    isAttacking: false,
    skillType: 'speed',
    damageMult: 0,
    onResolve: [],
  },
}

export const ATTACKING_ENEMY_MOVES: ReadonlySet<EnemyMoveId> = new Set(
  ENEMY_MOVE_IDS.filter((id) => ENEMY_MOVES[id].isAttacking),
)

const SKILL_TYPE_COLOR: Record<EnemyMoveSkillType, string> = {
  attack: '#cc4444',
  speed: '#44cc66',
  defense: '#4488cc',
  luck: '#c084fc',
  neutral: '#e8c878',
}

export function enemyMoveSkillColor(id: EnemyMoveId): string {
  return SKILL_TYPE_COLOR[ENEMY_MOVES[id].skillType]
}

export function getEnemyMoveDef(id: EnemyMoveId): EnemyMoveDefinition {
  return ENEMY_MOVES[id]
}

export function isAttackingEnemyMove(id: EnemyMoveId): boolean {
  return ENEMY_MOVES[id].isAttacking
}

export function telegraphLineForEnemyMove(id: EnemyMoveId): string {
  return ENEMY_MOVES[id].telegraphLine
}

export function computeEnemyStrikeDamage(eAtk: number, def: EnemyMoveDefinition): number {
  if (!def.isAttacking) return 0
  return Math.floor(eAtk * def.damageMult)
}

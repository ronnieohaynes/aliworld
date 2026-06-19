import { applyStatusToCombat, rollBleedTurns, type CombatStatusState } from './combatStatus'
import { STATUS_DEFAULT_TURNS } from './combatTypes'
import { ENEMY_SHAKE_OUTGOING_MULT } from './moveBalance'
import { getEnemyMoveDef, type EnemyMoveId, type UpcomingMove } from './enemyMoves'
import { MOVES } from './moveDefinitions'
import {
  DEFAULT_EQUIPPED_MOVES,
  MOVE_SKILL_LADDERS,
  PLAYER_MOVE_IDS,
  type PlayerMoveId,
} from './moveIds'
import {
  applyMoveBehavior,
  applyStolenEnemyMove,
  type PlayerMoveResolveOut,
  type PostResolveEffects,
  type ResolveMoveContext,
} from './moveResolver'
import type { SkillsState, SkillId } from '../store/skillStore'
import type { MoveXpContext } from './moveTypes'

export type {
  MoveCost,
  StatusApplySpec,
  StatusEffectId,
  MoveDefinition,
  MoveSkill,
  MoveXpContext,
  PlayerLogContext,
  PlayerMoveResolveOut,
} from './moveTypes'
export {
  DEFAULT_EQUIPPED_MOVES,
  MOVE_SKILL_LADDERS,
  PLAYER_MOVE_IDS,
  type PlayerMoveId,
}
export { LADDER_RUNG_UNLOCK_LEVEL, unlockLevelForRung } from './moveUnlock'
export { BLACKOUT_INTERRUPTIBLE } from './moveBalance'
export {
  applyMoveBehavior,
  applyStolenEnemyMove,
  type PostResolveEffects,
  type ResolveMoveContext,
}

export function getMoveDef(id: PlayerMoveId) {
  return MOVES[id]
}

export function isMoveUnlocked(
  id: PlayerMoveId,
  skills: Pick<SkillsState, 'attack' | 'speed' | 'defense' | 'luck'>,
): boolean {
  const move = MOVES[id]
  return skills[move.skill].level >= move.unlockAtSkillLevel
}

export function getUnlockedMoves(
  skills: Pick<SkillsState, 'attack' | 'speed' | 'defense' | 'luck'>,
): PlayerMoveId[] {
  return PLAYER_MOVE_IDS.filter((id) => isMoveUnlocked(id, skills))
}

export type ApplyPlayerMoveContext = ResolveMoveContext

export function applyPlayerMoveFromDef(
  def: ReturnType<typeof getMoveDef>,
  ctx: ResolveMoveContext,
  out: PlayerMoveResolveOut,
): PostResolveEffects {
  return applyMoveBehavior(def, ctx, out)
}

export function mergeResolveIntoCombatStatus(
  status: CombatStatusState,
  out: PlayerMoveResolveOut,
  blockStatus: boolean,
): CombatStatusState {
  if (blockStatus) return status
  let next = status
  if (out.shakeApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: 'shake',
        turns: out.shakePotency != null ? STATUS_DEFAULT_TURNS.shake : undefined,
      },
      'enemy',
    )
    if (out.shakePotency != null) {
      next = {
        ...next,
        enemyShakePotency: Math.max(
          0.05,
          ENEMY_SHAKE_OUTGOING_MULT - out.shakePotency,
        ),
      }
    }
  }
  if (out.bleedApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: 'bleed',
        turns: out.bleedTurns ?? rollBleedTurns(),
      },
      'enemy',
    )
    if (out.bleedPotencyMult != null) {
      next = { ...next, enemyBleedPotencyMult: out.bleedPotencyMult }
    }
  }
  if (out.stunApplied) next = applyStatusToCombat(next, 'stun', 'enemy')
  if (out.braced) next = applyStatusToCombat(next, 'brace', 'player')
  if (out.slowApplied) {
    next = applyStatusToCombat(
      next,
      {
        effect: 'slow',
        turns: out.slowTurns ?? STATUS_DEFAULT_TURNS.slow,
      },
      'enemy',
    )
  }
  if (out.missApplied) next = applyStatusToCombat(next, 'miss', 'enemy')
  if (out.doubleApplied) next = applyStatusToCombat(next, 'double', 'player')
  if (out.reflectApplied) next = applyStatusToCombat(next, 'reflect', 'player')
  return next
}

export function mergeEnemyMoveIntoCombatStatus(
  status: CombatStatusState,
  eMove: UpcomingMove,
  blockStatus: boolean,
): CombatStatusState {
  if (blockStatus || eMove === 'STUNNED') return status
  const def = getEnemyMoveDef(eMove as EnemyMoveId)
  let next = status
  for (const spec of def.onResolve) {
    next = applyStatusToCombat(next, spec, 'player')
  }
  return next
}

export type EnemyStatusOnPlayerFlags = {
  playerShakeApplied: boolean
  playerBleedApplied: boolean
  playerStunApplied: boolean
  playerSlowApplied: boolean
  playerMissApplied: boolean
}

/** Flags for battle feedback when an enemy move applies status to the player. */
export function previewEnemyStatusOnPlayer(
  eMove: UpcomingMove,
  blockStatus: boolean,
): EnemyStatusOnPlayerFlags {
  const flags: EnemyStatusOnPlayerFlags = {
    playerShakeApplied: false,
    playerBleedApplied: false,
    playerStunApplied: false,
    playerSlowApplied: false,
    playerMissApplied: false,
  }
  if (blockStatus || eMove === 'STUNNED') return flags
  const def = getEnemyMoveDef(eMove as EnemyMoveId)
  for (const spec of def.onResolve) {
    const effect = typeof spec === 'string' ? spec : spec.effect
    if (effect === 'shake') flags.playerShakeApplied = true
    if (effect === 'bleed') flags.playerBleedApplied = true
    if (effect === 'stun') flags.playerStunApplied = true
    if (effect === 'slow') flags.playerSlowApplied = true
    if (effect === 'miss') flags.playerMissApplied = true
  }
  return flags
}

export function playerLogLineForMove(
  r: import('./moveTypes').PlayerLogContext,
): string {
  return getMoveDef(r.pMove).playerLogLine(r)
}

export function xpGrantsForMove(r: MoveXpContext): { skill: SkillId; amount: number }[] {
  const def = getMoveDef(r.pMove)
  return def.xpGrants.map((grant) => ({
    skill: grant.skill,
    amount: typeof grant.amount === 'function' ? grant.amount(r) : grant.amount,
  }))
}

import type { MoveSkill } from './moveTypes'
import { crossScaleUiLabel, crossScaleUiParts } from './moveBalance'

const SKILL_MOVE_COLOR_CLASS: Record<MoveSkill, string> = {
  attack: 'battle-screen__move--strike',
  speed: 'battle-screen__move--slip',
  defense: 'battle-screen__move--hold',
  luck: 'battle-screen__move--whisper',
}

export function getMoveUiMeta(id: PlayerMoveId) {
  const m = MOVES[id]
  if (!m) {
    return {
      move: id,
      label: String(id),
      description: '',
      className: '',
      scaleLabel: null,
      scaleParts: null,
    }
  }
  return {
    move: id,
    label: m.displayName,
    description: m.uiDescription,
    className: SKILL_MOVE_COLOR_CLASS[m.skill],
    scaleLabel: crossScaleUiLabel(id),
    scaleParts: crossScaleUiParts(id),
  }
}

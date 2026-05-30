import { applyStatusToCombat, type CombatStatusState } from './combatStatus'
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
  if (out.shakeApplied) next = applyStatusToCombat(next, 'shake')
  if (out.bleedApplied) next = applyStatusToCombat(next, 'bleed')
  if (out.stunApplied) next = applyStatusToCombat(next, 'stun')
  if (out.braced) next = applyStatusToCombat(next, 'brace')
  if (out.slowApplied) next = applyStatusToCombat(next, 'slow')
  if (out.missApplied) next = applyStatusToCombat(next, 'miss')
  if (out.doubleApplied) next = applyStatusToCombat(next, 'double')
  if (out.reflectApplied) next = applyStatusToCombat(next, 'reflect')
  return next
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

export function getMoveUiMeta(id: PlayerMoveId) {
  const m = MOVES[id]
  return {
    move: id,
    label: m.displayName,
    description: m.uiDescription,
    className: m.uiClassName,
  }
}

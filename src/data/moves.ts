import type { StatusApplySpec } from './combatTypes'
import { applyStatusToCombat, rollBleedTurns, statusTargetFor, type CombatStatusState } from './combatStatus'
import { STATUS_DEFAULT_TURNS } from './combatTypes'
import { ENEMY_SHAKE_OUTGOING_MULT } from './moveBalance'
import { ENEMY_MOVES, type EnemyMoveId, type UpcomingMove } from './enemyMoves'
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
import { getMoveLogDisplayName } from '../game/moveHighlightColors'

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

/** onResolve specs for an enemy telegraph move (legacy pool or unified PlayerMoveId). */
function enemyMoveOnResolveSpecs(eMove: UpcomingMove): StatusApplySpec[] {
  if (eMove === 'STUNNED') return []
  const legacy = ENEMY_MOVES[eMove as EnemyMoveId]
  if (legacy) return legacy.onResolve
  return MOVES[eMove as PlayerMoveId]?.onResolve ?? []
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
  let next = status
  for (const spec of enemyMoveOnResolveSpecs(eMove)) {
    const effect = typeof spec === 'string' ? spec : spec.effect
    const playerActorTarget = statusTargetFor(effect)
    const enemyActorTarget = playerActorTarget === 'enemy' ? 'player' : 'enemy'
    next = applyStatusToCombat(next, spec, enemyActorTarget)
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
  for (const spec of enemyMoveOnResolveSpecs(eMove)) {
    const effect = typeof spec === 'string' ? spec : spec.effect
    if (effect === 'shake') flags.playerShakeApplied = true
    if (effect === 'bleed') flags.playerBleedApplied = true
    if (effect === 'stun') flags.playerStunApplied = true
    if (effect === 'slow') flags.playerSlowApplied = true
    if (effect === 'miss') flags.playerMissApplied = true
  }
  return flags
}

const PLAYER_INCOMING_DEFENSE_KINDS = new Set([
  'brace',
  'dodge',
  'brick-wall',
  'counterweight',
  'invincible',
])

export type DefensiveBlockLogContext = {
  pMove: PlayerMoveId
  eMove: UpcomingMove
  playerActed: boolean
  playerDmg: number
  incoming: number
  rawIncoming: number
  dodged: boolean
  braced: boolean
  damageBlocked: number
  damageAvoided: number
  enemyDodged: boolean
  enemyBraced: boolean
  enemyDamageBlocked: number
  stunApplied: boolean
}

function playerIncomingDefenseKind(pMove: PlayerMoveId): string | null {
  const kind = getMoveDef(pMove).behavior.kind
  return PLAYER_INCOMING_DEFENSE_KINDS.has(kind) ? kind : null
}

function enemyOutgoingDefenseKind(eMove: UpcomingMove): 'brace' | 'dodge' | null {
  if (eMove === 'STUNNED') return null
  const def = MOVES[eMove as PlayerMoveId]
  if (!def) return null
  const kind = def.behavior.kind
  return kind === 'brace' || kind === 'dodge' ? kind : null
}

/** Player used a defensive move that blocked or mitigated the enemy's hit. */
export function playerDefendedAgainstIncoming(r: DefensiveBlockLogContext): boolean {
  if (!r.playerActed || r.rawIncoming <= 0 || r.eMove === 'STUNNED') return false
  if (!playerIncomingDefenseKind(r.pMove)) return false
  return (
    r.dodged ||
    r.braced ||
    r.damageBlocked > 0 ||
    r.damageAvoided > 0
  )
}

/** Enemy used HOLD/ANCHOR/SLIP/PARRY-style defense against the player's hit. */
export function enemyDefendedAgainstOutgoing(r: DefensiveBlockLogContext): boolean {
  if (!r.playerActed || r.eMove === 'STUNNED') return false
  if (!enemyOutgoingDefenseKind(r.eMove)) return false
  return r.enemyDodged || r.enemyBraced || r.enemyDamageBlocked > 0
}

export function combinedPlayerDefenseLogLine(
  r: DefensiveBlockLogContext,
  displayName: string,
): string {
  const lower = displayName.toLowerCase()
  const enemyMove = getMoveLogDisplayName(r.eMove)
  const playerMove = getMoveLogDisplayName(r.pMove)
  const prefix = `${lower}'s ${enemyMove} vs ${playerMove}.`

  if (r.dodged) {
    if (r.pMove === 'SLIP') {
      return `${prefix} counter for ${r.playerDmg}.${r.stunApplied ? ` ${lower} reels.` : ''}`
    }
    if (r.pMove === 'PARRY') {
      return `${prefix} ${r.playerDmg} back.`
    }
    return `${prefix} dodged.${r.playerDmg > 0 ? ` ${r.playerDmg} back.` : ''}`
  }

  if (r.pMove === 'ANCHOR') {
    if (r.incoming > 0) return `${prefix} ${r.incoming} chip. status blocked.`
    return `${prefix} blocked.`
  }

  if (r.braced || r.pMove === 'HOLD') {
    if (r.incoming > 0) return `${prefix} ${r.incoming} chip.`
    return `${prefix} blocked.`
  }

  if (r.incoming > 0) return `${prefix} ${r.incoming} taken.`
  return `${prefix} blocked.`
}

export function combinedEnemyDefenseLogLine(
  r: DefensiveBlockLogContext,
  displayName: string,
): string {
  const lower = displayName.toLowerCase()
  const playerMove = getMoveLogDisplayName(r.pMove)
  const enemyMove = getMoveLogDisplayName(r.eMove)
  const prefix = `${playerMove} vs ${lower}'s ${enemyMove}.`

  if (r.enemyDodged && r.playerDmg === 0) return `${prefix} whiff.`
  return `${prefix} ${r.playerDmg}.`
}

export function combinedGuardCounterLogLine(
  r: DefensiveBlockLogContext,
  displayName: string,
  playerHit: number,
): string {
  const lower = displayName.toLowerCase()
  const playerMove = getMoveLogDisplayName(r.pMove)
  const enemyMove = getMoveLogDisplayName(r.eMove)
  return `${playerMove} vs ${lower}'s ${enemyMove}. counters. ${playerHit}.`
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

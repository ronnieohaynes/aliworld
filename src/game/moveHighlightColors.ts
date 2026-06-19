import { MOVES } from '../data/moveDefinitions'
import {
  ENEMY_MOVE_IDS,
  ENEMY_MOVES,
  enemyMoveSkillColor,
  type EnemyMoveId,
} from '../data/enemyMoves'
import { PLAYER_MOVE_IDS, type PlayerMoveId } from '../data/moveIds'
import type { MoveSkill } from '../data/moveTypes'

export const SKILL_TYPE_COLOR: Record<MoveSkill | 'neutral', string> = {
  attack: '#cc4444',
  speed: '#44cc66',
  defense: '#4488cc',
  luck: '#c084fc',
  neutral: '#e8c878',
}

export type BattleMoveId = PlayerMoveId | EnemyMoveId

const ENEMY_ONLY_MOVE_IDS = ENEMY_MOVE_IDS.filter(
  (id): id is EnemyMoveId => !(PLAYER_MOVE_IDS as readonly string[]).includes(id),
)

/** Extra lowercase log phrases keyed by move id (playerLogLine text ≠ displayName). */
const LOG_ALIASES: Partial<Record<BattleMoveId, readonly string[]>> = {
  ANCHOR: ['anchored'],
  HOLD: ['braced'],
}

/** One highlight color per move id; player registry wins for ids shared with enemies. */
export function moveHighlightColor(moveId: BattleMoveId): string {
  const player = MOVES[moveId as PlayerMoveId]
  if (player) return SKILL_TYPE_COLOR[player.skill] ?? SKILL_TYPE_COLOR.neutral
  const enemy = ENEMY_MOVES[moveId as EnemyMoveId]
  if (enemy) return enemyMoveSkillColor(enemy.id)
  return SKILL_TYPE_COLOR.neutral
}

export function getMoveLogDisplayName(moveId: string): string {
  const player = MOVES[moveId as PlayerMoveId]
  if (player) return player.displayName
  const enemy = ENEMY_MOVES[moveId as EnemyMoveId]
  if (enemy) return enemy.displayName
  return moveId
}

function collectMoveAliases(moveId: BattleMoveId): string[] {
  const aliases = new Set<string>()
  const player = MOVES[moveId as PlayerMoveId]
  if (player) aliases.add(player.displayName.toLowerCase())
  const enemy = ENEMY_MOVES[moveId as EnemyMoveId]
  if (enemy) aliases.add(enemy.displayName.toLowerCase())
  for (const alias of LOG_ALIASES[moveId] ?? []) {
    aliases.add(alias.toLowerCase())
  }
  return [...aliases]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildMoveLogHighlightPatterns(): { pattern: RegExp; color: string }[] {
  const aliasOwner = new Map<string, BattleMoveId>()

  for (const moveId of PLAYER_MOVE_IDS) {
    for (const alias of collectMoveAliases(moveId)) {
      if (!aliasOwner.has(alias)) aliasOwner.set(alias, moveId)
    }
  }

  for (const moveId of ENEMY_ONLY_MOVE_IDS) {
    for (const alias of collectMoveAliases(moveId)) {
      if (!aliasOwner.has(alias)) aliasOwner.set(alias, moveId)
    }
  }

  const patterns = [...aliasOwner.entries()].map(([alias, moveId]) => ({
    alias,
    color: moveHighlightColor(moveId),
    pattern: new RegExp(`(?<![a-z])${escapeRegExp(alias)}(?![a-z])`, 'gi'),
  }))

  patterns.sort((a, b) => b.alias.length - a.alias.length)
  return patterns.map(({ pattern, color }) => ({ pattern, color }))
}

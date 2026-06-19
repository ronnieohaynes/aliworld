import type { BuildLoopSkill } from './buildName'
import type { PlayerMoveId } from './moveIds'

/**
 * Static archetype → enemy moveset mapping (Phase A flavoring).
 * Reusable for gym leaders and future AI — not ghost-only throwaway.
 */
export const ARCHETYPE_ENEMY_MOVES: Record<BuildLoopSkill | 'balanced', readonly PlayerMoveId[]> = {
  attack: ['STRIKE', 'STRIKE', 'CANNON', 'LOOP', 'WHISPER'],
  defense: ['HOLD', 'HOLD', 'CANNON', 'STRIKE', 'SLIP'],
  speed: ['SLIP', 'STRIKE', 'WHISPER', 'FURY_SWEEP', 'LOOP'],
  luck: ['WHISPER', 'WHISPER', 'SLIP', 'STRIKE', 'LOOP'],
  balanced: ['STRIKE', 'HOLD', 'SLIP', 'WHISPER', 'CANNON'],
}

export function enemyMovesForBuild(buildType: BuildLoopSkill | null): PlayerMoveId[] {
  const key = buildType ?? 'balanced'
  return [...ARCHETYPE_ENEMY_MOVES[key]]
}

/** Moves that express a lean skill theme (for chooseGhostMove bias). */
export function leanThemedMoves(lean: BuildLoopSkill | 'none'): PlayerMoveId[] {
  switch (lean) {
    case 'attack':
      return ['STRIKE', 'CANNON', 'LOOP']
    case 'defense':
      return ['HOLD', 'CANNON']
    case 'speed':
      return ['SLIP', 'WHISPER']
    case 'luck':
      return ['WHISPER', 'LOOP']
    default:
      return ['STRIKE', 'SLIP', 'HOLD', 'WHISPER']
  }
}

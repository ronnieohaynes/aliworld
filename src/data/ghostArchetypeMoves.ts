import type { BuildLoopSkill } from './buildName'
import type { EnemyMoveId } from './enemyMoves'

/**
 * Static archetype → enemy moveset mapping (Phase A flavoring).
 * Reusable for gym leaders and future AI — not ghost-only throwaway.
 */
export const ARCHETYPE_ENEMY_MOVES: Record<BuildLoopSkill | 'balanced', readonly EnemyMoveId[]> = {
  attack: ['STRIKE', 'STRIKE', 'HAYMAKER', 'LOOP', 'WHISPER'],
  defense: ['HOLD', 'HOLD', 'HAYMAKER', 'STRIKE', 'SLIP'],
  speed: ['SLIP', 'STRIKE', 'WHISPER', 'HAYMAKER', 'LOOP'],
  luck: ['WHISPER', 'WHISPER', 'SLIP', 'STRIKE', 'LOOP'],
  balanced: ['STRIKE', 'HOLD', 'SLIP', 'WHISPER', 'HAYMAKER'],
}

export function enemyMovesForBuild(buildType: BuildLoopSkill | null): EnemyMoveId[] {
  const key = buildType ?? 'balanced'
  return [...ARCHETYPE_ENEMY_MOVES[key]]
}

/** Moves that express a lean skill theme (for chooseGhostMove bias). */
export function leanThemedMoves(lean: BuildLoopSkill | 'none'): EnemyMoveId[] {
  switch (lean) {
    case 'attack':
      return ['STRIKE', 'HAYMAKER', 'LOOP']
    case 'defense':
      return ['HOLD', 'HAYMAKER']
    case 'speed':
      return ['SLIP', 'WHISPER']
    case 'luck':
      return ['WHISPER', 'LOOP']
    default:
      return ['STRIKE', 'SLIP', 'HOLD', 'WHISPER']
  }
}

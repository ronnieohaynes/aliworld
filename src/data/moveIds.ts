/** All 20 player move ids (4 ladders × 5 rungs). */
export const PLAYER_MOVE_IDS = [
  'STRIKE',
  'FURY_SWEEP',
  'DARK_BREAK',
  'CANNON',
  'BLACKOUT',
  'SLIP',
  'PARRY',
  'GRAVITY_SHIFT',
  'REFRACT',
  'HYPERDRIVE',
  'HOLD',
  'ANCHOR',
  'COUNTERWEIGHT',
  'BRICK_WALL',
  'INVINCIBLE',
  'WHISPER',
  'LOOP',
  'SNAG',
  'PHENOMENA',
  'SEALED_FATE',
] as const

export type PlayerMoveId = (typeof PLAYER_MOVE_IDS)[number]

export const DEFAULT_EQUIPPED_MOVES: readonly [
  PlayerMoveId,
  PlayerMoveId,
  PlayerMoveId,
  PlayerMoveId,
] = ['STRIKE', 'SLIP', 'HOLD', 'WHISPER']

export const MOVE_SKILL_LADDERS: Record<
  'attack' | 'speed' | 'defense' | 'luck',
  readonly PlayerMoveId[]
> = {
  attack: ['STRIKE', 'FURY_SWEEP', 'DARK_BREAK', 'CANNON', 'BLACKOUT'],
  speed: ['SLIP', 'PARRY', 'GRAVITY_SHIFT', 'REFRACT', 'HYPERDRIVE'],
  defense: ['HOLD', 'ANCHOR', 'COUNTERWEIGHT', 'BRICK_WALL', 'INVINCIBLE'],
  luck: ['WHISPER', 'LOOP', 'SNAG', 'PHENOMENA', 'SEALED_FATE'],
}

/** All 22 player move ids (attack/speed × 5; defense/luck × 6). */
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
  'SECOND_WIND',
  'COUNTERWEIGHT',
  'BRICK_WALL',
  'INVINCIBLE',
  'WHISPER',
  'LOOP',
  'DEVILS_CUT',
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
  defense: ['HOLD', 'ANCHOR', 'SECOND_WIND', 'COUNTERWEIGHT', 'BRICK_WALL', 'INVINCIBLE'],
  luck: ['WHISPER', 'LOOP', 'DEVILS_CUT', 'SNAG', 'PHENOMENA', 'SEALED_FATE'],
}

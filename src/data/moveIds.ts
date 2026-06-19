/** All player+NPC move ids. HOLD is NPC-only — not in any skill ladder or default loadout. */
export const PLAYER_MOVE_IDS = [
  'STRIKE',
  'FURY_SWEEP',
  'DARK_BREAK',
  'CANNON',
  'BLACKOUT',
  'SLIP',
  'GRAVITY_SHIFT',
  'REFRACT',
  'HYPERDRIVE',
  'HOLD', // NPC-only — kept for type compatibility, not in any player ladder
  'PARRY',
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
] = ['STRIKE', 'SLIP', 'PARRY', 'WHISPER']

export const MOVE_SKILL_LADDERS: Record<
  'attack' | 'speed' | 'defense' | 'luck',
  readonly PlayerMoveId[]
> = {
  attack: ['STRIKE', 'DARK_BREAK', 'CANNON', 'BLACKOUT'],
  speed: ['SLIP', 'FURY_SWEEP', 'GRAVITY_SHIFT', 'REFRACT', 'HYPERDRIVE'],
  defense: ['PARRY', 'ANCHOR', 'SECOND_WIND', 'COUNTERWEIGHT', 'BRICK_WALL', 'INVINCIBLE'],
  luck: ['WHISPER', 'LOOP', 'DEVILS_CUT', 'SNAG', 'PHENOMENA', 'SEALED_FATE'],
}

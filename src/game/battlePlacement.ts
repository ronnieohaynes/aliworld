import {
  WORLD_NPC_DISPLAY_H,
  WORLD_NPC_DISPLAY_W,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from './worldSpriteRender'

/** Battle sprite scale vs overworld display size. */
export const BATTLE_SPRITE_SCALE = 1.2

/** Enemy asphalt line — bottom edge of enemy sprite box (arena coords). */
export const BATTLE_ENEMY_GROUND_Y = 258

/** Player ground line — bottom edge of player sprite box (arena coords). */
export const BATTLE_PLAYER_GROUND_Y = 255

/** @deprecated Use BATTLE_ENEMY_GROUND_Y */
export const BATTLE_GROUND_Y = BATTLE_ENEMY_GROUND_Y

export const BATTLE_ENEMY_X = 36
export const BATTLE_PLAYER_X = 228

export const BATTLE_ENEMY_DISPLAY_W = Math.floor(WORLD_NPC_DISPLAY_W * BATTLE_SPRITE_SCALE)
export const BATTLE_ENEMY_DISPLAY_H = Math.floor(WORLD_NPC_DISPLAY_H * BATTLE_SPRITE_SCALE)

export const BATTLE_PLAYER_DISPLAY_W = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH * BATTLE_SPRITE_SCALE)
export const BATTLE_PLAYER_DISPLAY_H = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT * BATTLE_SPRITE_SCALE)

/**
 * Transparent px below visible feet inside the rendered frame.
 * Increase if visible feet float above the ground line; decrease if they sink.
 */
export const BATTLE_ENEMY_FOOT_INSET = 0
export const BATTLE_PLAYER_FOOT_INSET = 0

export function battleDrawY(
  groundY: number,
  displayHeight: number,
  footInset = 0,
): number {
  return groundY - displayHeight + footInset
}

export const BATTLE_ENEMY_DRAW_Y = battleDrawY(
  BATTLE_ENEMY_GROUND_Y,
  BATTLE_ENEMY_DISPLAY_H,
  BATTLE_ENEMY_FOOT_INSET,
)
export const BATTLE_PLAYER_DRAW_Y = battleDrawY(
  BATTLE_PLAYER_GROUND_Y,
  BATTLE_PLAYER_DISPLAY_H,
  BATTLE_PLAYER_FOOT_INSET,
)

export type BattleSpritePlacement = {
  x: number
  drawY: number
  displayWidth: number
  displayHeight: number
  groundY: number
  footInset: number
  facing: 'left' | 'right'
}

export const BATTLE_ENEMY_PLACEMENT: BattleSpritePlacement = {
  x: BATTLE_ENEMY_X,
  drawY: BATTLE_ENEMY_DRAW_Y,
  displayWidth: BATTLE_ENEMY_DISPLAY_W,
  displayHeight: BATTLE_ENEMY_DISPLAY_H,
  groundY: BATTLE_ENEMY_GROUND_Y,
  footInset: BATTLE_ENEMY_FOOT_INSET,
  facing: 'left',
}

export const BATTLE_PLAYER_PLACEMENT: BattleSpritePlacement = {
  x: BATTLE_PLAYER_X,
  drawY: BATTLE_PLAYER_DRAW_Y,
  displayWidth: BATTLE_PLAYER_DISPLAY_W,
  displayHeight: BATTLE_PLAYER_DISPLAY_H,
  groundY: BATTLE_PLAYER_GROUND_Y,
  footInset: BATTLE_PLAYER_FOOT_INSET,
  facing: 'left',
}

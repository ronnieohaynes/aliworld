import {
  WORLD_NPC_DISPLAY_H,
  WORLD_NPC_DISPLAY_W,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from './worldSpriteRender'

/** Battle sprite scale vs overworld display size (enemy). */
export const BATTLE_SPRITE_SCALE = 1.2

/** Shared feet baseline — both fighters align visible feet to this arena Y. */
export const BATTLE_GROUND_Y = 258

/** @deprecated Use BATTLE_GROUND_Y */
export const BATTLE_ENEMY_GROUND_Y = BATTLE_GROUND_Y

/** @deprecated Use BATTLE_GROUND_Y */
export const BATTLE_PLAYER_GROUND_Y = BATTLE_GROUND_Y

export const BATTLE_ENEMY_X = 36
export const BATTLE_PLAYER_X = 198

export const BATTLE_ENEMY_DISPLAY_W = Math.floor(WORLD_NPC_DISPLAY_W * BATTLE_SPRITE_SCALE)
export const BATTLE_ENEMY_DISPLAY_H = Math.floor(WORLD_NPC_DISPLAY_H * BATTLE_SPRITE_SCALE)

/** Player vs enemy BOX multiplier — tuned for VISIBLE-body parity
 *  (enemy idle sheets are padded; player draws tight to the box). */
export const BATTLE_PLAYER_BOX_MULT = 0.9
export const BATTLE_PLAYER_DISPLAY_H = Math.floor(BATTLE_ENEMY_DISPLAY_H * BATTLE_PLAYER_BOX_MULT)
export const BATTLE_PLAYER_DISPLAY_W = Math.floor(
  WORLD_PLAYER_DISPLAY_WIDTH * (BATTLE_PLAYER_DISPLAY_H / WORLD_PLAYER_DISPLAY_HEIGHT),
)

/**
 * Per-sprite drawY tweak so visible feet meet BATTLE_GROUND_Y (source padding differs).
 * Increase to push sprite down; decrease to raise.
 */
export const BATTLE_ENEMY_FOOT_INSET = 6
export const BATTLE_PLAYER_FOOT_INSET = 0

export function battleDrawY(
  groundY: number,
  displayHeight: number,
  footInset = 0,
): number {
  return groundY - displayHeight + footInset
}

export const BATTLE_ENEMY_DRAW_Y = battleDrawY(
  BATTLE_GROUND_Y,
  BATTLE_ENEMY_DISPLAY_H,
  BATTLE_ENEMY_FOOT_INSET,
)
export const BATTLE_PLAYER_DRAW_Y = battleDrawY(
  BATTLE_GROUND_Y,
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
  groundY: BATTLE_GROUND_Y,
  footInset: BATTLE_ENEMY_FOOT_INSET,
  facing: 'left',
}

export const BATTLE_PLAYER_PLACEMENT: BattleSpritePlacement = {
  x: BATTLE_PLAYER_X,
  drawY: BATTLE_PLAYER_DRAW_Y,
  displayWidth: BATTLE_PLAYER_DISPLAY_W,
  displayHeight: BATTLE_PLAYER_DISPLAY_H,
  groundY: BATTLE_GROUND_Y,
  footInset: BATTLE_PLAYER_FOOT_INSET,
  facing: 'left',
}

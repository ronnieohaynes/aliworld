import {
  WORLD_NPC_DISPLAY_H,
  WORLD_NPC_DISPLAY_W,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from './worldSpriteRender'
import type { VisibleBounds } from './spriteBounds'

/** Battle enemy source canvas scale vs overworld NPC display. */
export const BATTLE_SPRITE_SCALE = 1.2

/** Shared feet baseline — visible feet align here via auto-fit. */
export const BATTLE_GROUND_Y = 258

/** @deprecated Use BATTLE_GROUND_Y */
export const BATTLE_ENEMY_GROUND_Y = BATTLE_GROUND_Y

/** @deprecated Use BATTLE_GROUND_Y */
export const BATTLE_PLAYER_GROUND_Y = BATTLE_GROUND_Y

export const BATTLE_ENEMY_X = 36
export const BATTLE_PLAYER_X = 198

/** Target visible body height for enemies (one dial for all NPCs). */
export const BATTLE_TARGET_VISIBLE_H = 150

/** @deprecated Alias for enemy target height — use with battleSizeMult. */
export const BATTLE_ENEMY_DISPLAY_H = BATTLE_TARGET_VISIBLE_H

/** Nudge sprites down so visible feet meet the street line (px). */
export const BATTLE_GROUND_FEET_NUDGE = 3

/** Player protagonist bump over enemy target. */
export const BATTLE_PLAYER_VISIBLE_MULT = 1.05

/** Enemy sprite drawn to this canvas before visible-bounds measure. */
export const BATTLE_ENEMY_SOURCE_W = Math.floor(WORLD_NPC_DISPLAY_W * BATTLE_SPRITE_SCALE)
export const BATTLE_ENEMY_SOURCE_H = Math.floor(WORLD_NPC_DISPLAY_H * BATTLE_SPRITE_SCALE)

export const BATTLE_PLAYER_SOURCE_W = WORLD_PLAYER_DISPLAY_WIDTH
export const BATTLE_PLAYER_SOURCE_H = WORLD_PLAYER_DISPLAY_HEIGHT

export type BattleSpritePlacement = {
  x: number
  drawY: number
  displayWidth: number
  displayHeight: number
  sourceWidth: number
  sourceHeight: number
  groundY: number
  facing: 'left' | 'right'
}

/**
 * Map source pixels → display using one uniform scale derived from visible height.
 * displayH ≈ targetVisibleH (body), not sourceH * scale (which inflates padded frames).
 */
export function layoutSpriteFromVisibleBounds(
  bounds: VisibleBounds,
  sourceW: number,
  sourceH: number,
  groundY: number,
  x: number,
  targetVisibleH: number,
): BattleSpritePlacement {
  const visH = Math.max(1, bounds.visH)
  const bodyScale = targetVisibleH / visH
  const displayH = Math.floor(visH * bodyScale)
  const uniformScale = displayH / sourceH
  const displayW = Math.floor(sourceW * uniformScale)
  const drawY = Math.floor(groundY - bounds.bottom * uniformScale + BATTLE_GROUND_FEET_NUDGE)

  return {
    x,
    drawY,
    displayWidth: displayW,
    displayHeight: displayH,
    sourceWidth: sourceW,
    sourceHeight: sourceH,
    groundY,
    facing: 'left',
  }
}

export const DEFAULT_ENEMY_PLACEMENT: BattleSpritePlacement = layoutSpriteFromVisibleBounds(
  { top: 0, bottom: BATTLE_ENEMY_SOURCE_H - 1, left: 0, right: BATTLE_ENEMY_SOURCE_W - 1, visH: BATTLE_ENEMY_SOURCE_H, visW: BATTLE_ENEMY_SOURCE_W },
  BATTLE_ENEMY_SOURCE_W,
  BATTLE_ENEMY_SOURCE_H,
  BATTLE_GROUND_Y,
  BATTLE_ENEMY_X,
  BATTLE_TARGET_VISIBLE_H,
)

export const DEFAULT_PLAYER_PLACEMENT: BattleSpritePlacement = layoutSpriteFromVisibleBounds(
  { top: 0, bottom: BATTLE_PLAYER_SOURCE_H - 1, left: 0, right: BATTLE_PLAYER_SOURCE_W - 1, visH: BATTLE_PLAYER_SOURCE_H, visW: BATTLE_PLAYER_SOURCE_W },
  BATTLE_PLAYER_SOURCE_W,
  BATTLE_PLAYER_SOURCE_H,
  BATTLE_GROUND_Y,
  BATTLE_PLAYER_X,
  Math.floor(BATTLE_TARGET_VISIBLE_H * BATTLE_PLAYER_VISIBLE_MULT),
)

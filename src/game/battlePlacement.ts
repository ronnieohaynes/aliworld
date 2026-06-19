import {
  WORLD_NPC_DISPLAY_H,
  WORLD_NPC_DISPLAY_W,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from './worldSpriteRender'
import type { VisibleBounds } from './spriteBounds'

/** Battle enemy source canvas scale vs overworld NPC display. */
export const BATTLE_SPRITE_SCALE = 1.2

/** Horizontal nudge for battle fighters (negative = left). */
export const BATTLE_FIGHTER_NUDGE_X = -5

/** Screen point where every enemy's feet land (bottom-center of visible sprite). */
export const BATTLE_ENEMY_FEET = { x: 68, y: 221 } as const

/** Horizontal nudge for the enemy status plate (positive = right). */
export const BATTLE_ENEMY_PLATE_OFFSET_X = 3

/** Screen point where the player's feet land (bottom-center of visible sprite). */
export const BATTLE_PLAYER_FEET = { x: 165 + BATTLE_FIGHTER_NUDGE_X + 10, y: 224 } as const

/** Horizontal nudge for the player status plate (positive = right). */
export const BATTLE_PLAYER_PLATE_OFFSET_X = 3

/** Gap below sprite visible top where the plate anchor sits (enemy and player). */
export const BATTLE_PLATE_VISIBLE_TOP_GAP = 5

/** Fixed arena Y for the bottom edge of the player status plate anchor. */
export const BATTLE_PLAYER_PLATE_BOTTOM_Y = 300

/** Toggle player status plate visibility in battle. */
export const SHOW_BATTLE_PLAYER_PLATE = true

/** Vertical nudge applied to the player fighter container (matches enemy +5). */
export const BATTLE_PLAYER_FIGHTER_NUDGE_Y = 5

/** @deprecated Use BATTLE_ENEMY_FEET.y */
export const BATTLE_GROUND_Y = BATTLE_ENEMY_FEET.y

/** @deprecated Use BATTLE_ENEMY_FEET.y */
export const BATTLE_ENEMY_GROUND_Y = BATTLE_ENEMY_FEET.y

/** @deprecated Use BATTLE_PLAYER_FEET.y */
export const BATTLE_PLAYER_GROUND_Y = BATTLE_PLAYER_FEET.y

/** @deprecated Feet X is derived from BATTLE_ENEMY_FEET, left edge varies per sprite. */
export const BATTLE_ENEMY_X = 36

/** @deprecated Feet X is derived from BATTLE_PLAYER_FEET, left edge varies per sprite. */
export const BATTLE_PLAYER_X = 213

/** Enemy visible height in battle. */
export const BATTLE_TARGET_VISIBLE_H = 125

/** Player visible height, slightly smaller so the perspective reads correctly. */
export const BATTLE_PLAYER_TARGET_VISIBLE_H = 80

/** @deprecated Alias for enemy target height, use with battleSizeMult. */
export const BATTLE_ENEMY_DISPLAY_H = BATTLE_TARGET_VISIBLE_H

/** Player visible height matches enemy target (no protagonist bump). */
export const BATTLE_PLAYER_VISIBLE_MULT = 0.65

/** Enemy sprite drawn to this canvas before visible-bounds measure. */
export const BATTLE_ENEMY_SOURCE_W = Math.floor(WORLD_NPC_DISPLAY_W * BATTLE_SPRITE_SCALE)
export const BATTLE_ENEMY_SOURCE_H = Math.floor(WORLD_NPC_DISPLAY_H * BATTLE_SPRITE_SCALE)

export const BATTLE_PLAYER_SOURCE_W = WORLD_PLAYER_DISPLAY_WIDTH
export const BATTLE_PLAYER_SOURCE_H = WORLD_PLAYER_DISPLAY_HEIGHT

export type BattleSpritePlacement = {
  x: number
  drawY: number
  /** Y of the topmost visible pixel, use this for plate anchoring. */
  visibleDrawY: number
  displayWidth: number
  displayHeight: number
  sourceWidth: number
  sourceHeight: number
  /** Target feet Y on the battle stage (same for all fighters in a slot). */
  feetY: number
  /** Target feet X on the battle stage (same for all fighters in a slot). */
  feetX: number
  facing: 'left' | 'right'
  /** @deprecated Use feetY */
  groundY: number
}

function footAnchorInSource(bounds: VisibleBounds): { x: number; y: number } {
  return {
    x: (bounds.left + bounds.right) / 2,
    y: bounds.bottom,
  }
}

/**
 * Scale sprite to targetVisibleH, then position so visible bottom-center
 * sits exactly on the shared feet anchor for that slot.
 */
export function layoutSpriteAtFeet(
  bounds: VisibleBounds,
  sourceW: number,
  sourceH: number,
  feetX: number,
  feetY: number,
  targetVisibleH: number,
): BattleSpritePlacement {
  const visH = Math.max(1, bounds.visH)
  const bodyScale = targetVisibleH / visH
  const displayH = Math.floor(visH * bodyScale)
  const uniformScale = displayH / sourceH
  const displayW = Math.floor(sourceW * uniformScale)
  const foot = footAnchorInSource(bounds)
  const x = Math.floor(feetX - foot.x * uniformScale)
  const drawY = Math.floor(feetY - foot.y * uniformScale)
  const visibleDrawY = drawY + Math.floor(bounds.top * uniformScale)

  return {
    x,
    drawY,
    visibleDrawY,
    displayWidth: displayW,
    displayHeight: displayH,
    sourceWidth: sourceW,
    sourceHeight: sourceH,
    feetX,
    feetY,
    groundY: feetY,
    facing: 'left',
  }
}

/** @deprecated Use layoutSpriteAtFeet */
export function layoutSpriteFromVisibleBounds(
  bounds: VisibleBounds,
  sourceW: number,
  sourceH: number,
  groundY: number,
  x: number,
  targetVisibleH: number,
  feetNudge: number,
): BattleSpritePlacement {
  const visH = Math.max(1, bounds.visH)
  const bodyScale = targetVisibleH / visH
  const displayH = Math.floor(visH * bodyScale)
  const uniformScale = displayH / sourceH
  const foot = footAnchorInSource(bounds)
  const feetY = groundY + feetNudge
  const feetX = x + foot.x * uniformScale
  return layoutSpriteAtFeet(bounds, sourceW, sourceH, feetX, feetY, targetVisibleH)
}

export const DEFAULT_ENEMY_PLACEMENT: BattleSpritePlacement = layoutSpriteAtFeet(
  {
    top: 0,
    bottom: BATTLE_ENEMY_SOURCE_H - 1,
    left: 0,
    right: BATTLE_ENEMY_SOURCE_W - 1,
    visH: BATTLE_ENEMY_SOURCE_H,
    visW: BATTLE_ENEMY_SOURCE_W,
  },
  BATTLE_ENEMY_SOURCE_W,
  BATTLE_ENEMY_SOURCE_H,
  BATTLE_ENEMY_FEET.x,
  BATTLE_ENEMY_FEET.y,
  BATTLE_TARGET_VISIBLE_H,
)

export const DEFAULT_PLAYER_PLACEMENT: BattleSpritePlacement = layoutSpriteAtFeet(
  {
    top: 0,
    bottom: BATTLE_PLAYER_SOURCE_H - 1,
    left: 0,
    right: BATTLE_PLAYER_SOURCE_W - 1,
    visH: BATTLE_PLAYER_SOURCE_H,
    visW: BATTLE_PLAYER_SOURCE_W,
  },
  BATTLE_PLAYER_SOURCE_W,
  BATTLE_PLAYER_SOURCE_H,
  BATTLE_PLAYER_FEET.x,
  BATTLE_PLAYER_FEET.y,
  Math.floor(BATTLE_TARGET_VISIBLE_H * BATTLE_PLAYER_VISIBLE_MULT),
)

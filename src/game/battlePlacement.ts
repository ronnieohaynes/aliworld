import {
  WORLD_NPC_DISPLAY_H,
  WORLD_NPC_DISPLAY_W,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from './worldSpriteRender'
import type { VisibleBounds } from './spriteBounds'

/** Battle enemy source canvas scale vs overworld NPC display. */
export const BATTLE_SPRITE_SCALE = 1.2

/** Screen point where every enemy's feet land (bottom-center of visible sprite). */
export const BATTLE_ENEMY_FEET = { x: 68, y: 221 } as const

/** Screen point where the player's feet land (bottom-center of visible sprite). */
export const BATTLE_PLAYER_FEET = { x: 288, y: 224 } as const

/** @deprecated Use BATTLE_ENEMY_FEET.y */
export const BATTLE_GROUND_Y = BATTLE_ENEMY_FEET.y

/** @deprecated Use BATTLE_ENEMY_FEET.y */
export const BATTLE_ENEMY_GROUND_Y = BATTLE_ENEMY_FEET.y

/** @deprecated Use BATTLE_PLAYER_FEET.y */
export const BATTLE_PLAYER_GROUND_Y = BATTLE_PLAYER_FEET.y

/** @deprecated Feet X is derived from BATTLE_ENEMY_FEET — left edge varies per sprite. */
export const BATTLE_ENEMY_X = 36

/** @deprecated Feet X is derived from BATTLE_PLAYER_FEET — left edge varies per sprite. */
export const BATTLE_PLAYER_X = 213

/** Target visible body height for enemies (one dial for all NPCs). */
export const BATTLE_TARGET_VISIBLE_H = 150

/** @deprecated Alias for enemy target height — use with battleSizeMult. */
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

  return {
    x,
    drawY,
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

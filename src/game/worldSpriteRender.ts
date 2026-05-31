/**
 * Overworld sprite draw sizes and crop logic — mirrors Player.tsx map rendering.
 * Battle and other scenes import from here so sizing stays consistent with the map.
 */

import {
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
} from '../constants/gameAssets'
import { MIDNIGHT_DEFAULT_RENDER_TUNING } from '../data/midnightVariants'
import type { MidnightVariantRenderTuning } from '../data/midnightVariants'
import { drawSheetFrame, getIdleFrameIndex } from './characterLayers'
import type { Direction, SpriteSheet } from './SpriteSheet'

/** Midnight on-map display height (Player.tsx). */
export const WORLD_PLAYER_DISPLAY_HEIGHT = 72

export const WORLD_PLAYER_DISPLAY_WIDTH = Math.floor(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * WORLD_PLAYER_DISPLAY_HEIGHT,
)

/** NPC idle sprite on-map display size (Player.tsx). */
export const WORLD_NPC_DISPLAY_W = 48
export const WORLD_NPC_DISPLAY_H = 120

/** NPC idle sheet column per facing (Player.tsx). */
export const WORLD_NPC_SPRITE_COL: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

export { getIdleFrameIndex }

export function drawWorldPlayerSprite(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  direction: Direction,
  frameIndex: number,
  dx: number,
  dy: number,
  tuning: MidnightVariantRenderTuning = MIDNIGHT_DEFAULT_RENDER_TUNING,
): void {
  const dw = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH)
  const dh = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT)
  drawSheetFrame(ctx, sheet, direction, frameIndex, dx, dy, dw, dh, 1, tuning)
}

export function drawWorldNpcSprite(
  ctx: CanvasRenderingContext2D,
  spriteImg: CanvasImageSource & { naturalHeight?: number },
  imageWidth: number,
  direction: Direction,
  dx: number,
  dy: number,
  spriteColumns = 4,
): void {
  const cols = spriteColumns
  const frameW = Math.floor(imageWidth / cols)
  const frameH = Math.floor(spriteImg.naturalHeight ?? 0)
  const col = WORLD_NPC_SPRITE_COL[direction]
  const nsx = Math.floor(col * frameW)
  const displayW = Math.floor(WORLD_NPC_DISPLAY_W)
  const displayH = Math.floor(WORLD_NPC_DISPLAY_H)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    spriteImg,
    nsx,
    0,
    frameW,
    frameH,
    Math.floor(dx),
    Math.floor(dy),
    displayW,
    displayH,
  )
}

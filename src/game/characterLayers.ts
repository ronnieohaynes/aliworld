/**
 * Sprite sheet helpers for Midnight and (V2-only) base body tone sheets.
 * Body tone loading/drawing is stubbed out for V1.1 so CustomizationScreen.tsx
 * still compiles but is never active.
 */

import {
  MIDNIGHT_WALK_COLUMNS,
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_ROWS,
  MIDNIGHT_DEFAULT_WALK_SRC,
} from '../constants/gameAssets'
import {
  MIDNIGHT_DEFAULT_RENDER_TUNING,
  type MidnightVariantRenderTuning,
} from '../data/midnightVariants'
import {
  getSkinToneFullSrc,
  getSkinToneIdleSrc,
  getSkinToneWalkSrc,
  type SkinTone,
} from '../store/characterStore'
import {
  BASE_BODY_IDLE_COLUMNS,
  BASE_BODY_IDLE_ROWS,
  BASE_BODY_WALK_COLUMNS,
  BASE_BODY_WALK_FRAMES_PER_DIRECTION,
  BASE_BODY_WALK_ROWS,
  SpriteSheet,
  type Direction,
} from './SpriteSheet'

/* ── Midnight sprite sheet row map ──────────────────────────────── */

const SPRITE_SHEET_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

/* ── Midnight sheet creation / loading ──────────────────────────── */

const SHEET_OPTIONS = {
  framesPerDirection: MIDNIGHT_WALK_FRAMES_PER_DIRECTION,
} as const

function createSheet(src: string): SpriteSheet {
  return new SpriteSheet(
    src,
    MIDNIGHT_WALK_COLUMNS,
    MIDNIGHT_WALK_ROWS,
    MIDNIGHT_WALK_FRAME_WIDTH,
    MIDNIGHT_WALK_FRAME_HEIGHT,
    SHEET_OPTIONS,
  )
}

export function getSheetDrawSource(sheet: SpriteSheet): CanvasImageSource | null {
  return (sheet as unknown as { drawSource: CanvasImageSource | null }).drawSource
}

import { retryAsync } from '../utils/retryAsync'

async function tryLoadSheet(src: string): Promise<SpriteSheet | null> {
  const sheet = createSheet(src)
  try {
    await retryAsync(() => sheet.load())
    return sheet.loaded ? sheet : null
  } catch {
    return null
  }
}

/** Load a single sheet URL with no fallback (e.g. variant select previews). */
export async function loadSpriteSheetPrimary(
  src: string,
): Promise<SpriteSheet | null> {
  return tryLoadSheet(src)
}

export async function loadSpriteSheetWithFallback(
  primarySrc: string,
  fallbackSrc = MIDNIGHT_DEFAULT_WALK_SRC,
): Promise<SpriteSheet | null> {
  const primary = await tryLoadSheet(primarySrc)
  if (primary) return primary
  if (primarySrc === fallbackSrc) return null
  return tryLoadSheet(fallbackSrc)
}

/* ── Midnight draw helpers ──────────────────────────────────────── */

function getRowPadding(direction: Direction, tuning: MidnightVariantRenderTuning): number {
  switch (direction) {
    case 'down':
      return tuning.rowPaddingDown
    case 'up':
      return tuning.rowPaddingUp
    case 'left':
      return tuning.rowPaddingLeft
    case 'right':
      return tuning.rowPaddingRight
  }
}

function getCropHeight(direction: Direction, tuning: MidnightVariantRenderTuning): number {
  switch (direction) {
    case 'down':
      return tuning.cropHeightDown
    case 'up':
      return tuning.cropHeightUp
    case 'left':
      return tuning.cropHeightLeft
    case 'right':
      return tuning.cropHeightRight
  }
}

function getFrameInsetTop(direction: Direction, tuning: MidnightVariantRenderTuning): number {
  switch (direction) {
    case 'down':
      return tuning.frameInsetTopDown
    case 'up':
      return tuning.frameInsetTopUp
    case 'left':
      return tuning.frameInsetTopLeft
    case 'right':
      return tuning.frameInsetTopRight
  }
}

/** Up-facing only: fraction of source crop height trimmed from the top (display dw/dh unchanged). */
export const PLAYER_UP_FACING_TOP_TRIM_RATIO = 0.03

export function getSourceCrop(
  direction: Direction,
  tuning: MidnightVariantRenderTuning = MIDNIGHT_DEFAULT_RENDER_TUNING,
): {
  sx: number
  sy: number
  sw: number
  sh: number
} {
  const rowIndex = SPRITE_SHEET_ROW[direction]
  const rowPad = getRowPadding(direction, tuning)
  const srcH = getCropHeight(direction, tuning)
  let sy = Math.floor(
    rowIndex * MIDNIGHT_WALK_FRAME_HEIGHT + rowPad + getFrameInsetTop(direction, tuning),
  )
  let sh = Math.max(1, Math.floor(srcH - tuning.frameInsetBottom))
  if (direction === 'up') {
    const topTrim = Math.floor(sh * PLAYER_UP_FACING_TOP_TRIM_RATIO)
    sy += topTrim
    sh = Math.max(1, sh - topTrim)
  }
  return {
    sx: 0,
    sy,
    sw: MIDNIGHT_WALK_FRAME_WIDTH,
    sh,
  }
}

export function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  direction: Direction,
  frameIndex: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
  tuning: MidnightVariantRenderTuning = MIDNIGHT_DEFAULT_RENDER_TUNING,
): void {
  const source = getSheetDrawSource(sheet)
  if (!source) return

  const rect = sheet.getFrameRect(direction, frameIndex)
  const crop = getSourceCrop(direction, tuning)
  const sx = Math.floor(rect.sx)
  const sy = Math.floor(crop.sy)
  const sw = Math.floor(rect.sw)
  const sh = Math.floor(crop.sh)

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = alpha
  ctx.drawImage(
    source,
    sx,
    sy,
    sw,
    sh,
    Math.floor(dx),
    Math.floor(dy),
    Math.floor(dw),
    Math.floor(dh),
  )
  ctx.restore()
}

export function getIdleFrameIndex(): number {
  return MIDNIGHT_WALK_IDLE_FRAME
}

/** Thumbnail: front-facing (down row) idle frame, full 256×256 cell — no crop tuning. */
export function drawVariantThumbnailFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const source = getSheetDrawSource(sheet)
  if (!source) return

  const sx = MIDNIGHT_WALK_IDLE_FRAME * MIDNIGHT_WALK_FRAME_WIDTH
  const sy = SPRITE_SHEET_ROW.down * MIDNIGHT_WALK_FRAME_HEIGHT

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    source,
    sx,
    sy,
    MIDNIGHT_WALK_FRAME_WIDTH,
    MIDNIGHT_WALK_FRAME_HEIGHT,
    Math.floor(dx),
    Math.floor(dy),
    Math.floor(dw),
    Math.floor(dh),
  )
  ctx.restore()
}

/* ── V2 body tone stubs (keep CustomizationScreen.tsx compiling) ── */

const BODY_WALK_SHEET_OPTIONS = {
  framesPerDirection: BASE_BODY_WALK_FRAMES_PER_DIRECTION,
  deriveFrameSizeFromImage: true,
} as const

const BODY_IDLE_SHEET_OPTIONS = {
  framesPerDirection: BASE_BODY_IDLE_COLUMNS,
  deriveFrameSizeFromImage: true,
} as const

function createBodyWalkSheet(src: string): SpriteSheet {
  return new SpriteSheet(src, BASE_BODY_WALK_COLUMNS, BASE_BODY_WALK_ROWS, 0, 0, BODY_WALK_SHEET_OPTIONS)
}

function createBodyIdleSheet(src: string): SpriteSheet {
  return new SpriteSheet(src, BASE_BODY_IDLE_COLUMNS, BASE_BODY_IDLE_ROWS, 0, 0, BODY_IDLE_SHEET_OPTIONS)
}

async function tryLoadBodyWalkSheet(src: string): Promise<SpriteSheet | null> {
  const sheet = createBodyWalkSheet(src)
  try { await sheet.load(); return sheet.loaded ? sheet : null } catch { return null }
}

async function tryLoadBodyIdleSheet(src: string): Promise<SpriteSheet | null> {
  const sheet = createBodyIdleSheet(src)
  try { await sheet.load(); return sheet.loaded ? sheet : null } catch { return null }
}

function loadImageAsset(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export type BodySpriteSheets = { bodyWalk: SpriteSheet; bodyIdle: SpriteSheet }

export async function loadBodySheetsForTone(tone: SkinTone): Promise<BodySpriteSheets | null> {
  const [bodyWalk, bodyIdleLoaded] = await Promise.all([
    tryLoadBodyWalkSheet(getSkinToneWalkSrc(tone)),
    tryLoadBodyIdleSheet(getSkinToneIdleSrc(tone)),
  ])
  if (!bodyWalk) return null
  return { bodyWalk, bodyIdle: bodyIdleLoaded ?? bodyWalk }
}

export type SkinToneFullPreview =
  | { kind: 'full'; image: HTMLImageElement }
  | { kind: 'sheet'; sheet: SpriteSheet }

export async function loadSkinToneFullPreview(tone: SkinTone): Promise<SkinToneFullPreview | null> {
  const fullImage = await loadImageAsset(getSkinToneFullSrc(tone))
  if (fullImage) return { kind: 'full', image: fullImage }
  const bodyWalk = await tryLoadBodyWalkSheet(getSkinToneWalkSrc(tone))
  if (!bodyWalk) return null
  const bodyIdle = (await tryLoadBodyIdleSheet(getSkinToneIdleSrc(tone))) ?? bodyWalk
  return { kind: 'sheet', sheet: bodyIdle }
}

export function drawSkinToneFullPreview(
  ctx: CanvasRenderingContext2D,
  preview: SkinToneFullPreview,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
): void {
  if (preview.kind === 'full') {
    const { image } = preview
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.globalAlpha = alpha
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, Math.floor(dx), Math.floor(dy), Math.floor(dw), Math.floor(dh))
    ctx.restore()
    return
  }
  drawBodyIdleSheetFrame(ctx, preview.sheet, 'down', dx, dy, dw, dh, alpha)
}

export function drawBodyFrameRect(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  rect: { sx: number; sy: number; sw: number; sh: number },
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
): void {
  const source = getSheetDrawSource(sheet)
  if (!source) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = alpha
  ctx.drawImage(source, Math.floor(rect.sx), Math.floor(rect.sy), Math.floor(rect.sw), Math.floor(rect.sh), Math.floor(dx), Math.floor(dy), Math.floor(dw), Math.floor(dh))
  ctx.restore()
}

export function drawBodyIdleSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  direction: Direction,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
): void {
  drawBodyFrameRect(ctx, sheet, sheet.getBodyIdleFrameRect(direction), dx, dy, dw, dh, alpha)
}

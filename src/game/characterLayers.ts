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
  MIDNIGHT_WALK_SRC,
} from '../constants/gameAssets'
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

const PLAYER_SOURCE_ROW_PADDING = 4
const PLAYER_SOURCE_FRAME_HEIGHT = 252
const PLAYER_LEFT_SOURCE_ROW_PADDING = 12
const PLAYER_LEFT_SOURCE_FRAME_HEIGHT = 232
const PLAYER_RIGHT_SOURCE_ROW_PADDING = -10
const PLAYER_RIGHT_SOURCE_FRAME_HEIGHT = 232

/* ── Midnight sheet creation / loading ──────────────────────────── */

const SHEET_OPTIONS = {
  chromaKey: true,
  removeGroundShadow: false,
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

async function tryLoadSheet(src: string): Promise<SpriteSheet | null> {
  const sheet = createSheet(src)
  try {
    await sheet.load()
    return sheet.loaded ? sheet : null
  } catch {
    return null
  }
}

export async function loadSpriteSheetWithFallback(
  primarySrc: string,
  fallbackSrc = MIDNIGHT_WALK_SRC,
): Promise<SpriteSheet | null> {
  const primary = await tryLoadSheet(primarySrc)
  if (primary) return primary
  if (primarySrc === fallbackSrc) return null
  return tryLoadSheet(fallbackSrc)
}

/* ── Midnight draw helpers ──────────────────────────────────────── */

function getSourceCrop(direction: Direction): {
  sx: number
  sy: number
  sw: number
  sh: number
} {
  const rowIndex = SPRITE_SHEET_ROW[direction]
  let rowPad = PLAYER_SOURCE_ROW_PADDING
  let srcH = PLAYER_SOURCE_FRAME_HEIGHT
  if (direction === 'left') {
    rowPad = PLAYER_LEFT_SOURCE_ROW_PADDING
    srcH = PLAYER_LEFT_SOURCE_FRAME_HEIGHT
  } else if (direction === 'right') {
    rowPad = PLAYER_RIGHT_SOURCE_ROW_PADDING
    srcH = PLAYER_RIGHT_SOURCE_FRAME_HEIGHT
  }
  return {
    sx: 0,
    sy: Math.floor(rowIndex * MIDNIGHT_WALK_FRAME_HEIGHT + rowPad),
    sw: MIDNIGHT_WALK_FRAME_WIDTH,
    sh: Math.floor(srcH),
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
): void {
  const source = getSheetDrawSource(sheet)
  if (!source) return

  const rect = sheet.getFrameRect(direction, frameIndex)
  const crop = getSourceCrop(direction)
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

/* ── V2 body tone stubs (keep CustomizationScreen.tsx compiling) ── */

const BODY_WALK_SHEET_OPTIONS = {
  chromaKey: true,
  removeGroundShadow: false,
  framesPerDirection: BASE_BODY_WALK_FRAMES_PER_DIRECTION,
  deriveFrameSizeFromImage: true,
} as const

const BODY_IDLE_SHEET_OPTIONS = {
  chromaKey: true,
  removeGroundShadow: false,
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

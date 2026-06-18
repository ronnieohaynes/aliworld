import { getBuildName } from '../data/buildName'
import { getEmblemDef } from '../data/emblemRegistry'
import { getMidnightVariantRenderTuning } from '../data/midnightVariants'
import { loadSpriteSheetWithFallback } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import {
  drawWorldPlayerSprite,
  getIdleFrameIndex,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from '../game/worldSpriteRender'
import { getAuthState } from '../store/authStore'
import { getSelectedMidnightVariant } from '../store/characterStore'
import { getActiveEmblemId, resolvePlayerWalkSrc } from '../store/cosmeticsStore'
import { getPlayerLevel } from '../store/playerStore'
import { publicAsset } from '../utils/publicAsset'

export const IDENTITY_CARD_WIDTH = 1080
export const IDENTITY_CARD_HEIGHT = 1920

const VOID_BG = '#0a0a12'
const CREAM = '#f4e8c1'
const GOLD = '#d4b87a'
const GLOW_PURPLE = 'rgba(127, 119, 221, 0.24)'
const FRAME_INSET = 36

const SIGIL_SRC = publicAsset('Assets/ui/AW%20GAME%20LOGO.svg')
const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

/** Visible sprite height ≈ 40% of card. */
const SPRITE_VISIBLE_TARGET_H = Math.floor(IDENTITY_CARD_HEIGHT * 0.4)

export function articleForBuildName(name: string): 'a' | 'an' {
  const letter = name.trim().charAt(0).toLowerCase()
  return 'aeiou'.includes(letter) ? 'an' : 'a'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed to load image: ${src}`))
    img.src = src
  })
}

function drawPlayerSpriteToCanvas(
  sheet: SpriteSheet,
  tuning: ReturnType<typeof getMidnightVariantRenderTuning>,
): HTMLCanvasElement {
  const dw = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH)
  const dh = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT)
  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return canvas
  ctx.clearRect(0, 0, dw, dh)
  drawWorldPlayerSprite(ctx, sheet, 'down', getIdleFrameIndex(), 0, tuning.feetOffset, tuning)
  return canvas
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('identity card png export failed'))),
      'image/png',
    )
  })
}

function drawVoidBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = VOID_BG
  ctx.fillRect(0, 0, IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)

  const glow = ctx.createRadialGradient(
    IDENTITY_CARD_WIDTH / 2,
    IDENTITY_CARD_HEIGHT * 0.34,
    60,
    IDENTITY_CARD_WIDTH / 2,
    IDENTITY_CARD_HEIGHT * 0.34,
    IDENTITY_CARD_WIDTH * 0.55,
  )
  glow.addColorStop(0, GLOW_PURPLE)
  glow.addColorStop(0.45, 'rgba(127, 119, 221, 0.08)')
  glow.addColorStop(1, 'rgba(10, 10, 18, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)

  const hillBase = IDENTITY_CARD_HEIGHT * 0.62
  ctx.fillStyle = 'rgba(20, 18, 32, 0.08)'
  ctx.beginPath()
  ctx.moveTo(0, hillBase + 220)
  ctx.lineTo(0, IDENTITY_CARD_HEIGHT)
  ctx.lineTo(IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)
  ctx.lineTo(IDENTITY_CARD_WIDTH, hillBase + 160)
  ctx.quadraticCurveTo(IDENTITY_CARD_WIDTH * 0.72, hillBase + 80, IDENTITY_CARD_WIDTH * 0.5, hillBase + 120)
  ctx.quadraticCurveTo(IDENTITY_CARD_WIDTH * 0.28, hillBase + 40, 0, hillBase + 220)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(30, 26, 48, 0.07)'
  ctx.beginPath()
  ctx.moveTo(0, hillBase + 280)
  ctx.lineTo(IDENTITY_CARD_WIDTH, hillBase + 240)
  ctx.lineTo(IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)
  ctx.lineTo(0, IDENTITY_CARD_HEIGHT)
  ctx.closePath()
  ctx.fill()

  for (let y = 0; y < IDENTITY_CARD_HEIGHT; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'
    ctx.fillRect(0, y, IDENTITY_CARD_WIDTH, 1)
  }

  const towerX = IDENTITY_CARD_WIDTH * 0.78
  const towerTop = hillBase + 40
  ctx.fillStyle = 'rgba(40, 36, 58, 0.08)'
  ctx.fillRect(towerX, towerTop, 14, hillBase + 200 - towerTop)
  ctx.fillRect(towerX - 6, towerTop + 30, 26, 8)
}

function drawCardFrame(ctx: CanvasRenderingContext2D, buildColor: string): void {
  const outer = FRAME_INSET
  const inner = outer + 10
  const w = IDENTITY_CARD_WIDTH
  const h = IDENTITY_CARD_HEIGHT

  ctx.strokeStyle = buildColor
  ctx.lineWidth = 2
  ctx.strokeRect(outer, outer, w - outer * 2, h - outer * 2)

  ctx.strokeStyle = GOLD
  ctx.lineWidth = 1
  ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2)

  const tick = 14
  ctx.fillStyle = GOLD
  const corners: [number, number, number, number][] = [
    [inner, inner, tick, 2],
    [inner, inner, 2, tick],
    [w - inner - tick, inner, tick, 2],
    [w - inner - 2, inner, 2, tick],
    [inner, h - inner - 2, tick, 2],
    [inner, h - inner - tick, 2, tick],
    [w - inner - tick, h - inner - 2, tick, 2],
    [w - inner - 2, h - inner - tick, 2, tick],
  ]
  for (const [x, y, tw, th] of corners) {
    ctx.fillRect(x, y, tw, th)
  }
}

function drawSpriteHero(
  ctx: CanvasRenderingContext2D,
  spriteSource: HTMLCanvasElement,
  buildColor: string,
): number {
  const sw = spriteSource.width
  const sh = spriteSource.height
  const displayH = SPRITE_VISIBLE_TARGET_H
  const displayW = Math.floor(sw * (displayH / sh))
  const spriteX = (IDENTITY_CARD_WIDTH - displayW) / 2
  const spriteY = 360

  const groundY = spriteY + displayH + 8
  ctx.save()
  ctx.fillStyle = buildColor
  ctx.globalAlpha = 0.18
  ctx.beginPath()
  ctx.ellipse(
    IDENTITY_CARD_WIDTH / 2,
    groundY,
    displayW * 0.42,
    16,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.restore()

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(spriteSource, spriteX, spriteY, displayW, displayH)

  return spriteY + displayH
}

function drawIdentityTypography(
  ctx: CanvasRenderingContext2D,
  build: { name: string; color: string },
  handle: string,
  level: number,
  sigil: HTMLImageElement,
  contentTop: number,
  emblem: HTMLImageElement | null,
): void {
  const buildUpper = build.name.toUpperCase()
  const article = articleForBuildName(build.name)

  let y = contentTop + 108

  ctx.font = `500 28px ${MONO}`
  ctx.fillStyle = CREAM
  ctx.textAlign = 'center'
  ctx.letterSpacing = '0.28em'
  ctx.fillText(`i am ${article}`, IDENTITY_CARD_WIDTH / 2, y)
  ctx.letterSpacing = '0'

  y += 88
  ctx.font = `800 92px ${MONO}`
  ctx.fillStyle = build.color
  ctx.fillText(buildUpper, IDENTITY_CARD_WIDTH / 2, y)

  y += 72
  const sigilH = 36
  const sigilW = Math.floor((sigil.naturalWidth / sigil.naturalHeight) * sigilH)
  const aliworldText = 'in aliworld'
  ctx.font = `600 40px ${MONO}`
  const aliW = ctx.measureText(aliworldText).width
  const rowW = sigilW + 16 + aliW
  let rowX = (IDENTITY_CARD_WIDTH - rowW) / 2

  ctx.drawImage(sigil, rowX, y - sigilH + 8, sigilW, sigilH)
  rowX += sigilW + 16
  ctx.fillStyle = GOLD
  ctx.fillText(aliworldText, rowX + aliW / 2, y)

  y += 64
  const pill = `@${handle} · lvl ${level}`
  ctx.font = `500 26px ${MONO}`
  const pillTextW = ctx.measureText(pill).width
  const emblemSize = emblem ? 34 : 0
  const emblemGap = emblem ? 10 : 0
  const pillW = pillTextW + 48
  const pillRowW = pillW + emblemGap + emblemSize
  const rowStartX = (IDENTITY_CARD_WIDTH - pillRowW) / 2
  const pillX = rowStartX
  const pillY = y - 28
  ctx.fillStyle = 'rgba(14, 14, 24, 0.55)'
  roundRect(ctx, pillX, pillY, pillW, 44, 22)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.fillText(pill, pillX + pillW / 2, y)

  if (emblem) {
    const emblemY = pillY + (44 - emblemSize) / 2
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(emblem, pillX + pillW + emblemGap, emblemY, emblemSize, emblemSize)
    ctx.imageSmoothingEnabled = false
  }

  ctx.textAlign = 'left'
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawCardFooter(ctx: CanvasRenderingContext2D): void {
  const marginX = FRAME_INSET + 32
  const maxTextW = IDENTITY_CARD_WIDTH - marginX * 2
  const innerBottom = IDENTITY_CARD_HEIGHT - FRAME_INSET - 14
  const ruleY = innerBottom - 78

  ctx.strokeStyle = GOLD
  ctx.globalAlpha = 0.65
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(marginX, ruleY)
  ctx.lineTo(IDENTITY_CARD_WIDTH - marginX, ruleY)
  ctx.stroke()
  ctx.globalAlpha = 1

  const lines = [
    '@officialdannyali · @aliworld_official',
    'play.dannyali.com',
  ]
  let fontSize = 22
  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD

  while (fontSize >= 16) {
    ctx.font = `500 ${fontSize}px ${MONO}`
    const fits = lines.every((line) => ctx.measureText(line).width <= maxTextW)
    if (fits) break
    fontSize -= 1
  }

  const lineHeight = Math.floor(fontSize * 1.45)
  let textY = ruleY + 36
  for (const line of lines) {
    ctx.fillText(line, IDENTITY_CARD_WIDTH / 2, textY)
    textY += lineHeight
  }
  ctx.textAlign = 'left'
}

/** Renders a 9:16 collectible story card PNG from live player state. */
export async function generateIdentityCard(): Promise<Blob> {
  const build = getBuildName()
  const level = getPlayerLevel()
  const handle = getAuthState().profile?.handle?.toLowerCase() ?? 'player'
  const variant = getSelectedMidnightVariant()
  const tuning = getMidnightVariantRenderTuning(variant)
  const walkSrc = resolvePlayerWalkSrc(variant)
  const emblemId = getActiveEmblemId()
  const emblemPromise = emblemId
    ? loadImage(getEmblemDef(emblemId).artSrc).catch(() => null)
    : Promise.resolve(null)

  const [sigil, sheet, emblemImg] = await Promise.all([
    loadImage(SIGIL_SRC),
    loadSpriteSheetWithFallback(walkSrc),
    emblemPromise,
  ])

  if (!sheet?.loaded) {
    throw new Error('player sprite not ready')
  }

  const spriteSource = drawPlayerSpriteToCanvas(sheet, tuning)

  const canvas = document.createElement('canvas')
  canvas.width = IDENTITY_CARD_WIDTH
  canvas.height = IDENTITY_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unavailable')

  drawVoidBackground(ctx)
  drawCardFrame(ctx, build.color)
  const contentBottom = drawSpriteHero(ctx, spriteSource, build.color)
  drawIdentityTypography(ctx, build, handle, level, sigil, contentBottom, emblemImg)
  drawCardFooter(ctx)

  return canvasToPngBlob(canvas)
}

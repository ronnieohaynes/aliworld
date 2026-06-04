import { getBuildName } from '../data/buildName'
import { getMidnightVariantRenderTuning, getMidnightWalkSrc } from '../data/midnightVariants'
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
import { getPlayerLevel } from '../store/playerStore'
import { publicAsset } from '../utils/publicAsset'

export const IDENTITY_CARD_WIDTH = 1080
export const IDENTITY_CARD_HEIGHT = 1920

const VOID_BG = '#0a0a12'
const CREAM = '#f4e8c1'
const GOLD = '#d4b87a'
const GLOW_PURPLE = 'rgba(127, 119, 221, 0.22)'

const SIGIL_SRC = publicAsset('Assets/ui/AW%20GAME%20LOGO.svg')
const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace'

const SPRITE_TARGET_H = 520

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

/** Renders a 9:16 story card PNG from live player state. */
export async function generateIdentityCard(): Promise<Blob> {
  const build = getBuildName()
  const level = getPlayerLevel()
  const handle = getAuthState().profile?.handle?.toLowerCase() ?? 'player'
  const variant = getSelectedMidnightVariant()
  const tuning = getMidnightVariantRenderTuning(variant)
  const walkSrc = getMidnightWalkSrc(variant)

  const [sigil, sheet] = await Promise.all([
    loadImage(SIGIL_SRC),
    loadSpriteSheetWithFallback(walkSrc),
  ])

  if (!sheet?.loaded) {
    throw new Error('player sprite not ready')
  }

  const spriteSource = drawPlayerSpriteToCanvas(sheet, tuning)
  const sw = spriteSource.width
  const sh = spriteSource.height
  const displayH = SPRITE_TARGET_H
  const displayW = Math.floor(sw * (displayH / sh))

  const canvas = document.createElement('canvas')
  canvas.width = IDENTITY_CARD_WIDTH
  canvas.height = IDENTITY_CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unavailable')

  ctx.fillStyle = VOID_BG
  ctx.fillRect(0, 0, IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)

  const glow = ctx.createRadialGradient(
    IDENTITY_CARD_WIDTH / 2,
    IDENTITY_CARD_HEIGHT * 0.36,
    40,
    IDENTITY_CARD_WIDTH / 2,
    IDENTITY_CARD_HEIGHT * 0.36,
    IDENTITY_CARD_WIDTH * 0.62,
  )
  glow.addColorStop(0, GLOW_PURPLE)
  glow.addColorStop(1, 'rgba(10, 10, 18, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, IDENTITY_CARD_WIDTH, IDENTITY_CARD_HEIGHT)

  const sigilW = 96
  const sigilH = Math.floor((sigil.naturalHeight / sigil.naturalWidth) * sigilW)
  const sigilX = (IDENTITY_CARD_WIDTH - sigilW) / 2
  ctx.drawImage(sigil, sigilX, 72, sigilW, sigilH)

  const spriteX = (IDENTITY_CARD_WIDTH - displayW) / 2
  const spriteY = 280
  ctx.save()
  ctx.shadowColor = build.color
  ctx.shadowBlur = 48
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(spriteSource, spriteX, spriteY, displayW, displayH)
  ctx.restore()

  const article = articleForBuildName(build.name)
  const buildLower = build.name.toLowerCase()
  const linePrefix = `i am ${article} `
  const lineSuffix = ' in aliworld'

  ctx.font = `600 44px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  const prefixW = ctx.measureText(linePrefix).width
  const buildW = ctx.measureText(buildLower).width
  const suffixW = ctx.measureText(lineSuffix).width
  const lineTotalW = prefixW + buildW + suffixW
  const lineY = spriteY + displayH + 100
  let lineX = (IDENTITY_CARD_WIDTH - lineTotalW) / 2

  ctx.fillStyle = CREAM
  ctx.fillText(linePrefix, lineX, lineY)
  lineX += prefixW
  ctx.fillStyle = build.color
  ctx.fillText(buildLower, lineX, lineY)
  lineX += buildW
  ctx.fillStyle = CREAM
  ctx.fillText(lineSuffix, lineX, lineY)

  ctx.font = `500 32px ${MONO}`
  ctx.fillStyle = CREAM
  const identityLine = `@${handle} · lvl ${level}`
  const identityW = ctx.measureText(identityLine).width
  ctx.fillText(identityLine, (IDENTITY_CARD_WIDTH - identityW) / 2, lineY + 72)

  ctx.font = `500 26px ${MONO}`
  ctx.fillStyle = GOLD
  const footerLines = [
    '@officialdannyali · @aliworld_official',
    'play.dannyali.com',
  ]
  let footerY = IDENTITY_CARD_HEIGHT - 120
  for (const line of footerLines) {
    const w = ctx.measureText(line).width
    ctx.fillText(line, (IDENTITY_CARD_WIDTH - w) / 2, footerY)
    footerY += 36
  }

  return canvasToPngBlob(canvas)
}

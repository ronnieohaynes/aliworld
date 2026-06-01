import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMidnightVariantRenderTuning,
  getMidnightWalkSrc,
  MIDNIGHT_VARIANTS,
  type MidnightVariantDef,
  type MidnightVariantId,
} from '../data/midnightVariants'
import { drawSheetFrame, getIdleFrameIndex, loadSpriteSheetPrimary } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import {
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from '../game/worldSpriteRender'
import { getBattleBackgroundSrc } from '../data/battleBackgrounds'
import { clearMidnightVariant, setMidnightVariant } from '../store/characterStore'
import { GameShell } from './GameShell'
import { MIDNIGHT_SELECT_TRANSITION_MS } from '../constants/midnightSelectTransition'
import './MidnightSelectTransition.css'
import './MidnightVariantSelectScreen.css'

const ENTRANCE_MS = MIDNIGHT_SELECT_TRANSITION_MS
const FIVE_BG_SRC = getBattleBackgroundSrc('five')
/** Carousel preview display is 2× world size — bitmap matches CSS so pixels stay crisp. */
const PREVIEW_PIXEL_SCALE = 2
const PREVIEW_DISPLAY_W = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH * PREVIEW_PIXEL_SCALE)
const PREVIEW_DISPLAY_H = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT * PREVIEW_PIXEL_SCALE)
const PREVIEW_ALPHA_MIN = 12

type PreloadedSheets = Partial<Record<MidnightVariantId, SpriteSheet>>

type OpaqueBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

let previewScratchCanvas: HTMLCanvasElement | null = null

function getPreviewScratchCanvas(width: number, height: number): HTMLCanvasElement {
  if (!previewScratchCanvas) previewScratchCanvas = document.createElement('canvas')
  previewScratchCanvas.width = width
  previewScratchCanvas.height = height
  return previewScratchCanvas
}

function getOpaqueBounds(imageData: ImageData): OpaqueBounds | null {
  const { data, width, height } = imageData
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!
      if (a <= PREVIEW_ALPHA_MIN) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) return null
  return { minX, minY, maxX, maxY }
}

function centerOpaqueContentInPreview(
  targetCtx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const sourceCtx = source.getContext('2d', { alpha: true })
  if (!sourceCtx) return

  const bounds = getOpaqueBounds(sourceCtx.getImageData(0, 0, width, height))
  targetCtx.clearRect(0, 0, width, height)
  targetCtx.imageSmoothingEnabled = false

  if (!bounds) {
    targetCtx.drawImage(source, 0, 0)
    return
  }

  const contentW = bounds.maxX - bounds.minX + 1
  const contentH = bounds.maxY - bounds.minY + 1
  const dx = Math.floor((width - contentW) / 2) - bounds.minX
  const dy = Math.floor((height - contentH) / 2) - bounds.minY
  targetCtx.drawImage(source, dx, dy)
}

async function preloadAllVariantSheets(): Promise<PreloadedSheets> {
  const pairs = await Promise.all(
    MIDNIGHT_VARIANTS.map(async (variant) => {
      const sheet = await loadSpriteSheetPrimary(getMidnightWalkSrc(variant.id))
      return [variant.id, sheet] as const
    }),
  )

  const sheets: PreloadedSheets = {}
  for (const [id, sheet] of pairs) {
    if (sheet?.loaded) sheets[id] = sheet
  }
  return sheets
}

function drawVariantPreview(
  canvas: HTMLCanvasElement,
  sheet: SpriteSheet,
  variantId: MidnightVariantId,
): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const tuning = getMidnightVariantRenderTuning(variantId)
  const dw = PREVIEW_DISPLAY_W
  const dh = PREVIEW_DISPLAY_H
  canvas.width = dw
  canvas.height = dh

  const scratch = getPreviewScratchCanvas(dw, dh)
  const scratchCtx = scratch.getContext('2d', { alpha: true })
  if (!scratchCtx) return

  scratchCtx.clearRect(0, 0, dw, dh)
  scratchCtx.imageSmoothingEnabled = false
  drawSheetFrame(
    scratchCtx,
    sheet,
    'down',
    getIdleFrameIndex(),
    0,
    tuning.feetOffset,
    dw,
    dh,
    1,
    tuning,
  )

  centerOpaqueContentInPreview(ctx, scratch, dw, dh)
}

function VariantCard({
  variant,
  sheet,
  isFocused,
  cardRef,
  onActivate,
}: {
  variant: MidnightVariantDef
  sheet: SpriteSheet | undefined
  isFocused: boolean
  cardRef: (el: HTMLDivElement | null) => void
  onActivate: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!sheet?.loaded) return
    const canvas = canvasRef.current
    if (canvas) drawVariantPreview(canvas, sheet, variant.id)
  }, [sheet, variant.id])

  const hasSprite = Boolean(sheet?.loaded)

  return (
    <div
      ref={cardRef}
      className={`midnight-select-screen__card${isFocused ? ' midnight-select-screen__card--focused' : ''}`}
      role="button"
      tabIndex={isFocused ? 0 : -1}
      aria-label={isFocused ? 'Select this MDNGHT appearance' : 'View MDNGHT appearance'}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
    >
      <div className="midnight-select-screen__preview">
        {hasSprite ? (
          <canvas
            ref={canvasRef}
            className="midnight-select-screen__canvas"
            width={PREVIEW_DISPLAY_W}
            height={PREVIEW_DISPLAY_H}
          />
        ) : (
          <div className="midnight-select-screen__preview-empty" aria-hidden />
        )}
      </div>
    </div>
  )
}

function MidnightSelectBackground() {
  const [bgVisible, setBgVisible] = useState(true)

  return (
    <div className="midnight-select-screen__bg" aria-hidden>
      <div className="midnight-select-screen__bg-fallback" />
      {bgVisible ? (
        <img
          className="midnight-select-screen__bg-img"
          src={FIVE_BG_SRC}
          alt=""
          draggable={false}
          onError={() => setBgVisible(false)}
        />
      ) : null}
      <div className="midnight-select-screen__bg-overlay" />
    </div>
  )
}

export function MidnightVariantSelectScreen() {
  const [preloadedSheets, setPreloadedSheets] = useState<PreloadedSheets | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let cancelled = false

    void preloadAllVariantSheets().then((sheets) => {
      if (!cancelled) setPreloadedSheets(sheets)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handlePick = useCallback((id: MidnightVariantId) => {
    setMidnightVariant(id)
  }, [])

  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(MIDNIGHT_VARIANTS.length - 1, index))
    const card = cardRefs.current[clamped]
    card?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    setFocusedIndex(clamped)
  }, [])

  const updateFocusedFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const trackRect = track.getBoundingClientRect()
    const centerX = trackRect.left + trackRect.width / 2

    let bestIndex = 0
    let bestDistance = Infinity

    cardRefs.current.forEach((card, index) => {
      if (!card) return
      const cardRect = card.getBoundingClientRect()
      const cardCenter = cardRect.left + cardRect.width / 2
      const distance = Math.abs(cardCenter - centerX)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    })

    setFocusedIndex(bestIndex)
  }, [])

  useEffect(() => {
    if (!preloadedSheets) return

    const track = trackRef.current
    if (!track) return

    updateFocusedFromScroll()

    let scrollEndTimer: number | undefined
    const onScroll = () => {
      if (scrollEndTimer !== undefined) window.clearTimeout(scrollEndTimer)
      scrollEndTimer = window.setTimeout(updateFocusedFromScroll, 80)
      updateFocusedFromScroll()
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      if (scrollEndTimer !== undefined) window.clearTimeout(scrollEndTimer)
    }
  }, [preloadedSheets, updateFocusedFromScroll])

  const focusedVariant = MIDNIGHT_VARIANTS[focusedIndex]!

  const handleCardActivate = useCallback(
    (index: number) => {
      if (index === focusedIndex) {
        handlePick(MIDNIGHT_VARIANTS[index]!.id)
        return
      }
      scrollToIndex(index)
    },
    [focusedIndex, handlePick, scrollToIndex],
  )

  const canScrollPrev = focusedIndex > 0
  const canScrollNext = focusedIndex < MIDNIGHT_VARIANTS.length - 1
  const isReady = preloadedSheets !== null

  return (
    <div className="midnight-select-app">
      <GameShell>
        <div
          className={`midnight-select-screen${
            isReady ? ' midnight-select-screen--enter' : ' midnight-select-screen--boot'
          }`}
          style={{ ['--midnight-select-enter-ms' as string]: `${ENTRANCE_MS}ms` }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose your MIDNIGHT"
          aria-busy={!isReady}
        >
          <MidnightSelectBackground />

          <div className="midnight-select-screen__content">
          <header className="midnight-select-screen__header">
            <h1 className="midnight-select-screen__title">Choose your MIDNIGHT</h1>
          </header>

          <section className="midnight-select-screen__carousel" aria-label="MDNGHT appearances">
            <button
              type="button"
              className="midnight-select-screen__arrow midnight-select-screen__arrow--prev"
              aria-label="Previous appearance"
              disabled={!isReady || !canScrollPrev}
              onClick={() => scrollToIndex(focusedIndex - 1)}
            >
              ‹
            </button>

            <div className="midnight-select-screen__carousel-viewport">
              {isReady ? (
                <div ref={trackRef} className="midnight-select-screen__track">
                  {MIDNIGHT_VARIANTS.map((variant, index) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      sheet={preloadedSheets[variant.id]}
                      isFocused={index === focusedIndex}
                      cardRef={(el) => {
                        cardRefs.current[index] = el
                      }}
                      onActivate={() => handleCardActivate(index)}
                    />
                  ))}
                </div>
              ) : (
                <div className="midnight-select-screen__track midnight-select-screen__track--boot" />
              )}
            </div>

            <button
              type="button"
              className="midnight-select-screen__arrow midnight-select-screen__arrow--next"
              aria-label="Next appearance"
              disabled={!isReady || !canScrollNext}
              onClick={() => scrollToIndex(focusedIndex + 1)}
            >
              ›
            </button>
          </section>

          <div className="midnight-select-screen__tagline-slot">
            <p className="midnight-select-screen__tagline">ALIWORLD awaits</p>
          </div>

          <button
            type="button"
            className="midnight-select-screen__confirm"
            disabled={!isReady}
            onClick={() => handlePick(focusedVariant.id)}
          >
            select
          </button>

          <footer className="midnight-select-screen__footer">
            <button
              type="button"
              className="midnight-select-screen__debug-reset"
              onClick={clearMidnightVariant}
            >
              reset pick (debug)
            </button>
            <p className="midnight-select-screen__debug-hint">new game returns here</p>
          </footer>
          </div>
        </div>
      </GameShell>
    </div>
  )
}

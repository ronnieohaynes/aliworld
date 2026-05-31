import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMidnightWalkSrc,
  MIDNIGHT_VARIANTS,
  type MidnightVariantDef,
  type MidnightVariantId,
} from '../data/midnightVariants'
import { loadSpriteSheetPrimary } from '../game/characterLayers'
import type { SpriteSheet } from '../game/SpriteSheet'
import {
  drawWorldPlayerSprite,
  getIdleFrameIndex,
  WORLD_PLAYER_DISPLAY_HEIGHT,
  WORLD_PLAYER_DISPLAY_WIDTH,
} from '../game/worldSpriteRender'
import { clearMidnightVariant, setMidnightVariant } from '../store/characterStore'
import { GameShell } from './GameShell'
import './MidnightVariantSelectScreen.css'

const PLACEHOLDER_ACCENT: Record<MidnightVariantId, { skin: string; accent: string }> = {
  default: { skin: '#b8a8c8', accent: '#534ab7' },
  'asian-f': { skin: '#f0d4c8', accent: '#c97b8a' },
  'latino-m': { skin: '#d4a574', accent: '#8b5a2e' },
  'white-f': { skin: '#f0e6d8', accent: '#9b8ec4' },
  'filipino-m': { skin: '#c9a882', accent: '#6b4f3a' },
}

function drawVariantPreview(canvas: HTMLCanvasElement, sheet: SpriteSheet): void {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  const dw = Math.floor(WORLD_PLAYER_DISPLAY_WIDTH)
  const dh = Math.floor(WORLD_PLAYER_DISPLAY_HEIGHT)
  canvas.width = dw
  canvas.height = dh
  ctx.clearRect(0, 0, dw, dh)
  drawWorldPlayerSprite(ctx, sheet, 'down', getIdleFrameIndex(), 0, 0)
}

function VariantPreviewPlaceholder({ id }: { id: MidnightVariantId }) {
  const colors = PLACEHOLDER_ACCENT[id]
  return (
    <div
      className="midnight-select-screen__placeholder"
      style={
        {
          '--placeholder-skin': colors.skin,
          '--placeholder-accent': colors.accent,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <span className="midnight-select-screen__placeholder-sigil" />
      <span className="midnight-select-screen__placeholder-body" />
    </div>
  )
}

function VariantCard({
  variant,
  isFocused,
  cardRef,
  onActivate,
}: {
  variant: MidnightVariantDef
  isFocused: boolean
  cardRef: (el: HTMLDivElement | null) => void
  onActivate: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sheetRef = useRef<SpriteSheet | null>(null)
  const [previewMode, setPreviewMode] = useState<'loading' | 'sheet' | 'placeholder'>('loading')

  useEffect(() => {
    let cancelled = false
    setPreviewMode('loading')
    const src = getMidnightWalkSrc(variant.id)

    void loadSpriteSheetPrimary(src).then((sheet) => {
      if (cancelled) return
      if (!sheet?.loaded) {
        sheetRef.current = null
        setPreviewMode('placeholder')
        return
      }
      sheetRef.current = sheet
      setPreviewMode('sheet')
    })

    return () => {
      cancelled = true
    }
  }, [variant.id])

  useEffect(() => {
    if (previewMode !== 'sheet' || !sheetRef.current) return
    const canvas = canvasRef.current
    if (canvas) drawVariantPreview(canvas, sheetRef.current)
  }, [previewMode])

  const showPlaceholder = previewMode !== 'sheet'

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
        {showPlaceholder ? (
          <VariantPreviewPlaceholder id={variant.id} />
        ) : (
          <canvas
            ref={canvasRef}
            className="midnight-select-screen__canvas"
            width={WORLD_PLAYER_DISPLAY_WIDTH}
            height={WORLD_PLAYER_DISPLAY_HEIGHT}
          />
        )}
      </div>
    </div>
  )
}

export function MidnightVariantSelectScreen() {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

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
  }, [updateFocusedFromScroll])

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

  return (
    <div className="midnight-select-app">
      <GameShell>
        <div className="midnight-select-screen" role="dialog" aria-modal="true" aria-label="Choose MDNGHT">
          <section className="midnight-select-screen__carousel" aria-label="MDNGHT appearances">
            <button
              type="button"
              className="midnight-select-screen__arrow midnight-select-screen__arrow--prev"
              aria-label="Previous appearance"
              disabled={!canScrollPrev}
              onClick={() => scrollToIndex(focusedIndex - 1)}
            >
              ‹
            </button>

            <div className="midnight-select-screen__carousel-viewport">
              <div ref={trackRef} className="midnight-select-screen__track">
                {MIDNIGHT_VARIANTS.map((variant, index) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    isFocused={index === focusedIndex}
                    cardRef={(el) => {
                      cardRefs.current[index] = el
                    }}
                    onActivate={() => handleCardActivate(index)}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="midnight-select-screen__arrow midnight-select-screen__arrow--next"
              aria-label="Next appearance"
              disabled={!canScrollNext}
              onClick={() => scrollToIndex(focusedIndex + 1)}
            >
              ›
            </button>
          </section>

          <button
            type="button"
            className="midnight-select-screen__confirm"
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
            <p className="midnight-select-screen__debug-hint">press M in game to return here</p>
          </footer>
        </div>
      </GameShell>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MIDNIGHT_WALK_FRAME_HEIGHT, MIDNIGHT_WALK_FRAME_WIDTH } from '../constants/gameAssets'
import {
  drawSkinToneFullPreview,
  loadSkinToneFullPreview,
  type SkinToneFullPreview,
} from '../game/characterLayers'
import {
  completeCustomization,
  DEFAULT_CUSTOMIZATION_PREVIEW_TONE,
  getCharacterState,
  getSkinToneFullSrc,
  getSkinToneIdleSrc,
  getSkinToneWalkSrc,
  setSkinTone,
  SKIN_TONE_SWATCHES,
  subscribeCharacterStore,
  type SkinTone,
} from '../store/characterStore'
import { publicAsset } from '../utils/publicAsset'
import './CustomizationScreen.css'

const INTERIOR_BG_SRC = publicAsset('Assets/Backgrounds/13gallons-interior.png')
const FADE_MS = 300

const SPRITE_SCALE = 6
const BASE_DISPLAY_HEIGHT = 72
const BASE_DISPLAY_WIDTH = Math.floor(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * BASE_DISPLAY_HEIGHT,
)
const DISPLAY_HEIGHT = BASE_DISPLAY_HEIGHT * SPRITE_SCALE
const DISPLAY_WIDTH = BASE_DISPLAY_WIDTH * SPRITE_SCALE

const PREVIEW_SCREEN_X = 0.25
const PREVIEW_SCREEN_Y = 0.94
/** Nudge preview downward (feet anchor) without changing draw size. */
const PREVIEW_Y_OFFSET = 28

const CUSTOMIZATION_OPTIONS = [
  'SKIN TONE',
  'HAIR',
  'TOPS',
  'BOTTOMS',
  'SHOES',
  'ACCESSORIES',
] as const

type PanelView = 'main' | 'skin-tone'

type Props = {
  onClose: () => void
}

function ToneSwatchPreview({ tone, color }: { tone: SkinTone; color: string }) {
  const [src, setSrc] = useState(getSkinToneFullSrc(tone))

  const handleError = () => {
    setSrc((current) => {
      if (current.endsWith('-full.png')) return getSkinToneIdleSrc(tone)
      if (current.includes('idle') || current.includes('Idle')) return getSkinToneWalkSrc(tone)
      return current
    })
  }

  return (
    <img
      className="customization-screen__swatch-img"
      src={src}
      alt=""
      draggable={false}
      style={{ backgroundColor: color }}
      onError={handleError}
    />
  )
}

export function CustomizationScreen({ onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodyPreviewRef = useRef<SkinToneFullPreview | null>(null)
  const previewCacheRef = useRef<Map<SkinTone, SkinToneFullPreview>>(new Map())
  const [closing, setClosing] = useState(false)
  const [panelView, setPanelView] = useState<PanelView>('main')
  const [layersReady, setLayersReady] = useState(false)
  const [previewRevision, setPreviewRevision] = useState(0)
  const [highlightedTone, setHighlightedTone] = useState<SkinTone | null>(null)

  const appliedSkinTone = useSyncExternalStore(
    subscribeCharacterStore,
    () => getCharacterState().skinTone,
    () => getCharacterState().skinTone,
  )
  const previewTone =
    highlightedTone ?? appliedSkinTone ?? DEFAULT_CUSTOMIZATION_PREVIEW_TONE

  const requestClose = useCallback(() => {
    setClosing(true)
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => {
      completeCustomization()
      onClose()
    }, FADE_MS)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  useEffect(() => {
    let cancelled = false
    setLayersReady(false)

    void loadSkinToneFullPreview(DEFAULT_CUSTOMIZATION_PREVIEW_TONE)
      .then((preview) => {
        if (cancelled || !preview) return
        previewCacheRef.current.set(DEFAULT_CUSTOMIZATION_PREVIEW_TONE, preview)
        bodyPreviewRef.current = preview
        setLayersReady(true)
        setPreviewRevision((n) => n + 1)
      })
      .catch(() => {
        if (!cancelled) setLayersReady(false)
      })

    void Promise.all(
      SKIN_TONE_SWATCHES.map(async ({ tone }) => {
        if (previewCacheRef.current.has(tone)) return
        const preview = await loadSkinToneFullPreview(tone)
        if (preview) previewCacheRef.current.set(tone, preview)
      }),
    )

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cached = previewCacheRef.current.get(previewTone)
    if (cached) {
      bodyPreviewRef.current = cached
      setPreviewRevision((n) => n + 1)
      return
    }

    let cancelled = false
    void loadSkinToneFullPreview(previewTone).then((preview) => {
      if (cancelled || !preview) return
      previewCacheRef.current.set(previewTone, preview)
      bodyPreviewRef.current = preview
      setPreviewRevision((n) => n + 1)
    })

    return () => {
      cancelled = true
    }
  }, [previewTone])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const bodyPreview = bodyPreviewRef.current
    if (!root || !canvas || !layersReady || !bodyPreview) return

    const drawSprites = () => {
      const width = root.clientWidth
      const height = root.clientHeight
      if (width <= 0 || height <= 0) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const spriteX = Math.floor(width * PREVIEW_SCREEN_X - DISPLAY_WIDTH / 2)
      const feetY = height * PREVIEW_SCREEN_Y
      const spriteY = Math.floor(
        Math.max(
          0,
          Math.min(feetY - DISPLAY_HEIGHT + PREVIEW_Y_OFFSET, height - DISPLAY_HEIGHT),
        ),
      )
      drawSkinToneFullPreview(
        ctx,
        bodyPreview,
        spriteX,
        spriteY,
        DISPLAY_WIDTH,
        DISPLAY_HEIGHT,
      )
    }

    drawSprites()

    const observer = new ResizeObserver(drawSprites)
    observer.observe(root)
    return () => observer.disconnect()
  }, [layersReady, previewTone, previewRevision])

  const handleOptionClick = (label: (typeof CUSTOMIZATION_OPTIONS)[number]) => {
    if (label === 'SKIN TONE') {
      setHighlightedTone(null)
      setPanelView('skin-tone')
    }
  }

  const handleSwatchSelect = (tone: SkinTone) => {
    setHighlightedTone(tone)
    const cached = previewCacheRef.current.get(tone)
    if (cached) {
      bodyPreviewRef.current = cached
      setPreviewRevision((n) => n + 1)
    }
  }

  const handleAccept = () => {
    if (highlightedTone) {
      setSkinTone(highlightedTone)
    }
    setHighlightedTone(null)
    setPanelView('main')
  }

  const handleCancel = () => {
    setHighlightedTone(null)
  }

  const handleBackToMain = () => {
    setHighlightedTone(null)
    setPanelView('main')
  }

  const activeSwatchTone =
    highlightedTone ?? appliedSkinTone ?? DEFAULT_CUSTOMIZATION_PREVIEW_TONE

  return (
    <div
      ref={rootRef}
      className={`customization-screen${closing ? ' customization-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      style={{ ['--customization-fade-ms' as string]: `${FADE_MS}ms` }}
    >
      <img
        className="customization-screen__bg"
        src={INTERIOR_BG_SRC}
        alt=""
        draggable={false}
      />
      <canvas ref={canvasRef} className="customization-screen__sprites" aria-hidden />
      <aside
        className={`customization-screen__panel${
          panelView === 'skin-tone' ? ' customization-screen__panel--skin-tone' : ''
        }`}
      >
        {panelView === 'main' ? (
          <>
            <h1 className="customization-screen__panel-title">cornerstone</h1>
            <nav className="customization-screen__options" aria-label="Customization categories">
              {CUSTOMIZATION_OPTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="customization-screen__option"
                  onClick={() => handleOptionClick(label)}
                >
                  <span className="customization-screen__option-label">{label}</span>
                  <span className="customization-screen__option-arrow" aria-hidden>
                    →
                  </span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          <div className="customization-screen__subpanel">
            <button type="button" className="customization-screen__back" onClick={handleBackToMain}>
              <span className="customization-screen__back-arrow" aria-hidden>
                ←
              </span>
              BACK
            </button>
            <div
              className="customization-screen__skin-tone-grid"
              role="listbox"
              aria-label="Skin tone"
            >
              {SKIN_TONE_SWATCHES.map(({ tone, color }) => (
                <button
                  key={tone}
                  type="button"
                  role="option"
                  aria-selected={activeSwatchTone === tone}
                  aria-label={`Tone ${tone}`}
                  className={`customization-screen__swatch${
                    activeSwatchTone === tone ? ' customization-screen__swatch--selected' : ''
                  }`}
                  onClick={() => handleSwatchSelect(tone)}
                >
                  <ToneSwatchPreview tone={tone} color={color} />
                </button>
              ))}
            </div>
          </div>
        )}
        {panelView === 'skin-tone' && (
          <div className="customization-screen__skin-tone-actions">
            <button
              type="button"
              className="customization-screen__skin-tone-action"
              onClick={handleAccept}
            >
              ACCEPT
            </button>
            <button
              type="button"
              className="customization-screen__skin-tone-action customization-screen__skin-tone-action--cancel"
              onClick={handleCancel}
            >
              CANCEL
            </button>
          </div>
        )}
        <button
          type="button"
          className="customization-screen__close"
          onClick={requestClose}
        >
          Close
        </button>
      </aside>
    </div>
  )
}

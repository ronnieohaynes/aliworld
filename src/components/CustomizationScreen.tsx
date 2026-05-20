import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  MIDNIGHT_WALK_COLUMNS,
  MIDNIGHT_WALK_FRAME_HEIGHT,
  MIDNIGHT_WALK_FRAME_WIDTH,
  MIDNIGHT_WALK_IDLE_FRAME,
  MIDNIGHT_WALK_ROWS,
  MIDNIGHT_WALK_SRC,
} from '../constants/gameAssets'
import { SpriteSheet } from '../game/SpriteSheet'
import {
  getCharacterState,
  getPlayerWalkSrc,
  getSkinToneWalkSrc,
  setSkinTone,
  SKIN_TONE_SWATCHES,
  subscribeCharacterStore,
  type SkinTone,
} from '../store/characterStore'
import './CustomizationScreen.css'

const INTERIOR_BG_SRC = '/Assets/Backgrounds/13gallons-interior.png'
const FADE_MS = 300
const PREVIEW_OPACITY = 0.7

const SPRITE_SCALE = 6
const BASE_DISPLAY_HEIGHT = 72
const BASE_DISPLAY_WIDTH = Math.floor(
  (MIDNIGHT_WALK_FRAME_WIDTH / MIDNIGHT_WALK_FRAME_HEIGHT) * BASE_DISPLAY_HEIGHT,
)
const DISPLAY_HEIGHT = BASE_DISPLAY_HEIGHT * SPRITE_SCALE
const DISPLAY_WIDTH = BASE_DISPLAY_WIDTH * SPRITE_SCALE

const MIDNIGHT_SCREEN_X = 0.25
const MIDNIGHT_SCREEN_Y = 0.88

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

function createWalkSheet(src: string): SpriteSheet {
  return new SpriteSheet(
    src,
    MIDNIGHT_WALK_COLUMNS,
    MIDNIGHT_WALK_ROWS,
    MIDNIGHT_WALK_FRAME_WIDTH,
    MIDNIGHT_WALK_FRAME_HEIGHT,
    {
      chromaKey: true,
      removeGroundShadow: false,
      framesPerDirection: 4,
    },
  )
}

function getSheetDrawSource(sheet: SpriteSheet): CanvasImageSource | null {
  return (sheet as unknown as { drawSource: CanvasImageSource | null }).drawSource
}

async function loadWalkSheet(src: string): Promise<SpriteSheet | null> {
  const tryLoad = async (url: string): Promise<SpriteSheet | null> => {
    const sheet = createWalkSheet(url)
    try {
      await sheet.load()
      return sheet.loaded ? sheet : null
    } catch {
      return null
    }
  }

  const primary = await tryLoad(src)
  if (primary) return primary
  if (src === MIDNIGHT_WALK_SRC) return null
  return tryLoad(MIDNIGHT_WALK_SRC)
}

function drawWalkFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sheet: SpriteSheet,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  alpha = 1,
): void {
  const rect = sheet.getFrameRect('down', MIDNIGHT_WALK_IDLE_FRAME)
  const sx = Math.floor(rect.sx)
  const sy = 0
  const sw = Math.floor(rect.sw)
  const sh = MIDNIGHT_WALK_FRAME_HEIGHT

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = alpha
  ctx.drawImage(source, sx, sy, sw, sh, Math.floor(dx), Math.floor(dy), dw, dh)
  ctx.restore()
}

export function CustomizationScreen({ onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const baseSheetRef = useRef<SpriteSheet | null>(null)
  const previewSheetRef = useRef<SpriteSheet | null>(null)
  const previewCacheRef = useRef<Map<SkinTone, SpriteSheet>>(new Map())
  const [closing, setClosing] = useState(false)
  const [panelView, setPanelView] = useState<PanelView>('main')
  const [baseReady, setBaseReady] = useState(false)
  const [previewRevision, setPreviewRevision] = useState(0)
  const [highlightedTone, setHighlightedTone] = useState<SkinTone | null>(null)

  const walkSrc = useSyncExternalStore(
    subscribeCharacterStore,
    getPlayerWalkSrc,
    getPlayerWalkSrc,
  )
  const appliedSkinTone = useSyncExternalStore(
    subscribeCharacterStore,
    () => getCharacterState().skinTone,
    () => getCharacterState().skinTone,
  )

  const requestClose = useCallback(() => {
    setClosing(true)
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(onClose, FADE_MS)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  useEffect(() => {
    let cancelled = false

    void loadWalkSheet(walkSrc).then((sheet) => {
      if (cancelled || !sheet) return
      baseSheetRef.current = sheet
      setBaseReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [walkSrc])

  useEffect(() => {
    let cancelled = false

    if (!highlightedTone) {
      previewSheetRef.current = null
      setPreviewRevision((n) => n + 1)
      return () => {
        cancelled = true
      }
    }

    const cached = previewCacheRef.current.get(highlightedTone)
    if (cached?.loaded) {
      previewSheetRef.current = cached
      setPreviewRevision((n) => n + 1)
      return () => {
        cancelled = true
      }
    }

    void loadWalkSheet(getSkinToneWalkSrc(highlightedTone)).then((sheet) => {
      if (cancelled || !sheet) return
      previewCacheRef.current.set(highlightedTone, sheet)
      previewSheetRef.current = sheet
      setPreviewRevision((n) => n + 1)
    })

    return () => {
      cancelled = true
    }
  }, [highlightedTone])

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const baseSheet = baseSheetRef.current
    if (!root || !canvas || !baseReady || !baseSheet?.loaded) return

    const baseSource = getSheetDrawSource(baseSheet)
    if (!baseSource) return

    const previewSheet = previewSheetRef.current
    const previewSource =
      previewSheet?.loaded && highlightedTone ? getSheetDrawSource(previewSheet) : null
    const showPreview =
      highlightedTone !== null &&
      previewSheet?.loaded === true &&
      previewSource !== null &&
      previewSheet !== baseSheet

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

      const spriteX = width * MIDNIGHT_SCREEN_X - DISPLAY_WIDTH / 2
      const feetY = height * MIDNIGHT_SCREEN_Y
      const spriteY = Math.max(0, Math.min(feetY - DISPLAY_HEIGHT, height - DISPLAY_HEIGHT))

      drawWalkFrame(ctx, baseSource, baseSheet, spriteX, spriteY, DISPLAY_WIDTH, DISPLAY_HEIGHT, 1)

      if (showPreview && previewSheet && previewSource) {
        drawWalkFrame(
          ctx,
          previewSource,
          previewSheet,
          spriteX,
          spriteY,
          DISPLAY_WIDTH,
          DISPLAY_HEIGHT,
          PREVIEW_OPACITY,
        )
      }
    }

    drawSprites()

    const observer = new ResizeObserver(drawSprites)
    observer.observe(root)
    return () => observer.disconnect()
  }, [baseReady, highlightedTone, previewRevision, walkSrc])

  const handleOptionClick = (label: (typeof CUSTOMIZATION_OPTIONS)[number]) => {
    if (label === 'SKIN TONE') {
      setHighlightedTone(null)
      setPanelView('skin-tone')
    }
  }

  const handleSwatchSelect = (tone: SkinTone) => {
    setHighlightedTone(tone)
    const cached = previewCacheRef.current.get(tone)
    if (cached?.loaded) {
      previewSheetRef.current = cached
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

  const activeSwatchTone = highlightedTone ?? appliedSkinTone

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
            <h1 className="customization-screen__panel-title">13 GALLONS</h1>
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
                  style={{ backgroundColor: color }}
                  onClick={() => handleSwatchSelect(tone)}
                />
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

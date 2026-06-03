import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  GAME_CANVAS_HEIGHT,
  GAME_CANVAS_WIDTH,
} from '../constants/gameAssets'
import {
  GameCanvasContext,
  type GameCanvasContextValue,
  type GameLoopFn,
} from '../game/GameCanvasContext'
import './GameCanvas.css'

type Props = {
  children?: ReactNode
  className?: string
  /** DOM id of the <pre> in GameScreen that shows debug text. */
  debugHudId?: string
}

type SurfaceSize = {
  width: number
  height: number
}

function syncCanvasSurface(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
): SurfaceSize | null {
  const cssW = Math.max(1, Math.floor(canvas.clientWidth || stage.clientWidth))
  const cssH = Math.max(1, Math.floor(canvas.clientHeight || stage.clientHeight))
  if (cssW <= 0 || cssH <= 0) return null

  const dpr = window.devicePixelRatio || 1
  const bufW = Math.max(1, Math.round(cssW * dpr))
  const bufH = Math.max(1, Math.round(cssH * dpr))

  if (canvas.width !== bufW || canvas.height !== bufH) {
    canvas.width = bufW
    canvas.height = bufH
  }

  return { width: cssW, height: cssH }
}

export function GameCanvas({ children, className, debugHudId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopsRef = useRef(new Map<symbol, GameLoopFn>())
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({
    width: GAME_CANVAS_WIDTH,
    height: GAME_CANVAS_HEIGHT,
  })
  const [contextValue, setContextValue] = useState<GameCanvasContextValue | null>(
    null,
  )

  const setDebugHud = useCallback(
    (text: string) => {
      if (!debugHudId) return
      const el = document.getElementById(debugHudId)
      if (el) el.textContent = text
    },
    [debugHudId],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = canvas?.parentElement
    if (!canvas || !stage) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const applySurface = () => {
      const next = syncCanvasSurface(canvas, stage)
      if (!next) return
      setSurfaceSize(next)
    }

    applySurface()
    const observer = new ResizeObserver(applySurface)
    observer.observe(stage)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const value: GameCanvasContextValue = {
      canvas,
      ctx,
      width: surfaceSize.width,
      height: surfaceSize.height,
      registerLoop: (id, fn) => {
        loopsRef.current.set(id, fn)
      },
      unregisterLoop: (id) => {
        loopsRef.current.delete(id)
      },
      setDebugHud,
    }

    setContextValue(value)

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      for (const fn of loopsRef.current.values()) {
        fn(dt)
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      loopsRef.current.clear()
    }
  }, [setDebugHud, surfaceSize.height, surfaceSize.width])

  return (
    <div className={`game-canvas-wrap ${className ?? ''}`}>
      <div className="game-canvas-stage">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="ALIWORLD game view"
        />
        {contextValue ? (
          <div className="game-canvas-ui">
            <GameCanvasContext.Provider value={contextValue}>
              {children}
            </GameCanvasContext.Provider>
          </div>
        ) : null}
      </div>
    </div>
  )
}

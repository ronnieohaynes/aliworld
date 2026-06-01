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
  /** When true, game loops do not run (canvas keeps the last frame). */
  paused?: boolean
}

export function GameCanvas({ children, className, debugHudId, paused = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopsRef = useRef(new Map<symbol, GameLoopFn>())
  const pausedRef = useRef(paused)
  pausedRef.current = paused
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
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const value: GameCanvasContextValue = {
      canvas,
      ctx,
      width: GAME_CANVAS_WIDTH,
      height: GAME_CANVAS_HEIGHT,
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
      if (!pausedRef.current) {
        for (const fn of loopsRef.current.values()) {
          fn(dt)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      loopsRef.current.clear()
    }
  }, [setDebugHud])

  return (
    <div className={`game-canvas-wrap ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={GAME_CANVAS_WIDTH}
        height={GAME_CANVAS_HEIGHT}
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
  )
}

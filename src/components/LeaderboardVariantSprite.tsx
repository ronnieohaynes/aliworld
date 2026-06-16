import { useEffect, useRef } from 'react'
import {
  getMidnightVariantRenderTuning,
  getMidnightWalkSrc,
  type MidnightVariantId,
} from '../data/midnightVariants'
import { drawSheetFrame, getIdleFrameIndex, loadSpriteSheetWithFallback } from '../game/characterLayers'

type Props = {
  variantId: MidnightVariantId | string
  width: number
  height: number
  className?: string
}

export function LeaderboardVariantSprite({ variantId, width, height, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    const tuning = getMidnightVariantRenderTuning(variantId)
    const walkSrc = getMidnightWalkSrc(variantId)

    void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (cancelled || !sheet) return
      ctx.clearRect(0, 0, width, height)
      drawSheetFrame(
        ctx,
        sheet,
        'down',
        getIdleFrameIndex(),
        0,
        0,
        width,
        height,
        1,
        tuning,
      )
    })

    return () => {
      cancelled = true
    }
  }, [variantId, width, height])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      width={width}
      height={height}
    />
  )
}

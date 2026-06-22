import { useEffect, useRef } from 'react'
import { getMidnightWalkSrc, type MidnightVariantId } from '../data/midnightVariants'
import { drawVariantThumbnailFrame, loadSpriteSheetWithFallback } from '../game/characterLayers'

export const VARIANT_THUMBNAIL_DEFAULT_SIZE = 72

type Props = {
  variantId: MidnightVariantId | string
  size?: number
  className?: string
  /** Accessible label when the thumbnail is interactive. */
  label?: string
}

/**
 * Front-facing idle frame from the variant walk sheet (down row, idle column).
 * Shared by mothership grant picker, loadout skin gallery, and leaderboard.
 */
export function VariantThumbnail({
  variantId,
  size = VARIANT_THUMBNAIL_DEFAULT_SIZE,
  className,
  label,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    const walkSrc = getMidnightWalkSrc(variantId)

    void loadSpriteSheetWithFallback(walkSrc).then((sheet) => {
      if (cancelled || !sheet) return
      ctx.clearRect(0, 0, size, size)
      drawVariantThumbnailFrame(ctx, sheet, 0, 0, size, size)
    })

    return () => {
      cancelled = true
    }
  }, [variantId, size])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
    />
  )
}

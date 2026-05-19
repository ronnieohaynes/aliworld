import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { BATTLE_BG_PIXEL_BLOCK_PX } from '../constants/assets'

/**
 * Draw `image` into a `cw`×`ch` buffer with object-fit: cover,
 * anchoring vertical crop to the bottom (grass) like `background-position: center bottom`.
 */
function drawCoverBottom(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cw: number,
  ch: number,
) {
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  if (!iw || !ih || cw < 1 || ch < 1) return

  const destRatio = cw / ch
  const srcRatio = iw / ih

  let sx = 0
  let sy = 0
  let sw = iw
  let sh = ih

  if (srcRatio > destRatio) {
    sw = ih * destRatio
    sx = (iw - sw) / 2
    sy = 0
    sh = ih
  } else {
    sh = iw / destRatio
    sx = 0
    sy = ih - sh
    sw = iw
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, cw, ch)
}

type Props = {
  src: string
  containerRef: RefObject<HTMLDivElement | null>
  /** Approximate CSS pixel size of each block (4–6 works well). */
  pixelBlockCssPx?: number
}

export function BattlePixelBackground({
  src,
  containerRef,
  pixelBlockCssPx = BATTLE_BG_PIXEL_BLOCK_PX,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const paint = useCallback(() => {
    const root = containerRef.current
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!root || !canvas || !image?.complete || !image.naturalWidth) return

    const w = Math.max(1, root.clientWidth)
    const h = Math.max(1, root.clientHeight)
    const block = Math.max(2, pixelBlockCssPx)
    const bw = Math.max(1, Math.ceil(w / block))
    const bh = Math.max(1, Math.ceil(h / block))

    canvas.width = bw
    canvas.height = bh
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, bw, bh)
    drawCoverBottom(ctx, image, bw, bh)
  }, [containerRef, pixelBlockCssPx])

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.decoding = 'async'
    image.src = src

    const onLoad = () => {
      if (cancelled) return
      imageRef.current = image
      paint()
    }

    const onError = () => {
      if (cancelled) return
      imageRef.current = null
    }

    image.addEventListener('load', onLoad)
    image.addEventListener('error', onError)

    if (image.complete && image.naturalWidth) {
      onLoad()
    }

    return () => {
      cancelled = true
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
      imageRef.current = null
    }
  }, [src, paint])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const ro = new ResizeObserver(() => paint())
    ro.observe(root)
    return () => ro.disconnect()
  }, [containerRef, paint])

  return <canvas ref={canvasRef} className="battle-pixel-bg" aria-hidden />
}

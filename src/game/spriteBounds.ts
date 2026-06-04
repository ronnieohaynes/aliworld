export type VisibleBounds = {
  top: number
  bottom: number
  left: number
  right: number
  visH: number
  visW: number
}

const ALPHA_THRESHOLD = 8
const boundsCache = new Map<string, VisibleBounds>()

/** Reject empty scans and “full frame” bounds (unloaded sheet or bad read). */
export function isInvalidVisibleBounds(bounds: VisibleBounds, h: number, w: number): boolean {
  if (bounds.visH <= 0 || bounds.visW <= 0) return true
  if (bounds.visH >= h - 1 || bounds.visH >= h * 0.98) return true
  if (bounds.visW >= w - 1 || bounds.visW >= w * 0.98) return true
  return false
}

/** ~65% of frame height, feet at bottom — safe fallback when scan fails. */
export function saneDefaultVisibleBounds(w: number, h: number): VisibleBounds {
  const visH = Math.max(1, Math.floor(h * 0.65))
  const top = Math.max(0, h - visH)
  return {
    top,
    bottom: h - 1,
    left: 0,
    right: w - 1,
    visH,
    visW: w,
  }
}

function scanAlphaBounds(
  data: ImageData,
  w: number,
  h: number,
): VisibleBounds | null {
  let top = h
  let bottom = 0
  let left = w
  let right = 0
  let found = false

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data.data[(y * w + x) * 4 + 3]!
      if (alpha > ALPHA_THRESHOLD) {
        found = true
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  if (!found) return null

  return {
    top,
    bottom,
    left,
    right,
    visH: bottom - top + 1,
    visW: right - left + 1,
  }
}

function finalizeBounds(
  raw: VisibleBounds | null,
  w: number,
  h: number,
  cacheKey: string,
  label?: string,
): VisibleBounds {
  if (raw == null || isInvalidVisibleBounds(raw, h, w)) {
    const fallback = saneDefaultVisibleBounds(w, h)
    console.warn(
      `[autofit] invalid bounds for ${label ?? cacheKey} (${w}x${h}); using default visH=${fallback.visH}`,
    )
    boundsCache.set(cacheKey, fallback)
    return fallback
  }
  boundsCache.set(cacheKey, raw)
  return raw
}

/** Wait until the image has decoded pixels (never measure an incomplete image). */
export async function ensureImageDecoded(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    if (typeof img.decode === 'function') {
      try {
        await img.decode()
      } catch {
        /* decode() can reject for broken images; onload path still ran */
      }
    }
    return
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`image failed to load: ${img.src}`))
  })

  if (typeof img.decode === 'function') {
    try {
      await img.decode()
    } catch {
      /* see above */
    }
  }
}

function measureFramePixels(
  img: CanvasImageSource,
  w: number,
  h: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): VisibleBounds | null {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null

  ctx.clearRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  return scanAlphaBounds(ctx.getImageData(0, 0, w, h), w, h)
}

/** Measure one sprite-sheet frame at its natural pixel size (1:1). */
export function measureNaturalImageFrame(
  img: HTMLImageElement,
  frameCol: number,
  spriteColumns: number,
  cacheKey: string,
  label?: string,
): VisibleBounds {
  const frameW = Math.max(1, Math.floor(img.naturalWidth / spriteColumns))
  const frameH = Math.max(1, Math.floor(img.naturalHeight))
  const key = `nat:${cacheKey}:${frameCol}@${frameW}x${frameH}`
  const cached = boundsCache.get(key)
  if (cached) return cached

  const sx = Math.floor(frameCol * frameW)
  const raw = measureFramePixels(img, frameW, frameH, sx, 0, frameW, frameH)
  return finalizeBounds(raw, frameW, frameH, key, label)
}

/** Scan non-transparent pixels at explicit width/height; results cached by cacheKey. */
export function measureVisibleBounds(
  img: CanvasImageSource,
  w: number,
  h: number,
  cacheKey?: string,
  label?: string,
): VisibleBounds {
  const key = cacheKey ?? `generic:${w}x${h}`
  const cached = boundsCache.get(key)
  if (cached) return cached

  const raw = measureFramePixels(img, w, h, 0, 0, w, h)
  return finalizeBounds(raw, w, h, key, label)
}

/** Measure bounds on a canvas that already has pixel content. */
export function measureCanvasVisibleBounds(
  canvas: HTMLCanvasElement,
  cacheKey?: string,
  label?: string,
): VisibleBounds {
  const w = canvas.width
  const h = canvas.height
  const key = cacheKey ?? `canvas:${w}x${h}`
  const cached = boundsCache.get(key)
  if (cached) return cached

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    return finalizeBounds(null, w, h, key, label)
  }

  const raw = scanAlphaBounds(ctx.getImageData(0, 0, w, h), w, h)
  return finalizeBounds(raw, w, h, key, label)
}

export function clearVisibleBoundsCache(): void {
  boundsCache.clear()
}

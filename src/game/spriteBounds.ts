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

function scanAlphaBounds(
  data: ImageData,
  w: number,
  h: number,
): VisibleBounds {
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

  if (!found) {
    return { top: 0, bottom: h - 1, left: 0, right: w - 1, visH: h, visW: w }
  }

  return {
    top,
    bottom,
    left,
    right,
    visH: bottom - top + 1,
    visW: right - left + 1,
  }
}

/** Scan non-transparent pixels; results cached by cacheKey when provided. */
export function measureVisibleBounds(
  img: CanvasImageSource,
  w: number,
  h: number,
  cacheKey?: string,
): VisibleBounds {
  const key = cacheKey ?? `generic:${w}x${h}`
  const cached = boundsCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    const fallback: VisibleBounds = {
      top: 0,
      bottom: h - 1,
      left: 0,
      right: w - 1,
      visH: h,
      visW: w,
    }
    boundsCache.set(key, fallback)
    return fallback
  }

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  const bounds = scanAlphaBounds(ctx.getImageData(0, 0, w, h), w, h)
  boundsCache.set(key, bounds)
  return bounds
}

/** Measure bounds on a canvas that already has pixel content. */
export function measureCanvasVisibleBounds(
  canvas: HTMLCanvasElement,
  cacheKey?: string,
): VisibleBounds {
  const w = canvas.width
  const h = canvas.height
  const key = cacheKey ?? `canvas:${w}x${h}`
  const cached = boundsCache.get(key)
  if (cached) return cached

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) {
    const fallback: VisibleBounds = {
      top: 0,
      bottom: h - 1,
      left: 0,
      right: w - 1,
      visH: h,
      visW: w,
    }
    boundsCache.set(key, fallback)
    return fallback
  }

  const bounds = scanAlphaBounds(ctx.getImageData(0, 0, w, h), w, h)
  boundsCache.set(key, bounds)
  return bounds
}

export function clearVisibleBoundsCache(): void {
  boundsCache.clear()
}

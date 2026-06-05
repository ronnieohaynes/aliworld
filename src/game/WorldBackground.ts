import { loadImageWithRetry } from './loadImage'

const imageCache = new Map<string, HTMLImageElement>()
const loadingCache = new Map<string, Promise<HTMLImageElement>>()

export function loadWorldBackgroundForSrc(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return Promise.resolve(cached)

  const existing = loadingCache.get(src)
  if (existing) return existing

  const promise = loadImageWithRetry(src)
    .then((img) => {
      imageCache.set(src, img)
      return img
    })
    .catch((err) => {
      loadingCache.delete(src)
      throw err
    })

  loadingCache.set(src, promise)
  return promise
}

export function getWorldBackgroundForSrc(src: string): HTMLImageElement | null {
  return imageCache.get(src) ?? null
}

export function isWorldBackgroundLoadedForSrc(src: string): boolean {
  const img = imageCache.get(src)
  return img !== null && img !== undefined && img.complete && img.naturalWidth > 0
}

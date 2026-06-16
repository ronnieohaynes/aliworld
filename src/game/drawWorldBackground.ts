import { getWorldBackgroundForSrc, isWorldBackgroundLoadedForSrc } from './WorldBackground'

export function drawWorldMap(
  ctx: CanvasRenderingContext2D,
  mapSrc: string,
  worldWidth: number,
  worldHeight: number,
  mapDrawScale = 1,
): void {
  if (!isWorldBackgroundLoadedForSrc(mapSrc)) return
  const image = getWorldBackgroundForSrc(mapSrc)
  if (!image) return
  const dw =
    mapDrawScale !== 1
      ? Math.floor(image.naturalWidth * mapDrawScale)
      : Math.floor(worldWidth)
  const dh =
    mapDrawScale !== 1
      ? Math.floor(image.naturalHeight * mapDrawScale)
      : Math.floor(worldHeight)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, 0, 0, dw, dh)
}

/** Full-map foreground overlay (transparent PNG), drawn after Midnight/NPCs. */
export function drawWorldForegroundOverlay(
  ctx: CanvasRenderingContext2D,
  overlaySrc: string,
  worldWidth: number,
  worldHeight: number,
  mapDrawScale = 1,
): void {
  drawWorldMap(ctx, overlaySrc, worldWidth, worldHeight, mapDrawScale)
}

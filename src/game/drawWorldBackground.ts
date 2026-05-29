import { getWorldBackgroundForSrc, isWorldBackgroundLoadedForSrc } from './WorldBackground'

export function drawWorldMap(ctx: CanvasRenderingContext2D, mapSrc: string, worldWidth: number, worldHeight: number): void {
  if (!isWorldBackgroundLoadedForSrc(mapSrc)) return
  const image = getWorldBackgroundForSrc(mapSrc)
  if (!image) return
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, 0, 0, worldWidth, worldHeight)
}

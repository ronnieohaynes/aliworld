import { WORLD_CANVAS_FILL, WORLD_HEIGHT, WORLD_WIDTH } from '../constants/worldAssets'
import { getWorldBackground, isWorldBackgroundLoaded } from './WorldBackground'

export function drawWorldBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
): void {
  ctx.fillStyle = WORLD_CANVAS_FILL
  ctx.fillRect(0, 0, viewWidth, viewHeight)

  if (!isWorldBackgroundLoaded()) return

  const image = getWorldBackground()
  if (!image) return

  const camX = Math.floor(cameraX)
  const camY = Math.floor(cameraY)

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(-camX, -camY)
  ctx.drawImage(image, 0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.restore()
}

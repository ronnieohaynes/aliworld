import { TILE_SIZE, WORLD_CANVAS_FILL } from '../constants/tileAssets'
import type { TileMap } from './TileMap'
import { getTile } from './TileMap'
import { getTileset } from './Tileset'

export function drawWorldMap(
  ctx: CanvasRenderingContext2D,
  map: TileMap,
  cameraX: number,
  cameraY: number,
  viewWidth: number,
  viewHeight: number,
): void {
  ctx.fillStyle = WORLD_CANVAS_FILL
  ctx.fillRect(0, 0, viewWidth, viewHeight)

  const tileset = getTileset()
  if (!tileset.loaded) return

  const camX = Math.floor(cameraX)
  const camY = Math.floor(cameraY)

  const startCol = Math.max(0, Math.floor(camX / TILE_SIZE))
  const startRow = Math.max(0, Math.floor(camY / TILE_SIZE))
  const endCol = Math.min(map.cols - 1, Math.floor((camX + viewWidth) / TILE_SIZE))
  const endRow = Math.min(map.rows - 1, Math.floor((camY + viewHeight) / TILE_SIZE))

  ctx.save()
  ctx.translate(-camX, -camY)

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const worldX = col * TILE_SIZE
      const worldY = row * TILE_SIZE
      const tileId = getTile(map, col, row)
      tileset.draw(ctx, tileId, worldX, worldY, TILE_SIZE)
    }
  }

  ctx.restore()
}

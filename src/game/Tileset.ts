import { TILE_SRC } from '../constants/tileAssets'
import { chromaKeyImage } from './chromaKeyImage'
import { loadImage } from './loadImage'

export class Tileset {
  private tiles: (HTMLCanvasElement | null)[] = []
  private loadPromise: Promise<void> | null = null

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = Promise.all(
      TILE_SRC.map(async (src, id) => {
        const img = await loadImage(src)
        this.tiles[id] = chromaKeyImage(img, { removeGroundShadow: true })
      }),
    ).then(() => undefined)

    return this.loadPromise
  }

  get loaded(): boolean {
    return this.tiles.length > 0 && this.tiles.every((t) => t !== null)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    tileId: number,
    dx: number,
    dy: number,
    size: number,
  ): void {
    const tile = this.tiles[tileId]
    if (!tile) return
    const x = Math.round(dx)
    const y = Math.round(dy)
    const s = Math.round(size)
    ctx.drawImage(tile, 0, 0, tile.width, tile.height, x, y, s, s)
  }
}

let sharedTileset: Tileset | null = null

export function getTileset(): Tileset {
  if (!sharedTileset) {
    sharedTileset = new Tileset()
  }
  return sharedTileset
}

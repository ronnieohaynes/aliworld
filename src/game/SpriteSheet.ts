import { chromaKeyImage } from './chromaKeyImage'

export const DIRECTIONS = ['down', 'up', 'left', 'right'] as const
export type Direction = (typeof DIRECTIONS)[number]

/** Sprite sheet row index for each facing direction. */
const DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

export type FrameRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

export type SpriteSheetOptions = {
  /** Frames per direction; defaults to `columns` when omitted. */
  framesPerDirection?: number
  /** Strip flat background (RGB exports) via corner colour key. */
  chromaKey?: boolean
  /** Only remove background pixels connected to the image edge (keeps interior blacks). */
  edgeConnectedKey?: boolean
  /** Strip dark ground-shadow pixels baked into the art. */
  removeGroundShadow?: boolean
}

/**
 * Loads a PNG sprite sheet and maps direction + frame index to `drawImage` source rects.
 * Layout: `columns` frames per row, `rows` for directions (down, up, left, right), left-to-right.
 * Frame size is fixed at construction time (not derived from the loaded image).
 */
export class SpriteSheet {
  private image: HTMLImageElement | null = null
  private drawSource: CanvasImageSource | null = null
  private loadPromise: Promise<HTMLImageElement> | null = null

  readonly framesPerDirection: number

  constructor(
    public readonly src: string,
    public readonly columns: number,
    public readonly rows: number,
    public readonly frameWidth: number,
    public readonly frameHeight: number,
    options: SpriteSheetOptions = {},
  ) {
    this.framesPerDirection = options.framesPerDirection ?? columns
    this.chromaKey = options.chromaKey ?? false
    this.edgeConnectedKey = options.edgeConnectedKey ?? true
    this.removeGroundShadow = options.removeGroundShadow ?? false
  }

  private readonly chromaKey: boolean
  private readonly edgeConnectedKey: boolean
  private readonly removeGroundShadow: boolean

  load(): Promise<HTMLImageElement> {
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        this.image = img
        this.drawSource = this.chromaKey
          ? chromaKeyImage(img, {
              edgeConnected: this.edgeConnectedKey,
              removeGroundShadow: this.removeGroundShadow,
            })
          : img
        resolve(img)
      }
      img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${this.src}`))
      img.src = this.src
    })

    return this.loadPromise
  }

  get loaded(): boolean {
    return this.drawSource !== null
  }

  get imageElement(): HTMLImageElement | null {
    return this.image
  }

  /** Source rectangle for `drawImage(image, sx, sy, sw, sh, ...)` — all values floored. */
  getFrameRect(direction: Direction, frameIndex: number): FrameRect {
    const row = DIRECTION_ROW[direction]
    const col = Math.max(0, Math.min(frameIndex, this.framesPerDirection - 1))
    return {
      sx: Math.floor(col * this.frameWidth),
      sy: Math.floor(row * this.frameHeight),
      sw: Math.floor(this.frameWidth),
      sh: Math.floor(this.frameHeight),
    }
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    direction: Direction,
    frameIndex: number,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number,
  ): void {
    const source = this.drawSource
    if (!source) return
    const { sx, sy, sw, sh } = this.getFrameRect(direction, frameIndex)
    const destW = Math.floor(dw ?? sw)
    const destH = Math.floor(dh ?? sh)
    ctx.drawImage(
      source,
      sx,
      sy,
      sw,
      sh,
      Math.floor(dx),
      Math.floor(dy),
      destW,
      destH,
    )
  }
}

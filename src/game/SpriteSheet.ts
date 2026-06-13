export const DIRECTIONS = ['down', 'up', 'left', 'right'] as const
export type Direction = (typeof DIRECTIONS)[number]

/** Base body tone walk sheets: 4×4 grid (frame size derived from image at load). */
export const BASE_BODY_WALK_COLUMNS = 4
export const BASE_BODY_WALK_ROWS = 4
export const BASE_BODY_WALK_FRAMES_PER_DIRECTION = 4

/** Base body tone idle sheets: 1 row × 4 columns (directions left-to-right). */
export const BASE_BODY_IDLE_COLUMNS = 4
export const BASE_BODY_IDLE_ROWS = 1
/** Idle always uses column 0 (first frame) of the facing row. */
export const BASE_BODY_WALK_IDLE_FRAME = 0

/** Walk sheet row index for each facing direction (4×4 grid). */
const DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

/** Idle sheet column index: down, up, right, left in one horizontal row. */
const IDLE_DIRECTION_COLUMN: Record<Direction, number> = {
  down: 0,
  up: 1,
  right: 2,
  left: 3,
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
  /**
   * After load, set frame size from image pixels: naturalWidth/columns × naturalHeight/rows.
   * Used for base body tone sheets only.
   */
  deriveFrameSizeFromImage?: boolean
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
  private frameWidth: number
  private frameHeight: number

  readonly framesPerDirection: number

  constructor(
    public readonly src: string,
    public readonly columns: number,
    public readonly rows: number,
    initialFrameWidth: number,
    initialFrameHeight: number,
    options: SpriteSheetOptions = {},
  ) {
    this.frameWidth = initialFrameWidth
    this.frameHeight = initialFrameHeight
    this.framesPerDirection = options.framesPerDirection ?? columns
    this.deriveFrameSizeFromImage = options.deriveFrameSizeFromImage ?? false
  }

  private readonly deriveFrameSizeFromImage: boolean

  getFrameWidth(): number {
    return Math.floor(this.frameWidth)
  }

  getFrameHeight(): number {
    return Math.floor(this.frameHeight)
  }

  load(): Promise<HTMLImageElement> {
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        this.image = img
        if (this.deriveFrameSizeFromImage) {
          this.frameWidth = Math.floor(img.naturalWidth / this.columns)
          this.frameHeight = Math.floor(img.naturalHeight / this.rows)
        }
        this.drawSource = img
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
    const frameWidth = Math.floor(this.frameWidth)
    const frameHeight = Math.floor(this.frameHeight)
    return {
      sx: Math.floor(col * frameWidth),
      sy: Math.floor(row * frameHeight),
      sw: frameWidth,
      sh: frameHeight,
    }
  }

  /**
   * Walk cycle tile for base body tone sheets (no Midnight row padding).
   * Row 0 = down, 1 = up, 2 = left, 3 = right; columns 0–3 = walk steps.
   */
  getBodyWalkFrameRect(direction: Direction, frameIndex: number): FrameRect {
    return this.getFrameRect(direction, frameIndex)
  }

  /**
   * Idle pose on tone[N]-idle.png: 1×4 horizontal strip, sy always 0.
   * Col 0 = down, 1 = up, 2 = right, 3 = left; frameHeight = full image height.
   */
  getBodyIdleFrameRect(direction: Direction): FrameRect {
    const frameWidth = Math.floor(this.frameWidth)
    const frameHeight = Math.floor(this.frameHeight)
    if (this.rows === 1) {
      const col = IDLE_DIRECTION_COLUMN[direction]
      return {
        sx: Math.floor(col * frameWidth),
        sy: 0,
        sw: frameWidth,
        sh: frameHeight,
      }
    }
    const row = DIRECTION_ROW[direction]
    return {
      sx: 0,
      sy: Math.floor(row * frameHeight),
      sw: frameWidth,
      sh: frameHeight,
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

  /** Draw a base body tone walk/idle frame using the full grid tile. */
  drawBodyWalkFrame(
    ctx: CanvasRenderingContext2D,
    direction: Direction,
    frameIndex: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    const source = this.drawSource
    if (!source) return

    const { sx, sy, sw, sh } = this.getBodyWalkFrameRect(direction, frameIndex)
    const sWidth = Math.floor(sw)
    const sHeight = Math.floor(sh)

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      source,
      Math.floor(sx),
      Math.floor(sy),
      sWidth,
      sHeight,
      Math.floor(dx),
      Math.floor(dy),
      Math.floor(dw),
      Math.floor(dh),
    )
    ctx.restore()
  }
}

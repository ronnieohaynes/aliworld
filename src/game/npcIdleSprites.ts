import type { Direction } from './SpriteSheet'

const STORY_IDLE_ALPHA_MIN = 12
const STORY_POSE_GAP_COLUMNS = 6

/** Horizontal pose order in sheet: front, back, left profile, right profile. */
const STORY_POSE_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right']

export type StoryIdlePoseRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

export type StoryIdlePoses = Record<Direction, StoryIdlePoseRect>

function isPixelOpaque(data: Uint8ClampedArray, offset: number): boolean {
  const a = data[offset + 3]!
  if (a > STORY_IDLE_ALPHA_MIN) return true
  const r = data[offset]!
  const g = data[offset + 1]!
  const b = data[offset + 2]!
  return r < 252 || g < 252 || b < 252
}

function getOpaqueBounds(
  data: Uint8ClampedArray,
  width: number,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
): StoryIdlePoseRect | null {
  let minX = regionX + regionW
  let minY = regionY + regionH
  let maxX = regionX - 1
  let maxY = regionY - 1

  for (let y = regionY; y < regionY + regionH; y++) {
    for (let x = regionX; x < regionX + regionW; x++) {
      const i = (y * width + x) * 4
      if (!isPixelOpaque(data, i)) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < minX) return null
  return {
    sx: minX,
    sy: minY,
    sw: maxX - minX + 1,
    sh: maxY - minY + 1,
  }
}

function findHorizontalPoseColumns(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { start: number; end: number }[] {
  const colHasOpaque = new Uint8Array(width)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (isPixelOpaque(data, (y * width + x) * 4)) {
        colHasOpaque[x] = 1
        break
      }
    }
  }

  const runs: { start: number; end: number }[] = []
  let inRun = false
  let runStart = 0
  let gap = 0

  for (let x = 0; x < width; x++) {
    if (colHasOpaque[x]) {
      if (!inRun) {
        runStart = x
        inRun = true
      }
      gap = 0
    } else if (inRun) {
      gap++
      if (gap >= STORY_POSE_GAP_COLUMNS) {
        runs.push({ start: runStart, end: x - gap })
        inRun = false
        gap = 0
      }
    }
  }
  if (inRun) {
    runs.push({ start: runStart, end: width - 1 })
  }

  return runs
}

function quarterRegions(width: number, height: number): { x: number; y: number; w: number; h: number }[] {
  const quarter = Math.floor(width / 4)
  return [0, 1, 2, 3].map((i) => ({
    x: i * quarter,
    y: 0,
    w: i === 3 ? width - quarter * 3 : quarter,
    h: height,
  }))
}

export function parseStoryIdlePosesFromImage(image: HTMLImageElement): StoryIdlePoses | null {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width <= 0 || height <= 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  let runs = findHorizontalPoseColumns(data, width, height)
  if (runs.length !== STORY_POSE_DIRECTIONS.length) {
    runs = quarterRegions(width, height).map((r) => ({ start: r.x, end: r.x + r.w - 1 }))
  }

  const poses = {} as StoryIdlePoses
  for (let i = 0; i < STORY_POSE_DIRECTIONS.length; i++) {
    const dir = STORY_POSE_DIRECTIONS[i]!
    const run = runs[i]
    if (!run) return null
    const bounds = getOpaqueBounds(data, width, run.start, 0, run.end - run.start + 1, height)
    if (!bounds) return null
    poses[dir] = bounds
  }

  return poses
}

export function loadStoryIdleSheet(
  src: string,
): Promise<{ image: HTMLImageElement; poses: StoryIdlePoses } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const poses = parseStoryIdlePosesFromImage(img)
      if (!poses) {
        resolve(null)
        return
      }
      resolve({ image: img, poses })
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function drawStoryIdleNpcPose(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pose: StoryIdlePoseRect,
  dx: number,
  dy: number,
  displayW: number,
  displayH: number,
): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    image,
    Math.floor(pose.sx),
    Math.floor(pose.sy),
    Math.floor(pose.sw),
    Math.floor(pose.sh),
    Math.floor(dx),
    Math.floor(dy),
    Math.floor(displayW),
    Math.floor(displayH),
  )
}

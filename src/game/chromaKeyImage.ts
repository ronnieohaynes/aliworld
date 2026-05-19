export type ChromaKeyOptions = {
  /** Remove dark pixels that still match the keyed background (floor shadow). */
  removeGroundShadow?: boolean
  /**
   * Only key background pixels connected to the image border.
   * Preserves interior blacks (hair, pants) when the export uses a black backdrop.
   */
  edgeConnected?: boolean
  /** Per-channel colour distance scale; auto-tightened on dark backgrounds. */
  tolerance?: number
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b)

function colorDist(
  r: number,
  g: number,
  b: number,
  bgR: number,
  bgG: number,
  bgB: number,
): number {
  return Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB)
}

function matchesBg(
  r: number,
  g: number,
  b: number,
  bgR: number,
  bgG: number,
  bgB: number,
  tolerance: number,
): boolean {
  return colorDist(r, g, b, bgR, bgG, bgB) < tolerance * 3
}

function edgeFloodKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  stride: number,
  bgR: number,
  bgG: number,
  bgB: number,
  tolerance: number,
): void {
  const visited = new Uint8Array(width * height)
  const queue: number[] = []

  const trySeed = (x: number, y: number) => {
    const idx = y * width + x
    if (visited[idx]) return
    const pi = idx * stride
    if (!matchesBg(data[pi]!, data[pi + 1]!, data[pi + 2]!, bgR, bgG, bgB, tolerance)) {
      return
    }
    visited[idx] = 1
    queue.push(idx)
  }

  const tryNeighbor = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    const pi = idx * stride
    if (!matchesBg(data[pi]!, data[pi + 1]!, data[pi + 2]!, bgR, bgG, bgB, tolerance)) {
      return
    }
    visited[idx] = 1
    queue.push(idx)
  }

  for (let x = 0; x < width; x++) {
    trySeed(x, 0)
    trySeed(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    trySeed(0, y)
    trySeed(width - 1, y)
  }

  while (queue.length > 0) {
    const idx = queue.pop()!
    const pi = idx * stride
    data[pi + 3] = 0
    const x = idx % width
    const y = (idx / width) | 0
    tryNeighbor(x - 1, y)
    tryNeighbor(x + 1, y)
    tryNeighbor(x, y - 1)
    tryNeighbor(x, y + 1)
  }
}

/** Keys out a flat background sampled from image corners (typical AI / export art). */
export function chromaKeyImage(
  source: HTMLImageElement,
  options: ChromaKeyOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.naturalWidth
  canvas.height = source.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imageData
  const stride = 4

  const samples: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width * 0.02), Math.floor(height * 0.02)],
    [Math.floor(width * 0.98), Math.floor(height * 0.02)],
  ]

  let bgR = 0
  let bgG = 0
  let bgB = 0
  for (const [x, y] of samples) {
    const i = (y * width + x) * stride
    bgR += data[i]!
    bgG += data[i + 1]!
    bgB += data[i + 2]!
  }
  bgR = Math.round(bgR / samples.length)
  bgG = Math.round(bgG / samples.length)
  bgB = Math.round(bgB / samples.length)

  const bgLuma = luma(bgR, bgG, bgB)
  const tolerance =
    options.tolerance ?? (bgLuma < 48 ? 8 : 42)
  const edgeConnected = options.edgeConnected ?? true

  if (edgeConnected) {
    edgeFloodKey(data, width, height, stride, bgR, bgG, bgB, tolerance)
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * stride
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!
        if (matchesBg(r, g, b, bgR, bgG, bgB, tolerance)) {
          data[i + 3] = 0
        }
      }
    }
  }

  if (options.removeGroundShadow) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * stride
        if (data[i + 3] === 0) continue
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!
        const dr = Math.abs(r - bgR)
        const dg = Math.abs(g - bgG)
        const db = Math.abs(b - bgB)
        const L = luma(r, g, b)
        const S = sat(r, g, b)
        const nearBg = dr + dg + db < tolerance * 4
        if (nearBg && L < 72 && S < 48) {
          data[i + 3] = 0
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

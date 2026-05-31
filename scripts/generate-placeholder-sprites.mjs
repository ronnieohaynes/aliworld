/**
 * Generates placeholder PNGs for ALIWORLD asset folders until final art is ready.
 * Walk sheets: 3 frames × 4 directions (rows: down, up, left, right), 32×32 per frame.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assets = path.join(root, 'public/Assets')

const FRAME = 32
const FRAMES_PER_DIR = 3
const DIRECTIONS = 4
const SHEET_W = FRAME * FRAMES_PER_DIR
const SHEET_H = FRAME * DIRECTIONS

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function walkSheetPixels(mainRgb, accentRgb) {
  const buf = Buffer.alloc(SHEET_W * SHEET_H * 4, 0)
  const rowColors = [
    [100, 80, 200],
    [80, 200, 120],
    [200, 120, 80],
    [200, 80, 160],
  ]

  for (let row = 0; row < DIRECTIONS; row++) {
    for (let col = 0; col < FRAMES_PER_DIR; col++) {
      const ox = col * FRAME
      const oy = row * FRAME
      const bob = col === 1 ? 2 : col === 2 ? 1 : 0
      for (let y = 0; y < FRAME; y++) {
        for (let x = 0; x < FRAME; x++) {
          const px = ox + x
          const py = oy + y
          const i = (py * SHEET_W + px) * 4
          const cx = FRAME / 2
          const cy = FRAME / 2 - bob
          const dx = x - cx
          const dy = y - cy + bob
          const inBody = Math.abs(dx) < 9 && dy > -10 && dy < 8
          const inHead = dx * dx + (dy + 12) * (dy + 12) < 36
          const outline =
            Math.abs(dx) === 9 && dy > -10 && dy < 8 ||
            Math.abs(dy - 8) < 1 && Math.abs(dx) < 9

          let r = 0
          let g = 0
          let b = 0
          let a = 0

          if (inHead || inBody) {
            a = 255
            if (outline) {
              ;[r, g, b] = [20, 12, 32]
            } else if (inHead) {
              ;[r, g, b] = rowColors[row]
            } else {
              ;[r, g, b] = mainRgb
            }
            if (y === oy + FRAME - 4 + bob && Math.abs(dx) < 4) {
              ;[r, g, b] = accentRgb
            }
          }

          buf[i] = r
          buf[i + 1] = g
          buf[i + 2] = b
          buf[i + 3] = a
        }
      }
    }
  }
  return buf
}

async function writeWalkSheet(outPath, mainRgb, accentRgb) {
  ensureDir(path.dirname(outPath))
  await sharp(walkSheetPixels(mainRgb, accentRgb), {
    raw: { width: SHEET_W, height: SHEET_H, channels: 4 },
  })
    .png()
    .toFile(outPath)
}

async function writeFullBody(outPath, mainRgb, accentRgb) {
  ensureDir(path.dirname(outPath))
  const w = 48
  const h = 64
  const buf = Buffer.alloc(w * h * 4, 0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const dx = x - w / 2
      const dy = y - h + 10
      const inBody = Math.abs(dx) < 12 && dy > -48 && dy < -8
      const inHead = dx * dx + (dy + 52) * (dy + 52) < 64
      let a = 0
      let r = 0
      let g = 0
      let b = 0
      if (inHead || inBody) {
        a = 255
        ;[r, g, b] = inHead ? [180, 160, 220] : mainRgb
        if (dy > -14 && dy < -8 && Math.abs(dx) < 8) [r, g, b] = accentRgb
      }
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = a
    }
  }
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outPath)
}

const toneColors = [
  [[240, 210, 190], [60, 40, 30]],
  [[220, 185, 155], [55, 38, 28]],
  [[190, 150, 115], [50, 35, 25]],
  [[155, 115, 85], [45, 32, 22]],
  [[115, 80, 55], [40, 28, 18]],
  [[85, 55, 38], [35, 24, 16]],
]

ensureDir(assets)

await writeWalkSheet(
  path.join(assets, 'characters/midnight/midnight-default.png'),
  [91, 33, 182],
  [220, 38, 127],
)
const midnightFull = path.join(assets, 'characters/midnight/midnight-full.png')
if (!fs.existsSync(midnightFull) || fs.statSync(midnightFull).size < 10_000) {
  await writeFullBody(midnightFull, [91, 33, 182], [220, 38, 127])
}

await writeWalkSheet(
  path.join(assets, 'characters/danny-ali/danny-ali-walk.png'),
  [37, 99, 235],
  [245, 158, 11],
)
await writeFullBody(
  path.join(assets, 'characters/danny-ali/danny-ali-full.png'),
  [37, 99, 235],
  [245, 158, 11],
)

for (let t = 1; t <= 6; t++) {
  const [skin, hair] = toneColors[t - 1]
  await writeWalkSheet(
    path.join(assets, `characters/base-body/male/tone${t}-walk.png`),
    skin,
    hair,
  )
}

const placeholders = [
  'hair/male',
  'hair/female',
  'clothing/tops',
  'clothing/bottoms',
  'clothing/shoes',
  'accessories',
  'tileset',
  'ui',
  'characters/base-body/female',
]

for (const dir of placeholders) {
  ensureDir(path.join(assets, dir))
  const keep = path.join(assets, dir, '.gitkeep')
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '')
}

console.log('Placeholder sprites written under public/Assets/')

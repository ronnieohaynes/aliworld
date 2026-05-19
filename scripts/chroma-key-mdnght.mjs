/**
 * Adds alpha to `public/Assets/Characters/mdnght.png` by keying out the
 * dominant flat color sampled from corners (AI exports are usually RGB, no alpha).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const rel = 'public/Assets/Characters/mdnght.png'
const filePath = path.join(root, rel)

const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const w = info.width
const h = info.height
const stride = 4

const samples = [
  [0, 0],
  [w - 1, 0],
  [0, h - 1],
  [w - 1, h - 1],
  [Math.floor(w * 0.02), Math.floor(h * 0.02)],
  [Math.floor(w * 0.98), Math.floor(h * 0.02)],
]

const bgSamples = []
for (const [x, y] of samples) {
  const i = (y * w + x) * stride
  bgSamples.push([data[i], data[i + 1], data[i + 2]])
}

const bgR = Math.round(bgSamples.reduce((s, v) => s + v[0], 0) / bgSamples.length)
const bgG = Math.round(bgSamples.reduce((s, v) => s + v[1], 0) / bgSamples.length)
const bgB = Math.round(bgSamples.reduce((s, v) => s + v[2], 0) / bgSamples.length)

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const cornerLum = lum(bgR, bgG, bgB)

/** Light studio-style backdrop → chroma distance. Dark backdrop → treat near-black as bg. */
const lightBackdrop = cornerLum > 90

const hard = lightBackdrop ? 48 : 38
const soft = lightBackdrop ? 72 : 58

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * stride
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const d = Math.hypot(r - bgR, g - bgG, b - bgB)

    let a = 255
    if (d < hard) {
      a = 0
    } else if (d < soft) {
      a = Math.round(((d - hard) / (soft - hard)) * 255)
    }

    if (lightBackdrop) {
      const L = lum(r, g, b)
      const sat = Math.max(r, g, b) - Math.min(r, g, b)
      if (L > 228 && sat < 28) {
        a = Math.min(a, Math.max(0, Math.round((255 - L) * 6)))
      }
    }

    data[i + 3] = a
  }
}

const tmp = filePath + '.tmp.png'
await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(tmp)

fs.renameSync(tmp, filePath)
console.log('Updated', rel, 'backdrop RGB', bgR, bgG, bgB, 'lightBackdrop=', lightBackdrop)

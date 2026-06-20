/**
 * Builds `public/Assets/Characters/mdnght.png` from `danny-ali-reference.png`:
 * same canvas size, pose, proportions, and soft anti-aliased edges as the reference,
 * recolored to MDNGHT (red jacket, purple / black palette, cool skin tones).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const refPath = path.join(root, 'public/Assets/Characters/danny-ali-reference.png')
const outPath = path.join(root, 'public/Assets/Characters/mdnght.png')

const { data, info } = await sharp(refPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const H = info.height
const stride = 4

/** Character silhouette in reference (non-paper pixels) */
const X0 = 287
const X1 = 814
const Y0 = 66
const Y1 = 1357

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const sat = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b)

function isPaper(r, g, b) {
  return r > 246 && g > 246 && b > 246
}

function isBlueish(r, g, b) {
  // Reference shirt/jeans are navy / cyan; blue is often only slightly above r (e.g. 30,40,55).
  return b > r + 3 && b > g - 3 && b >= 48
}

function isWarmSkin(r, g, b, ny) {
  if (ny < 0.12 || ny > 0.4) return false
  if (b > r - 5) return false
  return r > 95 && g > 45 && r > b + 18 && luma(r, g, b) > 55 && luma(r, g, b) < 230
}

function isCapBrown(r, g, b, ny) {
  // Cap / brim warm browns sit in the upper ~28% of the sprite (same as reference)
  if (ny > 0.28) return false
  return r > 75 && g < r * 0.75 && b < r * 0.65 && r > b + 25
}

function isBeard(r, g, b, ny, L, S) {
  if (ny > 0.38 || ny < 0.2) return false
  if (L > 95) return false
  if (S < 18) return false
  // Exclude warm cap / brim oranges (handled by `isCapBrown`)
  if (r > 85 && g < r * 0.72 && b < r * 0.55) return false
  return r > b - 10 && g > b - 15 && r > 25 && !isBlueish(r, g, b)
}

function isOutline(r, g, b, L, S) {
  const mx = Math.max(r, g, b)
  if (mx < 22) return true
  if (L < 26) return true
  // Very dark neutrals only, not navy (high blue, sat ~25+)
  if (L < 38 && S < 16 && !isBlueish(r, g, b)) return true
  return false
}

/** Cool grey highlights on cheeks / brow (reference anti-aliasing) */
function isSkinGrey(r, g, b, ny, L, S) {
  if (ny < 0.18 || ny > 0.36) return false
  if (S > 42) return false
  if (L < 105 || L > 225) return false
  if (isBlueish(r, g, b)) return false
  return Math.abs(r - g) < 25 && Math.abs(g - b) < 25
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Red jacket: three-stop ramp by luma (matches reference cel-shade feel) */
function jacketRgb(L) {
  const t = Math.max(0, Math.min(1, L / 255))
  const shadow = [74, 12, 28]
  const mid = [168, 28, 48]
  const hi = [220, 58, 72]
  if (t < 0.45) {
    const u = t / 0.45
    return [lerp(shadow[0], mid[0], u), lerp(shadow[1], mid[1], u), lerp(shadow[2], mid[2], u)]
  }
  const u = (t - 0.45) / 0.55
  return [lerp(mid[0], hi[0], u), lerp(mid[1], hi[1], u), lerp(mid[2], hi[2], u)]
}

/** Dark purple pants */
function pantsRgb(L) {
  const t = Math.max(0, Math.min(1, L / 255))
  const shadow = [26, 18, 38]
  const mid = [58, 42, 78]
  const hi = [98, 78, 128]
  if (t < 0.42) {
    const u = t / 0.42
    return [lerp(shadow[0], mid[0], u), lerp(shadow[1], mid[1], u), lerp(shadow[2], mid[2], u)]
  }
  const u = (t - 0.42) / 0.58
  return [lerp(mid[0], hi[0], u), lerp(mid[1], hi[1], u), lerp(mid[2], hi[2], u)]
}

function skinRgb(L) {
  const t = Math.max(0, Math.min(1, L / 255))
  const shadow = [62, 48, 82]
  const mid = [118, 96, 142]
  const hi = [168, 148, 196]
  if (t < 0.4) {
    const u = t / 0.4
    return [lerp(shadow[0], mid[0], u), lerp(shadow[1], mid[1], u), lerp(shadow[2], mid[2], u)]
  }
  const u = (t - 0.4) / 0.6
  return [lerp(mid[0], hi[0], u), lerp(mid[1], hi[1], u), lerp(mid[2], hi[2], u)]
}

function capRgb(L) {
  const t = Math.max(0, Math.min(1, L / 255))
  const shadow = [32, 22, 48]
  const mid = [68, 52, 92]
  const hi = [108, 88, 138]
  if (t < 0.45) {
    const u = t / 0.45
    return [lerp(shadow[0], mid[0], u), lerp(shadow[1], mid[1], u), lerp(shadow[2], mid[2], u)]
  }
  const u = (t - 0.45) / 0.55
  return [lerp(mid[0], hi[0], u), lerp(mid[1], hi[1], u), lerp(mid[2], hi[2], u)]
}

function undershirtRgb(L) {
  const t = Math.max(0, Math.min(1, L / 255))
  const base = [24, 18, 36]
  const hi = [48, 40, 62]
  return [lerp(base[0], hi[0], t), lerp(base[1], hi[1], t), lerp(base[2], hi[2], t)]
}

function outlineRgb() {
  return [10, 6, 16]
}

function beardRgb(L) {
  const t = Math.max(0, Math.min(1, L / 90))
  const deep = [22, 14, 34]
  const edge = [42, 32, 58]
  return [lerp(deep[0], edge[0], t), lerp(deep[1], edge[1], t), lerp(deep[2], edge[2], t)]
}

function defaultDarkPurple(L, S) {
  const base = [34, 26, 48]
  const hi = [72, 58, 96]
  const t = Math.max(0, Math.min(1, L / 130 + S / 400))
  return [lerp(base[0], hi[0], t), lerp(base[1], hi[1], t), lerp(base[2], hi[2], t)]
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * stride
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    const L = luma(r, g, b)
    const S = sat(r, g, b)

    let ny = 0.5
    let inBand = false
    if (x >= X0 && x <= X1 && y >= Y0 && y <= Y1) {
      ny = (y - Y0) / (Y1 - Y0)
      inBand = true
    }

    if (isPaper(r, g, b)) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
      continue
    }

    // Soft paper fringe → partial alpha
    const nearPaper = r > 230 && g > 230 && b > 230 && L > 215
    let alpha = 255
    if (nearPaper) {
      const t = Math.max(0, Math.min(1, (L - 215) / 35))
      alpha = Math.round((1 - t) * 255)
      if (alpha < 8) {
        data[i + 3] = 0
        continue
      }
    }

    let out
    if (isOutline(r, g, b, L, S)) {
      out = outlineRgb()
    } else if (isCapBrown(r, g, b, ny)) {
      out = capRgb(L)
    } else if (isBeard(r, g, b, ny, L, S)) {
      out = beardRgb(L)
    } else if (isWarmSkin(r, g, b, ny)) {
      out = skinRgb(L)
    } else if (isSkinGrey(r, g, b, ny, L, S)) {
      out = skinRgb(L * 0.98)
    } else if (L > 200 && S < 45 && ny > 0.28 && ny < 0.52) {
      out = undershirtRgb(L)
    } else if (isBlueish(r, g, b)) {
      if (ny < 0.14) {
        out = capRgb(L * 0.85)
      } else if (ny < 0.58) {
        out = jacketRgb(L)
      } else {
        out = pantsRgb(L)
      }
    } else if (L > 175 && S < 55 && ny > 0.52 && ny < 0.9) {
      // desaturated jean highlights / folds
      out = pantsRgb(L * 0.92)
    } else if (inBand && L < 120) {
      out = defaultDarkPurple(L, S)
    } else if (inBand && ny > 0.88) {
      // shoes: keep near-black with slight purple
      out = [lerp(12, 28, L / 120), lerp(8, 18, L / 120), lerp(20, 36, L / 120)]
    } else {
      out = defaultDarkPurple(L, S)
    }

    data[i] = Math.round(out[0])
    data[i + 1] = Math.round(out[1])
    data[i + 2] = Math.round(out[2])
    data[i + 3] = alpha
  }
}

const tmp = outPath + '.tmp.png'
await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(tmp)
fs.renameSync(tmp, outPath)
console.log('Wrote', path.relative(root, outPath), `${W}×${H}`)

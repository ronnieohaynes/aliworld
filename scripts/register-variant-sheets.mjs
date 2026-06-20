/**
 * Detect new 1024×1024 midnight walk sheets and append stubs to variantRegistry.ts.
 *
 * Sheet layout (must match src/constants/gameAssets.ts — do not change here alone):
 *   1024×1024 canvas, 4 columns × 4 rows, 256×256 px per frame
 *   row 0=down, 1=up, 2=left, 3=right; 4 walk frames per row; idle frame index = 1
 *
 * Folder roles under public/Assets/Characters:
 *   new sprites 2/  — STAGING: drop new art here; script copies to variants/ on --apply
 *   variants/       — LIVE: registered player/reward sprites (served + in registry)
 *   midnight/       — LIVE base bodies (creation carousel); register manually, not scanned
 *   * (archive)*    — ignored
 *
 * Usage:
 *   node scripts/register-variant-sheets.mjs           # dry-run (default)
 *   node scripts/register-variant-sheets.mjs --apply   # copy staging → variants + patch registry
 *
 * After --apply: fill displayName + hidden on each TODO entry, then commit + redeploy analytics-summary.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CHARACTERS_DIR = path.join(ROOT, 'public/Assets/Characters')
const STAGING_DIR = path.join(CHARACTERS_DIR, 'new sprites 2')
const LIVE_VARIANTS_DIR = path.join(CHARACTERS_DIR, 'variants')
const REGISTRY_PATH = path.join(
  ROOT,
  'supabase/functions/analytics-summary/variantRegistry.ts',
)

/** Matches src/constants/gameAssets.ts MIDNIGHT_WALK_* constants. */
const SHEET_LAYOUT = {
  sheetWidth: 1024,
  sheetHeight: 1024,
  columns: 4,
  rows: 4,
  frameWidth: 256,
  frameHeight: 256,
  framesPerDirection: 4,
  idleFrameIndex: 1,
  directionRows: ['down', 'up', 'left', 'right'],
}

const APPLY = process.argv.includes('--apply')

const SKIP_DIR_NAMES = new Set([
  'shop items',
  'SHOP ITEMS',
  'earmuffs',
])

const SKIP_PATH_RE =
  /(?:^|[/\\])(?:npcs|base-body|danny-ali|midnight \(archive\)|new sprites \(archive\)|new sprites 2)(?:[/\\]|$)/i

const SKIP_FILE_RE =
  /(?:idle|full|earmuff|-walk\.|-Idle\.|-full\.)/i

/** Staging-only skips — artist WIP names that are not distinct variants. */
const SKIP_STAGING_BASENAMES = new Set(['midnight.png'])

function slugify(baseName) {
  return baseName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function readRegistry() {
  const source = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const ids = new Set()
  const paths = new Set()
  const basenames = new Set()

  const entryRe =
    /^\s+'([^']+)':\s*\{\s*\n\s*folder:\s*'([^']+)',\s*\n\s*file:\s*'([^']+)',/gm
  for (const match of source.matchAll(entryRe)) {
    const [, id, folder, file] = match
    ids.add(id)
    paths.add(`${folder}/${file}`)
    basenames.add(path.basename(file))
  }

  return { source, ids, paths, basenames }
}

async function isWalkSheet(absPath) {
  if (!absPath.toLowerCase().endsWith('.png')) return false
  if (SKIP_FILE_RE.test(path.basename(absPath))) return false
  if (SKIP_PATH_RE.test(absPath)) return false

  const relFromCharacters = path.relative(CHARACTERS_DIR, absPath)
  const parts = relFromCharacters.split(path.sep)
  if (parts.some((p) => SKIP_DIR_NAMES.has(p))) return false

  try {
    const meta = await sharp(absPath).metadata()
    return (
      meta.width === SHEET_LAYOUT.sheetWidth &&
      meta.height === SHEET_LAYOUT.sheetHeight
    )
  } catch {
    return false
  }
}

async function collectPngs(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out

  const walk = (current) => {
    for (const name of fs.readdirSync(current)) {
      if (name.startsWith('.')) continue
      const abs = path.join(current, name)
      const stat = fs.statSync(abs)
      if (stat.isDirectory()) {
        if (SKIP_DIR_NAMES.has(name)) continue
        walk(abs)
      } else if (name.toLowerCase().endsWith('.png')) {
        out.push(abs)
      }
    }
  }

  walk(dir)
  return out
}

function formatRegistryEntry(id, entry) {
  const shopBlock = entry.shop
    ? `\n    shop: ${JSON.stringify(entry.shop, null, 2)
        .split('\n')
        .map((line, i) => (i === 0 ? line : `    ${line}`))
        .join('\n')},`
    : ''

  return `  '${id}': {
    folder: '${entry.folder}',
    file: '${entry.file}',
    displayName: '${entry.displayName}',
    hidden: ${entry.hidden},${shopBlock}
  },`
}

function appendEntries(source, newEntries) {
  const marker = '} as const satisfies Record<string, MidnightVariantRegistryEntry>'
  const idx = source.lastIndexOf(marker)
  if (idx === -1) {
    throw new Error(`Could not find registry closing marker in ${REGISTRY_PATH}`)
  }

  const block = newEntries.map(({ id, entry }) => formatRegistryEntry(id, entry)).join('\n')
  return `${source.slice(0, idx).trimEnd()}\n${block}\n${source.slice(idx)}`
}

function ensureUniqueId(baseId, ids) {
  if (!ids.has(baseId)) return baseId
  let n = 2
  while (ids.has(`${baseId}-${n}`)) n += 1
  return `${baseId}-${n}`
}

async function main() {
  const registry = readRegistry()
  const candidates = []

  // Staging intake (primary watch folder)
  for (const abs of await collectPngs(STAGING_DIR)) {
    if (!(await isWalkSheet(abs))) continue
    candidates.push({ abs, source: 'staging' })
  }

  // Live variants tree — catch sheets already copied but not registered (e.g. reward skins)
  for (const abs of await collectPngs(LIVE_VARIANTS_DIR)) {
    if (!(await isWalkSheet(abs))) continue
    candidates.push({ abs, source: 'variants' })
  }

  const newSheets = []

  for (const { abs, source } of candidates) {
    const basename = path.basename(abs)
    if (source === 'staging' && SKIP_STAGING_BASENAMES.has(basename)) continue
    if (registry.basenames.has(basename)) continue

    const relFromCharacters = path.relative(CHARACTERS_DIR, abs).split(path.sep)
    const folder = relFromCharacters[0]
    const file =
      folder === 'variants'
        ? relFromCharacters.slice(1).join('/')
        : basename

    const registryPath = `${folder === 'variants' ? 'variants' : folder}/${file}`
    if (registry.paths.has(registryPath)) continue

    let id = slugify(path.basename(basename, '.png'))
    if (!id) {
      console.warn(`skip (empty slug): ${abs}`)
      continue
    }
    id = ensureUniqueId(id, registry.ids)

    newSheets.push({
      id,
      abs,
      source,
      folder: 'variants',
      file: source === 'staging' ? basename : file,
      layout: SHEET_LAYOUT,
    })
  }

  if (newSheets.length === 0) {
    console.log('No new walk sheets found.')
    console.log(`  staging: ${STAGING_DIR}`)
    console.log(`  live scan: ${LIVE_VARIANTS_DIR}`)
    return
  }

  console.log(`Found ${newSheets.length} new sheet(s) not in variantRegistry.ts:\n`)
  for (const sheet of newSheets) {
    console.log(`  • ${sheet.id}`)
    console.log(`    disk: ${path.relative(ROOT, sheet.abs)}`)
    console.log(`    source: ${sheet.source}`)
    console.log(
      `    layout: ${SHEET_LAYOUT.sheetWidth}×${SHEET_LAYOUT.sheetHeight}, ` +
        `${SHEET_LAYOUT.columns}×${SHEET_LAYOUT.rows} grid @ ` +
        `${SHEET_LAYOUT.frameWidth}×${SHEET_LAYOUT.frameHeight}px`,
    )
    console.log(
      `    registry path: variants/${sheet.file}`,
    )
    console.log(`    TODO: displayName (in-world name)`)
    console.log(`    TODO: hidden (true = secret / mothership shows "(hidden)")`)
    console.log(`    shop: (optional, dormant) price, section, baseVariantId`)
    console.log('')
  }

  if (!APPLY) {
    console.log('Dry run — no files changed. Re-run with --apply to copy staging sheets + patch registry.')
    return
  }

  const entriesToAppend = []

  for (const sheet of newSheets) {
    const destAbs = path.join(LIVE_VARIANTS_DIR, sheet.file)
    if (sheet.source === 'staging') {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true })
      if (fs.existsSync(destAbs)) {
        console.warn(`skip copy (already exists): ${destAbs}`)
      } else {
        fs.copyFileSync(sheet.abs, destAbs)
        console.log(`copied → ${path.relative(ROOT, destAbs)}`)
      }
    } else if (!fs.existsSync(destAbs)) {
      console.warn(`warn: registered source missing on disk: ${destAbs}`)
    }

    entriesToAppend.push({
      id: sheet.id,
      entry: {
        folder: 'variants',
        file: sheet.file,
        displayName: 'TODO: in-world display name',
        hidden: true,
        shop: {
          section: 'skin',
        },
      },
    })
    registry.ids.add(sheet.id)
    registry.basenames.add(path.basename(sheet.file))
  }

  const nextSource = appendEntries(registry.source, entriesToAppend)
  fs.writeFileSync(REGISTRY_PATH, nextSource, 'utf8')
  console.log(`\nPatched ${path.relative(ROOT, REGISTRY_PATH)} with ${entriesToAppend.length} stub entries.`)
  console.log('\nNext: fill displayName + hidden for each TODO, commit, push, redeploy analytics-summary.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

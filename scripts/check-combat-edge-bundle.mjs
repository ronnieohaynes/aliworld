import { build } from 'esbuild'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const committedPath = join(root, 'supabase/functions/_shared/combatReplayBundle.js')
const stubDir = join(root, 'scripts/edge-stubs')

function stubFor(path) {
  if (path.endsWith('/playerStore.ts') || path.endsWith('/playerStore')) {
    return join(stubDir, 'playerStore.ts')
  }
  if (path.endsWith('/supabaseClient.ts') || path.endsWith('/supabaseClient')) {
    return join(stubDir, 'supabaseClient.ts')
  }
  if (path.endsWith('/authStore.ts') || path.endsWith('/authStore')) {
    return join(stubDir, 'authStore.ts')
  }
  if (path.endsWith('/analytics.ts') || path.endsWith('/analytics')) {
    return join(stubDir, 'analytics.ts')
  }
  return null
}

const tmpDir = mkdtempSync(join(tmpdir(), 'combat-edge-check-'))
const freshPath = join(tmpDir, 'combatReplayBundle.js')

try {
  await build({
    entryPoints: [join(root, 'combat-core/runBattle.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: freshPath,
    logLevel: 'silent',
    plugins: [
      {
        name: 'edge-stubs',
        setup(api) {
          api.onResolve({ filter: /.*/ }, (args) => {
            const stub = stubFor(args.path)
            if (stub) return { path: stub }
            return null
          })
        },
      },
    ],
  })

  const committed = readFileSync(committedPath)
  const fresh = readFileSync(freshPath)

  if (committed.length !== fresh.length || !committed.equals(fresh)) {
    console.error('check-combat-edge-bundle: STALE — committed bundle differs from combat-core source.')
    console.error('  Run: npm run build:combat-edge')
    console.error(`  committed: ${committedPath}`)
    process.exit(1)
  }

  console.log('check-combat-edge-bundle: OK (bundle matches combat-core source)')
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
}

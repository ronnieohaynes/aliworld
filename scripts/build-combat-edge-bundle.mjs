import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
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

await build({
  entryPoints: [join(root, 'combat-core/runBattle.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(root, 'supabase/functions/_shared/combatReplayBundle.js'),
  logLevel: 'info',
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

console.log('combat-edge bundle ready')

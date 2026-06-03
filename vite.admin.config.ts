import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Separate /admin build — anon key + admin secret only; NO service role in client. */
export default defineConfig(({ mode }) => {
  const envDir = process.cwd()
  const env = loadEnv(mode, envDir, '')

  return {
    root: 'admin',
    envDir,
    publicDir: false,
    plugins: [react()],
    define: {
      __ANALYTICS_ADMIN_SECRET__: JSON.stringify(env.VITE_ANALYTICS_ADMIN_SECRET ?? ''),
    },
    server: {
      port: 5174,
      strictPort: true,
    },
    build: {
      outDir: '../dist-admin',
      emptyOutDir: true,
    },
  }
})

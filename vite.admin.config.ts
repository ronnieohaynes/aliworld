import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Admin mothership — built into dist/admin for play.dannyali.com/admin */
export default defineConfig({
  base: '/admin/',
  root: 'admin',
  envDir: process.cwd(),
  publicDir: false,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: '../dist/admin',
    emptyOutDir: true,
  },
})

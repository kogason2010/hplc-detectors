import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`         → normal multi-file build in dist/ (for hosting)
// `npm run build:single`  → one self-contained dist-single/index.html (for review / offline)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  // relative asset paths, so the site works at https://<user>.github.io/<any-repo-name>/
  base: './',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
}))

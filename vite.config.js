import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/brand.js'

// Fills %BRAND_NAME% / %BRAND_FAVICON% in index.html from src/brand.js.
const brandHtml = {
  name: 'brand-html',
  transformIndexHtml: (html) => html
    .replaceAll('%BRAND_NAME%', BRAND.name)
    .replaceAll('%BRAND_FAVICON%', BRAND.favicon),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), brandHtml],

  // MapLibre ships its renderer and a separate web worker as sibling ESM
  // files (maplibre-gl.mjs + maplibre-gl-worker.mjs). The dev-time dependency
  // optimizer rewrites the entry but not the worker URL it resolves at
  // runtime, so the worker 404s and the map draws nothing at all -- no error
  // in the page, just an empty panel. Excluding the package leaves its own
  // module graph intact, which is what the worker URL is relative to.
  // Costs a slightly slower first dev load; the production build is
  // unaffected, it never used the optimizer.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})

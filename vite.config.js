import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { BRAND } from './src/brand.js'

// Fills the %BRAND_*% tokens in index.html from src/brand.js.
const TOKENS = {
  '%BRAND_NAME%': BRAND.name,
  '%BRAND_SLOGAN%': BRAND.slogan,
  '%BRAND_DESCRIPTION%': BRAND.description,
  '%BRAND_FAVICON%': BRAND.favicon,
  '%BRAND_FAVICON32%': BRAND.favicon32,
  '%BRAND_APPLE_TOUCH_ICON%': BRAND.appleTouchIcon,
  '%BRAND_OG_IMAGE%': BRAND.siteUrl + BRAND.ogImage,
}
const brandHtml = {
  name: 'brand-html',
  transformIndexHtml: (html) =>
    Object.entries(TOKENS).reduce((h, [k, v]) => h.replaceAll(k, v), html),
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

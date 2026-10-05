import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Lists every emitted file in `precache.json` (read by public/sw.js on install, so the app works offline after
 * the first visit) and stamps a build id into sw.js so each deploy installs a fresh worker.
 * The hls.js chunk is left out: it is only needed for HLS stations, which need a connection anyway.
 */
function precacheManifest(): Plugin {
  let outDir = 'dist'
  return {
    name: 'precache-manifest',
    apply: 'build',
    configResolved: config => { outDir = config.build.outDir },
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter(f => !f.endsWith('.map') && !f.startsWith('assets/hls-')).map(f => `/${f}`)
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
    },
    writeBundle() {
      const sw = join(outDir, 'sw.js')
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_ID__', Date.now().toString(36)))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheManifest()],
  server: {
    host: true, // needed for Docker access
    port: 3000,
  },
  // the globe and hls.js chunks are lazy-loaded on purpose
  build: { chunkSizeWarningLimit: 1000 },
  test: { environment: 'node' },
})

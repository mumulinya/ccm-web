import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = path.dirname(fileURLToPath(import.meta.url))
const ccmPackage = JSON.parse(fs.readFileSync(path.resolve(frontendDir, '../ccm-package/package.json'), 'utf8'))

export default defineConfig({
  plugins: [vue()],
  define: {
    __CCM_VERSION__: JSON.stringify(ccmPackage.version),
  },
  build: {
    outDir: '../ccm-package/public',
    emptyOutDir: true,
  },
  server: {
    port: 3081,
    proxy: {
      '/api': {
        target: 'http://localhost:3080',
        changeOrigin: true,
      }
    }
  }
})

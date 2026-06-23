import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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

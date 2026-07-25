import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5280,
    strictPort: false,
    // 前端联调：将 /api 转发到 amos-server（默认 8080，可用 VITE_API_TARGET 覆盖）
    proxy: {
      '/api': {
        target: (process.env.VITE_API_TARGET || 'http://localhost:8080'),
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

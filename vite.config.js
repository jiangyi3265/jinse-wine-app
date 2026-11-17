import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
export default defineConfig({
  plugins: [uni.default ? uni.default() : uni()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/dev-api': {
        target: process.env.VITE_LOCAL_API_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-api/, ''),
      },
    },
  },
})

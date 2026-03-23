import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api.php': {
        target: 'http://localhost/funagig',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost/funagig',
        changeOrigin: true
      }
    }
  }
})

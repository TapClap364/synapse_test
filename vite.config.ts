import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Прокси для локальной разработки, чтобы fetch('/api') работал
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    }
  }
})
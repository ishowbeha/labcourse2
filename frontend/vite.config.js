import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-bootstrap': ['react-bootstrap', 'bootstrap'],
          'vendor-zustand': ['zustand'],
          'vendor-pdf': ['jspdf'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
})

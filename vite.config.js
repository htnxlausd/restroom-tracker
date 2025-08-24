import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project under https://htnxlausd.github.io/restroom-tracker/
  base: '/restroom-tracker/',
  build: {
    chunkSizeWarningLimit: 900, // optional: relax the warning threshold
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore'],
          pdf: ['jspdf'],
          icons: ['lucide-react'],
        }
      }
    }
  }
})

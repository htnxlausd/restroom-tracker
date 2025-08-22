import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base must match your repo name: https://htnxlausd.github.io/restroom-tracker/
export default defineConfig({
  plugins: [react()],
  base: '/restroom-tracker/',
})

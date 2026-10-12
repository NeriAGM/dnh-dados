import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// La app vive en https://neriagm.github.io/dnh-dados/, por eso la base es /dnh-dados/.
export default defineConfig({
  base: '/dnh-dados/',
  plugins: [svelte()],
  build: {
    chunkSizeWarningLimit: 1200,
  },
})

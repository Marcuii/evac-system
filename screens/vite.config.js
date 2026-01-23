/**
 * @fileoverview Vite Configuration
 * @description Build tool configuration for the Emergency Evacuation Screens app.
 *              Configures React plugin, dev server, and build output.
 *
 * @see https://vitejs.dev/config/
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3060,
    host: true,
  },
  preview: {
    port: 3060,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

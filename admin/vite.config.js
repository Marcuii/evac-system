/**
 * @fileoverview Vite Configuration
 * @description Build tool configuration for the EES Admin Dashboard.
 *              Configures React plugin, dev server, and build output.
 *
 * @see https://vitejs.dev/config/
 * @author Marcelino Saad
 * @version 1.0.0
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration
 * @type {import('vite').UserConfig}
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.VITE_PORT, 10) || 3030

  return {
    plugins: [react()],
    server: {
      port,
      host: true,
    },
    preview: {
      port,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})

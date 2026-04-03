import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['funarcade_logo.png'],
      manifest: {
        name: 'FunArcade',
        short_name: 'FunArcade',
        description: 'Premium Multiplayer Arcade Suite',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'funarcade_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'funarcade_logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['arun_logo.png'],
      manifest: {
        name: 'Fun Arcade',
        short_name: 'Arcade',
        description: 'Premium Multiplayer Arcade Suite',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'arun_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'arun_logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})

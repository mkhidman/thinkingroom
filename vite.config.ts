import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Ruang — Personal Life OS',
        short_name: 'Ruang',
        description: 'Satu ruang untuk tugas, jadwal, rutinitas, ibadah, catatan, dan keuangan pribadi.',
        theme_color: '#005BAC',
        background_color: '#F4F7FB',
        display: 'standalone',
        id: '/',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'sigil.svg', 'robots.txt'],
      manifest: {
        name: 'Dobleuno',
        short_name: 'Dobleuno',
        description: 'El compañero de mesa para Warhammer: The Old World',
        theme_color: '#a01919',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        /**
         * Brand kit (escudos, heroes, tiles) tiene assets de 3-7 MB.
         * Default de workbox es 2 MiB → subimos a 10 MiB para que entren
         * al precache (sin esto, el build falla al final).
         */
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        /**
         * Ola 12 — Con la API y el SPA en el mismo origen, el navigateFallback
         * del service worker pasa a cubrir también las rutas /api/*: una
         * navegación a un endpoint (un redirect de auth, abrir la API en una
         * pestaña) recibiría el index.html en vez de la respuesta real, y el
         * síntoma es incomprensible. Antes no pasaba porque la API vivía en
         * otro origen y el SW ni la veía.
         */
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Ola 10 — Fotos de las crónicas. Va ANTES de la regla de /api/*
            // porque si no las trata como respuestas de API: NetworkFirst con
            // 24h de expiración, para archivos que son inmutables por diseño
            // (cada uno lleva su propio UUID en el nombre).
            urlPattern: /\/api\/media\/cronicas\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dobleuno-fotos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /**
             * Todo /api/ menos las fotos, que tienen su propia regla arriba.
             *
             * Era `^https://api.dobleuno.app/api/` — un host que con la
             * topología de un solo origen no matchea nunca, así que esta regla
             * estaba muerta y la API se quedaba sin caché offline.
             */
            urlPattern: /^\/api\/(?!media\/).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dobleuno-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\.(?:woff2|ttf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dobleuno-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // PWA solo en prod por ahora
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dobleuno/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    /**
     * Proxy de /api/* al backend Express (apps/server, puerto 3000).
     * Sin esto, Vite responde el index.html de la SPA para todo, y el cliente
     * nunca llega al server.
     */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
        },
      },
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'node:path';

// Upload de source maps só roda quando SENTRY_AUTH_TOKEN está presente (CI/deploy).
// Sem o token (dev local), o plugin é omitido e o build segue normal.
const sentryPlugins = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: process.env.VITE_APP_VERSION },
      }),
    ]
  : [];

export default defineConfig({
  // 'hidden' gera os .map para upload ao Sentry sem referenciá-los no bundle servido.
  build: { sourcemap: 'hidden' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'PokerHub',
        short_name: 'PokerHub',
        description: 'Gerenciamento de torneios de poker',
        lang: 'pt-BR',
        theme_color: '#211f1a',
        background_color: '#211f1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell precacheado; API/SignalR ficam de fora (origem diferente — a Container App).
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
    // Sentry por último (precisa ver o output final p/ associar source maps).
    ...sentryPlugins,
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Tudo sob /api vai para a PokerHub.Api local (launchSettings: http://localhost:5100).
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
      // SignalR do timer (hub em /hub/tournaments) — precisa de WebSocket.
      '/hub': {
        target: 'http://localhost:5100',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

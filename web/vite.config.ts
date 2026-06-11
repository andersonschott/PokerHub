import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Tudo sob /api vai para a PokerHub.Api local (launchSettings: http://localhost:5100).
      // /hubs (SignalR) entra só na Fase 4.
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
});

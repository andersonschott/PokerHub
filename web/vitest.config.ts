import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    // URL base para que window.location.href = '/login' resolva sem erro.
    environmentOptions: { happyDOM: { url: 'http://localhost:5173/app' } },
    // Patches localStorage for happy-dom ↔ vitest worker VM boundary compatibility.
    setupFiles: ['./src/test/setup.ts'],
  },
});

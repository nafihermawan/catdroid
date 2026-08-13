import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Halaman, status, dan endpoint aksi backend Express.
      '/api': 'http://localhost:3001',
      // WebSocket logcat stream.
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
});

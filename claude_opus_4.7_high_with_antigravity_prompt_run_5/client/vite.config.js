import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // REST API is proxied through Vite. The Socket.io connection is opened
      // directly to http://localhost:4000 from BoardPage.jsx in dev — Vite's
      // WebSocket proxy is unreliable with Socket.io's upgrade handshake.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});

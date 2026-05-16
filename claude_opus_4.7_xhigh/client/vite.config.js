import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev`, the Vite dev server proxies API and Socket.io traffic
// to the Express server on port 4000. In production, the Express server serves
// the built static assets directly so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_URL = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': SERVER_URL,
      '/socket.io': {
        target: SERVER_URL,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});

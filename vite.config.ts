import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/map/',
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2019',
    sourcemap: true
  }
});

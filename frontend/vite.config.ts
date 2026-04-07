import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  envDir: '../',
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
});

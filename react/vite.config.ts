import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '../../',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', //'http://127.0.0.1:4000',
        changeOrigin: true,
        // 중요: 주소의 '/api' 부분을 '/addhelper'로 바꿔서 백엔드에 전달합니다.
        rewrite: (path) => path.replace(/^\/api/, '/addhelper'),
      },
      '/addhelper': {
        target: 'http://localhost:8000', // 'https://gen-proj.duckdns.org',
        changeOrigin: true,
        secure: true,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});

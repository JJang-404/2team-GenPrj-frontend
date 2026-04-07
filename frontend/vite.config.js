import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy 헤더가 필요합니다.
// @imgly/background-removal 이 내부적으로 SharedArrayBuffer 를 사용하기 때문입니다.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})

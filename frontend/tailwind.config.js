/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 이 부분이 src 폴더 안의 파일들을 감시하게 합니다.
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
# 로컬 프록시 404 오류 해결 가이드

현재 백엔드 로그에 `POST /api/bridge/editing HTTP/1.1" 404 Not Found` 메시지가 발생하는 원인과 해결 방법입니다.

## 1. 문제 원인
- **프론트엔드**: `/api/bridge/editing` 주소로 데이터를 보냅니다.
- **백엔드(FastAPI)**: 모든 API 주소가 `/addhelper/...`로 시작하기 때문에, `/api/...`로 시작하는 요청을 인식하지 못하고 404 에러를 응답합니다.
- **누락된 설정**: Vite 프록시 설정에서 `/api`를 `/addhelper`로 바꿔주는 **경로 재작성(Rewrite)** 로직이 빠져 있습니다.

## 2. 해결 방법: `vite.config.js` 수정

프론트엔드 프로젝트 루트에 있는 `vite.config.js` (또는 `vite.config.ts`) 파일을 다음과 같이 수정하세요.

```javascript
// react/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 핵심: /api 로 오는 모든 요청을 가로채서 처리합니다.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 중요: 주소의 '/api' 부분을 '/addhelper'로 바꿔서 백엔드에 전달합니다.
        rewrite: (path) => path.replace(/^\/api/, '/addhelper'),
      },
      // /addhelper 로 직접 들어오는 요청도 처리합니다.
      '/addhelper': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

## 3. 적용 및 확인 단계

1. **Vite 서버 재시작**: `vite.config.js` 파일을 수정한 후에는 반드시 터미널에서 `Ctrl+C`를 눌러 서버를 껐다가 **`npm run dev`로 다시 실행**해야 설정이 적용됩니다.
2. **테스트**: 디자인 편집 버튼을 다시 눌러봅니다.
3. **로그 확인**:
   - **백엔드 터미널**: `"POST /addhelper/bridge/editing HTTP/1.1" 200 OK` (또는 201) 라고 찍히면 성공입니다.
   - **브라우저 콘솔**: 404 에러가 사라지고 페이지가 이동하는지 확인합니다.

## 4. 주의사항
- 만약 위 설정을 적용했는데도 여전히 404가 뜬다면, 백엔드(`Backend_final`) 코드에 해당 API 엔드포인트(`@app.post("/addhelper/bridge/editing")`)가 실제로 정의되어 있는지 확인해야 합니다.

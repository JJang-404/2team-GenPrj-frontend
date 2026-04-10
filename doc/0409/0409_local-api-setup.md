# 로컬 백엔드 연동 설정 가이드 (8000 포트)

현재 발생 중인 `ECONNREFUSED 127.0.0.1:4000` 오류를 해결하고, 로컬에서 실행 중인 백엔드(`http://localhost:8000/addhelper`)와 연동하기 위한 수정 방법입니다.

## 1. Vite 프록시 설정 수정
프론트엔드 개발 서버(Vite)가 API 요청을 어디로 보낼지 결정하는 설정입니다.

**대상 파일**: `react/vite.config.ts` (또는 `vite.config.js`)

```javascript
// 수정 전 (예시)
proxy: {
  '/api': {
    target: 'http://127.0.0.1:4000',
    changeOrigin: true,
  },
}

// 수정 후
proxy: {
  '/api': {
    target: 'http://localhost:8000', // 8000번 포트로 변경
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '/addhelper'), // /api로 시작하는 요청을 /addhelper로 변환
  },
  '/addhelper': {
    target: 'http://localhost:8000',
    changeOrigin: true,
  }
}
```

## 2. API 기본 URL 설정 수정
프론트엔드 코드 내에서 참조하는 백엔드 기본 주소를 업데이트합니다.

**대상 파일**: `react/src/server/common/defines.js`

```javascript
// 수정 전
export const BACKEND_BASE_URL = 'https://gen-proj.duckdns.org/addhelper';

// 수정 후
export const BACKEND_BASE_URL = 'http://localhost:8000/addhelper';
```

## 3. 환경 변수 설정 (.env)
코드 수정 없이 가장 깔끔하게 변경하는 방법입니다. 프로젝트 최상위 루트의 `.env` 파일을 확인하세요.

**대상 파일**: `.env`

```env
# 로컬 테스트용 백엔드 주소 설정
VITE_BACKEND_BASE_URL=http://localhost:8000/addhelper
PORT=8000
```

## 4. 백엔드 서버 확인 사항
백엔드 서버(`Backend_final`)가 정상적으로 요청을 받을 수 있도록 다음을 확인하세요.

1. **포트 번호**: 서버가 `8000` 포트에서 실행 중인지 확인합니다.
2. **CORS 설정**: 로컬 테스트 시 브라우저 차단을 막기 위해 백엔드 코드에 `localhost:5173` (프론트엔드 주소) 허용 로직이 있어야 합니다.
3. **경로 접두사**: 모든 API가 `/addhelper` 하위 경로(예: `/addhelper/api/health`)로 정의되어 있는지 확인합니다.

## 5. 적용 방법
1. 위의 파일들을 수정하고 저장합니다.
2. **백엔드 서버**를 실행합니다 (`uvicorn main:app --port 8000` 등).
3. **프론트엔드 터미널**을 종료했다가 다시 실행합니다 (`npm run dev`).
4. 브라우저에서 디자인 편집을 시도하여 요청이 `localhost:8000`으로 가는지 확인합니다.

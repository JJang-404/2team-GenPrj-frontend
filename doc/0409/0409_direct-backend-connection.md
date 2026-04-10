# 백엔드 직접 연결(Direct Connection) 설정 가이드

Vite 프록시 사용 시 대용량 데이터 전송에서 발생하는 `ECONNRESET` 오류를 해결하기 위해, 프록시를 거치지 않고 백엔드 서버와 직접 통신하도록 설정하는 방법입니다.

## 1. 프론트엔드 설정 변경

프론트엔드가 API 주소를 결정하는 로직을 수정하여 로컬 백엔드 주소를 직접 바라보게 합니다.

**대상 파일**: `react/src/server/common/functions.js`

```javascript
// react/src/server/common/functions.js

export function getBackendUrl() {
  // Vite 프록시(/addhelper)를 사용하지 않고 8000번 포트로 직접 연결합니다.
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/addhelper';
  }

  // 배포 환경 설정
  return import.meta.env.VITE_BACKEND_BASE_URL || 'https://gen-proj.duckdns.org/addhelper';
}
```

## 2. 백엔드 CORS 설정 확인 (필수)

프록시를 거치지 않으면 브라우저의 보안 정책(CORS)에 의해 요청이 차단될 수 있습니다. 백엔드 서버에서 프론트엔드 주소(`http://localhost:5173`)를 허용해줘야 합니다.

**대상 파일**: `Backend1/app/main.py`

```python
# Backend1/app/main.py

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 설정: 프론트엔드에서 직접 오는 요청을 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # 프론트엔드 개발 서버 주소
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 3. 적용 방법 및 장점

### 적용 단계
1. `functions.js`에서 반환 값을 `http://localhost:8000/addhelper`로 수정합니다.
2. 백엔드 `main.py`에 위 CORS 설정이 있는지 확인하고 서버를 재시작합니다.
3. 프론트엔드 서버를 재시작합니다 (`npm run dev`).

### 장점
- **Vite 프록시 부하 감소**: Vite 개발 서버가 대용량 데이터를 중계하면서 발생하는 오버헤드가 사라집니다.
- **연결 안정성**: 대용량 이미지 전송 시 프록시 서버의 타임아웃이나 용량 제한 설정에 영향을 받지 않습니다.
- **디버깅 용이**: 브라우저 네트워크 탭에서 실제 백엔드 주소로 요청이 가는 것을 직접 확인할 수 있습니다.

---

**주의**: 이 설정을 적용하면 브라우저 개발자 도구(F12)의 Network 탭에서 요청 주소가 `/addhelper/...`가 아닌 `http://localhost:8000/addhelper/...`로 표시됩니다.

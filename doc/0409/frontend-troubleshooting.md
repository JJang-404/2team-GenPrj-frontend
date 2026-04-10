# Frontend Troubleshooting Guide

프론트엔드 개발 중 발생할 수 있는 주요 오류와 해결 방법입니다.

## 1. [vite] Pre-transform error: Failed to resolve import "axios"

### 현상
`src/server/api/baseApi.js` 등에서 `import axios from 'axios'` 구문을 처리하지 못해 발생하는 오류입니다.

### 원인
현재 프로젝트의 `node_modules` 폴더에 `axios` 라이브러리가 설치되어 있지 않기 때문입니다.

### 해결 방법
프론트엔드 프로젝트 루트(`react/`) 폴더에서 다음 명령어를 실행하여 라이브러리를 설치하세요.
```powershell
npm install axios
```
설치 후 Vite 개발 서버를 재시작(`npm run dev`) 하시기 바랍니다.

---

## 2. http proxy error: connect ECONNREFUSED 127.0.0.1:4000

### 현상
`http://127.0.0.1:4000/api/...` 경로로 요청을 보냈으나 연결이 거부된 상태입니다.

### 원인
1. **백엔드 서버 미가동**: 4000번 포트로 백엔드 서버가 실행되고 있지 않습니다.
2. **잘못된 포트 설정**: 백엔드가 다른 포트(예: 8000)에서 실행 중인데 프론트엔드 프록시 설정은 4000으로 되어 있는 경우입니다.
3. **호스트 바인딩 문제**: 백엔드가 `localhost`가 아닌 특정 IP에만 바인딩되어 있을 때 발생할 수 있습니다.

### 해결 방법
1. **백엔드 서버 실행 확인**: 
   - `Backend/` 폴더에서 서버가 실행 중인지 확인하세요 (`node src/server.js`).
   - 콘솔에 `Demo backend listening on http://127.0.0.1:4000` 문구가 떠 있는지 확인합니다.
2. **포트 일치 확인**: 
   - 백엔드의 `server.js`에서 사용하는 포트와 `vite.config.js`의 `proxy` 설정 포트가 모두 `4000`으로 동일한지 확인하세요.
3. **백엔드 접속 테스트**: 
   - 브라우저 주소창에 직접 `http://127.0.0.1:4000/api/health`를 입력하여 `{"ok": true}`가 나오는지 먼저 확인하세요. 이 단계가 안 된다면 백엔드 서버의 문제입니다.

---

## 3. 요약 체크리스트
- [ ] 프론트엔드에서 `npm install`을 완료했는가?
- [ ] 백엔드 서버가 먼저 실행되었는가?
- [ ] `.env` 파일이 올바른 위치(최상위 루트)에 있는가?

# Git 업로드 가이드

### `frontend/` 폴더 구성 요소
아래 파일·폴더가 포함되어 있으면 충분합니다.

```
frontend/
├── src/              ← 소스 코드 전체
├── public/           ← 폰트, 아이콘 (필수 에셋)
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
└── README.md
```

### 올리지 않아도 되는 것 (`.gitignore` 대상)
- `node_modules/`: `npm install`로 복원 가능
- `dist/`: `npm run build`로 생성되는 결과물

### ⚠ `public/` 폴더 확인 (필수 에셋)
아래 파일들이 빠지면 폰트와 토글 아이콘이 정상적으로 표시되지 않습니다.
- `public/fonts/ZEN-SERIF-TTF-Regular.ttf`: 광고 제목 폰트
- `public/icons/visuable.png`: 표시 상태 아이콘
- `public/icons/blindfold.png`: 숨김 상태 아이콘

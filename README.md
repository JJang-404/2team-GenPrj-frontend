# 2팀 AI 광고 생성 서비스 통합 프로젝트

디자인 초안 생성(`features/init`)과 AI 배경 편집(`features/editor`)을 하나의 SPA로 통합한 프로젝트입니다.

---

## 폴더 구조

```
2team-GenPrj-frontend_United/
├── Frontend/                  ← 통합 프론트엔드 (Vite + React + TypeScript, Port: 5174)
│   ├── src/
│   │   ├── App.tsx            ← 루트: 1단계(init) ↔ 2단계(editor) 전환
│   │   ├── features/init/     ← 1단계: 드래프트 선택 및 기본 정보 입력
│   │   └── features/editor/   ← 2단계: 배경 생성 및 요소 편집
│   └── vite.config.ts         ← /api → localhost:4000 프록시 설정
│
├── backend/                   ← Node.js 백엔드 (Express, Port: 4000)
│   └── src/
│       ├── routes/editorRoutes.js
│       └── services/          ← 템플릿, 배경 생성, AI 연동 서비스
│
└── .env.example               ← 환경변수 템플릿 (복사 후 .env 생성)
```

---

## 실행 방법

### 0) 환경변수 설정

```bash
# 프로젝트 루트에서
cp .env.example .env
# .env 파일을 열어 HF_TOKEN 등 필요한 값 입력
```

### 1) 백엔드 실행 (필수)

```bash
cd backend
npm install
npm run dev   # http://localhost:4000
```

정상 실행 확인: http://localhost:4000/api/health → `{"ok":true}`

### 2) 프론트엔드 실행

```bash
cd Frontend
npm install
npm run dev   # http://localhost:5174
```

---

## API 키 안내

| 기능 | 필요 환경변수 | 키 없을 때 동작 |
|------|--------------|----------------|
| 템플릿 로드, CSS 배경 생성 | 없음 | 정상 작동 |
| AI 이미지 배경 생성 | `HF_TOKEN` | 해당 기능만 오류 |
| 제품 사진 배경 제거 | `HF_TOKEN` | 해당 기능만 오류 |
| 한→영 프롬프트 번역 | `OPENAI_API_KEY` (선택) | 기본 번역으로 대체 |

**HF_TOKEN 없이도 단색/그라데이션/다중색 배경 생성과 에디터 전체 흐름은 정상 작동합니다.**

HuggingFace 토큰 발급: https://huggingface.co/settings/tokens

---

## 주요 기술 이슈 및 해결 현황

### 1. 1단계 → 2단계 데이터 및 이미지 연동 : 해결 완료

- **문제**: 페이지 이동 시 `blob:` URL이 만료되어 이미지가 깨지고, 가게 정보가 누락됨.
- **해결**:
  - 프로젝트를 SPA로 통합하여 React State로 데이터를 직접 전달.
  - 이미지는 업로드 시점에 **Base64(DataURL)** 로 변환하여 메모리 유실 방지.
  - `HomeProjectData` 규격으로 변수명 통일 (`seatCount` → `parkingSpaces` 등).

### 2. 제품 이미지가 2단계로 전달 안 되는 문제 :  해결 완료

- **원인**: 백엔드 없이 동작하는 폴백 템플릿(`FALLBACK_TEMPLATE`)에 이미지 요소(`kind: 'image'`)가 없어 이미지를 매핑할 슬롯 자체가 없었음.
- **해결**: `EditorPage.tsx`의 `FALLBACK_TEMPLATE`에 제품 이미지 슬롯 3개 추가, `editorFlow.ts`의 `extraLayoutPresets`에 `template-fallback` 항목 추가.

### 3. 가게이름이 2단계에서 안 보이는 문제 : 해결 완료

- **원인**: `brandColor`(가게이름 글자색) 기본값이 `#FF4757`(빨강)인데, 단색 배경 기본색도 동일해 빨간 배경 위에 빨간 글자가 렌더링됨.
- **해결**: `DEFAULT_OPTIONS.brandColor`를 `#ffffff`(흰색)으로 변경 (`features/init/constants/design.ts`).

### 4. 2단계 배경 변경이 즉시 반영 안 되는 문제 :  해결 완료

- **원인**: 사이드바에서 배경 모드/색상을 바꿔도 캔버스 배경은 "배경 생성" 버튼 클릭 후 백엔드 API 응답 시에만 업데이트됨. 실시간 반영 로직이 없었음.
- **해결**:
  - `buildLivePreviewBackground()` 함수 추가: CSS만으로 즉시 배경 생성 (백엔드 불필요).
  - `useEffect([backgroundMode, promptHint])` 추가: 모드/색상이 바뀔 때마다 캔버스에 즉시 반영.
  - 1단계에서 선택한 색상이 사이드바 색상 피커에 올바르게 초기화되도록 `promptHint` 동기화 추가.
  - `ai-image` 모드는 백엔드 생성 결과를 유지 (실시간 교체 안 함).

### 5. 레이아웃 불일치 (부분 해결)

- **현황**: `draftIndex`(0~3)를 에디터로 전달해 `applyDraftLayoutVariant`로 제품 이미지 배치 위치를 조정.
- **한계**: 1단계 레이아웃(React 컴포넌트 구조)과 2단계 캔버스(절대 좌표 기반)의 구조 차이로 완전한 1:1 복원은 불가. 백엔드 템플릿 4종이 로드되면 레이아웃 매핑이 더 정확해짐.

---

## 데이터 흐름 요약

```
[1단계 InitPage]
  basicInfo.storeName / storeDesc / industry
  options.bgType / colors / brandColor
  products[].image (Base64)
        ↓  buildProjectData()
[HomeProjectData]  ← React State로 App.tsx가 보관
        ↓
[2단계 EditorPage]
  mapProjectDataToTemplate()        → EditorElement[] (텍스트/이미지 배치)
  buildInitialBackgroundCandidate() → BackgroundCandidate (1단계 배경 색 유지)
  buildLivePreviewBackground()      → 사이드바 색상 변경 시 즉시 미리보기
```


### 팀원분들께 드리는 안내

현재 클로드 사용 리밋에 도달하여 코드 다듬기 작업을 즉시 마무리 못했습니다
진행 흐름이 끊기게 되어 죄송합니다
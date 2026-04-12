# initPage UI 수정 정리

**작성일:** 2026-04-13  
**대상 브랜치/디렉터리:** `react/src/modules/initPage/`

---

## 1. 변경 목적

초기 화면(initPage)의 UX를 단순화하고,  
디자인 선택 시 실수로 편집 페이지로 이동하는 것을 방지하기 위한 확인 단계를 추가.

---

## 2. 수정 파일 목록

| 파일 경로 | 변경 내용 |
|---|---|
| `react/public/img.jpg` | 신규 추가 — 루트의 `img.jpg`를 public 폴더로 복사 |
| `react/src/modules/initPage/constants/design.js` | `sampleCount` 4 → 1 (주석으로 원본 유지) |
| `react/src/modules/initPage/components/draft/DraftCard.jsx` | 배경 스타일을 `img.jpg`로 통일 (기존 코드 주석 처리) |
| `react/src/modules/initPage/components/sidebar/Sidebar.jsx` | 섹션 순서 변경 + 배경 종류 섹션 주석 처리 |
| `react/src/modules/initPage/App.jsx` | 다음 단계 확인 모달 추가 |

---

## 3. 상세 변경 내용

### 3-1. 배경 이미지 통일 (`DraftCard.jsx`)

**변경 전**
```js
const bgInlineStyle = getBgStyle(options.bgType, options.startColor, options.endColor, {
  gradientAngle: options.gradientAngle,
  splitPosition: options.splitPosition,
  splitDirection: options.splitDirection,
});
const bgClass = bgInlineStyle ? 'text-white' : CONCEPT_STYLES[options.concept] ?? '';
```

**변경 후**
```js
// 기존 getBgStyle 코드는 주석 처리로 보존
const bgInlineStyle = {
  backgroundImage: 'url(/img.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};
const bgClass = 'text-white';
```

- 4가지 배경 타입(단색, 그라데이션, 다중색, AI 생성) 로직은 주석으로 보존
- 모든 드래프트 카드가 `img.jpg` 배경으로 통일

---

### 3-2. 드래프트 카드 1개만 표시 (`design.js`)

**변경 전**
```js
sampleCount: 4,
```

**변경 후**
```js
// sampleCount: 4, // 원래 4가지 레이아웃 표시 — 현재 1가지만 표시
sampleCount: 1,
```

- 4가지 레이아웃(ClassicLayout, SingleCompactLayout, OverlapGroupLayout, HalfCropGroupLayout)은 코드상 유지
- `sampleCount`만 조정하여 초기 화면에 1개만 노출

---

### 3-3. 사이드바 섹션 순서 변경 + 배경 종류 비활성화 (`Sidebar.jsx`)

**변경 전 순서**
1. 배경 종류 (BgSection)
2. 기본 정보 (BasicInfoSection)
3. 추가 정보 (ExtraInfoSection)
4. 상품 정보 (ProductsSection)

**변경 후 순서**
1. ~~배경 종류~~ → **주석 처리** (비활성화)
2. **기본 정보 (BasicInfoSection)** → 최상단으로 이동
3. 추가 정보 (ExtraInfoSection)
4. 상품 정보 (ProductsSection)

- `BgSection` 컴포넌트 import는 유지, JSX 렌더링만 주석 처리

---

### 3-4. 다음 단계 확인 모달 추가 (`App.jsx`)

#### 흐름 변경

**변경 전**
```
"이 디자인 선택" 클릭
  → handleSelectDesign(idx) 즉시 실행
  → 백엔드 payload 전송
  → editing 페이지로 이동
```

**변경 후**
```
"이 디자인 선택" 클릭
  → handleRequestSelect(idx) 실행
  → pendingIdx 상태 설정
  → ConfirmNextStepModal 표시

  [네] 선택
    → handleConfirmYes()
    → handleSelectDesign(pendingIdx) 실행
    → 백엔드 payload 전송
    → editing 페이지로 이동

  [아니요] 선택
    → handleConfirmNo()
    → pendingIdx = null (모달 닫힘)
    → initPage 계속 작업
```

#### 추가된 상태 및 함수

| 항목 | 타입 | 설명 |
|---|---|---|
| `pendingIdx` | `number \| null` | 확인 대기 중인 draftIndex. null이면 모달 비표시 |
| `handleRequestSelect(idx)` | function | 버튼 클릭 시 pendingIdx 설정 |
| `handleConfirmYes()` | function | "네" 클릭 시 실제 이동 로직 실행 |
| `handleConfirmNo()` | function | "아니요" 클릭 시 모달 닫기 |
| `ConfirmNextStepModal` | component | 확인 다이얼로그 UI (App.jsx 하단에 정의) |

#### ConfirmNextStepModal UI 구성

- 배경: `fixed inset-0` 반투명 오버레이 + blur 처리
- 카드: 흰색 rounded-3xl, 360px 고정 너비
- 메시지: "다음 단계로 넘어가겠습니까?"
- 서브 메시지: "선택한 디자인으로 편집 페이지로 이동합니다."
- 버튼:
  - **아니요** — border 스타일, 클릭 시 모달 닫힘
  - **네** — 파란색 강조, 클릭 시 편집 페이지 이동

---

## 4. 복원 방법 (롤백 포인트)

| 항목 | 복원 방법 |
|---|---|
| 배경 4가지 타입 재활성화 | `DraftCard.jsx`에서 주석 해제, img.jpg 스타일 주석 처리 |
| 드래프트 카드 4개 표시 | `design.js`에서 `sampleCount: 1` → `sampleCount: 4` |
| 배경 종류 섹션 재활성화 | `Sidebar.jsx`에서 `<BgSection .../>` 주석 해제 |
| 확인 모달 제거 | `App.jsx`에서 `handleRequestSelect` → `handleSelectDesign` 직접 연결 |

---

## 5. 비고

- 기존 4가지 배경 타입 로직(`getBgStyle`, `BG_TYPES`, `BgSection`)은 **삭제하지 않고 주석으로 보존**
- 향후 배경 선택 기능 재도입 시 주석 해제만으로 복구 가능
- `img.jpg`는 `react/public/` 폴더에 위치해야 Vite dev server에서 `/img.jpg`로 접근 가능

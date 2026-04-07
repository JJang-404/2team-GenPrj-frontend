# AD-GEN PRO — Frontend

> 가게 홍보 이미지를 실시간으로 생성·미리보기하는 광고 에디터입니다.  
> **서버 없이 브라우저 단독으로 실행됩니다.**  
> React 19 · Vite 8 · Tailwind CSS v4

---

## 목차

1. [팀원 로컬 실행 방법](#1-팀원-로컬-실행-방법)
2. [기술 스택](#2-기술-스택)
3. [화면 구성](#3-화면-구성)
4. [폴더 구조](#4-폴더-구조)
5. [데이터 흐름](#5-데이터-흐름)
6. [상수·기본값 수정](#6-상수기본값-수정)
7. [컴포넌트 상세](#7-컴포넌트-상세)
8. [배경 제거 기능](#8-배경 제거-기능)
9. [레이아웃 추가·수정](#9-레이아웃-추가수정)
10. [자주 수정하는 항목 빠른 참조](#10-자주-수정하는-항목-빠른-참조)

---

## 1. 팀원 로컬 실행 방법

```bash
# 1. 저장소 클론 후 이동
cd frontend

# 2. 패키지 설치 (최초 1회)
npm install

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

### 프로덕션 빌드

```bash
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 로컬 확인
```

### ⚠ 배경 제거 기능 관련 헤더

`배경 제거` 버튼은 브라우저 내장 AI를 사용합니다.  
내부적으로 `SharedArrayBuffer` 가 필요하기 때문에  
**`vite.config.js`에 COOP/COEP 헤더가 설정되어 있습니다** — 별도 설정 불필요.

```js
// vite.config.js — 이미 적용되어 있음
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```

> Nginx, Cloudflare Pages 등 **외부 서버**에 배포할 경우, 서버에서도 동일 헤더를 설정해야 배경 제거가 작동합니다.

---

## 2. 기술 스택

| 라이브러리 | 버전 | 역할 |
|------------|------|------|
| React | 19 | UI 렌더링 |
| Vite | 8 | 개발 서버 / 번들러 |
| Tailwind CSS | 4 | 유틸리티 스타일 |
| lucide-react | latest | 아이콘 |
| @imgly/background-removal | 1.7 | 브라우저 AI 배경 제거 (서버 불필요) |

---

## 3. 화면 구성

```
┌──────────────────────────┬──────────────────────────────────────────┐
│       좌측 사이드바       │           우측 Draft Preview              │
│  기본 420px / 확장 900px  │                                          │
│                           │  Draft Preview        [1:1] [4:5] [9:16]│
│  ┌─────────────────────┐  │                                          │
│  │ 구역 1: 배경 종류    │  │   ┌──────────┐    ┌──────────┐         │
│  │  단색 / 그라데이션  │  │   │   초안 1  │    │   초안 2  │         │
│  │  다중색 / AI 생성   │  │   │ Classic  │    │ Dynamic  │         │
│  │  시작색·종료색 피커  │  │   └──────────┘    └──────────┘         │
│  │  각도·분할 슬라이더  │  │                                          │
│  └─────────────────────┘  │   ┌──────────┐    ┌──────────┐         │
│  ┌─────────────────────┐  │   │   초안 3  │    │   초안 4  │         │
│  │ 구역 2: 기본 정보    │  │   │ Focused  │    │Immersive │         │
│  │  가게이름 + 색 피커  │  │   └──────────┘    └──────────┘         │
│  │  업종 / 소개문구    │  │                                          │
│  └─────────────────────┘  │   각 카드 하단: [이 디자인 선택] 버튼    │
│  ┌─────────────────────┐  │                                          │
│  │ 구역 3: 추가 정보    │  │                                          │
│  │  좌석수 / 연락처    │  │                                          │
│  │  주소 / 배달여부    │  │                                          │
│  │  노키즈존 / 흡연구역 │  │                                          │
│  │  엘레베이터 여부    │  │                                          │
│  │  → 항목별 표시 토글 │  │                                          │
│  └─────────────────────┘  │                                          │
│  ┌─────────────────────┐  │                                          │
│  │ 구역 4: 상품 정보    │  │                                          │
│  │  이미지 업로드       │  │                                          │
│  │  이름 / 금액 / 통화  │  │                                          │
│  │  소개문구           │  │                                          │
│  │  ✂ 배경 제거        │  │                                          │
│  └─────────────────────┘  │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

---

## 4. 폴더 구조

```
src/
├── App.jsx                        # 루트 컴포넌트. 전체 상태 보유·전달
├── index.css                      # Tailwind import + 커스텀 스크롤바
│
├── constants/
│   └── design.js                 # ★ 모든 상수·기본값 정의 (가장 자주 수정)
│
├── hooks/
│   ├── useDesignOptions.js       # 배경·색상·비율 등 디자인 옵션 상태 관리
│   └── useProducts.js            # 상품 목록 + AI 배경 제거 로직
│
├── utils/
│   ├── bgStyles.js               # bgType → CSS background 인라인 스타일 변환
│   └── ratioStyles.js            # ratio 문자열 → 패딩·폰트 크기 등 값 반환
│
└── components/
    ├── draft/                    # 우측 미리보기 영역
    │   ├── DraftCard.jsx         # 카드 1장 (배경, 레이아웃 선택, 분할선 핸들)
    │   ├── DraftLayouts.jsx      # ★ 4가지 레이아웃 컴포넌트
    │   └── DraftShared.jsx       # 레이아웃 공유 컴포넌트
    │
    └── sidebar/                  # 좌측 사이드바
        ├── Sidebar.jsx           # 사이드바 레이아웃 + props 라우팅
        ├── ProductCard.jsx       # 상품 1개 입력 카드
        └── sections/
            ├── BgSection.jsx     # 구역 1: 배경 종류 선택 + 색상·각도 컨트롤
            ├── BasicInfoSection.jsx  # 구역 2: 가게 이름·업종·소개문구
            ├── ExtraInfoSection.jsx  # 구역 3: 추가 정보 (좌석·연락처 등)
            ├── ProductsSection.jsx   # 구역 4: 상품 목록 + 추가 버튼
            └── ui/
                └── VisibilityToggle.jsx  # 표시/숨김 토글 버튼
```

---

## 5. 데이터 흐름

모든 상태는 `App.jsx`에 보관되며, 단방향으로 흐릅니다.

```
App.jsx
  │
  ├── useDesignOptions()
  │     ├── options        { bgType, startColor, endColor, brandColor, ... }
  │     ├── basicInfo      { storeName, industry, storeDesc }
  │     └── extraInfo      { phone, address, seatCount, ... }
  │
  ├── useProducts()
  │     ├── products[]     { id, name, price, currency, description, image, ... }
  │     ├── isRemovingBg   { [productId]: boolean }
  │     └── isFirstRun     boolean
  │
  ├── <Sidebar>            ← 상태 + 업데이트 함수 전달
  │
  └── <DraftCard × N>     ← options, products, extraInfo, inputData 전달
```

---

## 6. 상수·기본값 수정

> **`src/constants/design.js`** 파일에서 배경 타입, 지원 통화, 디자인 기본값 등을 수정할 수 있습니다.

- `BG_TYPES`: 배경 타입 목록
- `CURRENCIES`: 지원 통화 단위 (원, $, € 등)
- `RATIOS`: 화면 비율 목록 (1:1, 4:5, 9:16)
- `DEFAULT_OPTIONS`: 초기 디자인 설정값
- `DEFAULT_EXTRA_INFO`: 가게 추가 정보 기본 노출 여부

---

## 7. 컴포넌트 상세

- **`DraftCard.jsx`**: 카드 1장의 배경 및 레이아웃을 렌더링하고, 다중색 선택 시 분할선 조정 기능을 제공합니다.
- **`DraftLayouts.jsx`**: Classic, Dynamic, Focused, Immersive 4가지 스타일의 레이아웃이 구현되어 있습니다.
- **`DraftShared.jsx`**: 제목, 문구, 이미지 프레임 등 레이아웃에서 공통으로 사용하는 컴포넌트 모음입니다.

---

## 8. 배경 제거 기능

서버 없이 브라우저에서 WASM AI 모델(`@imgly/background-removal`)로 직접 처리합니다.

- **최초 실행 시**: AI 모델(~40 MB)을 다운로드하므로 시간이 다소 소요됩니다.
- **이후**: 브라우저 캐시를 사용하여 빠르게 처리됩니다.
- **주의**: 배포 시 서버에서 COOP/COEP 헤더 설정이 필요합니다.

---

## 9. 레이아웃 추가·수정

1. `src/components/draft/DraftLayouts.jsx`에 새 컴포넌트를 정의합니다.
2. `DraftCard.jsx`의 `LAYOUTS` 배열에 추가하여 레이아웃 순환 목록에 포함시킵니다.

---

## 10. 자주 수정하는 항목 빠른 참조

| 항목 | 파일 | 수정 위치 |
|-------------|------|-----------|
| 기본 배경/글자색 | `constants/design.js` | `DEFAULT_OPTIONS` |
| 기본 비율 | `constants/design.js` | `DEFAULT_OPTIONS.ratio` |
| 통화 단위 추가 | `constants/design.js` | `CURRENCIES` 배열 |
| 가격 표시 형식 | `components/draft/DraftShared.jsx` | `ProductInfo` 컴포넌트 |
| 사이드바 너비 | `components/sidebar/Sidebar.jsx` | `w-[420px]` / `w-[900px]` |
| 카드 둥근 모서리 | `components/draft/DraftCard.jsx` | `rounded-[3.5rem]` |

---

## 폰트 라이선스

- `ZEN-SERIF-TTF-Regular.ttf`: [Zen Old Mincho](https://fonts.google.com/specimen/Zen+Old+Mincho) (SIL OFL 1.1)

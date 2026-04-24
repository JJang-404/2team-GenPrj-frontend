<div align="center">

# react / Frontend 통합 구조 보고서

### initPage + editing 단일 React/Vite 통합 앱

_두 페이지, 하나의 프런트_

<br/>

![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Router](https://img.shields.io/badge/Routing-pathname-lightgrey?style=for-the-badge)
![Bridge](https://img.shields.io/badge/Bridge-sessionStorage-F7B801?style=for-the-badge)

</div>

---

## Before / After

```
  ┌──────── BEFORE ────────┐              ┌───────── AFTER ─────────┐
  │                        │              │                         │
  │   initPage  :3000      │              │                         │
  │   editing   :3001      │    ───▶      │      react   :5173      │
  │                        │              │                         │
  │   (두 앱 따로 기동)      │              │    (단일 앱 · 2 라우트)   │
  │                        │              │                         │
  └────────────────────────┘              └─────────────────────────┘
```

> `react`는 기존 `initPage`와 `editing`을 **하나의 React/Vite 프런트**로 합친 최종 프런트입니다.
> 이제 `react` 하나만 띄우면 전체 흐름이 동작합니다.

- 프런트 루트: `gen_prj/2team-GenPrj-frontend/react`
- 공용 env 루트: `gen_prj/.env`

---

## 라우트 지도

<div align="center">

| 경로 | 페이지 | 역할 |
|:----:|:------:|:-----|
| `/`         | `InitPage.tsx`    | 가게 정보 · 상품 업로드 · 비율/배경 선택 |
| `/editing`  | `EditingPage.tsx` | AI 배경 생성 · Wireframe · 텍스트 편집 |

</div>

```
     ┌──────────────┐    디자인 선택하기    ┌──────────────┐
     │              │ ─────────────────▶  │              │
     │   initPage   │   buildPayload()    │   editing    │
     │      "/"     │ ◀────────────────── │  "/editing"  │
     │              │      popstate       │              │
     └──────────────┘                     └──────────────┘
```

---

## 실행 방법

```bash
# 통합 프런트 실행
cd gen_prj/2team-GenPrj-frontend/react
npm install
npm run dev
```

```bash
# 빌드 검증
cd gen_prj/2team-GenPrj-frontend/react
npm run build
```

<div align="center">

| 항목 | 주소 |
|:---|:---|
| 프런트 | `http://localhost:5173` |
| 원격 FastAPI base | `https://gen-proj.duckdns.org/addhelper` |

</div>

---

## 프로젝트 구조

```
react/
├── src/
│   ├── main.tsx                         엔트리
│   ├── App.tsx                          경량 라우팅 (pathname + popstate)
│   │
│   ├── pages/                           경로 단위 진입점
│   │   ├── InitPage.tsx                 "/"
│   │   └── EditingPage.tsx              "/editing"
│   │
│   └── modules/
│       ├── initPage/                    초기 입력 기능
│       │   ├── App.jsx
│       │   ├── components/
│       │   │   ├── sidebar/
│       │   │   └── draft/
│       │   ├── hooks/
│       │   │   └── useProducts.js
│       │   └── utils/
│       │       ├── editingBridge.js     ──┐
│       │       ├── bgStyles.js            │
│       │       ├── cropToBoundingBox.js   │   Bridge
│       │       └── removeBackground.js    │
│       │                                  ▼
│       └── editing/                    ──┘ 에디터 본체
│           ├── App.tsx                   상태/전체 흐름
│           ├── components/
│           │   ├── EditorCanvas.tsx      캔버스
│           │   ├── TemplateCard.tsx
│           │   ├── BackgroundCard.tsx
│           │   ├── Sidebar.tsx
│           │   └── sidebar/
│           │       ├── AdInfoSection.tsx
│           │       ├── AdditionalInfoSection.tsx
│           │       ├── BackgroundOptionsSection.tsx
│           │       ├── AddElementSection.tsx
│           │       └── ElementInfoPanels.tsx
│           ├── utils/
│           │   ├── editorFlow.ts
│           │   ├── wireframeLayout.ts
│           │   ├── wireframeBridge.ts
│           │   ├── projectEditor.ts
│           │   ├── initialBackground.ts
│           │   ├── ratio.ts
│           │   └── additionalInfo.ts
│           ├── api/client.ts
│           ├── config/remoteApi.ts
│           └── types/
│               ├── editor-core.ts
│               └── home.ts
│
└── public/
    └── info-icons/                      parking · pet · no-kids · smoking · elevator
```

**구조 의도**

1. `pages`는 **경로 단위 진입점**만 담당
2. 실제 기능 코드는 `modules/initPage`, `modules/editing` 아래 유지
3. 공용 라우팅은 `src/App.tsx`에서 처리

---

## 라우팅 동작 원리

```
   window.location.pathname
             │
             ▼
   ┌─────────────────────┐
   │  startsWith(        │      YES    ┌──────────────┐
   │    "/editing"       │ ──────────▶ │  EditingPage │
   │  ) ?                │             └──────────────┘
   └─────────┬───────────┘
             │ NO
             ▼
      ┌──────────────┐
      │   InitPage   │
      └──────────────┘

   브라우저 뒤/앞 이동 → popstate 이벤트로 동기화
```

- `react-router` **미사용** — 의존성 최소화
- `window.location.pathname` 기반 경량 분기
- `popstate`로 뒤로/앞으로가기 동기화

---

## initPage → editing 데이터 전달

**관련 파일**
- `react/src/modules/initPage/utils/editingBridge.js`
- `react/src/modules/editing/utils/editingBridge.ts`

```
   1. 사용자 입력 (상품 · 배경 · 비율 · 추가정보)
           │
           ▼
   2. "디자인 선택하기" 클릭
           │
           ▼
   3. buildEditingPayload()
           │
           ▼
   4. blob: URL  ──▶  data URL  (이미지 유실 방지)
           │
           ▼
   5. sessionStorage / window.name  저장
           │
           ▼
   6. navigate → "/editing"
           │
           ▼
   7. editing이 payload 복원
           │
           ▼
   8. 템플릿 · 배경 · 객체 편집 화면 시작
```

### Payload 구조

```ts
{
  draftIndex: number;
  projectData: {
    options: {
      ratio: string;
      sampleCount: number;
      concept: string;
      brandColor: string;
      bgType?: string;
      startColor?: string;
      endColor?: string;
      gradientAngle?: number;
      splitPosition?: number;
      splitDirection?: 'horizontal' | 'vertical';
    };
    storeName: string;
    mainSlogan: string;
    details: string;
    products: Array<{
      id: number;
      name: string;
      price: string;
      currency?: string;
      description: string;
      image: string | null;
      isAiGen: boolean;
      showName: boolean;
      showPrice: boolean;
      showDesc: boolean;
    }>;
    additionalInfo: {
      parkingSpaces: string;
      petFriendly: boolean;
      noKidsZone: boolean;
      smokingArea: boolean;
      elevator: boolean;
      phoneNumber: string;
      address: string;
    };
  };
}
```

---

## 배경 / 비율 전달 규칙

<div align="center">

| 비율 | 적용 대상 |
|:---:|:---|
| `1:1`  | 정사각 프리뷰 / 후보 카드 / 캔버스 |
| `4:5`  | 세로형 프리뷰 / 후보 카드 / 캔버스 |
| `9:16` | 세로 Reflow (로고 상단 · footer 하단 앵커) |

</div>

```
  initPage 선택 배경
         │
         ▼
   initialBackground.ts ── 후보 1장 먼저 생성
         │
         ▼
   editing 진입 → 초기 배경 먼저 표시
         │
         ▼
   이후 후보 N개 생성 → 첫 후보 = initPage 배경 유지
```

**관련 파일**
- `modules/initPage/utils/bgStyles.js`
- `modules/editing/utils/initialBackground.ts`
- `modules/editing/utils/ratio.ts`
- `modules/editing/App.tsx`
- `modules/editing/components/EditorCanvas.tsx`

---

## 상품 이미지 처리

```
   원본 업로드  ──▶  배경 제거  ──▶  투명 배경 크롭  ──▶  data URL  ──▶  Bridge Payload
     [JPG]          [removeBg]       [cropBBox]         [string]         [editing]
```

**관련 파일**
- `modules/initPage/hooks/useProducts.js`
- `modules/initPage/utils/removeBackground.js`
- `modules/initPage/utils/cropToBoundingBox.js`

→ `editing` 전송 전에 `blob:` 상태를 없애 이미지 유실을 방지합니다.

---

## editing 내부 구조

<table>
<tr>
<td width="50%" valign="top">

### 컴포넌트

| 파일 | 역할 |
|:---|:---|
| `App.tsx` | 상태 · 전체 흐름 |
| `EditorCanvas.tsx` | 편집 캔버스 |
| `TemplateCard.tsx` | 템플릿 카드 |
| `BackgroundCard.tsx` | 배경 후보 카드 |
| `Sidebar.tsx` | 사이드바 조립 |

</td>
<td width="50%" valign="top">

### Sidebar 세부

| 섹션 | 파일 |
|:---|:---|
| 광고 정보 | `AdInfoSection.tsx` |
| 추가 정보 | `AdditionalInfoSection.tsx` |
| 배경 옵션 | `BackgroundOptionsSection.tsx` |
| 요소 추가 | `AddElementSection.tsx` |
| 선택 객체 | `ElementInfoPanels.tsx` |

</td>
</tr>
</table>

### Utils

<div align="center">

| 유틸 | 역할 |
|:---|:---|
| `editorFlow.ts` | 템플릿 / 객체 규칙 |
| `wireframeLayout.ts` | Wireframe 레이아웃 계산 |
| `wireframeBridge.ts` | initPage ↔ editing Wireframe 브릿지 |
| `projectEditor.ts` | 프로젝트 텍스트 / 프롬프트 동기화 |
| `initialBackground.ts` | 초기 배경 생성 |
| `ratio.ts` | 비율 처리 |
| `additionalInfo.ts` | 추가 정보 아이콘 매핑 |

</div>

---

## 상품 사진 정보 패널

```
   ┌────────────────────────────┐
   │  [선택된 상품 이미지]         │
   ├────────────────────────────┤
   │  사진 수정 / 배경 제거        │
   │  객체 제거 / 투명도           │
   │  ─────────────────────────  │
   │  이름                        │
   │  금액 + 통화 (원 / $)        │
   │  소개 문구                   │
   └────────────────────────────┘
```

**관련 파일**
- `modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `modules/editing/src/types/editor-core.ts`

값은 이미지 요소의 **메타데이터**로 저장되어, 이미지 객체별 독립 관리가 가능합니다. 이후 캔버스 텍스트 객체와 자동 연결하는 확장도 용이합니다.

---

## 추가 정보 아이콘

**경로**: `react/public/info-icons/`

<div align="center">

| 파일명 | 용도 |
|:---|:---|
| `parking.png` | 주차 (숫자 배지 오버레이) |
| `pet-friendly-yes.png` / `pet-friendly-no.png` | 반려동물 |
| `no-kids-yes.png` / `no-kids-no.png` | 노키즈존 |
| `smoking-yes.png` / `smoking-no.png` | 흡연 구역 |
| `elevator-yes.png` / `elevator-no.png` | 엘리베이터 |

</div>

매핑 코드: `modules/editing/utils/additionalInfo.ts`

---

## 무엇을 수정하려면 어디를 봐야 하는가

<div align="center">

| 수정 대상 | 진입 파일 |
|:---|:---|
| 초기 입력 화면 문구 / 필드 / 레이아웃 | `modules/initPage/App.jsx`, `components/sidebar/*`, `components/draft/*` |
| initPage → editing 데이터 구조 | `initPage/utils/editingBridge.js`, `editing/types/home.ts` |
| 편집 화면 배경 규칙 | `editing/utils/initialBackground.ts`, `sidebar/BackgroundOptionsSection.tsx`, `backend: backgroundService.js` |
| 편집 화면 객체 / 템플릿 배치 | `editing/utils/editorFlow.ts`, `backend: templateService.js` |
| 캔버스 비율 / 선택 박스 / 이동 | `EditorCanvas.tsx`, `editing/utils/ratio.ts`, `styles/global.css` |
| 추가 정보 아이콘 교체 | `public/info-icons/`, `editing/utils/additionalInfo.ts` |
| 상품 사진 정보 패널 필드 | `sidebar/ElementInfoPanels.tsx`, `editing/types/editor-core.ts` |

</div>

---

## 백엔드 연결 지점

**관련 파일**
- `modules/editing/api/client.ts`
- `modules/editing/config/remoteApi.ts`
- `modules/editing/utils/backgroundGeneration.ts`

```
  ┌─────────── 개발 ───────────┐       ┌─────────── 배포 ───────────┐
  │                            │       │                            │
  │  Vite proxy                │       │  VITE_REMOTE_API_BASE      │
  │    /addhelper              │       │    또는 기본값              │
  │       │                    │       │       │                    │
  │       ▼                    │       │       ▼                    │
  │  gen-proj.duckdns.org      │       │  gen-proj.duckdns.org      │
  │      /addhelper            │       │      /addhelper            │
  │                            │       │                            │
  └────────────────────────────┘       └────────────────────────────┘
```

### 원격 엔드포인트

<div align="center">

| Method | Endpoint | 역할 |
|:------:|:---|:---|
| `POST` | `/addhelper/model/changeimage` | img2img 배경 생성 |
| `GET`  | `/addhelper/model/generate`    | 텍스트 → 이미지 생성 |

</div>

### 프런트 내부로 옮긴 기능

```
  템플릿 bootstrap        ─┐
  sidebar recommendations  ├──▶  프런트 로컬 처리
  initPage → editing bridge│
  배경 제거                 ─┘
```

---

## 환경변수

루트 `.env`: `gen_prj/.env`

```env
# 필수
VITE_REMOTE_API_BASE=https://gen-proj.duckdns.org/addhelper

# 선택
VITE_EDITING_URL=/editing
VITE_INITPAGE_URL=/
```

단일 프런트 구조에서는 **기본값만으로 충분**합니다.

---

## 현재 상태 체크리스트

<div align="center">

| 항목 | 상태 |
|:---|:---:|
| `react` 단일 프런트 `npm install` | 완료 |
| `react` 단일 프런트 `npm run build` | 통과 |
| `initPage`와 `editing`의 단일 Vite 앱 통합 | 완료 |
| `/` → `/editing` 흐름 | 동작 |
| initPage → editing 초기 배경 / 비율 전달 | 동작 |
| 후보 생성 후 첫 후보에 initPage 배경 유지 | 동작 |

</div>

---

## 최근 수정사항

<details>
<summary><b>editing 배경 후보 로직 정리</b></summary>

- `단색`은 후보 단계 없이 바로 편집 화면으로 이동
- `그라데이션` · `다중색` · `AI 이미지 생성`은 후보 4개 표시
- 모드 전환 시 이전 모드 후보가 섞이던 문제 수정 → 현재 모드 기준 preview만 유지
- `배경 후보 보기` 버튼 동작 복구
  - 후보가 이미 4개 → 바로 후보 화면
  - 후보 부족 → 생성 후 후보 화면
  - `단색` 모드 → 버튼 숨김 유지
- `initPage` 배경을 후보 첫 카드에 강제 삽입하던 동작 제거 → 생성된 후보 4개만 표시
- 로컬 배경 후보 수 확장: 그라데이션 4 · 다중색 4 · AI 실패 폴백 4

**관련 파일**
- `modules/editing/App.tsx`
- `modules/editing/utils/backgroundGeneration.ts`
- `modules/editing/components/sidebar/BackgroundOptionsSection.tsx`

</details>

---

## 현재 제약

```
  [WARN]  빌드 시 chunk size 경고  ─▶  실패 아님, 코드 스플리팅으로 개선 여지
  [INFO]  이름/금액/소개문구       ─▶  이미지 객체 메타데이터 저장 (텍스트 객체 자동 연결은 추가 작업)
  [INFO]  라우팅                   ─▶  경량 수동 라우팅, 필요 시 react-router-dom 전환 가능
```

---

## 빠른 점검 순서

```
  1. react 프런트가 :5173 에서 떠 있는가
            │
            ▼
  2. "디자인 선택하기" 클릭 시 URL이 /editing 으로 바뀌는가
            │
            ▼
  3. 브라우저 콘솔에 브리지 / 이미지 에러가 있는가
            │
            ▼
  4. 실사 생성 실패 시 /addhelper/model/changeimage 응답 확인
            │
            ▼
  5. 비율 / 배경 이상 시 initPage/utils/editingBridge.js  ·  editing/utils/initialBackground.ts 확인
```

---

<div align="center">

```
  ─────────────────────────────────────────────────
       react / Backlit AI  ·  Frontend Bundle
  ─────────────────────────────────────────────────
```

</div>

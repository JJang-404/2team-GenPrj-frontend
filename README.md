<div align="center">

# Backlit AI

### AI 배경 생성 에디팅 서비스

_상품 한 장이 광고가 되는 가장 빠른 길_

<br/>

![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![ComfyUI](https://img.shields.io/badge/ComfyUI-img2img-FF6F00?style=for-the-badge)
![OpenAI](https://img.shields.io/badge/LLM-AdCopy-412991?style=for-the-badge&logo=openai&logoColor=white)

<br/>

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │     상품 업로드  →  배경 제거  →  AI 배경 생성  →  에디팅     │
  │                                                              │
  │        [IMG]         [PNG]          [4 STYLES]       [EDIT]  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

</div>

---

## 한눈에 보기

> **Backlit AI**는 사장님의 상품 사진 한 장을 **상업용 수준의 광고 이미지 + 카피**로 바꿔주는 웹 서비스입니다.
> 업로드 → 배경제거 → AI 배경 생성 → 텍스트 편집까지, **한 페이지에서 완성**됩니다.

```
  ╔══════════════════╗      ╔══════════════════╗      ╔══════════════════╗
  ║                  ║      ║                  ║      ║                  ║
  ║    initPage      ║ ───▶ ║     editing      ║ ───▶ ║    Download      ║
  ║  (가게 정보 입력) ║      ║ (AI 배경 + 편집) ║      ║   (광고 이미지)  ║
  ║                  ║      ║                  ║      ║                  ║
  ╚══════════════════╝      ╚══════════════════╝      ╚══════════════════╝
         "/"                    "/editing"                   export
```

---

## 관련 저장소 (Repositories)

<div align="center">

| 역할 | 저장소 / 엔드포인트 | 링크 |
|:---:|:---|:---:|
| **Frontend** | 2team-GenPrj-frontend | _본 저장소_ |
| **Backend**  | 2team-GenPrj-backend  | [github.com/JJang-404/2team-GenPrj-backend](https://github.com/JJang-404/2team-GenPrj-backend) |
| **Test**     | 2team-GenPrj-test     | [github.com/JJang-404/2team-GenPrj-test](https://github.com/JJang-404/2team-GenPrj-test) |
| **ComfyUI**  | 이미지 생성 서버      | [gen-proj.duckdns.org:8188](http://gen-proj.duckdns.org:8188/) |

</div>

---

## 시스템 아키텍처

```
                          ┌─────────────────────────────────┐
                          │          사용자 Browser          │
                          │   React 18 + Vite + TypeScript  │
                          └────────────────┬────────────────┘
                                           │
                          ┌────────────────┴────────────────┐
                          │                                 │
                    initPage (/)                     editing (/editing)
                  가게 정보 / 상품 업로드            AI 배경 / Wireframe / Export
                          │                                 │
                          └────────────────┬────────────────┘
                                           │
                         sessionStorage / IndexedDB Bridge
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                │                                │
          ▼                                ▼                                ▼
  ┌──────────────┐               ┌──────────────────┐              ┌──────────────┐
  │              │               │                  │              │              │
  │   FastAPI    │──────────────▶│     ComfyUI      │              │    OpenAI    │
  │   Backend    │    img2img    │  Generation Srv  │              │   LLM API    │
  │              │               │                  │              │              │
  └──────────────┘               └──────────────────┘              └──────────────┘
   /addhelper/model              gen-proj.duckdns.org              광고 카피 생성
    /changeimage                       :8188                       (storeInfo 기반)
    /generate
```

---

## 핵심 기능

<table>
<tr>
<td width="50%" valign="top">

### AI 배경 생성

4가지 스타일을 **병렬 생성**
```
  ┌──────────┬──────────┐
  │ Elegant  │ Vintage  │
  ├──────────┼──────────┤
  │Sophisti- │ Cartoon  │
  │  cated   │          │
  └──────────┴──────────┘
```
- `changeImageApi` 기반 **img2img**
- 상품 형상 보존, 배경만 재생성
- 시스템 프롬프트 의존 제거
- 사용자 키워드 + 스타일 특성만 결합

</td>
<td width="50%" valign="top">

### AI 광고 카피

가게 메타데이터 기반 **문맥형 카피**
```
  storeInfo.js
       │
       ▼
  ┌─────────────┐
  │ 프롬프트 빌드 │──▶ LLM
  └─────────────┘
       │
       ▼
  광고 문구 N종
```
- 주차/노키즈존/흡연구역 등 반영
- "디자인 선택하기" **Lazy-load**
- `initPage`의 불필요 호출 제거

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 데이터 브리지

3단 저장소 역할 분리
```
  Metadata  ─▶ localStorage
  Assets    ─▶ IndexedDB
  Payload   ─▶ sessionStorage
```
- `QuotaExceededError` 방지
- `initPage ↔ editing` 무손실 전달
- 고해상도 이미지는 토큰 방식 병행

</td>
<td width="50%" valign="top">

### 계층형 Wireframe

outer frame + inner wireframe
```
  ┌──────── 1000×1250 ────────┐
  │ logo                      │
  │ ┌──── main 1000×850 ────┐ │
  │ │                       │ │
  │ │      product slot     │ │
  │ │                       │ │
  │ └───────────────────────┘ │
  │ slogan / footer           │
  └───────────────────────────┘
```
- `ZonePositions` state 관리
- 9:16 Reflow 지원

</td>
</tr>
</table>

---

## 기술 스택

<div align="center">

| 계층 | 사용 기술 |
|:---:|:---|
| **Framework**     | React 18+ · Vite |
| **Language**      | TypeScript · JavaScript |
| **Styling**       | TailwindCSS · Vanilla CSS |
| **HTTP**          | Axios (BaseApi 추상화) |
| **State**         | Custom Hooks (`useDesignOptions`, `useProducts`) |
| **Persistence**   | LocalStorage · IndexedDB · sessionStorage / window.name |
| **AI Backend**    | FastAPI · ComfyUI (img2img) · OpenAI/LLM |

</div>

---

## 프로젝트 구조

```
2team-GenPrj-frontend/
│
├── react/                              ← 통합 React/Vite 앱
│   ├── src/
│   │   ├── main.tsx                    엔트리
│   │   ├── App.tsx                     pathname 기반 경량 라우팅
│   │   │
│   │   ├── pages/
│   │   │   ├── InitPage.tsx            ──▶  "/"
│   │   │   └── EditingPage.tsx         ──▶  "/editing"
│   │   │
│   │   ├── modules/
│   │   │   ├── initPage/               가게 정보·상품 업로드
│   │   │   │   ├── hooks/              useProducts · useDesignOptions
│   │   │   │   └── utils/              editingBridge · removeBackground
│   │   │   │
│   │   │   └── editing/                에디터 본체
│   │   │       ├── components/         EditorCanvas · Sidebar · Cards
│   │   │       ├── utils/              wireframeLayout · ratio · flow
│   │   │       ├── api/                client · remoteApi
│   │   │       └── types/              editor-core · home
│   │   │
│   │   └── server/                     callApi · adverApi · storeInfo
│   │
│   └── public/info-icons/              parking / pet / no-kids / smoking ...
│
└── doc/                                일자별 작업 리포트
    ├── 0414/ · 0415/ · 0416/ · 0422/ · 0423/
```

---

## 데이터 흐름 (initPage → editing)

```
  ┌─ 1 ─┐  상품 업로드 + 가게 정보 + 비율 + 배경 선택
     │
     ▼
  ┌─ 2 ─┐  "디자인 선택하기" 클릭
     │
     ▼
  ┌─ 3 ─┐  buildEditingPayload()
     │
     ▼
  ┌─ 4 ─┐  blob: URL → data URL 변환 (이미지 유실 방지)
     │
     ▼
  ┌─ 5 ─┐  sessionStorage / window.name 저장
     │
     ▼
  ┌─ 6 ─┐  navigate("/editing")
     │
     ▼
  ┌─ 7 ─┐  payload 복원 → 템플릿 · 배경 · 객체 초기화
```

---

## 백엔드 연동

<div align="center">

| Method | Endpoint | 역할 |
|:------:|:---|:---|
| `POST` | `/addhelper/model/changeimage` | img2img 기반 AI 배경 생성 |
| `GET`  | `/addhelper/model/generate`    | 텍스트 → 이미지 생성 |

</div>

```
  개발:   Vite proxy  ──  /addhelper  ──▶  https://gen-proj.duckdns.org/addhelper
  배포:   VITE_REMOTE_API_BASE        ──▶  https://gen-proj.duckdns.org/addhelper
```

**API 모듈**
- `callApi.js` — 이미지 생성 · 배경 제거 (모델 서버)
- `adverApi.js` — OpenAI/LLM 광고 문구 생성
- `storeInfo.js` — 가게 정보 관리 + 프롬프트 빌드

---

## 빠른 시작 (Quick Start)

```bash
# 1. 저장소 클론
git clone <frontend-repo>
cd 2team-GenPrj-frontend/react

# 2. 종속성 설치
npm install

# 3. 로컬 개발 서버  (http://localhost:5173)
npm run dev

# 4. 프로덕션 빌드
npm run build
```

### 환경변수 (`gen_prj/.env`)

```env
VITE_REMOTE_API_BASE=https://gen-proj.duckdns.org/addhelper
VITE_EDITING_URL=/editing
VITE_INITPAGE_URL=/
```

### 구동 전제 조건

```
  [Frontend 5173]  ─▶  [Backend FastAPI]  ─▶  [ComfyUI :8188]
                                │
                                └─▶  [OpenAI / LLM]
```

---

## 협업일지 (Collaboration Log)

> 팀 구성: AI 엔지니어 6기 2팀

김경태 : ![https://www.notion.so/3358dd9ffeba80a18572f5b2ba11ae6d?v=3358dd9ffeba80ccaf85000c25dd18e1&source=copy_link]
김영욱 :
오현석 :
장우정 : ![https://www.notion.so/AI-6-2-34c2cc364d71807aba85e00982c9510f]

---

### Notes

본 프로젝트는 **FastAPI 백엔드** 및 **ComfyUI 생성 서버**가 함께 구동되어야 AI 생성이 정상 동작합니다.
백엔드 주소는 `.env` 또는 `src/server/common/defines.js`를 확인하십시오.

```
  ─────────────────────────────────────────────
       Backlit AI  ·  AI Ad-Gen Platform
  ─────────────────────────────────────────────
```

</div>

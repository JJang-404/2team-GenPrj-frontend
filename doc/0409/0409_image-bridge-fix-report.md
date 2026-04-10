# 이미지 브리지 초기화 버그 수정 보고서
### 작성일 : 2026-04-09
### 작성자 : jang

## 문제 요약

사용자가 `initPage`에서 사진을 업로드한 뒤 **'이 디자인 선택'** 버튼을 누르면, 사진이 백엔드에 전달되지 않고 에디팅 페이지가 빈 상태(초기화)로 열리는 현상.

---

## 근본 원인 분석

### 버그 1 (주 원인) — Vite `/api` 프록시 누락

| 항목 | 내용 |
|------|------|
| **파일** | `react/vite.config.ts` |
| **증상** | 프론트엔드(port 5173)에서 `POST /api/bridge/editing` 호출 시 Vite가 백엔드(port 4000)로 전달하지 않아 404/네트워크 오류 발생 |
| **연쇄 효과** | ① 백엔드 저장 실패 → ② sessionStorage 폴백 시도 → ③ 이미지 Data URL이 크면 sessionStorage 용량 초과(~5 MB 제한) → ④ 데이터 없이 `/editing` 이동 → ⑤ 에디팅 페이지가 데이터를 찾지 못해 `/`로 강제 리디렉션(초기화처럼 보임) |

### 버그 2 (보조 원인) — `editing App.tsx` bootstrap 실패 시 bridge resolve 중단

| 항목 | 내용 |
|------|------|
| **파일** | `react/src/modules/editing/App.tsx` |
| **증상** | `GET /api/editor/bootstrap` 실패 시 `bootstrap.templates.length === 0`이 되어 bridge resolve useEffect가 영원히 실행되지 않음 → 에디팅 페이지가 "초기 연결 데이터를 확인하는 중" 상태로 무한 대기 |

---

## 수정 내용

### 수정 1 — `react/vite.config.ts` : `/api` 프록시 추가

```diff
  proxy: {
+   '/api': {
+     target: 'http://127.0.0.1:4000',
+     changeOrigin: true,
+   },
    '/addhelper': {
      target: 'https://gen-proj.duckdns.org',
      changeOrigin: true,
      secure: true,
    },
  },
```

**효과**  
- 개발 서버에서 `/api/*` 요청이 백엔드(port 4000)로 정상 프록시됨  
- `POST /api/bridge/editing` → 이미지 포함 payload가 백엔드 인메모리 store에 저장, 토큰 반환  
- `GET /api/bridge/editing/:token` → 에디팅 페이지에서 토큰으로 payload 복원  
- `GET /api/editor/bootstrap` → 템플릿 목록 정상 수신

### 수정 2 — `react/src/modules/editing/App.tsx` : bridge resolve 조건 완화

```diff
- if (loading || bootstrap.templates.length === 0 || bridgeResolved) return;
+ if (loading || bridgeResolved) return;

- }, [loading, bootstrap.templates.length, bridgeResolved]);
+ }, [loading, bridgeResolved]);
```

**효과**  
- bootstrap 실패(템플릿 빈 배열) 상태에서도 bridge resolve가 정상 실행됨  
- bridge 데이터가 없으면 `init` 페이지로 리디렉션(기존 동작 유지)  
- bridge 데이터가 있으면 `handleStartFromHome` 호출 — 템플릿이 없을 경우 `step = 'template'`으로 진입하고 에러 메시지 표시(안전한 degradation)

---

## 데이터 흐름 (수정 후)

```
initPage
  │
  ├─ 사진 업로드 → FileReader.readAsDataURL → product.image (Data URL)
  │
  └─ '이 디자인 선택' 클릭
       │
       ├─ buildEditingPayload()
       │    └─ product.image(Data URL) → normalizeProductImage() → 그대로 반환
       │
       ├─ storeEditingPayload(payload)
       │    └─ POST /api/bridge/editing  ─→  [Vite Proxy]  ─→  Backend:4000
       │         └─ 토큰 반환
       │
       └─ window.location.href = '/editing?token=...'

editingPage (/editing?token=...)
  │
  ├─ fetchBootstrap() → GET /api/editor/bootstrap → 템플릿 수신
  │
  └─ readEditingBridgePayload()
       └─ GET /api/bridge/editing/:token → payload 복원
            └─ handleStartFromHome(projectData)
                 └─ mapProjectDataToTemplate(): product.image → element.imageUrl 반영
```

---

## 수정된 파일 목록

| 파일 | 수정 유형 | 내용 |
|------|-----------|------|
| `react/vite.config.ts` | 설정 추가 | `/api` → `http://127.0.0.1:4000` 프록시 추가 |
| `react/src/modules/editing/App.tsx` | 조건 수정 | bridge resolve useEffect에서 `bootstrap.templates.length === 0` 가드 제거 |

---

---

## 3차 수정 (2026-04-09) — 단색/그라데이션/다중색 배경 미반영 버그

### 추가 문제 요약

editing 2단계에서 사이드바에서 단색·그라데이션·다중색 모드 버튼을 클릭해도 캔버스 배경이 변경되지 않고, initPage에서 설정한 배경 그대로 유지되는 현상.

### 근본 원인

| 원인 | 설명 |
|------|------|
| **UX 미반영** | 모드 버튼 클릭 → `backgroundMode` 상태만 변경. 캔버스는 `backgroundCandidates[selectedBackgroundId]`의 `cssBackground`만 보여주는데, 이 값은 모드 버튼 클릭 시 자동 갱신되지 않음 |
| **색상 불일치** | `handleStartFromHome` 후 `promptHint = ''`이어서 사이드바 색상 피커가 initPage 색상이 아닌 기본값(`#60a5fa` 등)으로 표시 |
| **불필요한 캡처 호출** | 단색/그라데이션/다중색에서 "이미지 생성" 클릭 시 `captureElementAsDataUrl`(html2canvas) + `generateBackgrounds` 전체 흐름을 거쳐야만 배경이 반영됨 (실패 시 배경 미변경) |

### 수정 내용

#### 수정 3-1 — `handleStartFromHome`에 `promptHint` 사전 주입

```diff
+ const buildInitPromptHint = (options) => {
+   const start = options.startColor ?? '#FF4757';
+   const end = options.endColor ?? '#4A90E2';
+   if (options.concept === 'solid') return `BG_SOLID(${start})`;
+   if (options.concept === 'gradient') return `BG_GRADIENT(${start},${end})`;
+   if (options.concept === 'pastel') return `BG_MULTI(${start},${end})`;
+   return '';
+ };

  const handleStartFromHome = (data, draftIndex = 0) => {
    ...
    setBackgroundMode(nextBackgroundMode);
+   const initPromptHint = buildInitPromptHint(data.options);
+   setPromptHint(initPromptHint);
-   const initialBackground = buildInitialBackgroundCandidate(data, nextBackgroundMode, promptHint);
+   const initialBackground = buildInitialBackgroundCandidate(data, nextBackgroundMode, initPromptHint);
```

**효과**: 사이드바 색상 피커가 initPage에서 설정한 색상(startColor/endColor)으로 초기화됨

#### 수정 3-2 — `backgroundMode` / `promptHint` 변경 시 즉시 캔버스 업데이트 (reactive useEffect)

```typescript
useEffect(() => {
  if (!projectData || backgroundMode === 'ai-image') return;
  const preview = buildInitialBackgroundCandidate(projectData, backgroundMode, promptHint);
  setBackgroundCandidates((prev) => {
    const rest = prev.filter((b) => b.id !== preview.id);
    return [preview, ...rest];
  });
  setSelectedBackgroundId(preview.id);
}, [backgroundMode, promptHint, projectData]);
```

**효과**: 모드 버튼 클릭 → 즉시 캔버스 배경 반영. 색상 피커 변경 → 실시간 미리보기

#### 수정 3-3 — `handleGenerateBackgrounds`에서 단색/그라데이션/다중색 fast path 분리

```diff
  const handleGenerateBackgrounds = async () => {
-   if (!selectedTemplateId || !captureRef.current) return;
+   if (!selectedTemplateId) return;

+   // 단색/그라데이션/다중색은 캡처·서버 호출 없이 즉시 로컬 후보 생성
+   if (backgroundMode !== 'ai-image') {
+     const localResult = await generateBackgrounds({ ..., guideImage: '', guideSummary: '' });
+     // solid → editor 진입, gradient/pastel → background 후보 목록 표시
+     ...
+     return;
+   }

    // AI 이미지만 캔버스 캡처 + 서버 호출
+   if (!captureRef.current) return;
    const guideImage = await captureElementAsDataUrl(captureRef.current, 1.5);
```

**효과**:
- 단색: "단색 이미지 생성" 클릭 시 즉시 editor 단계 진입
- 그라데이션/다중색: "이미지 생성" 클릭 시 3가지 변형 후보 즉시 표시 (캡처 없음)
- html2canvas 실패로 인한 배경 미반영 버그 원천 차단
- AI 이미지 모드만 기존처럼 캡처 + 외부 API 호출

### 수정된 파일 목록 (추가)

| 파일 | 수정 유형 | 내용 |
|------|-----------|------|
| `react/src/modules/editing/App.tsx` | 기능 추가 | `buildInitPromptHint` 함수 추가, `handleStartFromHome` promptHint 초기화, 리액티브 useEffect 추가, `handleGenerateBackgrounds` fast path 분리 |

---

## 수정되지 않은 기존 알려진 한계 (별도 대응 필요)

- **x, y, width, height 누락**: `buildEditingPayload`가 사용자 조정 좌표를 전달하지 않음 (기존 분석 문서 참조)
- **대용량 이미지 sessionStorage 폴백 한계**: 백엔드가 완전히 다운된 경우 ~5 MB 초과 이미지는 여전히 유실될 수 있음 (백엔드 프록시가 정상이면 미발생)

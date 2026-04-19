# 01. 진입·라우팅 레이어 보고서

- 대상: `react/src/main.tsx`, `react/src/App.tsx`, `react/src/pages/*`
- 역할: 브라우저 진입 → 모델 사전 로드 → path 기반 라우팅 → 두 모듈 App 래핑
- 관련 상위 문서: `00_overview.md § 5, § 6`

이 블록은 얇다. 파일 4개, 총 60줄 안팎. 하지만 두 개의 거대한 App 모듈이 어떻게
한 번의 실행에서 교차되는지가 여기서 결정된다.

---

## 1. 파일 맵

```
src/
├── main.tsx           # React root create, 전역 CSS 로드, BG removal 모델 preload
├── App.tsx            # path → 'init' | 'editing' 매핑, popstate 리스닝
└── pages/
    ├── InitPage.tsx   # (thin) modules/initPage/App 래핑 + BG preload 재시도
    └── EditingPage.tsx # (thin) modules/editing/App 래핑 — 그 외 아무 것도 안 함
```

---

## 2. `main.tsx` — 애플리케이션 부트스트랩

```tsx
import { preload } from '@imgly/background-removal';
import App from './App';
import { BG_REMOVAL_CONFIG } from './modules/initPage/config/backgroundRemoval';
import './modules/initPage/index.css';
import './modules/editing/styles/global.css';

preload(BG_REMOVAL_CONFIG as Parameters<typeof preload>[0]).catch(console.warn);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

주목 포인트:

1. **모델 preload 는 App mount 와 병렬.** `preload(BG_REMOVAL_CONFIG)` 는 await
   하지 않고 fire-and-forget. 사용자의 클릭이 오기 전에 WebAssembly/ONNX 자산을
   캐시에 올려두는 것이 목적. 실패해도 `console.warn` 만 찍고 렌더는 계속.
2. **양쪽 모듈의 전역 CSS 를 동시에 로드.** `initPage/index.css`,
   `editing/styles/global.css` 를 둘 다 import 해서 라우팅이 바뀌어도 CSS 손실이
   없다. Tailwind base 는 `initPage/index.css` 에서 한 번만 선언.
3. **StrictMode 활성.** effect 가 두 번 돌 수 있음을 감안해야 한다 — 특히
   editing 쪽 bridge 읽기와 prebake 가 멱등이어야 한다(현재 구현은 `bridgeResolved`
   플래그와 `isPrebakingImages` 로 이 조건을 만족).

---

## 3. `App.tsx` — path 기반 수동 라우팅

```tsx
type AppRoute = 'init' | 'editing';
function resolveRoute(pathname: string): AppRoute {
  return pathname.startsWith('/editing') ? 'editing' : 'init';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => resolveRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(resolveRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return route === 'editing' ? <EditingPage /> : <InitPage />;
}
```

### 3.1 설계 판단

- **React Router 미사용.** 라우트가 실제로 두 개(`/` 와 `/editing`)뿐이므로
  별도 라이브러리 없이 `startsWith('/editing')` 한 줄로 분기.
- **router 가 아닌 "스위치".** 동일 url 에 여러 children 이 있는 구조가 아니라,
  두 단계(InitPage ↔ EditingPage) 사이를 넘어가는 플로우. 그래서 query string
  이나 hash 가 아닌 pathname 으로만 결정.
- **`popstate` 리스너.** 사용자가 브라우저 뒤로가기를 누르면 다시 `InitPage` 로
  돌아오게 하기 위함. 단, editing 에서 init 으로 되돌아갈 때는 대부분
  `window.location.href` 로 풀 리로드를 일으키므로 이 리스너가 동작하는 경로는
  예외적.
- **사이드 이펙트 없음.** 라우트 전환 시 상태 초기화는 각 App 내부에서 자체적
  으로 처리. 이 레이어는 "어떤 모듈을 마운트할지" 만 결정.

### 3.2 환경변수 연계

| 변수 | 사용처 | 의미 |
|------|--------|------|
| `VITE_EDITING_URL` | `initPage/utils/editingBridge.js` → `getEditingAppUrl()` | editing 진입 URL. 미지정 시 `/editing`. |
| `VITE_INITPAGE_URL` | `editing/App.tsx` → `getInitPageUrl()` | init 복귀 URL. 미지정 시 `/`. |

배포 환경에서 두 앱을 별도 도메인/포트로 쪼갤 경우 이 변수만 바꾸면 된다.

---

## 4. `pages/InitPage.tsx` — InitApp 래퍼

```tsx
export default function InitPage() {
  useEffect(() => {
    preload(BG_REMOVAL_CONFIG as Parameters<typeof preload>[0]).catch(console.warn);
  }, []);
  return <InitPageApp />;
}
```

왜 `main.tsx` 에서 이미 한 번 preload 했는데 여기서 또 부르는가?

- `main.tsx` 의 preload 는 **SPA 최초 로드 직후** 한 번. 사용자가 editing 에
  들어갔다가 "처음으로 돌아가기"로 init 을 전체 리로드 없이 돌아오는 케이스
  에서는 이미 메모리에 로드된 상태라 중복 호출이 무해하다.
- editing → init 으로 가는 플로우(`getInitPageUrl()` 이용) 는 실제로는 주로
  `window.location.href` 를 통해 full reload 를 하므로 이 effect 는 재확인 보험.
- `.catch(console.warn)` 으로 실패해도 UX 는 영향을 받지 않는다.

---

## 5. `pages/EditingPage.tsx` — EditApp 래퍼

```tsx
export default function EditingPage() {
  return <EditingApp />;
}
```

정말 아무 것도 안 한다. preload, error boundary, suspense 등은 전부 안쪽
`modules/editing/App.tsx` 가 담당. 래퍼는 `modules/` 를 숨기기 위한 얇은
facade 일 뿐.

---

## 6. 라이프사이클 다이어그램

```
브라우저 탭 오픈
   │
   ▼
main.tsx
  ├─ import initPage.css, editing.css
  ├─ preload(BG_REMOVAL_CONFIG)  ── 병렬 ──▶ (모델 캐시)
  └─ render <App />
         │
         ▼
     App.tsx
     resolveRoute(pathname)
        ├─ '/'          → <InitPage>
        │                   └─ preload(재보험) → <InitPageApp>
        └─ '/editing'   → <EditingPage>
                            └─ <EditingApp>
                                 └─ readEditingBridgePayload() ...
```

---

## 7. 변경 포인트 가이드

이 레이어를 건드려야 하는 전형적 경우는 다음과 같다:

| 변경 목적 | 수정 위치 | 주의 |
|-----------|-----------|------|
| 세 번째 모듈 추가 | `App.tsx.resolveRoute` 확장 + `pages/XYZ.tsx` | 라우트 조건은 `startsWith` 순서 민감 — 더 구체적인 prefix 를 먼저 검사 |
| 모델 preload 끄기 | `main.tsx` + `InitPage.tsx` 둘 다 | 한쪽만 지우면 `InitPage` 진입 시 다시 로드됨 |
| 전역 CSS 추가 | `main.tsx` import 라인 | Tailwind base 중복 import 주의 |
| 라우트 라이브러리 도입 | `App.tsx` + 각 page 엔트리 | `popstate` 리스너 제거 필요, `getEditingAppUrl/getInitPageUrl` 계약 유지 권장 |

---

## 8. 테스트 관점 체크리스트

- [ ] `/` 로 진입 시 InitPage 가 렌더되는가.
- [ ] `/editing?token=...` 로 진입 시 EditingPage 가 렌더되고, 토큰이 payload 로 복원되는가.
- [ ] 브라우저 뒤로가기 시 `popstate` 로 InitPage 로 돌아오는가 (full reload 아닌 경우).
- [ ] `@imgly/background-removal` 의 preload 가 실패해도 UI 는 정상 마운트되는가.
- [ ] Dark/Light OS 설정이나 첫 로드 시 CSS 깜빡임이 없는가 (StrictMode 이중 mount 고려).

---

## 9. 관련 경로 빠른 참조

- [main.tsx](../../react/src/main.tsx)
- [App.tsx](../../react/src/App.tsx)
- [pages/InitPage.tsx](../../react/src/pages/InitPage.tsx)
- [pages/EditingPage.tsx](../../react/src/pages/EditingPage.tsx)
- [initPage/config/backgroundRemoval.js](../../react/src/modules/initPage/config/backgroundRemoval.js) — `BG_REMOVAL_CONFIG` 상수

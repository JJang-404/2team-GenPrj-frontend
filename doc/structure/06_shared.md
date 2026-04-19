# 06. Shared 레이어 보고서

- 대상: `react/src/shared/*`
  - [backgroundStyle.ts](../../react/src/shared/backgroundStyle.ts) (43 L)
  - [draftLayout.ts](../../react/src/shared/draftLayout.ts) (121 L)
  - [draftTypography.ts](../../react/src/shared/draftTypography.ts) (54 L)
- 역할: InitPage 와 Editing 두 모듈이 **같은 시각 결과** 를 내놓을 수 있도록
  강제되는 단일 소스. 3파일, 총 ~218 줄밖에 안 되지만 이 층이 깨지면 두
  모듈 사이에 "미리보기와 실제 결과가 다름" 증상이 바로 재발한다.
- 상위 문서: `00_overview.md § 4.6`

---

## 1. 왜 이 폴더가 필요한가

프로젝트에는 두 개의 앱이 있다:

- **InitPage (JSX)** — 가게 정보를 입력받고 draft 카드를 4종 보여준다.
- **Editing (TSX)** — InitPage 에서 넘어온 프로젝트로 본격 편집.

두 곳에서 "제품 3개 배치", "폰트 크기 스케일", "배경 그라데이션 공식" 을 각각
구현하면 필연적으로 드리프트가 일어난다. 실제로 Type 4 버그(§ 04 보고서)가
그 사례였다.

`shared/` 는 이 드리프트 방지용 **도메인-단위 프리셋 레지스트리**. 순수 함수만
두고, React/컴포넌트 의존 없음. initPage 쪽은 JS 로, editing 쪽은 TS 로 그대로
consume.

---

## 2. `backgroundStyle.ts` — 배경 CSS 공식 단일화

```ts
export function getSharedBgStyle(
  bgType?: string,
  startColor?: string,
  endColor?: string,
  opts: { gradientAngle?, splitPosition?, splitDirection? } = {}
): { background: string } | null
```

입력:
- `bgType` ∈ `{ '단색', '그라데이션', '다중색' }`
- `startColor / endColor` — 미지정 시 기본 white/#2f2f2f
- `opts`:
  - `gradientAngle` 기본 135°
  - `splitPosition` 기본 50%
  - `splitDirection` 기본 'horizontal'

출력 규약:

| bgType | CSS 결과 |
|--------|----------|
| `'단색'` | `{ background: startColor }` |
| `'그라데이션'` | `linear-gradient({angle}deg, start, end)` |
| `'다중색' + horizontal` | `linear-gradient(90deg, start {pos}, end {pos})` |
| `'다중색' + vertical` | `linear-gradient(180deg, start {pos}, end {pos})` |
| 그 외 | `null` (AI 이미지 모드 등은 별도 렌더) |

### 2.1 왜 중요한가

- initPage 의 `bgStyles.js` 는 이 함수를 wrap 해서 쓴다. editing 의
  `initialBackground.ts` 도 동일 호출.
- 덕분에 "가게 배경 그라데이션" 선택 상태가 편집 페이지 진입 후에도 **픽셀
  단위로 동일**. 사용자는 "내가 고른 게 바뀌었다" 느끼지 않는다.
- 변경 시 주의: `bgType` 은 **한글 문자열 그대로** (`'단색'` 등). 이는 legacy
  계약이므로 영어로 표준화하려면 두 모듈 모두 수정 필요.

---

## 3. `draftLayout.ts` — Draft Card 4종의 하드코딩 좌표

`initPage` 의 Step 3 에서 사용자에게 보여주는 **draft 카드 4종 × 제품 1/2/3
케이스** 좌표 배열.

```ts
interface DraftSlot { x, y, width, height, rotation }
interface DraftTextPlacement { x, y, width, rotation?, zIndex?, align? }

const DRAFT_LAYOUTS: DraftLayoutConfig[] = [
  // draft 0: 가로 배치, 중앙 정렬
  // draft 1: 좌측 상단 기울기, 우측 상세
  // draft 2: 크게 1개 + 작게 2개 대각선
  // draft 3: 가운데 크게 + 양옆 보조
];

export function getDraftProductSlots(draftIndex: number, count: number): DraftSlot[]
export function getDraftTextPlacements(draftIndex: number): { store, slogan, details, summary }
```

### 3.1 좌표 규약

- **전체 캔버스 기준 0-100%**. (wireframe 엔진의 mainZone 기준과는 다름)
- `rotation` 은 degrees. draft 1/2 는 약간의 틸트 적용.
- `zIndex` 28/29/30 으로 store > slogan > details/summary 오버레이 순서.
- `align` 은 `'left' | 'center' | 'right'`. draft 1 이 좌측 정렬 예.

### 3.2 제품 개수 케이스

`products[count]` 는 1/2/3 만 정의.

```ts
function getCountIndex(count: number) {
  if (count <= 1) return 0;
  if (count === 2) return 1;
  return 2;  // 3개 이상은 모두 index 2 사용
}
```

즉 **4개 이상 제품은 draft 카드 시점에선 3개 배치로 fallback**. 실제 편집
페이지에서 wireframe Type 1-4 로 6개까지 펼쳐지므로 draft 단계는 구도 감만
보여주는 역할.

### 3.3 호출처

- `initPage/components/draft/DraftShared.jsx` — draft 카드 렌더링.
- `initPage/utils/editingBridge.js` — bridge payload 에 zonePositions 세팅.
- `editing/utils/editorFlow.ts` — `getDefaultZonePositions(draftIndex)` 가 이
  파일의 text placement 을 그대로 반환.
- `editing/components/WireframeChoiceCard.tsx` — 초기 상태 레이아웃.
- `editing/utils/initialBackground.ts` — 배경 모드 전환 시 텍스트 존 복구.

---

## 4. `draftTypography.ts` — 폰트 크기/라인하이트 프리셋

```ts
export function getDraftTypography(draftIndex: number, ratio = '4:5'): {
  storeSize, sloganSize, detailsSize, summarySize,
  storeLineHeight, sloganLineHeight,
}
```

### 4.1 ratio 분기

`ratio` 에 따라 세 축으로 스케일:

- `'9:16'` → `isTall = true` → 세로 큰 캔버스, 폰트도 크게 (ex. draft 3 store 96px)
- `'1:1'` → `isSquare = true` → 작게 (ex. draft 3 store 48px)
- default `'4:5'` → 중간 (ex. draft 3 store 72px)

### 4.2 draft 별 스타일 구분

| draft | 스토어 인상 | slogan | 주 용도 |
|-------|-------------|--------|---------|
| 0 | 36px 중립 | 14px | "표준/안전" draft |
| 1 | 60px 굵게 | 20px | 큰 타이틀 강조 |
| 2 | 36px 아담 | 12px | 정보 밀도 높은 타입 |
| 3 | 72px 매우 큼 | 18px | 임팩트 중심 |

draft 순서는 InitPage 에서 Type 1-4 wireframe 선택과 **반드시 동일 인덱스**.
즉 사용자가 Type 3 을 고르면 editing 에 넘어갈 때 `draftIndex = 2` 로 전달되고
`getDraftTypography(2, ratio)` 가 적용된다.

### 4.3 호출 예시

```ts
// editorFlow.applyDraftTypographyVariant(elements, projectData)
const typo = getDraftTypography(projectData.options.draftIndex ?? 0, projectData.options.ratio);
// storeName 엘리먼트에 typo.storeSize 적용
// mainSlogan 엘리먼트에 typo.sloganSize, sloganLineHeight 적용
// ...
```

---

## 5. 세 파일의 공통 원칙

1. **순수 함수, 부작용 없음.** React hook, window, localStorage 참조 금지.
2. **타입 추가 시 두 모듈 양쪽 consume 확인.** TypeScript 기반이므로 editing 쪽은
   자동 타입체크. initPage 는 JS 이므로 IDE 타입추론만 — 호출부 수동 검증 필요.
3. **단위 절대 혼동 금지.**
   - `draftLayout` 좌표는 **전체 캔버스 %**.
   - `wireframeLayout` 좌표(04 보고서)는 **mainZone %**.
   - `backgroundStyle` 의 `splitPosition` 은 **0-100 percent value**.
4. **인덱스 계약.** `draftIndex ∈ {0, 1, 2, 3}` 가 Type 1/2/3/4 와 1:1. modulo
   wrap(`((idx % 4) + 4) % 4`) 은 draftTypography 에만 있음 — 다른 곳에서
   -1 이 들어오지 않도록 호출부에서 제로화.

---

## 6. 실제 의존성 그래프

```
shared/backgroundStyle.ts
  ←─── initPage/utils/bgStyles.js
  ←─── editing/utils/initialBackground.ts

shared/draftLayout.ts
  ←─── initPage/components/draft/DraftShared.jsx
  ←─── initPage/utils/editingBridge.js       (zonePositions 시드)
  ←─── editing/utils/editorFlow.ts           (getDefaultZonePositions)
  ←─── editing/components/WireframeChoiceCard.tsx
  ←─── editing/utils/initialBackground.ts

shared/draftTypography.ts
  ←─── initPage/components/draft/DraftShared.jsx
  ←─── editing/utils/editorFlow.ts           (applyDraftTypographyVariant)
```

총 6개 consumer. 수정 전/후 반드시 이 6개 파일의 실제 출력을 비교할 것.

---

## 7. 변경 포인트 가이드

| 변경 목적 | 수정 위치 | 동반 영향 |
|-----------|-----------|-----------|
| draft 5번째 추가 | `draftLayout.DRAFT_LAYOUTS` 배열 + `draftTypography` switch case + wireframe 엔진의 Type 5 (04 참조) | **5 파일 동시 수정 필수** |
| 제품 4개 이상 케이스 분리 | `getCountIndex` 조건 수정 + `products[3]` 슬롯 배열 추가 | 현재 fallback(3개 배치)에 익숙한 draft 카드 UI 와 시각 차이 발생 |
| 배경 '다중색' 분할 각도 추가 (e.g. 45°) | `getSharedBgStyle` switch 확장 + `splitDirection` 타입 확장 + initPage `bgType` 선택지 | 편집 모듈은 자동 반영 (공식 공유) |
| 기본 색상 변경 | `getSharedBgStyle` 내부 `safeStart/safeEnd` fallback | 전역 영향 — InitPage 의 DEFAULT_OPTIONS(defines.js) 와 정렬 |
| 가로 폰트 스케일 전면 조정 | `draftTypography` 전 switch case | draft preview 와 editing main preview 모두 동일 스케일 변경 |
| 새 ratio 지원 (예: '16:9') | `draftTypography` 내부 분기 추가 + `ratio.ts` (wireframe 엔진) 매핑 | wireframe engine 과 pair 수정 필요 |

---

## 8. 테스트 관점 체크리스트

- [ ] draft 0-3 × count 1/2/3 × ratio 4:5/9:16/1:1 조합(= 36 케이스) 에서 좌표가
      화면을 벗어나지 않는가 (`x+width <= 100`, `y+height <= 100`).
- [ ] `draftTypography` 의 모든 switch case 가 `DraftTypography` 인터페이스의
      모든 필드를 채우는가 (누락 시 NaN 렌더).
- [ ] `getSharedBgStyle('단색', '#fff')` 이 `{ background: '#fff' }` 를 정확히
      반환 (objectEquality 까지).
- [ ] `getSharedBgStyle('ai-image')` 같은 미지원 모드가 `null` 인가 (caller 는
      null 을 "배경 스타일 적용하지 않음" 으로 해석).
- [ ] 음수 draftIndex 입력 시 `draftTypography` 가 wrap 해도 `draftLayout` 은
      에러 throw 안 하는가 (`draftIndex % 4` 만 사용).
- [ ] `splitPosition` 이 0 또는 100 일 때 gradient 가 "한 가지 색" 으로 평평하게
      떨어지는가.

---

## 9. 관련 경로

- [shared/backgroundStyle.ts](../../react/src/shared/backgroundStyle.ts)
- [shared/draftLayout.ts](../../react/src/shared/draftLayout.ts)
- [shared/draftTypography.ts](../../react/src/shared/draftTypography.ts)

### Consumers
- [initPage/utils/bgStyles.js](../../react/src/modules/initPage/utils/bgStyles.js)
- [initPage/components/draft/DraftShared.jsx](../../react/src/modules/initPage/components/draft/DraftShared.jsx)
- [initPage/utils/editingBridge.js](../../react/src/modules/initPage/utils/editingBridge.js)
- [editing/utils/editorFlow.ts](../../react/src/modules/editing/utils/editorFlow.ts)
- [editing/utils/initialBackground.ts](../../react/src/modules/editing/utils/initialBackground.ts)
- [editing/components/WireframeChoiceCard.tsx](../../react/src/modules/editing/components/WireframeChoiceCard.tsx)

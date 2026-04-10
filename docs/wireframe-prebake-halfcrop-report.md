# editing 모듈 Wireframe Pre-bake & 반크롭 렌더링 — 설계 보고서

> 이 문서는 `.omc/specs/deep-interview-wireframe-prebake-halfcrop.md`의 요약 보고서로, 개발자가 아닌 독자도 **무엇을 왜 이렇게 만드는지** 이해할 수 있도록 풀어 쓴 버전입니다.

## 관련 문서

- [`WIREFRAME_ARCHITECTURE.md`](./WIREFRAME_ARCHITECTURE.md) — **initPage 쪽 wireframe 렌더 시스템**에 대한 설계 문서. 본 보고서의 작업은 그 시스템을 editing 모듈의 편집 가능한 elements[] 모델로 **포팅**하는 내용입니다. Type 3 `OVERLAP_RATIO = 0.2`, Type 4 반크롭 공식, `CANVAS_HW_RATIO = 1.25` 같은 상수와 공식의 **원천**은 모두 그 문서에 설명되어 있습니다.
- [`EDITING_MODULE.md`](./EDITING_MODULE.md) — editing 모듈 전반 구조와 EditorCanvas의 elements[] 모델.

## 1. 한 문장 요약

initPage에서 정의된 wireframe 구도(Type 1~4)를 editing 모듈의 main-preview에도 그대로 보여주되, **편집 기능은 그대로 살아있게** 하기 위해, 제품 이미지를 editing 진입 시점에 **미리 한 번** 잘라 두는 방식을 채택합니다.

## 2. 배경: 무엇이 문제였나

### editing 모듈의 2단계는 "wireframe 구도" 선택 화면입니다

사용자는 4가지 구도 (Type 1 클래식 대형 / Type 2 컴팩트 헤더 / Type 3 오버랩 그룹 / Type 4 하프크롭 그룹) 중 하나를 고릅니다. 고르는 순간 좌측 main-preview와 BackgroundCard 미리보기가 해당 구도로 재배치되어야 합니다.

### 그런데 Type 3, Type 4가 깨져 있었습니다

- **Type 3 (오버랩)**: 두 제품이 살짝 겹쳐야 하는데, editing에서는 제품들이 그냥 나란히 떨어져 있었습니다.
- **Type 4 (반크롭)**: 두 제품이 서로 **반쪽씩** 보여서 붙어 있는 모양이어야 하는데, editing에서는 제품이 그냥 작게 나란히 놓여 있을 뿐이었습니다.

또한 Type 2의 가게 이름에 있던 **살짝 기울어진 효과(-3°)** 도 반영되지 않았습니다.

### 왜 단순히 initPage 로직을 그대로 가져오지 못하나?

initPage의 wireframe 시스템은 이렇게 돌아갑니다:

1. `wireframeSlots.json`에 각 구도의 **초기 슬롯 위치**가 정의돼 있음
2. **매 렌더마다** 제품 이미지의 실제 가로세로 비율(AR)을 측정해서 슬롯 크기를 조정
3. Type 4의 경우 `<img>` 태그에 `objectPosition: 'left center'`를 걸어 **CSS로** 이미지의 왼쪽 절반만 보여줌

반면 editing의 `main-preview`는 `EditorCanvas` 컴포넌트가 렌더하고, 이 컴포넌트는 **`{x, y, width, height, rotation}` 형태의 정적 박스** 만 다룹니다. 드래그/리사이즈/회전 같은 편집 조작을 단순하게 유지하기 위해서입니다. 여기에는:

- `objectPosition` 같은 CSS 속성을 받아줄 통로가 없고,
- 렌더할 때마다 비동기로 이미지 AR을 재측정할 수도 없습니다.

**편집 가능성과 wireframe 렌더링 정확도 사이에 구조적 간극이 있었던 셈입니다.**

## 3. 해결 아이디어: "한 번만 구워두고 정적으로 쓴다"

핵심 발상은 단순합니다.

> **wireframe 적용은 편집 가능한 최종 배치를 만드는 "일회성 초기화"다.**
> 초기화할 때 한 번만 복잡한 계산을 하고, 그 결과를 평범한 편집 가능 객체로 저장해 둔다.

구체적으로:

### 3.1 제품 이미지 사전 크롭 (pre-bake)

editing 모듈이 처음 로드될 때, **각 제품 이미지에 대해 왼쪽 절반 크롭본과 오른쪽 절반 크롭본을 미리 canvas로 잘라서** 메모리에 들고 있습니다.

```
원본 제품 이미지 ┬→ 왼쪽 절반 (PNG dataURL, 투명 배경 보존)
                └→ 오른쪽 절반 (PNG dataURL, 투명 배경 보존)
                   + 원본 naturalWidth / naturalHeight 기록
```

편집 중에 "왼쪽이었던 제품이 오른쪽이 될 수도" 있으니 **양쪽 버전 모두** 준비해 둡니다.

**포맷은 PNG 고정**입니다. 제품 이미지는 배경 제거가 선행된 경우가 많아 투명 배경을 유지해야 하기 때문에 JPEG는 쓸 수 없습니다.

**크롭 대상 범위**: pre-bake는 **브리지 payload에서 수신한 실제 사용자 입력 제품에만** 적용됩니다. `bootstrap.ts`에 Vite import로 박혀 있는 개발용 fixture 제품들(`matcha`, `chocolate` 등)은 실제 입력과 무관한 개발 기본값이므로 pre-bake 파이프에서 제외합니다.

### 3.2 pre-bake 동안은 편집 화면을 숨긴다

사전 크롭은 이미지 로드 + canvas 렌더를 거치므로 수백 밀리초 정도 걸릴 수 있습니다. 이 동안 사용자가 편집 UI를 보고 클릭하면 복잡한 타이밍 문제가 생기므로, **pre-bake가 끝날 때까지는 "편집 페이지 로딩 중..." 오버레이만** 보여줍니다. 끝나면 오버레이가 사라지고 정상 editing UI가 한 번에 나타납니다.

제품 6개 기준 **3초 이내**를 목표로 합니다 (soft target). 이 시간을 넘기면 경고 로그가 찍히지만 실패로 처리하진 않습니다.

### 3.3 wireframe 전환은 동기적으로 한다

사전 크롭이 끝난 뒤부터 사용자가 구도를 Type 1 → 2 → 3 → 4로 바꾸면, 변환 로직은 **즉시 계산되고 즉시 반영**됩니다. 이미지 로드를 기다릴 필요가 없기 때문입니다.

- **Type 3**: 사전에 기록해 둔 `naturalWidth/Height`로 AR을 계산해서 제품 너비를 구하고, 페어 중심점(`pairCx`)과 겹침 폭(`Ow = 제품너비 * 0.2`)을 적용. 좌측 제품은 `zIndex=1`, 우측은 `zIndex=2`로 겹침.
- **Type 4**: 페어 좌측 자리에는 그 제품의 **왼쪽 절반 크롭본**을, 우측 자리에는 **오른쪽 절반 크롭본**을 element의 `imageUrl`로 꽂습니다. element 너비는 `원본너비/2`로 설정. 이렇게 되면 EditorCanvas 입장에서는 "그냥 좀 좁은 이미지 두 개"로 보이지만, 시각적으로는 반크롭 효과가 나옵니다.

### 3.4 편집 기능은 완전 그대로

EditorCanvas의 드래그/리사이즈/회전 코드는 **한 줄도 바뀌지 않습니다.** 반크롭된 element도 그 입장에서는 "평범한 이미지 element"일 뿐이므로, 사용자가 그걸 끌거나 크기를 바꿔도 기존 로직이 그대로 동작합니다.

### 3.5 편집 중 이미지 교체 → 해당 제품만 재-pre-bake

사용자가 편집 중에 제품 이미지를 교체하는 경로(직접 업로드, 배경 제거, 정면 변환 등)가 실행되면, **그 제품 한 장에 한해** pre-bake를 다시 돌립니다. 이때는 초기 로드와 달리 전체 화면을 덮지 않고, **해당 제품 element 위에 "이미지 자르는 중" 로컬 인디케이터**만 표시해 다른 편집 조작은 계속 가능하도록 합니다. 재-pre-bake가 끝나면 인디케이터가 사라지고 Type 4 전환 시에 새 크롭본이 사용됩니다.

## 4. 왜 B(canvas 크롭)를 골랐나 — A(CSS objectPosition) 대신

설계 초기에는 CSS `objectPosition`을 활용하는 안(A)도 검토했습니다. `EditorElement`에 `imagePosition` 필드를 추가하고, `<img>` 스타일로 넘기는 방식입니다.

### A안의 문제

`objectFit: cover` + `objectPosition: left center` 조합은 **컨테이너 종횡비에 따라 실제 노출되는 이미지 영역이 달라집니다.** 예를 들어:

- 정사각형 이미지가 세로로 긴 컨테이너에 담기면 → 왼쪽 50% 영역 노출
- 같은 이미지가 정사각형 컨테이너에 담기면 → 이미지 전체 노출 (잘림 없음)

즉 사용자가 편집 중에 반크롭된 element의 크기를 바꾸면, **"왼쪽 절반"이라는 의미가 유지되지 않습니다.**

### B안(실제 canvas 크롭)이 이기는 이유

canvas로 실제로 잘라서 새 이미지를 만들면, 그 이미지는 **이미 잘린 상태**입니다. 사용자가 어떻게 리사이즈하든 잘린 픽셀만 스케일되므로 직관적으로 동작합니다. CSS 트릭이 아니라 진짜 잘린 이미지이기 때문입니다.

### CORS는 문제 없는가?

canvas로 이미지를 잘라서 `toDataURL()`로 뽑아낼 때 **tainted canvas** 문제가 생길 수 있습니다. 외부 도메인 이미지를 CORS 헤더 없이 그린 canvas는 "읽기 금지" 상태가 되어 크롭이 실패합니다.

다행히 editing 모듈에 들어오는 제품 이미지는 현재 모두:

- Vite 번들에 포함된 static import (same-origin)
- 파일 업로드에서 생성한 `data:` URL
- API 응답에서 만든 `blob:` URL

이라 전부 canvas-safe입니다. 혹시 미래에 cross-origin 이미지가 들어와도 서버가 CORS 헤더만 주면 동작하도록 `img.crossOrigin = 'anonymous'`를 기본 설정으로 두고, 크롭 실패 시에는 해당 제품만 원본 이미지로 fallback하도록 에러 처리를 넣습니다.

## 5. 데이터가 어디에 사는가

**브리지 payload (initPage → editing 전달 데이터)는 그대로입니다.** 기존 스키마가 동결돼야 한다는 제약이 있어서, 크롭본 필드는 initPage가 보내주지 않습니다.

대신 editing 모듈이 payload를 수신한 **직후**, 메모리에 있는 `projectData.products[i]`에 다음 필드들을 채워 넣습니다:

```ts
interface HomeProjectDataProduct {
  // ... 기존 필드
  image: string;                    // 원본 이미지 (그대로)

  // pre-bake 시점에 editing이 채움 (브리지에는 없음)
  imageLeftHalf?: string;           // dataURL, 왼쪽 절반
  imageRightHalf?: string;          // dataURL, 오른쪽 절반
  imageNaturalWidth?: number;       // Type 3 AR 계산용
  imageNaturalHeight?: number;
}
```

이 필드들은 editing 모듈 내부의 state 수명주기 동안만 존재합니다. 사용자가 페이지를 떠나면 함께 사라지고, 다음번에 다시 들어오면 또 pre-bake부터 시작합니다.

## 6. 에러가 났을 때는

- **전체 pre-bake 흐름 중 치명적 실패** (예: payload 자체가 망가짐): `console.error` 로그 + 원본 이미지로 폴백해 최소한 에디터는 뜨게 함.
- **개별 제품 한 장의 크롭 실패**: `console.warn`으로 "제품 X 이미지 크롭 실패 — 반크롭 레이아웃에서 원본을 사용합니다" 로그. Type 4에서 해당 제품은 원본 이미지가 폭 절반 박스에 담겨 보여서 시각적으로 완벽하진 않지만 깨지지 않음. 나머지 제품은 정상.
- **이미지 로드 자체 실패**: `console.warn`으로 naturalSize 누락을 알리고, Type 3 AR 계산은 fallback으로 슬롯 기본 크기 사용.

**절대 원칙: pre-bake의 어느 단계가 실패해도 editor는 크래시하지 않는다.**

## 7. 파일별 변경 요약

| 파일 | 변경 내용 |
|---|---|
| `types/home.ts` | `HomeProjectDataProduct`에 크롭 필드 4개 추가 |
| `utils/productImagePrebake.ts` (신규) | 제품 배열을 받아 크롭본 필드를 채운 새 배열 반환 |
| `utils/wireframeLayout.ts` | Type 3 오버랩 공식, Type 4 반크롭 공식 추가 |
| `utils/editorFlow.ts` | `applyDraftLayoutVariant`가 Type 3/4에서 새 공식 사용, Type 2 기울기 보존 |
| `App.tsx` | `isPrebakingImages` state + `useEffect` 트리거 + 로딩 오버레이 렌더 가드 |

## 8. 검증 시나리오 (AC 요약)

1. editing 진입 → "편집 페이지 로딩 중" 오버레이가 보이다가 사라지고 정상 UI 표시
2. Type 1 / Type 2 선택 → 기존대로 동작, Type 2 가게 이름 `-3°` 기울기 반영
3. Type 3 선택 → 제품 쌍이 20% 겹쳐서 배치되고 좌측이 우측 아래에 놓임 (zIndex 1 → 2)
4. Type 4 선택 → 제품 쌍이 서로 반쪽씩 보여서 붙어 있는 모양
5. 홀수 개 제품에서 마지막 제품이 단독 배치
6. 깨진 이미지 URL 주입 → 해당 제품만 원본 이미지로 폴백, 에디터는 계속 동작
7. `npx vite build` 성공, `npx tsc --noEmit`이 새/수정 파일에서 에러 없음

## 9. 남아 있는 한계와 후속 고려사항

- **메모리 사용량**: 제품 3~6개 기준 PNG dataURL 6~12장(수 MB) 수준. 현 규모에선 문제 없지만 제품 수가 수십 개로 늘면 재검토 필요.
- **리사이즈 시 반크롭 element의 의미**: 이미 잘린 이미지를 그냥 스케일하는 것이므로 "반절"이라는 의미 자체는 편집 중에 사라질 수 있습니다. 이건 의도된 트레이드오프 (편집 자유도 우선).
- **로딩 3초 soft target**: 이미지 크기가 크거나 제품이 많을 경우 초과할 수 있습니다. 초과는 경고만 찍고 실패로 처리하지 않으므로, 프로덕션에서 자주 초과한다면 캔버스 크기 다운스케일이나 webworker 이전을 검토합니다.

# Wireframe Type 4 Half-Crop 복구 보고서

- 작성일: 2026-04-14
- 대상 브랜치: `feature/United1_4`
- 관련 이슈: Type 4 (HalfCropGroupLayout) 반쪽 크롭이 `WireframeChoiceCard` 썸네일에서 사라진 회귀 수정

---

## 1. 증상

`WireframeChoiceCard`의 4번째 카드(Type 4 — 반쪽 크롭 그룹)에서 제품 이미지가 **중앙 contain** 형태로 표시되어, 원래 의도한 "두 제품이 반쪽씩 붙어 있는 모양"이 사라져 있었다.

메인 프리뷰(`EditorCanvas`)의 Type 4 렌더는 정상 동작했고, 문제는 카드 썸네일에만 국한되어 있었다.

## 2. 근본 원인

썸네일은 [`computeSlotStyle.js`](../../react/src/modules/initPage/components/wireframe/computeSlotStyle.js) 의 CSS 기반 크롭을 사용한다. 이 파일이 `79d49d5 "추가 UI개선"` 커밋에서 4 hunk에 걸쳐 아래와 같이 변경되며 half-crop이 동작하지 않게 되었다.

| 항목 | 회귀 전 (정상) | 회귀 후 (79d49d5) |
|---|---|---|
| `objectFit` | `cover` | `contain` |
| left 슬롯 `objectPosition` | `left center` | `center center` |
| right 슬롯 `objectPosition` | `right center` | `center center` |

`object-fit: cover` + `object-position: left/right center` 조합이어야 이미지가 슬롯을 꽉 채우면서 좌/우 절반만 보이고, 두 슬롯이 붙어서 한 이미지처럼 보이는 half-crop 효과가 만들어진다. `contain` + `center center`로 바뀌면 슬롯 안에 이미지 전체가 축소되어 들어가버려서 반쪽 크롭이 사라진다.

## 3. 포스터 렌더링의 2단 구조 (참고)

Type 4의 반쪽 크롭은 **렌더링 경로에 따라 두 가지 방식**으로 구현되어 있다. 이번 회귀는 (a)만 망가졌고 (b)는 정상이었다.

| 경로 | 렌더 대상 | 크롭 방식 | 관련 파일 |
|---|---|---|---|
| (a) 썸네일 | `WireframeChoiceCard` 안의 작은 미리보기 | CSS `object-fit/position` (원본 이미지 그대로, 브라우저가 잘라서 보여줌) | `initPage/.../HalfCropGroupLayout.jsx`, `computeSlotStyle.js` |
| (b) 메인 프리뷰 | `EditorCanvas`의 포스터 본체 | **실제 픽셀 크롭** — canvas로 좌/우 반쪽을 PNG dataURL로 구워서 요소 `imageUrl`에 주입 | `productImagePrebake.ts`, `wireframeLayout.ts`, `editorFlow.ts` |

두 경로가 공존하는 이유는 `EditorCanvas`에서는 사용자가 요소 크기를 자유롭게 변경할 수 있기 때문이다. CSS `object-position` 방식은 리사이즈 시 "반쪽"의 기준이 달라져서 의미가 깨진다. 그래서 메인 프리뷰는 이미지가 확정되는 시점(initPage→editing 진입)에 실제 픽셀을 잘라 dataURL로 저장해둔다 (`docs/wireframe-prebake-halfcrop-report.md` §4 참조).

## 4. 수정 내역

### 4.1 수정한 파일 (1개)

[`react/src/modules/initPage/components/wireframe/computeSlotStyle.js`](../../react/src/modules/initPage/components/wireframe/computeSlotStyle.js)

`computeSlotStyle` 함수의 `single` 분기 1곳 + left/right 분기 1곳, 그리고 `getFallbackStyle`의 동일 2곳, 총 **4 hunk**를 다음과 같이 서지컬하게 되돌림.

```diff
- objectFit: 'contain',
- objectPosition: 'center center',
+ objectFit: 'cover',
+ objectPosition: side === 'left' ? 'left center' : 'right center',
```

`single` 분기(제품 홀수 개일 때 마지막 단독 슬롯)는 원래부터 중앙 배치이므로 `objectFit`만 `cover`로 되돌리고 `objectPosition`은 `center center` 그대로 둠.

### 4.2 건드리지 않은 파일

1차 조사에서 `editorFlow.ts`도 문제인 줄 알고 전체를 `feature/United1_1`로 덮어썼으나, 그 과정에서 **`feature/United1_4`에 있던 다른 UI 개선(검정 텍스트 정책, `buildProductTextElements` + `placeProductMetaElement`, `extra-product-caption-*`, `shouldShowAdditionalInfoIcon` 주차 분기 등)을 모두 되돌려버리는 부작용**이 있었다. 확인 결과 `editorFlow.ts`의 Type 4 half-crop 로직(`applyDraftLayoutVariant`의 `imageUrlOverride` 스왑, L340–342)은 `feature/United1_4`에도 **정상적으로 살아있는 상태**였다.

따라서 `editorFlow.ts`는 `git checkout origin/feature/United1_4 --`로 원복했고, 실제 회귀 수정은 `computeSlotStyle.js` 4 hunk에 국한되어 있다.

다음 파일들은 모두 변경하지 않았다:

- `productImagePrebake.ts`, `wireframeLayout.ts`, `types/home.ts` — pre-bake 파이프라인, U1_4 상태 그대로 정상
- `App.tsx` — `prebakeProductImages` 호출, `isPrebakingImages` 게이트, `applyDraftLayoutVariant` 3-arg 호출 모두 그대로
- `editorFlow.ts` — half-crop 파이프라인 L340–342 원래부터 정상
- `WireframeChoiceCard.tsx` — 카드 컴포넌트 자체는 수정 불필요

## 5. 흔한 오해 정리

작업 중 여러 가능성을 검토하며 확인한 사실들.

### 5.1 "localStorage에 반쪽 이미지를 저장하던 기능"은 존재한 적 없음

이전에 사용자가 기억했던 "initPage에서 로딩하면서 반쪽 이미지를 localStorage에 저장하던 기능"은 **어느 브랜치(U1_1, U1_1_patch, U1_2, U1_3)에도 코드로 존재한 적이 없다**. 모든 브랜치에서 half-crop pre-bake는 **React state(`HomeProductInput.imageLeftHalf` / `imageRightHalf`) 기반**으로만 구현되어 있고, 이 설계 의도는 `docs/wireframe-prebake-halfcrop-report.md` §5에 명시되어 있다:

> 이 필드들은 editing 모듈 내부의 state 수명주기 동안만 존재합니다.

localStorage의 약 5MB 쿼터로는 제품 3–6개에 해당하는 PNG dataURL 6–12장(수 MB)을 안정적으로 담기 어렵고, initPage→editing 전환은 같은 SPA 내부 라우팅이라 React state로 충분하다.

### 5.2 "별도 로딩 페이지"는 `isPrebakingImages` state 렌더 차단으로만 존재

사용자가 기억했던 "로딩 페이지"는 `App.tsx` L725의 다음 렌더 차단일 가능성이 높다.

```tsx
if (isPrebakingImages) {
  return <div className="empty-panel">편집 페이지 로딩 중</div>;
}
```

별도의 라우트나 페이지 컴포넌트가 아니라, editing 모듈 진입 직후 `prebakeProductImages`가 완료되기 전까지 렌더를 막는 임시 안내 화면이다. 이 부분은 U1_4에 원래부터 살아있었다.

## 6. 검증

- `npm run build` — exit 0 (vite 5.4.21, 약 40초, 모듈 1868개 변환)
- 브라우저 검증 항목 (사용자 수동 확인 필요):
  - [ ] `WireframeChoiceCard`의 4번째 카드(Type 4)에서 두 제품이 반쪽씩 붙은 모양으로 렌더되는가
  - [ ] `EditorCanvas`의 Type 4 메인 프리뷰에서도 반쪽 크롭이 정상인가
  - [ ] 홀수 개 제품일 때 마지막 슬롯이 단독(single) 중앙 배치로 나오는가

## 7. 관련 문서

- [`docs/wireframe-prebake-halfcrop-report.md`](../../docs/wireframe-prebake-halfcrop-report.md) — Type 4 half-crop pre-bake 설계 문서 (원본)
- [`docs/WIREFRAME_ARCHITECTURE.md`](../../docs/WIREFRAME_ARCHITECTURE.md) — wireframe 전반 구조

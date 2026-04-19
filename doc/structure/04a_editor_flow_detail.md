# 04a. editorFlow.ts 상세 로직 보고서

- 대상: [utils/editorFlow.ts](../../react/src/modules/editing/utils/editorFlow.ts) (1237 LOC)
  + 긴밀히 결합된 [utils/projectEditor.ts](../../react/src/modules/editing/utils/projectEditor.ts)
  의 `toggleAdditionalInfoElements`
- 상위 문서: [03 § 5](03_editing_module.md#5-핵심-utils--editorflowts-1236-l)
- 인접 상세 문서: [04 wireframe_engine.md](04_wireframe_engine.md)
  (`computeWireframeProductPlacements` 세부)

---

## 0. 왜 이 문서가 필요한가

`editorFlow.ts` 는 **"EditorElement 의 생애주기"를 모두 담당**하는 파일이다.
함수 14 개가 한 모듈에 모여 있지만 실제로는 **서로 다른 4 개의 축** 에서
Element 배열을 변형한다:

| 축 | 담당 함수 | 책임 |
|----|-----------|------|
| **Layout** | `getDefaultZonePositions`, `createElementsFromWireframe`, `applyDraftLayoutVariant`, `computeFooterPresets` | x/y/width/height/rotation 을 draft Type 1-4 기준으로 배치 |
| **Typography** | `applyDraftTypographyVariant`, `getDraftTypography` (shared) | fontSize/lineHeight/fontFamily 를 draft × ratio 조합으로 결정 |
| **Visibility** | `shouldShowAdditionalInfoText`, `shouldShowAdditionalInfoIcon`, `applyElementVisibilityRules`, `createAdditionalInfoElements`, `toggleAdditionalInfoElements` | 어떤 element 를 그릴지 / 숨길지 결정 |
| **Text sync** | `mapProjectDataToTemplate`, `updateProjectTextElements`, `buildGuideSummary` | `projectData.storeName/mainSlogan/details` → element.text 동기화 |

같은 element 배열을 여러 함수가 **순차적으로** 변형하므로, 한 함수를 수정하면
다른 축에 예상치 못한 파급이 생긴다. 이 문서는 각 함수의 입출력과 부수 효과,
그리고 네 축이 교차하는 지점을 명시한다.

---

## 1. 파일 레이아웃 (물리적 순서)

```
Line 1-15    import (types, wireframeLayout, wireframeTextPlacements,
                      wireframeBridge, ratio)
Line 17-32   applyZoneToElement (헬퍼)
Line 34-89   LegacyTextRect/LegacyTextPlacements + LEGACY_TEXT_PLACEMENTS[0-3]
Line 90-101  getDefaultZonePositions                               ← Layout
Line 103     import getDraftTypography (shared)
Line 104-251 createElementsFromWireframe                           ← Layout + Typography 시드
Line 252-253 import additionalInfo (ADDITIONAL_INFO_KEYS, getAdditionalInfoLabel) + cloneTemplateElements
Line 255-263 FOOTER_TEXT_KEYS / FOOTER_ICON_KEYS (AdditionalInfoKey 배열)
Line 265-359 FooterPreset 타입 + FOOTER_* 상수 + computeFooterPresets  ← Layout (footer)
Line 361-378 extraLayoutPresets (템플릿 id → 추가 제품 슬롯)
Line 380-381 DEFAULT_TITLE_FONT / DEFAULT_TEXT_COLOR
Line 383-457 buildProductTextElements                              ← Text sync
Line 459-485 placeProductMetaElement                               ← Layout (제품 메타)
Line 487-489 normalizePriceCurrency
Line 491-493 slugInfoKey                                            ← index util (AdditionalInfoKey → 1-based slug)
Line 495-511 isPrimaryImageElement / isDecorativeElement            ← Visibility 판별자
Line 513-544 shouldShowAdditionalInfoIcon/Text                      ← Visibility
Line 546-713 applyDraftLayoutVariant (Type 전환 시 재배치, ~170L)    ← Layout
Line 715-727 applyElementVisibilityRules                             ← Visibility
Line 729-946 mapProjectDataToTemplate (~220L)                        ← Text sync + Visibility
Line 948-970 buildGuideSummary                                       ← Text sync (AI 프롬프트)
Line 972-1086 updateProjectTextElements                              ← Text sync
Line 1088-1141 createAdditionalInfoElements                          ← Layout + Visibility 생성
Line 1143-1165 createCustomTextElement                               ← Creation
Line 1167-1215 applyDraftTypographyVariant                           ← Typography
Line 1217-1236 createCustomImageElement                              ← Creation
```

**물리적 배치 노이즈**: `import` 가 파일 중간 (line 90, 103, 252) 에 끼어 있다.
이는 리팩터 과정에서 기능이 추가될 때 관련 import 를 해당 섹션 근처에 놓은
흔적. TypeScript 가 허용하는 한 기능 동작에는 영향 없지만 가독성에는 나쁨.

---

## 2. 입출력 요약 (Signature 한눈에)

| 함수 | 입력 | 출력 | 부수 효과 |
|------|------|------|----------|
| `getDefaultZonePositions(draftIndex)` | `number` | `ZonePositions` | 순수 |
| `createElementsFromWireframe(projectData, visibility?)` | `HomeProjectData`, `Record<string,boolean>?` | `EditorElement[]` | 순수 |
| `computeFooterPresets(projectData, visibility?)` | `HomeProjectData\|null`, `Record<string,boolean>?` | `Record<label, FooterPreset>` | 순수 |
| `applyDraftLayoutVariant(elements, draftIndex, projectData?, visibility?)` | 현재 `elements`, draftIndex, projectData, visibility | 재배치된 `EditorElement[]` | 순수 (입력 mutate 없음) |
| `applyDraftTypographyVariant(elements, projectData)` | `elements`, `projectData` | 폰트만 덮어쓴 `EditorElement[]` | 순수 |
| `applyElementVisibilityRules(templateId, elements, mode, projectData)` | 4개 인자 | hidden 플래그 덮어쓴 `EditorElement[]` | 순수 |
| `mapProjectDataToTemplate(template, projectData)` | `TemplateDefinition`, `projectData` | `EditorElement[]` (base + extras) | 순수 |
| `updateProjectTextElements(elements, projectData, field)` | `elements`, `projectData`, `'storeName'\|'mainSlogan'` | 텍스트 동기화된 `EditorElement[]` | 순수 |
| `createAdditionalInfoElements(projectData, viewKey, visibility?)` | 3개 인자 (viewKey: `AdditionalInfoKey`) | `EditorElement[]` (0-2개) | 순수 |
| `shouldShowAdditionalInfoText(projectData, viewKey, visibility?)` | 3개 인자 | `boolean` | 순수 |
| `shouldShowAdditionalInfoIcon(projectData, viewKey, visibility?)` | 3개 인자 | `boolean` | 순수 |
| `buildGuideSummary(projectData, template)` | 2개 인자 | `string` | 순수 |
| `slugInfoKey(viewKey)` | `AdditionalInfoKey` | `string` (1-based index) | 순수 |
| `isPrimaryImageElement(element)` | `EditorElement` | `boolean` | 순수 |
| `createCustomTextElement(label)` / `createCustomImageElement(url, label)` | 1-2 인자 | `EditorElement` | 순수 (Date.now id) |

> **중요**: 모든 export 가 **순수 함수**. state/context/전역 저장소 없음.
> App.tsx 가 결과를 받아 setState 로 반영하는 역할. 테스트 시 **입력→출력만
> 검증**하면 됨.

---

## 3. Layout 축 — 4-stage 좌표 파이프라인

EditorElement 의 `{x, y, width, height}` 가 최종 값이 되기까지 **최대 4 단계**
좌표 계산을 거친다.

```
Stage 1: Template 좌표계 (0-100%)
   └─ mapProjectDataToTemplate: TemplateDefinition.elements 원본 유지
Stage 2: Wireframe slot 좌표계 (mainZone 기준 0-100%)
   └─ computeWireframeProductPlacements → rawPlacements[].rect
Stage 3: Canvas 좌표계 (전체 캔버스 기준 0-100%)
   └─ applyDraftLayoutVariant: mainZone.x + (slot.x/100)*mainZone.w 로 리매핑
Stage 4: Footer 좌표계 (캔버스 하단 고정, lineCount 기반 동적)
   └─ computeFooterPresets: FOOTER_BOTTOM(96%) 기준 위로 적층
```

### 3.1 Zone 모델 — `ZonePositions`

`HomeProjectData.zonePositions` 는 4개 텍스트 zone 을 담는다:

```ts
interface ZonePositions {
  store:   ZonePosition;  // 가게명
  slogan:  ZonePosition;  // 메인 문구
  details: ZonePosition;  // 상세 설명
  summary: ZonePosition;  // 가격/요약
}
```

각 `ZonePosition` = `{ x, y, width, align?, rotation?, zIndex? }` (0-100% 기준).
`LEGACY_TEXT_PLACEMENTS[0..3]` 에 Type 1-4 별 기본값이 하드코딩되어 있으며
`getDefaultZonePositions(draftIndex)` 가 유일한 접근자.

**Why legacy** 라는 이름?  원래 `shared/draftLayout.ts` 의 `DRAFT_LAYOUTS[].{store,slogan,details,summary}` 에서 가져오던 좌표를, editing 이 해당
의존을 끊을 때 **비트 단위로 복사**해 둔 것. 주석 (line 34-44) 에 "upstream 이
바뀌면 수동 재동기화 필요" 명시.

### 3.2 mainZone — 동적 "제품 영역"

```ts
const mainZone: FrameZone = computeMainZoneDynamic(zones);
```

4개 zone 의 위치에서 **"제품이 놓일 여유 공간"** 을 계산한다. 예를 들어 Type 1
에서 store(y=7) + slogan(y=16) 이 위를, details(y=74) + summary(y=86) 가
아래를 차지하므로 mainZone 은 대략 `y=24 ~ y=72` 구간. 실제 계산은
`wireframeBridge.ts` 의 `computeMainZoneDynamic` 담당.

이 값은 **Stage 2 → Stage 3 변환의 기준 프레임**으로 사용된다.

### 3.3 좌표 리매핑 — Stage 2 → Stage 3

```ts
rect = {
  x: mainZone.x + (p.rect.x / 100) * mainZone.w,
  y: mainZone.y + (p.rect.y / 100) * mainZone.h,
  width:  (p.rect.width  / 100) * mainZone.w,
  height: (p.rect.height / 100) * mainZone.h,
}
```

`computeWireframeProductPlacements` 는 mainZone 크기를 모른 채 0-100% 기준
슬롯을 반환 (WireframeChoiceCard 카드 안에서도 같은 공식 재사용). 이를 실제
캔버스 좌표로 옮기는 곱셈이 Layout 엔진의 핵심.

### 3.4 hwRatio — 가로세로비 분모

```ts
const hwRatio = mainZone.h * ratioToCanvasAR(ratio) / 100;
```

`ratioToCanvasAR('4:5')` = 1.25 등. Type 3/4 의 제품 배치는 mainZone 의
"실제 픽셀 비율" 을 알아야 정사각형 슬롯을 정사각형으로 그릴 수 있다. 이
값이 `computeWireframeProductPlacements` 의 다섯 번째 인자로 전달된다.

---

## 4. `createElementsFromWireframe` — 진입 시드 (line 109-251)

editing 진입 1 회 호출. "템플릿 기반" 이 아닌 **zone + wireframe 만으로**
elements 배열을 처음부터 만든다.

### 4.1 입력 정규화

```ts
const draftIndex = projectData.options.draftIndex ?? 0;
const typeIndex  = (((draftIndex % 4) + 4) % 4) as 0|1|2|3;  // 음수도 안전
const ratio      = projectData.options.ratio ?? '4:5';
const zones      = projectData.zonePositions ?? getDefaultZonePositions(draftIndex);
const typography = getDraftTypography(draftIndex, ratio);
```

`((x % 4) + 4) % 4` 는 **음수 draftIndex 를 안전하게 0-3 으로 접는 관용구**.
API 실수로 -1 이 들어와도 Type 3(2) 으로 매핑되어 예외 없이 렌더.

### 4.2 생성 순서 (zIndex 역순 정렬 효과)

```
1. storeName   → id: 'fallback-store-name',   zIndex: zones.store.zIndex ?? 13
2. mainSlogan  → id: 'fallback-main-slogan',  zIndex: zones.slogan.zIndex ?? 13
3. details     → id: 'fallback-details',      zIndex: zones.details.zIndex ?? 12
4. 제품 N개    → id: 'product-{id}',           zIndex: 10 + placement.zIndex
   4a. 제품별 meta (name/price/desc) → id: 'product-meta-{id}-{kind}', zIndex: 24
5. 부가정보 × 7 labels → id: 'info-text-{slug}' / 'info-image-{slug}', zIndex: 20-21
```

zIndex 는 EditorCanvas 에서 `style.zIndex` 로 그대로 렌더되므로 **큰 값이
위**. 위 순서는 "생성 순서 ≠ 렌더 순서". 생성 순서는 단지 배열 푸시 순서일
뿐이고, 실제 stacking 은 zIndex 숫자로 결정.

### 4.3 조건부 생성

- **storeName/mainSlogan/details**: `if (projectData.X)` — 값이 있을 때만 push.
  빈 문자열이면 fallback element 자체가 생기지 않음. 이후 사용자가 입력을
  시작하면 `updateProjectTextElements` 가 fallback 을 **새로 push** (§ 9).
- **제품**: `activeProducts = products.filter(p => p.image)` — 이미지 없는
  제품은 전면 제외. 이미지 없는 제품의 meta 텍스트도 생성되지 않음.
- **부가정보**: `ADDITIONAL_INFO_KEYS.forEach(viewKey => …)` 로 7 개 키 모두
  시도하지만, `createAdditionalInfoElements` 내부에서 visibility × 데이터
  유무 2 조건을 모두 만족해야 실제 element 가 반환됨 (§ 7).

### 4.4 제품 meta 배치 — `placeProductMetaElement` (line 459-485)

제품 이미지 rect 를 받아 name/price/desc 를 **그 아래** 혹은 **옆**에 배치.

```ts
const meta = WIREFRAME_TEXT_PLACEMENTS[draftIndex].productMeta;  // Type별 프리셋
const width = Math.max(
  rect.width,
  isName ? meta.nameMinWidth : isPrice ? meta.priceMinWidth : meta.descMinWidth,
);
const x = rect.x + (rect.width - width) / 2;      // 중앙 정렬
const yOffset = isName ? meta.nameOffsetY : ...;
const y = Math.min(95, rect.y + rect.height + yOffset);  // 95% 상한
```

**95% 상한**: 캔버스 하단 safe area(footer info 영역)를 침범하지 않도록
강제로 잘라낸다. Type 4 처럼 mainZone 이 낮으면 제품 desc 가 footer info
와 겹칠 수 있는데 이 `Math.min` 이 방어선.

---

## 5. `computeFooterPresets` — 동적 footer 레이아웃 (line 265-359)

**7 개 부가정보 `AdditionalInfoKey` 를 화면 하단에 배치**하는 전담 계산기.
호출 컨텍스트 2 개 소비자: `createAdditionalInfoElements` (element 생성 시)
와 `applyDraftLayoutVariant` / `toggleAdditionalInfoElements` (재배치 시).

### 5.1 상수 (line 277-286)

```
FOOTER_BOTTOM = 96    // 하단 안전 y%
FOOTER_X      =  5    // 좌측 마진
FOOTER_W      = 90    // 전체 폭
LINE_H        =  2.5  // 텍스트 1줄 높이
ICON_SIZE     =  2.5  // 정사각형 아이콘
ICON_GAP      =  0.5  // 아이콘 간 간격
TEXT_ICON_GAP =  2    // 텍스트영역 ↔ 아이콘영역 간격
ICON_STEP     =  3.0  // = ICON_SIZE + ICON_GAP
ICON_AREA_W   = 15    // = 5 * ICON_STEP (항상 5개 슬롯 기준)
TEXT_W        = 73    // = FOOTER_W - ICON_AREA_W - TEXT_ICON_GAP
```

> **Why ICON_AREA_W = 5 * ICON_STEP (15)?**
> `FOOTER_ICON_KEYS` 는 정확히 5개 (`viewParking`, `viewPet`, `viewNoKids`,
> `viewSmoking`, `viewElevator`). 아이콘은 우측 정렬이므로 영역 폭은 최대치
> (5 개 모두 on) 기준으로 고정 예약해, 텍스트 영역 `TEXT_W` 가 아이콘
> on/off 에 따라 흔들리지 않도록 한다.

### 5.2 FOOTER_TEXT_KEYS vs FOOTER_ICON_KEYS

두 배열에 **`viewParking` 가 중복**된다. 주차만 "텍스트 + 아이콘 양쪽" 을
가지는 2중 항목이기 때문.

```
FOOTER_TEXT_KEYS: readonly AdditionalInfoKey[] = ['viewPhone', 'viewAddress', 'viewParking']            // 3개
FOOTER_ICON_KEYS: readonly AdditionalInfoKey[] = ['viewParking', 'viewPet', 'viewNoKids', 'viewSmoking', 'viewElevator']  // 5개
```

### 5.3 알고리즘

```
1. activeTextKeys = FOOTER_TEXT_KEYS 중 shouldShowText 통과한 것만
   lineCount = activeTextKeys.length
   footerH   = max(lineCount, 1) * LINE_H
   footerTopY = 96 - footerH                 ← 위로 자라는 스택

2. activeIconKeys = FOOTER_ICON_KEYS 중 shouldShowIcon 통과한 것만
   usedIconWidth = n * ICON_SIZE + (n-1) * ICON_GAP
   iconLeftmostX = FOOTER_X + FOOTER_W - usedIconWidth   ← 우측 정렬
   iconY = 96 - ICON_SIZE

3. 텍스트 preset: activeTextKeys 만 y 좌표 배정 (textIdx 순회),
                 비활성은 EMPTY_RECT.

4. 아이콘 preset: activeIconKeys 만 좌→우 순서로 iconLeftmostX + idx*ICON_STEP,
                  비활성은 EMPTY_RECT.

5. 반환: Record<AdditionalInfoKey, { text, image }>  (7 viewKey 모두 포함)
```

**핵심 특성**:
- 텍스트는 **위로 자람** (하단 고정, 줄 추가되면 footerTopY 가 작아짐)
- 아이콘은 **우측 정렬** (activeIconLabels 에서 가장 오른쪽 = FOOTER_X + FOOTER_W)
- 비활성 항목은 **EMPTY_RECT** 로 반환되어 이후 `shouldShowAdditionalInfoX` 의
  2 차 가드로 element 자체가 생성되지 않음. preset 에는 존재하되 rect 가
  0 크기라 그려지지 않음.

### 5.4 왜 동적인가

사용자 토글로 viewKey on/off → lineCount 변화 → footerTopY 이동. 예:
- 전화번호만 on: footerH = 2.5, footerTopY = 93.5
- 전화번호 + 주소 on: footerH = 5.0, footerTopY = 91.0
- 3 개 모두 on: footerH = 7.5, footerTopY = 88.5

아이콘도 마찬가지로 visible 개수에 따라 좌측 시작점이 **우측 끝에서 계산**
되어 이동. 이 때문에 한 개 토글만 바뀌어도 footer 의 **모든 element 좌표가
재계산**되어야 한다 — `toggleAdditionalInfoElements` 가 그래서 "나머지 info
elements 도 재배치" 한다 (§ 7).

---

## 6. `applyDraftLayoutVariant` — Type 전환 재배치 (line 546-713)

**사용자가 WireframeChoiceCard 에서 Type 1↔2↔3↔4 를 바꿨을 때** 호출. 기존
elements 의 **id 매칭 기반으로 좌표만 덮어쓰기**. text 나 imageUrl 은 건드리지
않음.

### 6.1 단계 (line 적시)

```
546-558  productCount = primary image 개수, hasSlogan = fallback-main-slogan 존재
559-560  typeIndex 정규화 + wireframe = deriveWireframeLayout(typeIndex, ...)
562-569  zones 결정 + mainZone + hwRatio 계산 (§ 3)
571-593  제품 rawPlacements 계산 + mainZone 기준 리매핑
595-604  productElements, productIds, productPlacementById 사전 준비
606-712  elements.map((element) => {
           case productIds.has(element.id):          → 제품 rect 갱신 + zIndex offset
           case id matches /^product-meta-.*$/:       → placeProductMetaElement
           case id === 'fallback-main-slogan':        → zones.slogan
           case id === 'fallback-store-name':         → zones.store
           case id === 'fallback-details':            → zones.details
           case id === 'fallback-product-summary':    → zones.summary
           case kind==='text' + regex 매칭:           → 해당 zone 적용
           case id matches /^info-text-\d+$/:         → computeFooterPresets[viewKey]
           case id matches /^info-image-\d+$/:        → computeFooterPresets[viewKey]
           default:                                    → element 그대로
         })
```

### 6.2 `hasSlogan` 추론 (line 556-558)

```ts
const hasSlogan = elements.some(
  (el) => el.id === 'fallback-main-slogan' && el.kind === 'text' && Boolean(el.text)
);
```

주석 (line 553-555) 에 명시된 설계: "projectData 를 thread 하지 않고 **현재
elements 배열에서 slogan 존재 여부를 추출**". mapProjectDataToTemplate 이
mainSlogan 이 있을 때만 `fallback-main-slogan` 을 생성하므로
`Boolean(projectData.mainSlogan)` 과 **등가**. projectData 를 선택적으로만
받기 위한 설계 선택 (App.tsx 에서 아직 projectData state 가 미정일 때도 호출
가능).

### 6.3 제품 zIndex 오프셋 (line 622-625)

```ts
zIndex: placementZ !== undefined ? element.zIndex + placementZ : element.zIndex,
```

**Type 3 오버랩 pair** 에서만 placementZ 값이 나온다 (left=1, right=2).
element 의 base zIndex 에 더해 pair 내 상대 순서를 유지한다. Type 1/2/4 는
`placementZ === undefined` 이므로 base 유지.

### 6.4 Type 4 half-crop imageUrl 오버라이드 (line 627-631)

```ts
if (imageUrlOverride) {
  next.imageUrl = imageUrlOverride;
}
```

Type 4 의 `imageLeftHalf`/`imageRightHalf` 가 prebake 단계에서 준비된 경우
해당 dataURL 로 갱신. prebake 실패 시 override 가 `undefined` 라 **원본
유지** — fallback 이 자동 보장됨.

### 6.5 정규식 label 매칭 (line 659-684)

```
/(store|brand|가게명|브랜드명)/     → zones.store
/(headline|title|타이틀)/          → zones.slogan
/(subcopy|광고 문구|보조 타이틀|copy)/ → zones.slogan + yOffsetPx
/(description|설명|footer|cta|하단 문구)/ → zones.details
/(price|가격)/                     → zones.summary
```

템플릿이 영어/한국어로 **자유롭게 label 을 지어도** 이 regex 배치가 매핑을
흡수한다. 새 label 을 추가하면 매칭되지 않아 기본 위치 유지 — **조용한 실패**.
Template 이 갑자기 이상한 위치에 있으면 label regex 에 hit 되지 않았는지 확인.

### 6.6 info element 재배치 (line 686-709)

```ts
const infoTextMatch = element.id.match(/^info-text-(\d+)$/);
if (infoTextMatch) {
  const idx = Number(infoTextMatch[1]) - 1;
  const viewKey = ADDITIONAL_INFO_KEYS[idx];
  if (viewKey) {
    const preset = computeFooterPresets(projectData ?? null, visibility)[viewKey];
    if (preset) {
      return { ...element, x: ..., y: ..., width: ..., height: ... };
    }
  }
}
```

`info-text-{slug}` / `info-image-{slug}` id 에서 **숫자 slug → viewKey
역매핑**. slug 는 `slugInfoKey(viewKey)` (line 491-493) 이 만드는
`ADDITIONAL_INFO_KEYS.indexOf(viewKey) + 1`. 즉 1-based 인덱스이므로 `-1` 로
되돌린다.

**computeFooterPresets 3 회 호출 비용**: Type 전환 1 회당 info element 수
만큼 `computeFooterPresets` 가 재호출된다. 같은 projectData+visibility 로
매번 같은 결과를 내므로 이론적으로는 hoist 가능 — § 11 의 리팩터 후보.

---

## 7. `createAdditionalInfoElements` + Visibility 체인 (line 1088-1141)

### 7.1 함수 시그니처

```ts
function createAdditionalInfoElements(
  projectData: HomeProjectData | null,
  label: string,
  visibility?: Record<string, boolean>,
): EditorElement[]  // 0, 1, 2 개 요소 반환
```

### 7.2 반환 가능한 조합

| shouldShowText | shouldShowIcon | 반환 |
|----------------|----------------|------|
| false | false | `[]` |
| true  | false | `[info-text-{slug}]` |
| false | true  | `[info-image-{slug}]` |
| true  | true  | `[info-text-{slug}, info-image-{slug}]` |

label 별 가능한 조합 (shouldShow 함수 의 switch 로 제한):

| label | text? | icon? |
|-------|-------|-------|
| 주차 공간 수 | ✓ (숫자>0) | ✓ |
| 애견 동반 가능 여부 | ✗ | ✓ |
| 노키즈존 | ✗ | ✓ |
| 흡연 구역 존재 여부 | ✗ | ✓ |
| 엘리베이터 존재 여부 | ✗ | ✓ |
| 전화번호 | ✓ (truthy) | ✗ |
| 주소 | ✓ (truthy) | ✗ |

### 7.3 `shouldShowAdditionalInfoText` — 3-stage 필터 (line 530-544)

```
if (!projectData?.additionalInfo) → false            # 1. 데이터 존재
if (visibility && !visibility[label]) → false        # 2. 토글 on
switch (label):
  '전화번호':    Boolean(info.phoneNumber.trim())    # 3. 내용 있음
  '주소':        Boolean(info.address.trim())
  '주차 공간 수': info.parkingSpaces > 0               # number (이전 string → 변경)
  default:       false
```

3 번 필터 (내용 유무) 때문에 **visibility=true + 데이터=빈 문자열** 이면
element 가 생성되지 않는다. 사용자가 체크박스를 켰어도 전화번호를 비우면
캔버스에 안 나옴 — 이 동작이 직관적인지는 논의 여지가 있지만 의도된 것.

### 7.4 `shouldShowAdditionalInfoIcon` (line 513-528)

Text 와 달리 **데이터 유무 검사 없이** visibility 만 본다. 주차/애견/노키즈
등 아이콘 항목은 "있음/없음" 을 아이콘 자체로 표현하므로 데이터가 따로
필요하지 않다는 설계.

### 7.5 `toggleAdditionalInfoElements` — 토글 시 재배치 (projectEditor.ts)

```ts
// 1. 토글된 label 의 기존 element 제거
const withoutCurrentInfo = elements.filter(
  (element) => element.label !== label && element.label !== `${label} 아이콘`
);

// 2. on → 새로 생성, off → 빈 배열
const newElements = nextVisible
  ? createAdditionalInfoElements(projectData, label, nextVisibility)
  : [];

// 3. **나머지** info elements 좌표를 nextVisibility 로 재배치
//    (우측 정렬 특성상 한 개만 바뀌어도 전체 아이콘 위치 이동)
const presets = computeFooterPresets(projectData, nextVisibility);
const repositioned = withoutCurrentInfo.filter(…).map(el => {
  if (/^info-text-\d+$/.test(el.id)) → presets[label].text 적용
  if (/^info-image-\d+$/.test(el.id)) → presets[label].image 적용
});

return [...repositioned, ...newElements];
```

> **왜 3 단계가 필요한가**: FOOTER_ICON 은 우측 정렬이라 한 아이콘의
> visible 변화가 **나머지 모든 아이콘의 x 좌표를 shift** 시킨다. 새 element
> 만 반영하면 기존 아이콘들이 제자리에 남아 겹친다.

---

## 8. `mapProjectDataToTemplate` — 템플릿 기반 경로 (line 729-946)

`createElementsFromWireframe` 과 **상호 배타적** 대안. 둘 중 하나만 elements
시드에 쓰인다.

### 8.1 현재 호출 지점

실제로 이 함수는 **App.tsx 의 bootstrap effect** (템플릿 카드를 사이드바에
나열할 때) 와 template preview 에서 쓰이지, 메인 편집 진입 시에는 쓰이지
않는다. `handleStartFromHome` 은 `createElementsFromWireframe` 경로 사용.
즉 `mapProjectDataToTemplate` 은 **현재 레거시 색상이 짙은 API**.

### 8.2 구조

```
baseElements = cloneTemplateElements(template)  // deep clone 으로 mutation 격리
activeProducts = projectData.products.filter(이미지/이름/가격/설명/isAiGen 중 하나)
primaryImages  = baseElements.filter(isPrimaryImageElement)
matchedFields  = { store: false, slogan: false, details: false }

baseElements.map(element => {
  if (element.kind === 'image'):
    imageIndex = primaryImages.findIndex(id 매칭)
    product    = activeProducts[imageIndex] ?? null
    if (product?.image):
       return { ...element, ...transformOverride, imageUrl, hidden:false,
                productName, productPrice, productDescription, priceCurrency }
    if (imageIndex >= 0): return { ...element, hidden: true }
    return element
  else if (text regex 매칭 store/brand):
    matchedFields.store = true  // 중복 매칭 방지
    return text 동기화
  // ... slogan, details 동일 패턴
})

// 매칭 실패 시 extras 로 fallback element 생성
if (storeName && !matchedFields.store)  → extras.push(fallback-store-name)
if (mainSlogan && !matchedFields.slogan) → extras.push(fallback-main-slogan)
if (details && !matchedFields.details)   → extras.push(fallback-details)

// 템플릿 id 에 따라 "추가 제품" 배치
remainingProducts = activeProducts.filter(used 아닌 것)
remainingProducts.forEach((p, i) => {
  preset = extraLayoutPresets[template.id][i]
  extras.push({ id: `extra-product-${p.id}`, ...preset, imageUrl: p.image })
})

// product meta 텍스트도 extras 로
activeProducts.forEach(p => extras.push(...buildProductTextElements(p)))

return [...mapped, ...extras]
```

### 8.3 `matchedFields` 가드의 의미

같은 regex 가 템플릿의 여러 element 에 매칭될 수 있다 (예: 여러 텍스트 블록
이 label 에 '타이틀' 포함). `matchedFields.slogan = true` 이후로는 동일 regex
매칭을 **skip**. 첫 번째 매칭만 채우고 나머지는 건너뛴다.

### 8.4 `extraLayoutPresets` (line 361-378)

템플릿 id 별로 "추가 제품" (base 에 없는) 배치 좌표 하드코딩. `template-split-hero`,
`template-dual-drink`, `template-pop-board`, `template-arch-premium` 4 가지.
데이터 주입형 템플릿에 대한 대비책.

---

## 9. `updateProjectTextElements` — 사용자 입력 실시간 반영 (line 972-1086)

사이드바 `AdInfoSection` 에서 storeName 이나 mainSlogan 을 타이핑할 때
호출되는 **incremental text sync**.

### 9.1 2-phase 패턴

```
Phase 1: 기존 elements 순회하며 매칭되는 것을 찾음 → text 갱신
   - element.id === 'fallback-store-name' / 'fallback-main-slogan' → 즉시 매칭
   - regex 매칭 + kind==='text' → 추가 매칭
   matched = true 시 기록

Phase 2: matched === false 이면 (한 번도 못 찾았다면)
   - fallback element 를 새로 push
   - zone 좌표 (projectData.zonePositions || getDefaultZonePositions) 기반
   - nextValue 가 비어있으면 (trim() 결과 falsy) 추가 안 함
```

이 구조 덕분에:
- **초기 로드** 시 fallback 이 없다가 사용자가 입력 시작 → 첫 타이핑에서 새
  element 생성
- 일단 한 번 생긴 fallback 은 이후 입력 시 동일 id 로 매칭되어 **새로 생성
  안 되고 텍스트만 교체**

### 9.2 typography 포함

단순히 text 만 갈아끼우는 게 아니라 `getDraftTypography(draftIndex, ratio)`
결과를 함께 적용. Type 전환을 하지 않았어도 이 함수가 호출되면 fontSize 가
현재 Type 기준으로 **재보정**된다.

---

## 10. `applyElementVisibilityRules` — 현재는 장식 숨김만 (line 715-727)

```ts
export function applyElementVisibilityRules(
  _templateId: string | null,
  elements: EditorElement[],
  _backgroundMode: BackgroundMode,
  _projectData: HomeProjectData | null
) {
  return elements.map((element) => {
    if (!isDecorativeElement(element)) return element;
    return { ...element, hidden: true };
  });
}
```

시그니처가 4 인자지만 **실제로는 elements 만 쓴다** (나머지 `_` 접두어).
`isDecorativeElement` (line 501-511) 은 id/label 에 splash/badge/decoration/ornament/arch-panel/diagonal 등이 들어간 element 를
장식으로 판별.

**설계 의도 vs 현재 구현의 괴리**: 원래는 "templateId / backgroundMode /
projectData 조합에 따라 규칙을 바꾸는 의도" 였지만, 리팩터 과정에서 장식
숨김 규칙 1 개만 남았다. App.tsx 의 `renderElements = useMemo` 가 이 함수를
통과시켜 얻은 결과를 EditorCanvas 에 보낸다.

**확장 포인트**: 새 visibility 규칙 (예: mode==='solid' 시 주 배경 이미지
숨김) 을 추가하려면 이 함수에 case 를 더한다. CLAUDE.md 변경 포인트 가이드
(03 § 13) 에 명시된 경로.

---

## 11. 네 축의 교차 — Type 전환 1 회 시 무슨 일이 일어나는가

```
사용자가 WireframeChoiceCard 에서 Type 1 → Type 3 클릭
  │
  ▼  App.handleSelectWireframeType(nextDraftIndex=2)
  │
  ├─ nextProjectData = { ...projectData, options: { ..., draftIndex: 2 },
  │                      zonePositions: getDefaultZonePositions(2) }
  │
  ├─ let nextElements = elements    ← 현재 편집 상태 보존
  │
  ├─ nextElements = applyDraftLayoutVariant(
  │                   nextElements, 2, nextProjectData, additionalInfoVisibility)
  │     └─ § 6. 각 element 의 x/y/w/h/rotation + zIndex 재계산
  │        - 제품: mainZone 리매핑 + Type 3 pair z-offset
  │        - text: zones.* 기반 재배치
  │        - info-text/image: computeFooterPresets 기반 재배치
  │
  ├─ nextElements = applyDraftTypographyVariant(nextElements, nextProjectData)
  │     └─ § 4.3. fontSize/lineHeight 를 Type 3 typography 로 덮어쓰기
  │
  ├─ setProjectData(nextProjectData)
  ├─ setElements(nextElements)
```

**1 회 Type 전환에 Layout + Typography 두 축이 순차 적용**. Visibility 는
이미 결정된 상태 (토글이 없었으므로) 라 별도 패스 없음. Text sync 도 이미
element.text 에 있는 값 유지.

---

## 12. 공통 id 규약

| id 패턴 | 출처 | 의미 |
|---------|------|------|
| `fallback-store-name` | createElementsFromWireframe + updateProjectTextElements | 가게명 (zone.store) |
| `fallback-main-slogan` | 상동 | 메인 문구 (zone.slogan) |
| `fallback-details` | 상동 | 상세 설명 (zone.details) |
| `fallback-product-summary` | 과거 호환 | 요약/가격 (zone.summary) |
| `product-{id}` | createElementsFromWireframe | 제품 이미지 |
| `product-meta-{id}-name/price/desc` | buildProductTextElements | 제품 메타 텍스트 |
| `info-text-{slug}` | createAdditionalInfoElements | 부가정보 텍스트 (slug=1-7) |
| `info-image-{slug}` | 상동 | 부가정보 아이콘 |
| `extra-product-{id}` | mapProjectDataToTemplate | 템플릿 초과 제품 |
| `custom-text-{Date.now()}` | createCustomTextElement | 사용자 추가 텍스트 |
| `custom-image-{Date.now()}` | createCustomImageElement | 사용자 추가 이미지 |

id 규약은 **applyDraftLayoutVariant 의 분기** (§ 6.1) 전체의 전제. id 를
바꾸면 layout 재배치가 해당 element 를 건너뛴다 — **조용한 회귀** 위험.

---

## 13. 리팩터/테스트 후보

| 항목 | 현재 상태 | 제안 |
|------|-----------|------|
| 물리적 import 위치 | 파일 중간 3 곳에 흩어짐 | 상단으로 모으기 (fn 동작 무관) |
| `computeFooterPresets` 반복 호출 | applyDraftLayoutVariant map 안에서 info element 마다 1 회 | map 밖에서 1 회 계산 후 hoist (성능은 무시할 수준이지만 명시성 ↑) |
| `applyElementVisibilityRules` 4 인자 중 1 개만 사용 | `_` 접두어로 표시 | 나머지 3 인자 제거 or 확장 |
| `mapProjectDataToTemplate` 레거시성 | handleStartFromHome 에서 미사용 | 템플릿 프리뷰 전용임을 주석/rename 으로 명시 |
| Text sync 3 가지 함수 (updateProjectTextElements, applyProjectTextField, mapProjectDataToTemplate) 중복 로직 | regex 3 곳 중복 | shared regex util 로 추출 |
| 단위 테스트 부재 | 수동 QA 에 의존 | `computeFooterPresets` / `shouldShow*` / `applyDraftLayoutVariant` 는 순수 함수라 Jest 로 쉽게 커버 가능 |

---

## 14. 관련 경로

- [editorFlow.ts](../../react/src/modules/editing/utils/editorFlow.ts)
- [projectEditor.ts](../../react/src/modules/editing/utils/projectEditor.ts)
- [wireframeLayout.ts](../../react/src/modules/editing/utils/wireframeLayout.ts) — `computeWireframeProductPlacements` 등
- [wireframeTextPlacements.ts](../../react/src/modules/editing/utils/wireframeTextPlacements.ts) — productMeta 프리셋
- [wireframeBridge.ts](../../react/src/modules/editing/utils/wireframeBridge.ts) — `computeMainZoneDynamic`
- [shared/draftTypography.ts](../../react/src/shared/draftTypography.ts) — `getDraftTypography`
- [additionalInfo.ts](../../react/src/modules/editing/utils/additionalInfo.ts) — `getAdditionalInfoIcon`, `getAdditionalInfoDisplayText`

### 연계 상세 보고서
- [03 § 2.1 handleStartFromHome 상세](03_editing_module.md#21-handlestartfromhome-상세--진입-1회-seed-지점)
- [03 § 3.2 additionalInfoVisibility 계약](03_editing_module.md#32-additionalinfovisibility-계약--한국어-레이블-key-규약)
- [04 wireframe_engine.md](04_wireframe_engine.md) — Type 1-4 레이아웃 엔진의 수학적 디테일
- [07 § 2.2 view* ↔ 한국어 레이블 변환](07_bridge.md)

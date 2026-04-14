# Q.md

## 질문

1. 객체를 움직일 때 `Ctrl` 키를 누르고 여러 객체를 동시에 선택해서 한 번에 이동시킬 수 있는 기능을 넣을 수 있을까?
2. 지금 객체가 와이어프레임 기반인데, 첨부 이미지처럼 가게명/광고문구를 특정 위치에 같이 배치할 수 있을까?

## 결론 요약

- 두 기능 모두 **구조상 추가 가능**합니다.
- 다만 난이도는 다릅니다.
- `가게명/광고문구 배치`는 현재 코드에 이미 `text element` 와 `wireframe 기반 좌표 재배치`가 일부 들어가 있어서, **상대적으로 붙이기 쉬운 편**입니다.
- `Ctrl 다중 선택 후 그룹 이동`은 현재 편집기가 **단일 선택 전제**로 짜여 있어서, **상태 구조와 캔버스 이벤트를 같이 바꿔야 하는 기능**입니다.

## 현재 구조 분석

### 1. 편집 캔버스는 지금 `단일 선택` 구조다

- `App.tsx` 에서 선택 상태가 `selectedElementId: string | null` 하나만 있습니다.
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:109)
- 실제 캔버스에도 `selectedElementId` 하나만 내려가고, 선택 콜백도 `onSelect(id)` 하나입니다.
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:807)
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:7)
- `EditorCanvas` 의 드래그 상태도 `{ id }` 한 개 기준입니다. 이동/리사이즈/회전 모두 단일 객체만 대상으로 합니다.
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:17)
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:42)
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:76)

즉, 지금 상태에서는 `Ctrl + 클릭 다중 선택`이 **없습니다**.  
하지만 구조가 절대좌표 `elements[]` 기반이라서, 선택 상태만 `Set<string>` 또는 `string[]` 로 확장하면 구현은 가능합니다.

### 2. 텍스트는 이미 독립 객체로 다뤄지고 있다

- `EditorElement.kind` 에 이미 `'text' | 'image' | 'shape'` 가 있습니다.
  - 근거: [react/src/modules/editing/types/editor-core.ts](/2team-GenPrj-frontend/react/src/modules/editing/types/editor-core.ts:5)
- 캔버스에서도 텍스트를 별도 렌더링합니다.
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:169)
- 새 텍스트를 추가하는 기능도 이미 있습니다.
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:670)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:875)

즉, “와이어프레임 안에 가게명/광고문구를 넣을 수 있나?”에 대한 답은 **이미 어느 정도 되고 있고, 더 정교하게 맞추는 것도 가능**입니다.

### 3. 가게명/광고문구를 자동 배치하는 로직도 이미 일부 있다

- `mapProjectDataToTemplate()` 에서 `storeName`, `mainSlogan`, `details` 를 텍스트 요소로 매핑합니다.
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:472)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:520)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:534)
- 템플릿 안에 해당 텍스트 슬롯이 없으면 `fallback-store-name`, `fallback-main-slogan` 같은 보조 텍스트 요소를 따로 만듭니다.
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:615)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:638)
- 사용자가 가게명/광고문구를 바꾸면 `updateProjectTextElements()` 로 기존 텍스트 요소를 업데이트합니다.
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:486)
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:497)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:715)

### 4. 와이어프레임 기반 텍스트 재배치도 이미 들어가 있다

- `applyDraftLayoutVariant()` 가 제품 위치뿐 아니라 `store/slogan/details/summary` 같은 텍스트 좌표도 다시 잡습니다.
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:274)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:354)
  - 근거: [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:402)
- `wireframeLayout.ts` 에서 wireframe 슬롯을 editing 쪽 `elements[]` 좌표로 변환하고 있습니다.
  - 근거: [react/src/modules/editing/utils/wireframeLayout.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeLayout.ts:1)
- 특히 Type 3 overlap, Type 4 half-crop 배치도 이미 계산하고 있습니다.
  - 근거: [react/src/modules/editing/utils/wireframeLayout.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeLayout.ts:163)
  - 근거: [react/src/modules/editing/utils/wireframeLayout.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeLayout.ts:234)

즉, 첨부 이미지처럼

- 상단 작은 로고/가게명
- 하단 광고문구
- 상품 아래 상품명

같은 배치는 **현재 방향성과 맞습니다**.

다만 지금 텍스트 배치 값은 일부가 `LEGACY_TEXT_PLACEMENTS` 같은 하드코딩 테이블 기반이라서, 첨부 이미지처럼 더 정확한 레이아웃을 원하면 **wireframe 타입별 텍스트 좌표를 더 세밀하게 조정**해야 합니다.

## 질문 1. `Ctrl` 로 여러 객체를 동시에 선택해서 이동할 수 있나?

### 답

가능합니다. 다만 “짧은 패치” 수준은 아니고, 편집기의 선택 모델을 바꿔야 합니다.

### 왜 바로 안 되는가

- 선택 상태가 `selectedElementId` 하나뿐입니다.
- 드래그 상태도 `id` 하나만 기억합니다.
- 사이드바도 `selectedElement` 하나만 받아서 속성 편집 패널을 여는 구조입니다.
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:178)
  - 근거: [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:735)

### 넣는 방법

추천 방식은 아래입니다.

1. `selectedElementId` 를 `selectedElementIds: string[]` 또는 `Set<string>` 로 변경
2. `onSelect` 를 `onSelect(id, { append: boolean })` 형태로 변경
3. `Ctrl` 또는 `Meta` 키가 눌린 상태에서 클릭하면 기존 선택에 추가/제거
4. 드래그 시작 시 선택된 모든 객체의 시작 좌표를 저장
5. 마우스 이동량만큼 선택된 객체 전체에 같은 delta를 적용
6. 리사이즈/회전은 1차 버전에서는 단일 선택만 허용하는 게 안전

### 추천 구현 범위

1차 구현:

- `Ctrl/Command + 클릭` 다중 선택
- 선택된 여러 객체 `동시 이동`
- 배경 클릭 시 전체 선택 해제
- 사이드바는 “다중 선택 중” 메시지만 표시

2차 구현:

- 다중 선택 bounding box
- 그룹 리사이즈
- 그룹 회전
- 정렬/간격 맞춤

### 예상 영향 파일

- `react/src/modules/editing/App.tsx`
- `react/src/modules/editing/components/EditorCanvas.tsx`
- `react/src/modules/editing/components/Sidebar.tsx`
- `react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
- `react/src/modules/editing/utils/editor.ts`

### 리스크

- 현재 `onChangeElement(id, patch)` 는 단일 요소 기준이라 그룹 이동용 `updateElements(ids, updater)` 같은 유틸이 필요할 가능성이 큽니다.
- 다중 선택 상태에서 사이드바 UX를 어떻게 할지 결정해야 합니다.
- Mac 사용자는 `Ctrl` 보다 `Command(metaKey)` 가 자연스러워서 둘 다 지원하는 것이 안전합니다.

## 질문 2. 와이어프레임 안에 가게명/광고문구를 첨부 이미지처럼 배치할 수 있나?

### 답

가능합니다. 현재 코드에도 이미 같은 방향의 기능이 들어가 있습니다.

### 지금 이미 되는 부분

- 가게명 텍스트 요소 생성/업데이트
- 광고문구 텍스트 요소 생성/업데이트
- 상품명/가격/설명 텍스트 생성
- wireframe 타입별 제품 재배치
- 일부 텍스트의 위치 재배치

즉, 기능이 “없는 것”이 아니라 **정밀도가 아직 부족한 상태**에 가깝습니다.

### 첨부 이미지처럼 하려면 필요한 것

1. wireframe 타입별 텍스트 앵커를 더 정확히 정의
2. `storeName`, `mainSlogan`, 상품명, 가격, 설명을 타입별로 별도 좌표 세트로 관리
3. 필요하면 로고 전용 텍스트/이미지 슬롯도 추가
4. 텍스트 길이에 따라 줄바꿈, 최대폭, 폰트 크기 축소 규칙을 정리

### 현재 코드 기준 추천 방법

가장 자연스러운 방법은 `elements[]` 모델을 유지하면서, wireframe 적용 시 텍스트 좌표를 같이 덮어쓰는 방식입니다.

이 방식이 맞는 이유:

- 지금 편집기는 최종 렌더를 `elements[]` 로 그리고 있음
  - 근거: [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:132)
- 그래서 텍스트도 결국 독립 `text element` 로 남아야 이후 자유 편집이 쉬움
- wireframe은 “초기 자동 배치 규칙”으로 쓰고, 이후에는 사용자가 손으로 미세 조정하는 구조가 가장 안정적임

### 구현 아이디어

권장안:

- `wireframe type 1~4` 별로
  - `storeNameRect`
  - `mainSloganRect`
  - `productNameRect`
  - `priceRect`
  - `descriptionRect`
  를 정의
- `applyDraftLayoutVariant()` 에서 이미지뿐 아니라 해당 텍스트들도 같은 기준으로 재배치

현재 코드도 이미 이 방향으로 가고 있어서, 크게 어긋나지 않습니다.

## 우선순위 제안

### 우선 1

텍스트 배치 정교화

이유:

- 이미 기반 코드가 있음
- 사용자 체감 효과가 큼
- 리스크가 다중 선택보다 낮음

### 우선 2

`Ctrl/Command` 다중 선택 + 동시 이동

이유:

- 구현 가능하지만 상태 구조 변경 폭이 더 큼
- UX 결정이 필요함

## 실제 작업을 시작한다면 추천 순서

1. `selectedElementId` 를 다중 선택 구조로 바꿀지 먼저 결정
2. 텍스트 배치 좌표를 wireframe type별로 별도 표로 정리
3. `applyDraftLayoutVariant()` 에서 텍스트/이미지 모두 같은 규칙으로 재배치
4. 길이가 긴 가게명/광고문구 테스트
5. 그 다음 다중 선택 이동 추가

## 최종 판단

- `Ctrl` 다중 선택 이동: **가능**
- 첨부 이미지 같은 텍스트 배치: **가능**
- 둘 중 더 빨리 안정적으로 붙는 것은: **텍스트 배치**
- 구조 변경이 더 큰 것은: **다중 선택 이동**

필요하면 다음 단계에서 이 문서를 바탕으로 실제 구현 작업도 바로 이어갈 수 있습니다.

## 추가 정리: 실제로 기능을 넣으려면 어떤 파일을 어떻게 수정해야 하나

기존 분석은 “가능 여부” 중심이었고, 아래는 실제 구현을 시작할 때의 수정 대상과 방향을 정리한 것입니다.

---

## A. `Ctrl/Command` 다중 선택 + 여러 객체 동시 이동

### 목표

- `Ctrl` 또는 `Command` 를 누른 채 객체를 클릭하면 여러 객체를 동시에 선택
- 선택된 객체들을 한 번에 같이 이동
- 배경 클릭 시 전체 선택 해제
- 1차 버전에서는 리사이즈/회전은 단일 선택만 유지

### 수정 대상 파일

#### 1. `react/src/modules/editing/App.tsx`

가장 큰 변경 지점입니다.

해야 할 일:

- `selectedElementId` 를 `selectedElementIds` 로 변경
- `selectedElement` 단일 계산을 유지할지, `selectedElements` 배열로 바꿀지 결정
- `EditorCanvas` 에 넘기는 props 를 다중 선택용으로 변경
- 그룹 이동용 업데이트 함수를 추가

구체적으로 바꿔야 할 부분:

- 현재
  - `const [selectedElementId, setSelectedElementId] = useState<string | null>(null);`
- 변경 방향
  - `const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);`

추가로 필요한 로직:

- `toggleElementSelection(id, append)` 같은 함수
- `clearSelection()` 함수
- 그룹 이동용 `updateElementsByIds(ids, delta)` 또는 `patchElements(ids, fn)` 함수

추가 구현 예시 방향:

- 일반 클릭: 기존 선택 초기화 후 하나만 선택
- `Ctrl/Meta + 클릭`: 배열에 추가 또는 제거
- 템플릿 변경, wireframe 변경, 배경 생성 시 선택 초기화

중요한 영향:

- 지금 `selectedElement` 를 사이드바에 넘기고 있으므로, 다중 선택일 때는
  - 첫 번째 요소만 보여줄지
  - `null` 로 넘기고 “다중 선택 중” UI를 띄울지
  둘 중 하나로 정해야 합니다.

#### 2. `react/src/modules/editing/components/EditorCanvas.tsx`

이 파일이 실제 클릭/드래그 동작을 담당하므로 다중 선택 기능의 핵심입니다.

해야 할 일:

- `selectedElementId` 단일 비교를 다중 선택 비교로 변경
- `onSelect(id)` 를 `onSelect(id, options)` 형태로 확장
- `event.ctrlKey` / `event.metaKey` 를 읽어서 append 선택 처리
- 드래그 시작 시 선택된 모든 요소의 시작 좌표를 저장
- 마우스 이동 시 선택된 요소 전체에 같은 delta 적용

현재 구조:

- `DragState` 가 `{ id, startX, startY, x, y }` 형태

변경 방향:

- `DragState` 를 아래처럼 확장
  - `ids: string[]`
  - `origins: Array<{ id, x, y }>`

예상 변경 포인트:

- `EditorCanvasProps`
  - `selectedElementId: string | null`
  - `onSelect: (id: string | null) => void`
  를
  - `selectedElementIds: string[]`
  - `onSelect: (id: string | null, options?: { append?: boolean }) => void`
  로 변경

- `const selected = selectedElementId === element.id;`
  를
  - `selectedElementIds.includes(element.id)`
  로 변경

- `startMove()`
  - 선택된 객체 집합 기준으로 drag state 저장

- `onMove()`
  - 지금은 `onChangeElement(current.id, { x, y })`
  - 변경 후에는 `onChangeElements(current.ids, delta)` 식으로 여러 개 적용

추가 권장 사항:

- 다중 선택 상태에서는 resize/rotate handle 을 숨기는 것이 1차 구현에 안전합니다.

#### 3. `react/src/modules/editing/utils/editor.ts`

현재는 단일 요소 업데이트 유틸만 쓰고 있을 가능성이 높습니다.

해야 할 일:

- 여러 요소를 한 번에 업데이트하는 유틸 추가

예시 함수:

- `updateElements(elements, ids, updater)`
- `moveElements(elements, ids, dx, dy)`

이 파일에 넣는 이유:

- `App.tsx` 와 `EditorCanvas.tsx` 에서 동일한 그룹 업데이트 로직을 재사용하기 좋음
- 좌표 clamp 규칙을 한 곳에 모을 수 있음

#### 4. `react/src/modules/editing/components/Sidebar.tsx`

현재는 단일 선택된 요소를 전제로 동작합니다.

해야 할 일:

- `selectedElement` 대신
  - `selectedElements`
  - 또는 `selectionCount`
  를 받을 수 있게 변경

1차 구현 권장:

- 다중 선택이면 상세 속성 패널 대신
  - “N개 요소 선택됨”
  - “이동만 가능, 세부 속성 편집은 단일 선택에서 지원”
  정도만 보여주기

이렇게 하면 `ElementInfoPanels.tsx` 복잡도를 낮출 수 있습니다.

#### 5. `react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`

이 파일은 단일 요소 속성 편집 UI입니다.

해야 할 일:

- 다중 선택 상태 분기 추가

권장 방향:

- 1차 버전: 다중 선택이면 속성 편집 비활성화
- 2차 버전: 공통 속성만 편집 가능
  - opacity
  - zIndex 올리기/내리기
  - hidden 처리

#### 6. CSS 관련 파일

- `react/src/modules/editing/styles/global.css`

해야 할 일:

- 다중 선택 스타일 추가
- 여러 객체가 선택됐을 때 시각적으로 구분되는 outline 정리
- 필요하면 그룹 bounding box 스타일 추가

1차 구현이면 필수는 아니지만, 최소한 선택된 여러 객체가 눈에 잘 보여야 합니다.

### 다중 선택 기능 구현 순서 추천

1. `App.tsx` 에서 선택 상태를 배열로 변경
2. `EditorCanvas.tsx` 에서 `Ctrl/Meta + 클릭` 선택 추가
3. 그룹 이동 유틸을 `utils/editor.ts` 에 추가
4. 드래그 이동을 여러 요소에 적용
5. 다중 선택 상태에서 사이드바 UI 정리
6. 선택 스타일 CSS 보완

### 다중 선택 구현 시 주의점

- `Ctrl` 은 Windows/Linux, `Meta(Command)` 는 Mac 대응으로 같이 처리해야 함
- 숨김 요소(`hidden`)나 잠금 요소(`locked`)는 다중 선택 대상에서 제외할지 결정 필요
- 현재 저장/캡처 로직은 선택 핸들을 무시하고 있으므로 큰 충돌은 없지만, 그룹 selection box를 추가하면 `data-html2canvas-ignore` 처리 필요 가능성 있음

---

## B. 와이어프레임 안에 가게명/광고문구/상품명을 첨부 이미지처럼 더 정확하게 배치

### 목표

- 와이어프레임 타입별로
  - 가게명
  - 광고문구
  - 상품명
  - 가격
  - 설명
  을 더 의도된 위치에 자동 배치
- 이후 사용자가 편집기로 미세 이동 가능

### 수정 대상 파일

#### 1. `react/src/modules/editing/utils/editorFlow.ts`

텍스트 요소 생성과 배치 재적용의 중심 파일입니다.

해야 할 일:

- 현재 `applyDraftLayoutVariant()` 에 있는 텍스트 배치 규칙을 더 세분화
- `store/slogan/details/summary` 외에 상품 메타 텍스트도 wireframe 타입별 규칙으로 조정
- 필요하면 로고 전용 요소도 여기서 생성

특히 손봐야 할 부분:

- `LEGACY_TEXT_PLACEMENTS`
  - 지금은 과거 좌표 테이블 성격이 강함
  - 첨부 이미지 수준으로 맞추려면 타입별 텍스트 앵커를 다시 정의해야 함

- `buildProductTextElements()`
  - 지금은 상품명/가격/설명 요소를 일괄 생성
  - 생성은 유지하되, 위치 계산을 더 정교하게 연결해야 함

- `placeProductMetaElement()`
  - 현재는 상품 이미지 rect 아래에 이름/가격/설명을 단순 배치
  - 첨부 이미지처럼 “상품 아래 상품명, 그 아래 광고문구” 구조를 맞추려면
    타입별 오프셋 규칙 또는 역할별 오프셋 규칙을 더 세밀하게 넣어야 함

추천 변경 방향:

- `storeName`
- `mainSlogan`
- `details`
- `summary`
- `product name`
- `product price`
- `product desc`
를 각각 분리해서 배치 테이블화

즉, 지금보다 더 명시적으로

- 어떤 텍스트인지
- 어느 wireframe type인지
- 어느 위치에 둘지

를 코드에서 분리해야 합니다.

#### 2. `react/src/modules/editing/utils/wireframeTextPlacements.ts`

이 파일은 텍스트 좌표를 관리하기에 가장 자연스러운 위치입니다.

현재는 `storeName`, `mainSlogan` 정도만 단순 정의되어 있습니다.

해야 할 일:

- 타입별 텍스트 좌표 구조 확장

예시 방향:

- `storeName`
- `mainSlogan`
- `details`
- `productName`
- `productPrice`
- `productDesc`
- 필요하면 `logo`

형태로 확장

예를 들면:

- Type 1
  - 좌상단 작은 로고/가게명
  - 중앙 제품
  - 하단 상품명
  - 맨 아래 광고문구

- Type 2
  - 좌측 로고/가게명
  - 중앙 제품
  - 하단 문구

같은 식으로 타입별 테이블을 잡아야 합니다.

이 파일을 확장하면 `editorFlow.ts` 에서 좌표를 가져다 쓰기 쉬워집니다.

#### 3. `react/src/modules/editing/utils/wireframeLayout.ts`

이 파일은 제품 이미지용 wireframe 좌표 계산의 중심입니다.

해야 할 일:

- 이미지뿐 아니라 텍스트 배치와 연결할 수 있는 기준점 역할을 더 분명히 정리
- 필요하면 텍스트용 anchor 계산도 여기서 일부 담당

현재 상태:

- 제품 슬롯은 잘 계산하고 있음
- 텍스트는 별도 하드코딩 테이블에 의존

선택 가능한 방향:

1. `wireframeLayout.ts` 는 제품 슬롯만 유지
2. 텍스트는 `wireframeTextPlacements.ts` 에서만 관리

이 방식이 1차 구현에는 더 단순합니다.

즉, 이 파일은 꼭 크게 바꾸지 않아도 되지만, 아래 경우에는 수정이 필요합니다.

- 상품 이미지 rect 기준으로 텍스트를 상대 배치하고 싶을 때
- type별 특수 공식이 텍스트에도 영향을 줄 때

#### 4. `react/src/modules/editing/App.tsx`

이 파일은 실제 projectData 변경이 elements에 반영되는 진입점입니다.

해야 할 일:

- 가게명/광고문구 변경 시 새 좌표 규칙이 자연스럽게 다시 적용되도록 연결 확인
- wireframe 타입 변경 시 텍스트도 함께 재배치되는 흐름 유지

이미 관련 연결은 있습니다.

- `handleStoreNameChange()`
- `handleMainSloganChange()`
- `handleSelectWireframeType()`
- `handleStartFromHome()`

그래서 이 파일의 수정은 크지 않을 수 있지만, 아래 확인은 필요합니다.

- 텍스트 좌표 재적용 타이밍이 맞는지
- 사용자가 수동 이동한 뒤 wireframe 변경 시 덮어써도 되는지

이건 UX 정책 문제이기도 합니다.

#### 5. `react/src/modules/editing/components/EditorCanvas.tsx`

이 파일은 텍스트를 렌더링하므로, 긴 문구나 줄바꿈 처리에서 손볼 수 있습니다.

가능한 수정 포인트:

- 긴 가게명/광고문구에 대한 `maxWidth` / 줄바꿈 확인
- 필요하면 `white-space`, `word-break`, `overflow-wrap` 계열 스타일 보강
- 텍스트 박스 선택 시 실제 배치가 어긋나 보이지 않도록 스타일 조정

즉, 좌표 계산은 `editorFlow.ts` 쪽이 중심이고, 이 파일은 실제 표시 품질 보완 역할입니다.

#### 6. 필요시 추가 파일: `react/src/modules/editing/utils/fontRecommendations.ts`

텍스트가 배치되더라도 문구 길이에 따라 폰트 크기나 굵기가 자동 조절돼야 보기 좋아질 수 있습니다.

필요하다면:

- wireframe type별 권장 폰트 크기
- 긴 문구 축소 규칙
- storeName / slogan / details 우선순위

를 이 파일과 연결할 수 있습니다.

현재 필수 수정 파일은 아니지만, 품질을 올리려면 후보입니다.

### 텍스트 배치 기능 구현 순서 추천

1. `wireframeTextPlacements.ts` 구조 확장
2. `editorFlow.ts` 에서 텍스트 역할별 배치 로직 정리
3. 상품명/가격/설명 요소를 type별로 더 정교하게 배치
4. `App.tsx` 흐름에서 wireframe 전환/문구 변경 시 재배치 확인
5. `EditorCanvas.tsx` 에서 긴 문구 렌더 품질 보완

### 텍스트 배치 구현 시 주의점

- 가게명과 광고문구는 길이 편차가 커서 고정 좌표만으로는 부족할 수 있음
- 한국어 문구는 줄바꿈이 예상보다 빨리 일어날 수 있음
- 사용자가 편집기에서 수동 이동한 뒤 자동 재배치가 다시 실행되면 “내가 움직인 위치가 사라졌다”는 느낌을 줄 수 있음

따라서 추천 정책은 아래 둘 중 하나입니다.

1. wireframe 변경 시에만 자동 재배치
2. 문구 변경 시에도 재배치하되, 사용자가 수동 이동한 요소는 잠금 또는 자동배치 제외 처리

---

## 가장 현실적인 1차 작업안

둘 다 한 번에 하려면 범위가 커집니다.  
그래서 실제 작업은 아래 순서가 가장 안전합니다.

### 1차

- 텍스트 배치 정교화
  - 수정 파일
    - `react/src/modules/editing/utils/wireframeTextPlacements.ts`
    - `react/src/modules/editing/utils/editorFlow.ts`
    - 필요시 `react/src/modules/editing/App.tsx`
    - 필요시 `react/src/modules/editing/components/EditorCanvas.tsx`

### 2차

- `Ctrl/Command` 다중 선택 + 동시 이동
  - 수정 파일
    - `react/src/modules/editing/App.tsx`
    - `react/src/modules/editing/components/EditorCanvas.tsx`
    - `react/src/modules/editing/utils/editor.ts`
    - `react/src/modules/editing/components/Sidebar.tsx`
    - `react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx`
    - `react/src/modules/editing/styles/global.css`

---

## 한 줄 정리

- 텍스트 배치는 `editorFlow.ts` 와 `wireframeTextPlacements.ts` 가 핵심
- 다중 선택 이동은 `App.tsx` 와 `EditorCanvas.tsx` 가 핵심
- 실제 구현 난이도는 다중 선택 쪽이 더 높음

## 정리_2

### 1. 텍스트 위치를 내가 원하는 대로 조정하려면 어디를 보면 되나

텍스트 위치를 실제로 결정하는 코드는 한 군데가 아니라 아래 순서로 연결됩니다.

#### 가장 먼저 봐야 하는 파일

- `react/src/modules/editing/utils/wireframeTextPlacements.ts`

이 파일이 wireframe 타입별 텍스트 위치표입니다.

여기서 조정하는 것:

- `storeName`
- `mainSlogan`
- `productMeta`
  - `nameOffsetY`
  - `priceOffsetY`
  - `descOffsetY`
  - 최소 폭 관련 값

즉,

- 가게명을 더 위/아래로
- 광고문구를 더 아래/중앙으로
- 상품명/가격/설명을 제품 아래에서 얼마나 떨어뜨릴지

같은 건 이 파일에서 제일 먼저 조정합니다.

관련 파일:

- [react/src/modules/editing/utils/wireframeTextPlacements.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeTextPlacements.ts:1)

#### 실제로 그 좌표를 elements 에 반영하는 파일

- `react/src/modules/editing/utils/editorFlow.ts`

이 파일에서 텍스트 위치표를 실제 요소 좌표에 덮어씁니다.

핵심 함수:

- `applyDraftLayoutVariant()`
  - wireframe type 기준으로 store/slogan/details/summary 위치를 다시 잡음
- `placeProductMetaElement()`
  - 상품 이미지 rect 아래에 상품명/가격/설명을 어떻게 배치할지 정함
- `mapProjectDataToTemplate()`
  - 가게명/광고문구/상세문구를 텍스트 요소로 실제 생성

즉, 좌표표 자체는 `wireframeTextPlacements.ts` 에 있고,  
그 좌표를 실제 화면 요소에 적용하는 곳은 `editorFlow.ts` 입니다.

관련 위치:

- [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:274)
- [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:346)
- [react/src/modules/editing/utils/editorFlow.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/editorFlow.ts:472)

#### 실제 화면에 텍스트가 어떻게 보이는지 결정하는 파일

- `react/src/modules/editing/components/EditorCanvas.tsx`

이 파일은 좌표 계산은 하지 않고, 이미 계산된 `element.x/y/width/...` 로 그립니다.

여기서 영향을 주는 것:

- 텍스트 박스가 `fit-content` 로 보일지
- `maxWidth` 가 얼마나 적용될지
- fontSize / lineHeight / align 이 실제로 어떻게 렌더될지

즉, “위치 계산” 문제는 아니지만  
“왜 같은 좌표인데 보이는 느낌이 다르지?” 같은 건 이 파일도 같이 봐야 합니다.

관련 위치:

- [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:145)
- [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:169)

### 2. 텍스트 위치를 실제로 수정할 때 우선순위

가장 빠른 순서는 아래입니다.

1. `wireframeTextPlacements.ts` 에서 type별 위치값 수정
2. 상품명/가격/설명 간격은 `editorFlow.ts` 의 `placeProductMetaElement()` 수정
3. 여전히 이상하면 `EditorCanvas.tsx` 에서 텍스트 렌더 스타일 확인

즉, 보통은 먼저 이 두 파일을 보면 됩니다.

- `react/src/modules/editing/utils/wireframeTextPlacements.ts`
- `react/src/modules/editing/utils/editorFlow.ts`

---

### 3. 왜 구도선택/배경선택 카드와 메인 화면이 서로 다르게 보이나

이건 실제로 렌더 경로가 서로 다르기 때문입니다.

#### 메인 프리뷰

메인 프리뷰는 `App.tsx` 에서 `EditorCanvas` 를 사용합니다.

관련 위치:

- [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:825)
- [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:22)

즉, 메인은 최종적으로 `elements[]` 를 기반으로 편집 가능한 캔버스를 그립니다.

#### 배경선택 카드

배경선택 카드는 `BackgroundCard.tsx` 를 사용합니다.

관련 위치:

- [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:857)
- [react/src/modules/editing/components/BackgroundCard.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/BackgroundCard.tsx:1)

이 카드도 `elements[]` 를 쓰긴 하지만, 메인과 렌더 방식이 완전히 같지는 않습니다.

차이점:

- `EditorCanvas` 는 텍스트에 `fit-content` + `maxWidth` 를 씀
- `BackgroundCard` 는 텍스트도 그냥 `width: ${element.width}%`, `height: ${element.height}%` 로 그림
- 메인은 선택/드래그/핸들/그림자 같은 편집용 표현이 있음
- 배경 카드는 읽기 전용 축소 렌더

즉, 같은 `elements[]` 를 써도 텍스트 박스 처리 방식이 달라서  
메인과 배경 카드가 미세하게 다르게 보일 수 있습니다.

특히 봐야 하는 곳:

- [react/src/modules/editing/components/EditorCanvas.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/EditorCanvas.tsx:148)
- [react/src/modules/editing/components/BackgroundCard.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/BackgroundCard.tsx:27)

#### 구도선택 카드

구도선택 카드는 `WireframeChoiceCard.tsx` 를 사용합니다.

관련 위치:

- [react/src/modules/editing/App.tsx](/2team-GenPrj-frontend/react/src/modules/editing/App.tsx:870)
- [react/src/modules/editing/components/WireframeChoiceCard.tsx](/2team-GenPrj-frontend/react/src/modules/editing/components/WireframeChoiceCard.tsx:1)

여기가 가장 큰 차이입니다.

이 카드는 `elements[]` 를 직접 그리지 않고,  
`initPage` 쪽 wireframe 레이아웃 컴포넌트를 그대로 가져와 렌더합니다.

연결 파일:

- [react/src/modules/editing/utils/wireframeBridge.ts](/2team-GenPrj-frontend/react/src/modules/editing/utils/wireframeBridge.ts:1)

즉:

- 메인 프리뷰 = `EditorCanvas` + `elements[]`
- 배경선택 카드 = `BackgroundCard` + `elements[]`
- 구도선택 카드 = `WireframeChoiceCard` + `initPage wireframe Layout JSX`

그래서 구도선택 카드와 메인 프리뷰가 다르게 보이는 건 자연스러운 상태입니다.  
둘이 아예 같은 렌더러를 쓰지 않기 때문입니다.

---

### 4. 어디를 수정하면 어떤 화면이 바뀌나

#### 메인 프리뷰만 바꾸고 싶을 때

- `react/src/modules/editing/components/EditorCanvas.tsx`
- `react/src/modules/editing/utils/editorFlow.ts`
- `react/src/modules/editing/utils/wireframeTextPlacements.ts`

#### 배경선택 카드도 같이 맞추고 싶을 때

- 위 파일들 +
- `react/src/modules/editing/components/BackgroundCard.tsx`

특히 텍스트 width/height 처리 방식을 메인과 맞춰야 합니다.

#### 구도선택 카드까지 메인과 비슷하게 맞추고 싶을 때

- `react/src/modules/editing/components/WireframeChoiceCard.tsx`
- `react/src/modules/editing/utils/wireframeBridge.ts`
- 필요하면 아예 메인도 같은 wireframe Layout 컴포넌트를 쓰는 방향 검토

하지만 이건 범위가 커집니다.  
왜냐하면 지금 구도선택 카드는 `initPage` 렌더 시스템을 그대로 쓰고,  
메인은 `editing` 전용 `elements[]` 시스템을 쓰기 때문입니다.

---

### 5. 한 줄로 정리하면

- 텍스트 위치 조정의 핵심 파일
  - `react/src/modules/editing/utils/wireframeTextPlacements.ts`
  - `react/src/modules/editing/utils/editorFlow.ts`

- 메인과 배경선택 카드가 다른 이유
  - 둘 다 `elements[]` 를 쓰지만 렌더 방식이 약간 다름

- 메인과 구도선택 카드가 다른 이유
  - 메인은 `EditorCanvas`
  - 구도선택 카드는 `initPage wireframe Layout`
  - 즉, 렌더러가 아예 다름

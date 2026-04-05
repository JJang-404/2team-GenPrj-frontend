# Deep Interview Spec: SlotList 배경 제거 교체 (isnet 모델 명시)

## Metadata
- Interview ID: di-slotlist-rembg-20260404
- Rounds: 3
- Final Ambiguity Score: 14%
- Type: brownfield
- Generated: 2026-04-04
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.92 | 35% | 0.322 |
| Constraint Clarity | 0.78 | 25% | 0.195 |
| Success Criteria | 0.82 | 25% | 0.205 |
| Context Clarity | 0.95 | 15% | 0.143 |
| **Total Clarity** | | | **0.865** |
| **Ambiguity** | | | **14%** |

## Goal
`2team-GenPrj-frontend/src/components/Editor/SlotList.tsx`의 `handleRemoveBg` 및 `removeBgFromImage` 헬퍼를 `2team-GenPrj-frontend/App.jsx`의 `handleRemoveBackground` 패턴(fetch → Blob → removeBackground(blob))으로 교체하고, `@imgly/background-removal`의 모델을 `isnet`으로 명시한다. 목적은 비닐봉지·디저트봉지처럼 반투명하거나 복잡한 배경 요소의 검출 품질 향상이다.

## Constraints
- **라이브러리**: `@imgly/background-removal` v1.7.0 유지 (최신 버전이 이미 설치됨). birefnet 미지원 확인됨.
- **모델**: `isnet` 명시 사용 (v1.7.0 지원 모델 중 최고 품질: `isnet` > `isnet_fp16` > `isnet_quint8`)
- **결과 URL 형식**: `DataURL` (FileReader → readAsDataURL) — App.jsx 원본 패턴 유지, ObjectURL 메모리 누수 회피
- **에러 처리**: `alert()` 사용 금지 (새 코드베이스에 없는 패턴). `catch` 블록 추가, `console.error`로 최소 로깅. 로딩 상태는 `finally`에서 반드시 해제.
- **상태 관리**: `loadingSlots` state 패턴 유지 (슬롯별 로딩 추적)
- **콜백**: `onImageUpload(slotId, resultDataUrl)` 형식 유지 (타입 시그니처 변경 없음)
- **TypeScript 타입**: 기존 SlotListProps 인터페이스 변경 없음

## Non-Goals
- `@imgly/background-removal` 버전 업그레이드 (v1.7.0이 최신)
- birefnet 또는 타 라이브러리로 교체
- SlotList 이외 컴포넌트 수정
- 배경 제거 품질 튜닝 (model 옵션 외 추가 파라미터 조정)
- UI/버튼 텍스트 변경

## Acceptance Criteria
- [ ] `removeBgFromImage` 헬퍼 함수 제거됨
- [ ] `handleRemoveBg`가 `fetch(url) → blob → removeBackground(blob, { model: 'isnet' })` 패턴으로 교체됨
- [ ] 결과가 `DataURL` 형식으로 `onImageUpload`에 전달됨
- [ ] `try-catch-finally` 구조: catch에 console.error, finally에 loadingSlots 해제
- [ ] TypeScript 타입 에러 없이 빌드 통과 (`npm run build`)
- [ ] `2team-GenPrj-frontend/img/picture/KakaoTalk_20260401_184320873_06.jpg` 입력 시 우측 컵 뒤 비닐봉지/디저트봉지가 배경으로 검출되어 제거됨 (시각적 검증, 자동화 불가)

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| birefnet 사용 가능 | npm view로 확인 | v1.7.0에 없음 → isnet 사용 |
| 최신 버전에 birefnet 있을 것 | latest 태그 확인 | v1.7.0이 최신, 더 높은 버전 없음 |
| App.jsx의 alert()를 그대로 이식 | 新 코드베이스 패턴 탐색 | 새 코드베이스에 alert 없음 → console.error로 대체 |
| ObjectURL이 DataURL과 동일하게 동작 | onImageUpload 소비처 탐색 | App.tsx는 string만 저장, 둘 다 가능하나 DataURL이 더 안전 |

## Technical Context

### 변경 대상 파일
- **`2team-GenPrj-frontend/src/components/Editor/SlotList.tsx`**

### 현재 구현 (교체 전)
```typescript
// 라인 17-20: 헬퍼 함수 (제거 대상)
async function removeBgFromImage(imgUrl: string): Promise<string> {
  const blob = await removeBackground(imgUrl);  // URL 직접 전달, 옵션 없음
  return URL.createObjectURL(blob);             // ObjectURL 반환
}

// 라인 42-50: 핸들러 (교체 대상)
const handleRemoveBg = async (slotId: string, url: string) => {
  setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
  try {
    const result = await removeBgFromImage(url);
    onImageUpload(slotId, result);
  } finally {   // catch 없음 — 에러 silent
    setLoadingSlots(prev => ({ ...prev, [slotId]: false }));
  }
};
```

### 목표 구현 (교체 후)
```typescript
// removeBgFromImage 헬퍼 제거

const handleRemoveBg = async (slotId: string, url: string) => {
  setLoadingSlots(prev => ({ ...prev, [slotId]: true }));
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const resultBlob = await removeBackground(blob, { model: 'isnet' });
    const resultUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(resultBlob);
    });
    onImageUpload(slotId, resultUrl);
  } catch (error) {
    console.error('배경 제거 실패:', error);
  } finally {
    setLoadingSlots(prev => ({ ...prev, [slotId]: false }));
  }
};
```

### 참조 파일
- `2team-GenPrj-frontend/App.jsx`: 원본 패턴 (임시 보관)
- `2team-GenPrj-frontend/img/picture/KakaoTalk_20260401_184320873_06.jpg`: 시각적 검증용 테스트 이미지

### 왜 URL→Blob 방식이 품질에 유리한가
현재 SlotList.tsx는 `removeBackground(url)` — URL을 직접 전달. App.jsx는 `fetch(url) → blob → removeBackground(blob)`. 라이브러리가 URL을 받으면 내부적으로 fetch하는데, Blob을 직접 전달하면 CORS/캐시 등 네트워크 변수가 제거됨. 품질 개선의 주요 원인은 모델을 `isnet` (기본값과 동일하나 명시적)으로 지정하는 것.

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| SlotList | core domain | slotDefs, imageSlots, loadingSlots | uses removeBackground, calls onImageUpload |
| handleRemoveBg | core domain | slotId, url | 교체 대상, calls removeBackground |
| removeBackground | external system | blob/url input, model option | from @imgly/background-removal |
| onImageUpload | supporting | slotId, imageUrl(string) | callback to App.tsx |
| isnet | supporting | model config value | passed as option to removeBackground |
| loadingSlots | supporting | Record<string, boolean> | tracks per-slot loading state |
| DataURL | supporting | base64 string | result format from FileReader |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 6 | 1 (isnet) | 0 | 5 | 83% |
| 3 | 7 | 2 (DataURL, loadingSlots) | 0 | 5 | 71% |

## Interview Transcript
<details>
<summary>Full Q&A (3 rounds)</summary>

### Round 1
**Q:** 성능 기준(비닐봉지 배경 검출)을 달성하기 위한 범위는 어디까지인가요?
**A:** birefnet으로 교체 가능한지 파악해줘. python rembg 기준으로 가장 좋았거든. 안 된다면 다른 모델 중에 성능이 가장 좋은 (가장 최근에 발표된) 모델을 시도하자.
**Ambiguity:** 32% (Goal: 0.80, Constraints: 0.55, Criteria: 0.55, Context: 0.80)

### Round 2
**Q:** @imgly/background-removal v1.7.0에는 birefnet이 없습니다. isnet / isnet_fp16 / isnet_quint8 3종뿐. 어떻게 할까요?
**A:** isnet 계열 말고 더 좋은 모델이 있다면 그걸 쓰자. 아니라면 isnet 쓰고.
*(npm 확인 결과: v1.7.0이 최신, birefnet 없음 → isnet 채택)*
**Ambiguity:** 21% (Goal: 0.90, Constraints: 0.65, Criteria: 0.70, Context: 0.90)

### Round 3
*(코드베이스 탐색으로 해결: onImageUpload 형식, 에러 처리 패턴 확인)*
**Ambiguity:** 14% — 임계값 통과

</details>

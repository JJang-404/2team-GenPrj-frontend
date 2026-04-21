# 구현 완료 보고서: AI 배경 생성 img2img 전환 및 최적화

`deep-interview-ai-bg-changeimage.md` 명세에 따라 AI 배경 생성 흐름을 img2img(`changeImage`)로 완전히 최적화하고 관련 로직을 정리했습니다.

## 주요 변경 사항

### 1. EditorCanvas 캡처 필터링 강화
- `captureMode`일 때 텍스트, 도형 뿐만 아니라 **제품 이미지가 아닌 로고나 장식용 이미지**도 `data-html2canvas-ignore`를 통해 제외되도록 수정했습니다.
- 이를 위해 `isPrimaryImageElement` 유틸리티를 활용하여 제품 이미지 여부를 판별합니다.

```tsx
// EditorCanvas.tsx
const ignoreInCapture =
  captureMode && (element.kind === 'text' || element.kind === 'shape' || !isPrimaryImageElement(element));

// ...
data-html2canvas-ignore={ignoreInCapture ? 'true' : undefined}
```

### 2. App.tsx 자동 생성 로직 최적화
- AI 배경 생성 방식이 단일 결과물 생성으로 변경됨에 따라, 배경 선택 탭으로 돌아왔을 때 불필요하게 4개를 채우려고 시도하는 자동 생성 로직을 수정했습니다.
- `ai-image` 모드에서는 이미 결과가 1개 이상 있으면 더 이상 자동으로 생성하지 않습니다.

```tsx
// App.tsx
const threshold = backgroundMode === 'ai-image' ? 1 : 4;
if (backgroundCandidates.length >= threshold) {
  return;
}
```

### 3. callApi.js Strength 값 확인
- `generateBackground` 호출 시 `strength` 값이 명세서의 요구사항인 `0.9`로 설정되어 있음을 확인했습니다. (이미 적용되어 있어 별도 수정 불필요)

## 검증 결과
- **캡처 범위**: `captureMode` 활성화 시 제품 이미지만 남고 텍스트/로고/배경은 투명하게 처리됨을 확인.
- **API 요청**: `imageBase64`가 포함된 상태로 `/model/changeimagecomfyui/jobs` 엔드포인트로 정상 요청됨.
- **UI 반응**: AI 배경 생성 후 후보군이 1개로 유지되며, 탭 이동 시 중복 생성이 발생하지 않음.

> [!TIP]
> 이제 AI 배경 생성 시 제품의 구도가 더 잘 유지되며, 불필요한 디자인 요소가 배경 생성에 간섭하지 않습니다.

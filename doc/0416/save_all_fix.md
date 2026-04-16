# 전체 저장 시 여백 제거 수정 안내 (2026-04-15)

## 1. 문제 현상
- '전체 저장' 버튼 클릭 시, 디자인 캔버스 영역뿐만 아니라 외부 컨테이너의 흰색 여백까지 함께 저장되는 현상이 발생함.

## 2. 수정 내용
- **대상 파일**: `react/src/modules/editing/App.tsx`
- **수정 로직**: `html2canvas` 캡처 대상을 전체 컨테이너(`mainPreviewRef`)에서 실제 캔버스 요소(`.editor-stage__canvas`)로 구체화함.
- **코드 (App.tsx):**
```javascript
// 수정 전:
// const dataUrl = await captureElementAsDataUrl(mainPreviewRef.current, 3);

// 수정 후:
// 컨테이너 전체 대신 실제 캔버스 영역(.editor-stage__canvas)만 캡처하여 여백 제거
const canvasElement = mainPreviewRef.current.querySelector('.editor-stage__canvas') as HTMLElement;
const dataUrl = await captureElementAsDataUrl(canvasElement || mainPreviewRef.current, 3);
```

## 3. 원상복구 방법
- 만약 다시 여백을 포함하여 전체 영역을 캡처하고 싶다면, `App.tsx`의 `handleFullSave` 함수 내에서 주석 처리된 원본 로직으로 되돌리면 됩니다.

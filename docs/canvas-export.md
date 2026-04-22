# Canvas Export — 기술 보고서

> 작성일: 2026-04-05  
> 관련 스펙: `.omc/specs/deep-interview-canvas-export.md`

## 1. 개요

에디터 캔버스의 내용을 PNG 이미지로 내보내는 기능을 구현합니다.  
외부 라이브러리(html2canvas, OpenCV 등) 없이 **브라우저 내장 Canvas 2D API**만 사용합니다.

### 내보내기 경로 2가지

| 버튼 | 파일명 | 포함 레이어 | 용도 |
|------|--------|-----------|------|
| 전체 저장 | `ad_full.png` | 배경색/패턴 + 굵은 선 + 이미지 슬롯 + 텍스트 | 최종 결과물 다운로드 |
| 객체 저장 (테스트) | `ad_objects.png` | 굵은 선 + 이미지 슬롯 + 텍스트, **투명 배경** | 배경 생성 API 테스트용 다운로드 |
| 백엔드 전송 | (파일 없음) | 객체 저장과 동일 PNG | FastAPI `/api/generate-bg` POST |

---

## 2. 변경된 파일

### 2-1. `src/components/Editor/Canvas.tsx`
- **캔버스 비율 변경**: 3:4 (400×533) → **4:5 (400×500)**
  ```ts
  // 변경 전
  const CH = Math.round(CW * 4 / 3); // 533

  // 변경 후
  const RATIO_W = 4;
  const RATIO_H = 5;
  const CH = Math.round(CW * RATIO_H / RATIO_W); // 500
  ```
- 상수를 `RATIO_W / RATIO_H`로 분리해 A4·1:1 비율 확장 시 한 곳만 수정하면 됩니다.

### 2-2. `src/components/Editor/ControlPanel.tsx`
- props `bgColor` / `onUpdateBgColor` → `bgTopColor` / `bgBottomColor` / `onUpdateBgTopColor` / `onUpdateBgBottomColor` 로 분리
- UI: 배경색 컬러피커가 상단·하단 두 개로 분리됨

### 2-3. `src/utils/exportCanvas.ts` *(신규)*

핵심 유틸 모듈. 세 함수를 export합니다.

```ts
exportFull(state: ExportState, outputWidth?: number): Promise<Blob>
exportObjects(state: ExportState, outputWidth?: number): Promise<Blob>
downloadBlob(blob: Blob, filename: string): void
```

### 2-4. `src/api/backgroundApi.ts` *(신규)*

FastAPI 전송 클라이언트.

```ts
sendObjectsToBackend(blob: Blob, endpoint?: string): Promise<Response>
```

### 2-5. `src/App.tsx`
- 두 imports 추가 (`exportCanvas`, `backgroundApi`)
- `exporting` state 추가 (버튼 비활성화 제어)
- `getExportState()` 콜백 — 현재 App state를 `ExportState`로 패키징
- 핸들러 3개: `handleExportFull`, `handleExportObjects`, `handleSendToBackend`
- 캔버스 아래 버튼 toolbar 추가

---

## 3. 핵심 모듈: `exportCanvas.ts`

### ExportState 인터페이스

```ts
export interface ExportState {
  bgTopColor: string;
  bgBottomColor: string;
  checkWave: CheckWave;
  cafeName: string;
  cafeNamePos: { x: number; y: number };
  sections: MenuSection[];
  imageSlots: Record<string, ImageSlotState>;
  borders: BorderLine[];
}
```

App.tsx의 `getExportState()`로 현재 state를 스냅샷해서 전달합니다.

### 렌더링 좌표계

- **논리 좌표**: `LOGICAL_W=400`, `LOGICAL_H=500` (Canvas.tsx viewBox 기준)
- **출력 픽셀**: `OUTPUT_WIDTH=1080` → scale = `1080/400 = 2.7`
- 모든 위치/크기는 `%` 단위 → `(value/100) * W` 변환
- 폰트 크기: `cqw` 단위 → `(n/100) * W` 픽셀 (예: `6cqw` → `0.06 * 1080 = 64.8px`)

### 레이어 그리기 순서 (`drawLayers` 내부)

```
includeBackground=true 일 때만:
  ① bgTopColor fillRect (전체)
  ② bgBottomColor (wave 클립 영역)
  ③ 체커보드 패턴 (wave clip, enabled 시)

항상 (전체 저장 + 객체 저장 공통):
  ④ 굵은 선 (border.y% 위치) ← 제목/본문 구분선
  ⑤ 이미지 슬롯 (slot.url이 있는 것만, opacity 적용)
  ⑥ 카페 이름 (bold, #e06060, center align)
  ⑦ 메뉴 섹션 (타이틀 + 아이템 이름/가격)
```

### 투명 배경 PNG

`exportObjects()`는 `fillRect`를 호출하지 않습니다.  
`document.createElement('canvas')`로 생성된 캔버스의 기본 배경은 완전 투명(alpha=0)이므로 별도 처리 불필요합니다.

---

## 4. API 전송: `backgroundApi.ts`

```ts
// 기본 사용
const blob = await exportObjects(getExportState());
await sendObjectsToBackend(blob);

// 커스텀 엔드포인트
await sendObjectsToBackend(blob, '/api/v2/generate-bg');
```

**FastAPI 수신 예시 (Python)**:

```python
from fastapi import FastAPI, UploadFile, File

app = FastAPI()

@app.post("/api/generate-bg")
async def generate_background(objects_png: UploadFile = File(...)):
    data = await objects_png.read()
    # data: 투명 배경 PNG bytes (객체만 포함)
    # ... AI 배경 생성 처리 ...
    return {"status": "ok"}
```

---

## 5. 비율 확장 방법

현재 4:5 고정. A4·1:1 추가 시:

```ts
// exportCanvas.ts 상단 상수만 교체
const LOGICAL_W = 400;
const LOGICAL_H = 500;   // 4:5
// const LOGICAL_H = 566; // A4 (1:√2 ≈ 1:1.414)
// const LOGICAL_H = 400; // 1:1
```

또는 `exportFull(state, 1080, 'a4')` 형태로 비율 파라미터를 추가해 분기 처리하면 됩니다.

Canvas.tsx의 `RATIO_W / RATIO_H` 상수도 함께 변경해야 렌더 비율이 일치합니다.

---

## 6. 알려진 제약사항

| 항목 | 상태 | 비고 |
|------|------|------|
| 폰트 렌더링 | ⚠ 시스템 폰트 의존 | Canvas 2D는 웹폰트 로드 후 사용 가능. 현재 `sans-serif` 폴백 사용. |
| 배경 이미지 | ❌ 미구현 | Canvas.tsx에 배경 이미지 레이어 없음. 추가 시 `exportFull`에 `drawImage` 레이어 추가 필요. |
| 백엔드 전송 성공 UI | ❌ 없음 | `console.log`만. 성공/실패 토스트 알림 추가 권장. |
| CORS | ✅ 문제없음 | 이미지 슬롯은 data URL / blob URL — 동일 출처로 처리됨. |
| OpenCV | ✅ 불필요 | DIV 기반 캔버스에 Canvas 2D로 충분. |

---

## 7. 로컬 반영 체크리스트

```bash
# 1. 패키지 추가 없음 — npm install 불필요

# 2. 개발 서버 재시작
npm run dev

# 3. 프로덕션 빌드 확인
npm run build
```

UI에서:
- 캔버스 비율이 4:5(정사각형에 가까운 세로형)로 변경됨을 확인
- 배경 설정 패널에 색상 피커가 2개(상단·하단)로 나뉨을 확인
- 캔버스 하단 버튼 3개(전체 저장 / 객체 저장 / 백엔드 전송) 확인
- 이미지 업로드 후 "전체 저장" → `ad_full.png` 다운로드 확인
- "객체 저장" → 투명 배경의 `ad_objects.png` 다운로드 확인 (이미지 뷰어에서 투명도 확인)
- "백엔드 전송" → DevTools Network에서 `POST /api/generate-bg` 404 (백엔드 미구현 정상)

# Deep Interview Spec: 캔버스 이미지 합성 내보내기 (다운로드 + API 전송)

## Metadata
- Interview ID: di-canvas-export-20260405
- Rounds: 4
- Final Ambiguity Score: 17%
- Type: brownfield
- Generated: 2026-04-05
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 35% | 0.315 |
| Constraint Clarity | 0.72 | 25% | 0.180 |
| Success Criteria | 0.80 | 25% | 0.200 |
| Context Clarity | 0.87 | 15% | 0.131 |
| **Total Clarity** | | | **0.826** |
| **Ambiguity** | | | **17%** |

## Goal

`2team-GenPrj-frontend`의 React 에디터 캔버스에 두 가지 이미지 합성 내보내기 경로를 구현한다:

1. **전체 이미지 저장**: 배경(색상/물결/패턴) + 객체(이미지 슬롯+텍스트) 전체 합성 → PNG 다운로드
2. **객체 전용 저장/전송**: 이미지 슬롯 + 텍스트만, 투명 배경 위에 합성 → PNG 다운로드(테스트) + FastAPI `POST` 전송

OpenCV는 사용하지 않는다 (DIV+SVG 기반 캔버스에 과한 라이브러리; HTML Canvas API로 충분).

캔버스 비율을 현재 3:4(400×533)에서 **4:5(400×500)**으로 변경한다. 이후 A4, 1:1 확장을 위해 비율을 상수로 관리한다.

## Constraints

- **라이브러리**: html2canvas (DOM→Bitmap 래스터화) 또는 네이티브 Canvas API 직접 합성 중 선택. OpenCV.js 미사용.
- **캔버스 비율**: 4:5 먼저. `Canvas.tsx`의 `CH = Math.round(CW * 5/4)` 로 변경 (현재 `* 4/3`).
- **출력 해상도**: 4:5 기준 너비 고정, 높이 비율로 계산. 출력 픽셀 너비는 1080px 기준 (demo_ad_editor.html 선례). html2canvas `scale` 옵션으로 배율 조정.
- **투명 배경 PNG**: 객체 전용 합성 시 alpha 채널 보존. `toDataURL('image/png')` 사용.
- **API 전송**: FastAPI. 단일 PNG 1장. `multipart/form-data` 또는 `application/json`+base64 중 FastAPI 수신 방식에 맞춤 (현재 미구현 엔드포인트).
- **기존 이미지 슬롯 URL**: `@imgly/background-removal` 처리된 data URL을 재사용 (재처리 불필요).
- **TypeScript**: 기존 타입 시그니처 변경 없음. 새 함수는 `App.tsx` 또는 별도 유틸 파일에 추가.

## Non-Goals

- FastAPI 백엔드 엔드포인트 구현 (프론트엔드만)
- A4 / 1:1 비율 지원 (이번 범위 외, 나중에 확장)
- 배경 생성 AI 로직 (추후 결정)
- OpenCV.js 통합
- 캔버스 요소 편집 기능 변경 (텍스트 인라인 편집 등)

## Acceptance Criteria

- [ ] Canvas.tsx 비율: `CH = Math.round(CW * 5/4)` (4:5, 400×500)
- [ ] "전체 저장" 버튼 클릭 → 배경+객체 포함 전체 합성 PNG 다운로드 (파일명: `ad_full.png`)
- [ ] "객체 저장" 버튼 클릭 → 이미지 슬롯 + 텍스트, 투명 배경 PNG 다운로드 (파일명: `ad_objects.png`)
- [ ] "백엔드 전송" 버튼 클릭 → 객체 전용 PNG를 FastAPI에 POST (엔드포인트: `/api/generate-bg` 또는 기존 `/api/generate` 확장)
- [ ] 배경 없는 이미지가 없는 슬롯은 합성에서 건너뜀 (null URL 처리)
- [ ] 출력 PNG 너비 ≥ 1080px (html2canvas scale 적용)
- [ ] OpenCV 미사용

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| OpenCV 필요 | DIV+SVG 기반 캔버스, HTML canvas 요소 없음 | OpenCV 불필요. html2canvas 또는 Canvas API 직접 사용 |
| 배경 없는 객체 = 이미지 슬롯만 | 텍스트 레이어 포함 여부 | 이미지 슬롯 + 텍스트(카페이름+메뉴섹션) 포함 확인 |
| 배경 없는 다운로드 = data URL 그대로 | 실제로 새로 합성 필요 여부 | 합성 필요 (전송용 이미지와 동일 가제품) |
| 단일 출력 해상도 | 여러 비율 언급 | 4:5 먼저, 확장 가능하도록 상수화 |

## Technical Context

### 변경 대상 파일

- **`Canvas.tsx:20-21`** — `CH` 계산 (`* 4/3` → `* 5/4`)
- **`App.tsx`** — 내보내기 버튼 + 합성 로직 추가
- **`src/utils/exportCanvas.ts`** (신규 권장) — html2canvas 또는 Canvas API 합성 유틸

### 캔버스 구조 (탐색 결과)

현재 Canvas.tsx는 DIV 기반 레이어 구조:
```
<div ref={canvasRef}>           ← 캡처 대상
  [Layer 0] SVG — bgBottomColor 물결 채움
  [Layer 1] SVG — 체커보드 패턴 (checkWave.enabled 시)
  [Layer 2] div × N — BorderLine (y% 위치)
  [Layer 3] div × N — ImageSlot (절대 위치, img 태그)
  [Layer 4] div — 카페이름 텍스트
  [Layer 5] div × N — 메뉴섹션 블록
</div>
```

### 합성 전략 (권장: html2canvas)

**전체 저장**: `html2canvas(canvasRef.current, { scale: 2.7, useCORS: true })` → PNG blob → download

**객체 전용 저장**: 두 가지 접근
- A) 배경 레이어 숨김(visibility:hidden) → html2canvas 캡처 → 복원 (부작용 위험)
- B) Canvas API 직접 합성: `new HTMLCanvasElement()` 생성 → imageSlots URL을 `drawImage()` → 텍스트를 `fillText()` → transparent bg → `toBlob()`
  - **권장**: B안. 독립적이고 투명 배경 보장

### 기존 API 연동 파일
- `src/api/generate.ts` → `POST /api/generate` (기존 템플릿 생성용)
- 배경 생성용 API는 별도 엔드포인트 또는 확장 예정

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Canvas | core domain | CW, CH, bgTopColor, bgBottomColor, checkWave | contains all layers |
| ImageSlot | core domain | url, x, y, width, height, opacity | rendered in Canvas Layer 3 |
| TextLayer | core domain | cafeName, cafeNamePos, sections | rendered in Canvas Layer 4-5 |
| BackgroundLayer | supporting | bgTopColor, bgBottomColor, checkWave, borders | excluded from objects-only export |
| BackendAPI | external system | /api/generate (existing), /api/generate-bg (new) | receives ComposedPNG |
| ComposedPNG | supporting | blob/dataURL, width, height, transparent flag | output of export pipeline |
| FullCompositeExport | supporting | includes background | download only |
| CanvasRatio | supporting | 4:5 (current), A4, 1:1 (future) | determines CH calculation |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 6 | 1 (ComposedPNG) | 0 | 5 | 83% |
| 3 | 7 | 1 (CanvasRatio) | 0 | 6 | 86% |
| 4 | 8 | 1 (FullCompositeExport) | 0 | 7 | 88% |

## Interview Transcript

<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1
**Q:** API로 전송할 '배경 없는 객체'란 어떤 레이어인가요?
**A:** 이미지 슬롯 + 텍스트
**Ambiguity:** 45% (Goal: 0.65, Constraints: 0.45, Criteria: 0.35, Context: 0.80)

### Round 2
**Q:** 배경 없는 객체를 API로 보낼 때, 맞는 형태는?
**A:** 단일 합성 PNG 1장, 백엔드는 FastAPI
**Ambiguity:** 34% (Goal: 0.75, Constraints: 0.55, Criteria: 0.55, Context: 0.82)

### Round 3
**Q:** 출력 PNG의 목표 해상도는?
**A:** 여러 비율 (A4, 4:5, 1:1) 예정. 너비 고정, 높이 변동. 우선 4:5 기준.
**Ambiguity:** 27% (Goal: 0.80, Constraints: 0.68, Criteria: 0.60, Context: 0.85)

### Round 4 (Contrarian mode)
**Q:** '배경 없는 이미지 테스트 다운로드'는 이미 저장된 data URL 그대로인가, 새로 합성하는가?
**A:** 전송용 이미지 테스트 목적 → 이미지+텍스트 합성 PNG 다운로드. '전체 이미지 저장'과 별개로 전체=배경 포함, 객체전용=배경 제외.
**Ambiguity:** 17% ✅

</details>

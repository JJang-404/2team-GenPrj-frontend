# AI 배경 생성 정밀 고도화: 마스크 품질 개선 및 인페인팅 최적화

**날짜**: 2026-04-10  
**대상 파일**:
- `react/src/modules/editing/utils/canvas.ts`
- `react/src/server/api/callApi.js`
- `react/src/modules/editing/App.tsx`

---

## 변경 요약

### 1. 마스크 생성 방식 변경 (`canvas.ts`)

#### 이전 방식 (합성 후 알파 체크)
- 캔버스에 흰색 배경 먼저 그린 뒤 원본 이미지를 합성
- 합성된 픽셀의 알파값으로 객체 판별
- 결과를 JPEG로 저장 (손실 압축)

#### 변경 후 방식 (원본 알파 직접 참조)
- 원본 이미지를 별도 캔버스에 그린 뒤 알파 채널만 직접 읽음
- `alphaThreshold` 옵션으로 반투명 경계 픽셀 처리
- `padding` 옵션으로 객체 주변 보호 범위 팽창
- `blur` 옵션으로 마스크 경계 부드럽게 처리
- 결과를 **PNG**로 저장 (무손실)

#### 추가된 함수
- `inspectAlpha(dataUrl)`: 이미지의 투명/불투명 픽셀 수를 반환하는 디버그 유틸리티

```typescript
// 새로운 generateInpaintMask 시그니처
generateInpaintMask(dataUrl: string, options?: InpaintMaskOptions): Promise<string>

interface InpaintMaskOptions {
  alphaThreshold?: number;  // 기본: 8
  padding?: number;          // 기본: 0
  blur?: number;             // 기본: 0
}
```

---

### 2. 인페인팅 파라미터 최적화 (`callApi.js`)

| 항목 | 이전 | 변경 후 |
|------|------|---------|
| `strength` 기본값 | `0.45` | `0.3` |
| 마스크 옵션 | 없음 | `alphaThreshold: 8, padding: 14, blur: 3` |
| 알파 검사 로그 | 없음 | `inspectAlpha` 호출 후 콘솔 출력 |
| 마스크 생성 로그 | 없음 | base64 앞 60자 미리보기 출력 |

#### 프롬프트 변경
- **Positive**: "Inpainting task: fill only the background region" 로 시작하도록 변경 → 인페인팅 의도 명시
- **Negative**: 객체 수정 관련 토큰 추가 (`changed product appearance`, `modified subject color/texture`, `painted over subject` 등)

---

### 3. `App.tsx` strength 값 하향 조정

```tsx
// 변경 전
const res = await callApi.changeBackgroundWithImage(objectsDataUrl, promptHint, 0.45);

// 변경 후
const res = await callApi.changeBackgroundWithImage(objectsDataUrl, promptHint, 0.3);
```

---

## 검증 방법

1. **Console Log 확인**: 브라우저 개발자 도구에서 다음 로그 확인
   - `[CallApi] alpha inspection: { transparent: N, opaque: N, total: N }` → 투명 PNG 확인
   - `[CallApi] mask generated: data:image/png;base64,...` → 마스크 생성 확인

2. **Mask 품질 확인**: 위 base64 값을 `<img src="...">` 에 붙여 시각화. 객체 영역은 검은색, 배경은 흰색이어야 함

3. **인페인팅 결과 확인**:
   - 상품 텍스트·디테일이 변형 없이 보존되는지
   - 배경이 객체 주변에 자연스럽게 채워지는지
   - 이전(strength 0.45) 대비 객체 왜곡이 줄었는지

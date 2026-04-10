# 상품 사진 AI 정면(Frontal View) 변환 기능 가이드

이 문서는 편집 화면에서 상품 사진을 AI를 이용해 정면 뷰로 변환하는 기능의 구현 상세 및 사용 방법을 설명합니다.

---

## 1. 개요
측면이나 비스듬한 각도로 촬영된 상품 사진을 AI 모델을 통해 정면을 바라보는 모습으로 자연스럽게 변환합니다. 변환 시 원본의 정체성(Identity)과 특징은 최대한 유지하면서 대칭적인 정면 각도를 생성하도록 설계되었습니다.

## 2. 주요 기능 및 로직

### UI 위치
- **편집 화면(Editing Screen)** > 상품 사진 객체 선택 > **[상품 사진 정보]** 패널
- '앞으로' 버튼 옆에 **[정면]** 버튼이 위치합니다.

### 사용된 AI 프롬프트 (Prompt)
변환의 정확도를 높이기 위해 다음과 같은 상세 프롬프트가 적용되었습니다.

- **Positive Prompt**:
  > Strictly frontal view. The subject must face directly forward with full symmetry. Camera is positioned straight in front at eye level. Preserve all identity details exactly as in the input image. Photorealistic, high resolution, clean background. No side angle, no profile, no rotation, no perspective distortion. Preserve identity and facial features from the original image.

- **Negative Prompt**:
  > side view, profile, angled face, tilted head, asymmetry, distortion, warped face, perspective skew, low quality, blurry, unrealistic

### 기술적 구현 상세
1.  **이미지 처리**: `CallApi.transformImageToFrontal`에서 이미지를 Fetch한 후 Base64 문자열로 변환합니다.
2.  **API 연동**: `modelApi.changeImage` (Image-to-Image 방식)를 호출하며, **Strength 0.75** 값을 사용하여 원본의 형태를 유지하면서 각도를 조정합니다.
3.  **상태 업데이트**: 변환된 이미지는 새로운 Blob URL로 생성되어 `App.tsx`의 `elements` 상태에 즉시 반영됩니다.

---

## 3. 관련 파일 정보

- **[callApi.js](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/server/api/callApi.js)**: 정면 변환 핵심 비즈니스 로직 (`transformImageToFrontal`)
- **[ElementInfoPanels.tsx](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/editing/components/sidebar/ElementInfoPanels.tsx)**: '정면' 버튼 UI 구현
- **[App.tsx](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/editing/App.tsx)**: 핸들러 구현 및 UI-API 연결 로직

---

## 4. 주의사항

> [!WARNING]
> **변환 품질**: AI 변환 특성상 이미지의 복잡도에 따라 결과물이 다를 수 있습니다. 만약 원본의 형태가 너무 많이 변한다면, 향후 `strength` 값을 조정하여 최적의 지점을 찾을 수 있습니다.

> [!TIP]
> **로딩 표시**: 변환 중에는 상단 툴바의 상태 표시줄에 '생성 중...' 메시지가 표시됩니다. 처리가 완료될 때까지 잠시 기다려 주세요.

# AI 배경 생성 품질 개선 최종 보고서 (2026.04.10)

사용자님이 제기하신 **"객체 반복 현상"**과 **"프롬프트 무시 문제"**를 근본적으로 해결하기 위해, 배경 생성 방식을 **인페인팅(Inpainting)**에서 **순수 생성(Pure Generation)** 방식으로 전면 전환하였습니다.

## 1. 주요 개선 사항

### ① 생성 알고리즘 전환: 인페인팅 → 순수 생성
- **기존 (인페인팅)**: 기존 레이아웃을 AI에게 보여주고 그 빈 공간을 채우게 함. 이 과정에서 AI가 기존 객체를 '복제'하거나 가이드에 갇혀 프롬프트(봄, 카페 등)를 무시하는 경향이 발생.
- **개선 (순수 생성)**: 배경만 100% 새롭게 생성. AI가 객체의 존재를 모르고 배경에만 집중하므로 프롬프트와 업종의 색감을 최대로 반영함. 객체는 생성된 고품질 배경 위에 자동으로 배치됨.

### ② 업종 및 가게 정보 지능형 반영
- 사용자가 설정한 **업종(Industry)**과 **가게 이름**을 분석하여 프롬프트에 자동 주입합니다.
  - *예시*: 업종이 '카페'면 `cafe interior/exterior` 키워드 추가.
  - *예시*: 업종이 '식당'이면 `restaurant dining area` 키워드 추가.
- 사용자가 작성하는 'AI 이미지 생성 프롬프트'는 이 정보들과 결합되어 최상의 조화를 이룹니다.

### ③ 시각적 품질 강화
- **8K 해상도**, **Cinematic Lighting**, **Realistic Textures** 등의 전문 광고 사진용 키워드를 표준 템플릿으로 적용하여 훨씬 고급스러운 분위기를 연출합니다.

## 2. 작업 완료 파일

1.  **[callApi.js](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/server/api/callApi.js)**: `generateBackground` 함수 고도화 (업종 기반 프롬프트 템플릿 적용).
2.  **[App.tsx](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/editing/App.tsx)**: 메인 배경 생성 로직을 순수 생성 방식으로 변경.
3.  **[backgroundGeneration.ts](file:///d:/01.project/2team-GenPrj-frontend_United/United1_1/react/src/modules/editing/utils/backgroundGeneration.ts)**: 실사 배경 후보군 생성 시 인페인팅 대신 순수 생성 API 호출.

## 3. 테스트 방법

1.  **업종 확인**: 설정 페이지에서 업종이 본인의 가게 대분류에 맞게 설정되어 있는지 확인합니다.
2.  **프롬프트 입력**: "봄 분위기의 화사한 카페 테라스"와 같이 구체적인 컨셉을 입력합니다.
3.  **배경 생성**: 생성 버튼을 누르면, 배치된 객체와 무관하게 프롬프트의 의도가 100% 반영된 배경이 나타납니다.

---
**이제 사용자의 의도와 업종의 특성이 조화롭게 반영된 AI 배경을 만나보실 수 있습니다.**

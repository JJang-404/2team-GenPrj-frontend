# AI 기반 통합 에디팅 시스템 구축 계획 (문구 & 이미지)

이 문서는 `initPage`에서 전달된 데이터를 기반으로, `editingPage` 내에서 GPT(문구 생성) 및 Stable Diffusion(이미지 생성)을 실행하는 통합 시스템의 구현 가이드를 제공합니다.

## 1. 개요 (Core Concept)
- **지연 생성 (Lazy Generation)**: `initPage`에서는 데이터를 수집/전달만 하고, 실제 AI 연산은 사용자가 필요한 시점에 `editingPage`에서 호출합니다.
- **컨텍스트 유지**: 백엔드에 저장된 토큰(Token)을 통해 가게 정보, 상품 정보, 이미지를 호출 시마다 매번 보내지 않고 서버 측 저장 데이터를 재활용합니다.
- **객체 보존 (Object Consistency)**: AI 이미지 생성 시 기존 상품(객체)의 위치와 형태는 유지하고 배경만 4종의 새로운 스타일로 교체합니다.

## 2. 상세 데이터 흐름 (Workflow)

### 1단계: initPage (데이터 패키징)
- 사용자가 입력한 모든 정보(가게 이름, 주소, 노키즈존 여부 등)와 상품 이미지들을 `Backend_final`의 `/api/bridge/editing`으로 전송합니다.
- 서버는 이 데이터를 UUID 토큰과 함께 메모리(또는 DB)에 저장하고 토큰을 반환합니다.
- 프론트엔드는 `editingPage?token=UUID`로 이동합니다.

### 2단계: editingPage (AI 문구 생성)
- **UI**: 사이드바에 "AI 문구 추천" 버튼을 배치합니다.
- **Action**: 버튼 클릭 시 `GET /api/adver/generate-by-token?token=UUID`를 호출합니다.
- **Backend (FastAPI)**:
    1. 토큰으로 저장된 프로젝트 데이터를 조회합니다.
    2. 미입력된 `description`이 있는 상품들을 추출합니다.
    3. **GPT Prompt**: "가게이름: {name}, 업종: {category}, 특이사항: {address, noKids...}, 상품명: {prodName} 정보를 바탕으로 매력적인 광고 문구 1줄을 작성해줘."
    4. 생성된 문구를 JSON으로 반환합니다.
- **Frontend**: 반환된 문구를 캔버스의 텍스트 요소에 즉시 반영합니다.

### 3단계: editingPage (AI 이미지 생성)
- **UI**: 사이드바의 배경 설정 탭에 "AI 배경 생성" 버튼을 배치합니다.
- **Action**: `POST /api/model/generate-variants`를 호출합니다. (Payload: `{ token: UUID, prompt: "..." }`)
- **Backend (FastAPI)**:
    1. 저장된 데이터를 바탕으로 **가이드 이미지(레이아웃 실루엣)**를 생성합니다.
    2. Stable Diffusion 모델을 사용하여 해당 레이아웃에 맞는 **배경 이미지 4장**을 생성합니다.
    3. 이때, 기존 상품 객체는 레이어에서 분리되어 있으므로 배경만 생성하거나 Inpainting 기술을 사용합니다.
    4. 4장의 이미지 URL(또는 Base64)을 배열로 반환합니다.
- **Frontend**: 배경 후보 리스트(Background Cards)에 4장의 이미지를 보여주고, 사용자가 선택 시 배경으로 적용합니다.

## 3. 백엔드(`Backend_final`) 연동 상세

최종 백엔드인 FastAPI 서버에서는 다음 모듈을 고도화해야 합니다.

### 3-1. 브릿지 저장소 고도화 (`bridgeService.py`)
- `initPage`에서 보낸 대용량 데이터(이미지 포함)를 토큰별로 관리합니다.
- AI 이미지 생성 시 필요한 '상품 레이아웃 정보'를 즉시 꺼낼 수 있도록 구조화합니다.

### 3-2. GPT 연동 (`adverApi.py`)
- 기존의 단순 텍스트 입력 방식에서 **객체 지향 프롬프트 구성** 방식으로 변경합니다.
- 가게의 특징(노키즈존 등)을 Boolean 값에 따라 "조용한 분위기", "아이와 함께" 등의 키워드로 변환하여 GPT에 전달합니다.

### 3-3. 이미지 생성 연동 (`modelApi.py`)
- `stabilityai/stable-diffusion-3.5-medium` 등 최신 모델을 사용하여 고품질 배경을 생성합니다.
- **이미지 4개 생성 로직**: `num_images_per_prompt=4` 설정을 통해 한 번의 요청으로 4개의 변크(Variants)를 얻습니다.

## 4. Claude를 위한 구현 체크리스트

1. **스키마 확장**: `HomeProjectData` 인터페이스에 `storeInfo`(가게상세)와 `additionalFeatures` 필드를 추가했는가?
2. **비동기 핸들링**: GPT와 Stable Diffusion 호출은 5~20초 이상 걸릴 수 있으므로, 각 버튼에 개별 로딩 스피너를 구현했는가?
3. **토큰 기반 조회**: `editingPage`의 모든 AI 요청은 데이터를 새로 보내는 대신 `token`만 보내서 서버 데이터를 활용하는가?
4. **객체 보존**: 이미지 생성 시 상품의 투명도 정보를 활용하여 배경만 교체되는 `ControlNet` 또는 `Adapter` 로직이 준비되었는가? (현재는 단순 배경 교체 후 상품 레이어 덮어쓰기 방식 우선 적용)

## 5. 기대 효과
사용자는 `initPage`에서 최소한의 정보만 넣고 넘어가도, `editingPage`에서 AI의 도움을 받아 **전문가급 카피와 실사 배경이 결합된 광고 시안**을 버튼 클릭 몇 번으로 완성할 수 있습니다.

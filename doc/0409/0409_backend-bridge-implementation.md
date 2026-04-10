# [최종] 브리지 연동 및 AI(GPT/이미지) 생성 시스템 구축 가이드

이 문서는 `initPage`에서 수집된 데이터를 `Backend1`(FastAPI)에 임시 저장하고, `editingPage`에서 해당 데이터를 불러와 **GPT 문구 생성** 및 **AI 이미지 4종 생성**을 수행하는 통합 프로세스를 정의합니다.

---

## 1. 시스템 아키텍처 개요

1. **1단계 (데이터 패키징 - `initPage`)**:
   - 사용자가 입력한 가게 정보, 추가 정보, 상품 이미지(Base64)를 백엔드 브리지 API로 전송.
   - 백엔드는 이를 메모리에 저장하고 고유 `token` 발급.
2. **2단계 (환경 복원 - `editingPage`)**:
   - URL의 `token`을 사용하여 백엔드에서 전체 데이터를 조회하여 에디터 상태 복원.
3. **3단계 (AI 문구 생성)**:
   - 사용자가 'AI 문구' 버튼 클릭 시, 백엔드에 저장된 정보를 바탕으로 GPT가 광고 카피 생성.
4. **4단계 (AI 이미지 생성)**:
   - 사용자가 'AI 배경 생성' 버튼 클릭 시, 저장된 레이아웃 정보를 활용해 배경 이미지 4종 생성.

---

## 2. 백엔드 구현 (`Backend1`)

### 2-1. 브리지 API 구현 (`app/restapi/bridgeApi.py` 신규 생성)
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid, time

router = APIRouter(prefix="/addhelper/bridge", tags=["bridge"])

# 메모리 저장소 (TTL 10분)
bridge_store = {}

class BridgePayload(BaseModel):
    payload: dict

@router.post("/save")
async def save_bridge_data(data: BridgePayload):
    token = str(uuid.uuid4())
    bridge_store[token] = {"data": data.payload, "expires": time.time() + 600}
    return {"token": token}

@router.get("/load/{token}")
async def get_bridge_data(token: str):
    if token in bridge_store and bridge_store[token]["expires"] > time.time():
        return bridge_store[token]["data"]
    raise HTTPException(status_code=404, detail="Token expired or not found")
```

### 2-2. AI 문구 생성 고도화 (`app/restapi/adverApi.py`)
기존 `/generate` 외에 토큰 기반 생성 엔드포인트 추가.
```python
@router.get("/generate-by-token")
async def generate_by_token(token: str):
    data = bridge_store.get(token) # 저장된 가게 정보/상품 정보 추출
    # GPT 프롬프트 구성: "가게이름: {name}, 특징: {address}, 상품명: {p_name}..."
    # OpenAI 호출 후 결과 반환
```

### 2-3. AI 이미지 4종 생성 (`app/restapi/modelApi.py`)
```python
@router.post("/generate-variants")
async def generate_variants(token: str, prompt: str):
    # 1. 토큰으로 기존 레이아웃(객체 위치) 조회
    # 2. 이미지 생성 엔진(SD 3.5 등)에 4개 생성 요청 (num_images=4)
    # 3. 객체는 유지하고 배경만 바뀐 이미지 4장의 URL/Base64 반환
```

---

## 3. 프론트엔드 연동 (`@react`)

### 3-1. `initPage`에서 데이터 전송 (`modules/initPage/utils/editingBridge.js`)
- `storeEditingPayload` 함수가 `http://localhost:8000/addhelper/bridge/save`를 호출하도록 설정.

### 3-2. `editingPage`에서 AI 기능 호출
- **AI 문구**: `AdInfoSection.tsx`의 버튼이 백엔드의 `generate-by-token` API를 호출.
- **AI 이미지**: `BackgroundOptionsSection.tsx`에서 생성 버튼 클릭 시 4개의 이미지를 받아 `BackgroundCard.tsx` 리스트에 매핑.

---

## 4. Claude를 위한 구현 체크리스트

1. **데이터 보존**: AI 이미지 생성 시, 사용자가 `initPage`에서 배치한 `x, y, width, height` 정보가 백엔드에 토큰과 함께 저장되어 있는가? (이미지 생성 가이드로 활용)
2. **객체 고정**: 배경 이미지 4개가 생성되어도, 프론트엔드 캔버스 위의 상품(Foreground) 객체는 위치가 변하지 않아야 함.
3. **용량 최적화**: 브리지로 이미지를 보낼 때 `cropToBoundingBox`를 사용하여 불필요한 투명 영역을 제거했는가?
4. **연동 주소**: `server/common/functions.js`가 `http://localhost:8000/addhelper`를 정확히 바라보고 있는가?

---

## 5. 최종 검증 방법
1. **브리지 확인**: `POST /addhelper/bridge/save` 호출 후 생성된 토큰으로 `GET /addhelper/bridge/load/{token}` 호출 시 데이터가 완벽히 출력되는지 확인.
2. **GPT 확인**: 저장된 가게/상품 정보 중 비어있는 `description`이 GPT에 의해 자연스럽게 채워지는지 확인.
3. **이미지 확인**: 배경 생성 요청 시 4개의 서로 다른 스타일(스튜디오, 카페 등) 배경이 상품 레이어 뒤로 깔리는지 확인.

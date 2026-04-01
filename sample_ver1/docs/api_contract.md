# Ad Generation API Contract

## Input

- `image`: 음식/제품 원본 이미지 경로
- `prompt`: 사용자가 원하는 문장형 요청
- `tone`: 고급, 일반, 빈티지, 메뉴판, 배달 등 분위기 힌트
- `business_type`: 카페, 한식, 버거, 디저트 등 업종
- `goal`: 신메뉴 홍보, 할인 행사, 메뉴판 제작 등 목적
- `copy`: 선택 입력
  - `logo`
  - `slogan`
  - `headline`
  - `subheadline`
  - `body`
  - `price`
  - `discount_badge`
  - `footer`
  - `hashtags`
  - `open_close`

## Output

- `style_group`
- `template_name`
- `confidence`
- `matched_keywords`
- `final_image`

## Pipeline

1. 사용자 입력 수집
2. `template_selector.py`가 style group과 template를 선택
3. 광고 문구 생성 또는 사용자가 제공한 문구 사용
4. 이미지 생성 결과 또는 입력 이미지를 준비
5. `overlay_engine.py`가 template JSON을 읽어 배치 수행
6. 최종 이미지를 `outputs/finals`에 저장


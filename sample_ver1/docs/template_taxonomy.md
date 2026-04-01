# Template Taxonomy

## 1. Style Groups

- `premium`
  - `premium_restaurant_dark`
  - `premium_magazine_cover`
  - `premium_brunch_soft`
- `general_food`
  - `general_price_badge`
  - `general_korean_menu`
  - `general_japanese_poster`
  - `general_fastfood_flyer`
- `vintage`
  - `vintage_classic`
  - `vintage_retro_bold`
  - `vintage_minimal`
- `delivery`
  - `delivery_thumbnail`
  - `delivery_discount_banner`
- `menu_board`
  - `menu_single_item`
  - `menu_multi_item_grid`
  - `menu_price_list`

## 2. Reference Analysis

루트 `샘플` 폴더의 전 참고 이미지를 분류 기준으로 읽어 정리했다.

- `premium`
  - 원본: `샘플/템플릿/음식점/고급화` 6장, `샘플/템플릿/카페/고급화` 10장
  - 공통: 어두운 배경, 히어로 음식 비중 큼, 고대비 헤드라인, 상단 로고/브랜드명, 하단 정보 최소화
- `general_food`
  - 원본: `샘플/템플릿/음식점/일반` 9장, `샘플/템플릿/카페/일반` 17장
  - 공통: 가격 배지/할인 스티커, 한식/패스트푸드/카페형 프로모션, 정보량 많음, 따뜻한 색상
- `vintage`
  - 원본: `샘플/템플릿/음식점/빈티지` 8장, `샘플/템플릿/카페/빈티지` 5장
  - 공통: 종이 질감, 배너형 타이틀, 장식적 타이포, 도장형 가격표, 복고 색조
- `menu_board`
  - 원본: `샘플/템플릿/음식점/메뉴판/*` 18장, `샘플/템플릿/카페/메뉴판/*` 18장
  - 공통: 좌우 분할 또는 카드 그리드, 가격 리스트, 카테고리 헤더, 긴 설명보다 구조 우선
- `delivery`
  - 원본: 별도 폴더는 없지만 일반 홍보 이미지 중 할인/주문/배지/CTA 강한 사례를 delivery 성격으로 추상화

## 3. Common Visual Rules

### 배경 톤

- `premium`: 블랙, 딥브라운, 다크네이비, 스포트라이트/보케
- `general_food`: 크림, 주황, 레드, 짙은 브라운
- `vintage`: 베이지, 브릭레드, 머스터드, 종이 질감
- `menu_board`: 화이트, 아이보리, 연회색
- `delivery`: 다크 브라운/차콜 위에 강한 포인트 컬러

### 음식 이미지 비중

- `premium`: 55~75%
- `general_food`: 35~60%
- `vintage`: 30~55%
- `menu_board`: 25~50%
- `delivery`: 40~65%

### 텍스트 비중

- `premium`: 적음. 헤드라인 중심
- `general_food`: 중간~많음. 가격/혜택/CTA 동시 노출
- `vintage`: 중간. 장식적 텍스트와 배너형 문구
- `menu_board`: 많음. 메뉴명/가격/카테고리 위주
- `delivery`: 중간. 짧고 강한 카피 + CTA

### 가격 강조 방식

- 원형 배지
- 둥근 리본형 박스
- 카드 우측 상단 소형 태그
- 메뉴판형 열(column) 가격 정렬

### 배지/스티커 존재 여부

- `premium`: 거의 없음 또는 최소
- `general_food`: 매우 잦음
- `vintage`: 있음. 도장/타원형/쿠폰형
- `menu_board`: 제한적
- `delivery`: 핵심 요소

### 상단 로고 유무

- 대부분 존재
- `premium`과 `menu_board`는 브랜드명 또는 masthead 비중 높음
- `general_food`와 `delivery`는 로고보다 혜택/CTA 우선

### 레이아웃 패턴

- 중앙 집중형: `premium_restaurant_dark`, `vintage_classic`
- 좌우 분할형: `menu_single_item`
- 하단 정보형: `general_price_badge`, `premium_restaurant_dark`
- 카드 그리드형: `menu_multi_item_grid`, `general_korean_menu`

### 유형별 차이

- 잡지 커버형: masthead, coverline, 세로 포스터, 이미지 위 직접 텍스트
- 메뉴판형: 정렬과 반복성 우선, 카테고리/가격 컬럼 명확
- 프로모션형: 할인율, CTA, 배달/주문 액션이 전면

### 한글 세로 배치

- 가능
- 주로 빈티지/에디토리얼/일부 프리미엄 포스터에서 장식 요소로 제한 사용
- 기본 템플릿은 가독성 때문에 가로 배치 우선

### 글꼴 성격

- `premium`: serif 느낌의 우아한 display + 가는 본문
- `general_food`: 굵은 sans + 읽기 쉬운 본문
- `vintage`: decorative headline + 보조 sans
- `menu_board`: clean sans + 정렬이 쉬운 숫자
- `delivery`: impact bold sans

## 4. JSON Schema Intent

모든 템플릿은 아래 구조를 공유한다.

- `name`
- `style_group`
- `description`
- `canvas`
- `safe_area`
- `background`
- `image_slots`
- `text_blocks`
- `badges`
- `stickers`
- `ribbons`
- `color_palette`
- `font_mapping`
- `decoration`
- `layout_intent`

핵심 원칙은 "참고 이미지를 그대로 저장하지 않고, 반복되는 배치 규칙과 강조 패턴을 JSON으로 추상화한다"는 점이다.


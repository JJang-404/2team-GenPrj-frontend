# 소상공인 광고 콘텐츠 생성용 Template System

## 프로젝트 목표

- 음식/제품 사진 기반 광고 이미지 생성
- 템플릿 시스템 기반 디자인 일관성 확보
- `premium`, `general_food`, `vintage`, `delivery`, `menu_board` 스타일 지원
- 생성 후 수정 요청까지 가능한 반복 편집 구조 제공

이 프로젝트는 참고 이미지를 그대로 베끼지 않고, 관찰된 레이아웃 특징을 JSON 규칙으로 일반화해서 광고 포스터와 메뉴판을 만드는 샘플 구현이다.

## 동작 방식

1. 사용자 입력: `prompt`, `tone`, `business_type`, `goal`, 원본 이미지
2. 스타일 분석: `ai/template_selector.py`가 키워드로 style group과 template 후보를 계산
3. 템플릿 선택: 선택된 template JSON을 `ai/template_loader.py`가 로드
4. 광고 문구 생성: 외부 LLM 또는 내부 copywriter 결과를 `copy_data`에 채움
5. 이미지 생성 또는 입력 이미지 사용: SD, FLUX, Midjourney, 수동 촬영 이미지 모두 가능
6. overlay / layout: `ai/overlay_engine.py`가 JSON 규칙에 따라 이미지 슬롯, 텍스트, 배지, 리본을 렌더링
7. 최종 이미지 저장: `outputs/finals`
8. 수정 요청 처리: `ai/revision_parser.py`와 `ai/ad_workflow.py`가 revision prompt를 해석해 템플릿/문구/레이아웃을 다시 반영

## 분류 체계

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

## 폴더 구조

```text
sample_ver1/
├─ README.md
├─ ai/
│  ├─ __init__.py
│  ├─ ad_workflow.py
│  ├─ font_registry.py
│  ├─ overlay.py
│  ├─ overlay_engine.py
│  ├─ revision_parser.py
│  ├─ sdxl_generator.py
│  ├─ template_loader.py
│  └─ template_selector.py
├─ assets/
│  ├─ fonts/
│  └─ templates/
│     ├─ premium/
│     ├─ general_food/
│     ├─ vintage/
│     ├─ delivery/
│     └─ menu_board/
├─ docs/
│  ├─ api_contract.md
│  └─ template_taxonomy.md
├─ inputs/
│  └─ images/
├─ outputs/
│  └─ finals/
├─ references/
│  ├─ premium/
│  ├─ general_food/
│  ├─ vintage/
│  ├─ delivery/
│  └─ menu_board/
├─ run_cli.py
└─ test_overlay.py
```

## 원리 설명

- 템플릿 이미지를 그대로 쓰지 않는다.
- 참고 이미지에서 반복되는 레이아웃, 가격 배지, 타이포 위계, 이미지 비중을 JSON 규칙으로 일반화한다.
- AI 모델은 이미지 생성 또는 이미지 편집을 담당한다.
- 템플릿 시스템은 브랜드 톤과 정보 배치의 일관성을 담당한다.
- 생성 이후 수정 요청은 "다시 처음부터 설계"가 아니라 "기존 결과에 대한 재선택 + 재배치"로 처리한다.
- SDXL을 같이 쓰면 "배경/히어로 비주얼 생성"과 "텍스트/레이아웃 후처리"를 분리할 수 있다.

## 컨셉 지정 방식

사용자는 자연어로 원하는 분위기를 말하면 된다.

- `"고급화 느낌", "프리미엄 레스토랑", "매거진 커버 느낌"`: `premium`
- `"일반 메뉴 홍보", "가격 강조", "버거 행사"`: `general_food`
- `"빈티지 느낌", "레트로 광고", "옛날 포스터"`: `vintage`
- `"배달앱 썸네일", "할인 행사", "주문 유도"`: `delivery`
- `"메뉴판 느낌", "가격표", "복수 메뉴 소개"`: `menu_board`

실제 로직은 [template_selector.py](/home/ohs3201/codeit/project/2team-GenPrj/sample_ver1/ai/template_selector.py)에서 처리한다.

입력값

- `prompt`
- `tone`
- `business_type`
- `goal`

출력값

- `style_group`
- `template_name`
- `confidence`
- `matched_keywords`

예시

```python
from ai.template_selector import select_template

decision = select_template(
    prompt="배달앱 썸네일 느낌으로 할인 배너 만들어줘",
    tone="강한 프로모션",
    business_type="치킨",
    goal="주문 전환"
)
print(decision.template_name)
```

## 생성 후 수정 방식

수정도 가능하다. 현재 구조는 revision prompt를 받아 다음 세 가지를 다시 계산한다.

1. 템플릿 변경
2. 문구 변경
3. 레이아웃 override 적용

예를 들면 아래 요청을 처리할 수 있다.

- `"조금 더 고급스럽게"`
- `"배달앱 할인 배너 느낌으로 바꿔줘"`
- `"가격 배지를 더 크게"`
- `"텍스트를 좀 줄여줘"`
- `"배경을 더 밝게"`

핵심 파일

- [revision_parser.py](/home/ohs3201/codeit/project/2team-GenPrj/sample_ver1/ai/revision_parser.py)
- [ad_workflow.py](/home/ohs3201/codeit/project/2team-GenPrj/sample_ver1/ai/ad_workflow.py)

수정 원리

- revision prompt에 `고급`, `빈티지`, `배달`, `메뉴판` 같은 키워드가 있으면 템플릿 재선택
- `텍스트 줄여줘`, `제목 짧게` 같은 요청은 copy_data를 축약
- `가격 배지 크게` 같은 요청은 `template_override`를 통해 리본/배지 크기를 일시적으로 변경
- 결과는 새 파일로 재렌더링

## 전체 처리 흐름

```text
사용자 입력
-> template selector
-> template json load
-> copy data 준비
-> base render
-> revision prompt 입력
-> revision parser
-> template / copy / layout override 계산
-> revised render
```

## 주요 파일

- `ai/template_loader.py`: 템플릿 JSON 탐색 및 로드
- `ai/template_selector.py`: 사용자 입력을 style group / template로 매핑
- `ai/font_registry.py`: 템플릿이 쓰는 font role을 실제 파일 경로로 해석
- `ai/overlay_engine.py`: canvas 생성, 이미지 배치, 텍스트/배지/리본 렌더링
- `ai/revision_parser.py`: revision prompt를 해석해 수정 지시 생성
- `ai/ad_workflow.py`: 최초 생성과 수정 적용 파이프라인
- `docs/template_taxonomy.md`: 참고 이미지 분석과 taxonomy 정리

## 폰트 시스템

JSON에는 경로가 아니라 role만 적는다.

- `premium_serif_kr`
- `premium_serif_en`
- `premium_display_kr`
- `general_bold_kr`
- `general_body_kr`
- `vintage_decorative_kr`
- `menu_clean_kr`
- `delivery_impact_kr`

실제 폰트 파일 경로는 `ai/font_registry.py`에서 관리한다.

## 실행 방법

기본 실행

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver1
python3 test_overlay.py
```

사용자 입력 기반 실행

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver1
python3 run_cli.py
```

`run_cli.py`는 아래를 직접 입력받는다.

- 이미지 경로
- 비주얼 소스: `input`, `sdxl`, `sdxl_img2img`, `sdxl_controlnet`
- 컨셉 prompt
- tone
- business_type
- goal
- logo
- slogan
- headline
- subheadline
- body
- price
- discount_badge
- footer
- hashtags
- open_close
- 수정 요청

`sdxl`, `sdxl_img2img`, `sdxl_controlnet`을 선택하면 추가로 아래도 입력받는다.

- `SDXL visual prompt`
- `SDXL negative prompt`

추가 입력

- `sdxl_img2img`: `img2img strength`
- `sdxl_controlnet`: `controlnet conditioning scale`

생성된 비주얼은 `outputs/finals/generated/` 아래에 저장되고, 그 이미지를 다시 템플릿 오버레이에 사용한다.

생성 결과

- `outputs/finals/sample_ad.jpg`
- `outputs/finals/sample_ad_revised.jpg`

실행 시 하는 일

1. 최초 prompt로 템플릿 선택
2. 첫 번째 광고 이미지 렌더링
3. revision prompt 적용
4. 수정된 두 번째 광고 이미지 렌더링

`run_cli.py` 실행 예시

```text
이미지 경로 [inputs/images/아메리카노.png]:
비주얼 소스(input/sdxl/sdxl_img2img/sdxl_controlnet) [input]: sdxl_controlnet
컨셉 prompt [고급스러운 카페 신메뉴 매거진 느낌 포스터]: 배달앱 썸네일 느낌으로 할인 배너 만들어줘
tone [고급, 감성]: 강한 프로모션
business_type [카페]: 치킨
goal [신메뉴 홍보]: 주문 전환
SDXL visual prompt [...]: crispy fried chicken hero shot, delivery app thumbnail, no text
SDXL negative prompt [...]:
controlnet conditioning scale [0.8]:
...
수정 요청: 가격 배지를 더 크게 하고 텍스트를 줄여줘
```

## SDXL 함께 쓰는 방식

가능하다. 이 샘플에서는 [sdxl_generator.py](/home/ohs3201/codeit/project/2team-GenPrj/sample_ver1/ai/sdxl_generator.py)를 추가해서 아래 구조로 붙였다.

```text
컨셉 입력
-> template selector
-> style/template 결정
-> SDXL visual prompt 생성
-> SDXL로 광고용 배경/제품 비주얼 생성
-> overlay engine으로 텍스트/배지/가격 배치
-> 최종 이미지 저장
```

지원 모드

- `sdxl`
  - text-to-image
  - 입력 이미지를 쓰지 않고 새 광고 비주얼을 생성
- `sdxl_img2img`
  - 업로드 이미지를 초기 이미지로 사용
  - 제품 형태를 어느 정도 유지한 채 분위기와 배경을 바꾸기 좋음
- `sdxl_controlnet`
  - 업로드 이미지에서 canny edge를 추출해 ControlNet 조건으로 사용
  - 컵/접시/플레이팅의 윤곽을 더 강하게 유지하고 싶을 때 적합

이 구조를 쓰는 이유

- 생성 모델은 이미지 품질과 무드 담당
- 템플릿 시스템은 가독성과 배치 일관성 담당
- 모델이 글씨를 이상하게 그리는 문제를 후처리로 피할 수 있음

기본 SDXL 모델 ID

- `stabilityai/stable-diffusion-xl-base-1.0`
- ControlNet: `diffusers/controlnet-canny-sdxl-1.0`

주의사항

- 실제 실행에는 `torch`, `diffusers`, Hugging Face 모델 접근 권한이 필요하다.
- `.env`의 `HF_TOKEN`을 자동으로 읽는다.
- 이 환경에서는 모델 다운로드를 검증하지 못했기 때문에, SDXL 경로는 코드만 추가했고 로컬 GPU 환경에서 실행해야 한다.
- CUDA가 없으면 `ai/sdxl_generator.py`의 `SDXLConfig.device`를 `cpu`로 바꿀 수 있지만 속도는 크게 느려진다.
- ControlNet 경로는 `opencv-python`과 `numpy`가 필요하다.

간단 사용 예시

```python
from ai.sdxl_generator import SDXLGenerator, build_visual_prompt

generator = SDXLGenerator()
prompt = build_visual_prompt(
    business_type="카페",
    prompt="빈티지 레트로 포스터",
    tone="빈티지, 따뜻함",
    goal="신메뉴 홍보",
    style_group="vintage",
    template_name="vintage_classic",
)
generator.generate(
    prompt=prompt,
    output_path="outputs/finals/generated/manual_sdxl.png",
)
```

img2img 예시

```python
generator.generate_img2img(
    prompt=prompt,
    init_image_path="inputs/images/아메리카노.png",
    output_path="outputs/finals/generated/manual_sdxl_img2img.png",
    strength=0.6,
)
```

ControlNet 예시

```python
generator.generate_controlnet(
    prompt=prompt,
    control_image_path="inputs/images/아메리카노.png",
    output_path="outputs/finals/generated/manual_sdxl_controlnet.png",
    conditioning_scale=0.8,
)
```

## 코드 사용 예시

```bash
python3 - <<'PY'
from ai.ad_workflow import generate_ad, apply_revision

base = generate_ad(
    image_path="inputs/images/아메리카노.png",
    output_path="outputs/finals/my_ad.jpg",
    prompt="고급스러운 카페 신메뉴 포스터",
    tone="프리미엄",
    business_type="카페",
    goal="신메뉴 홍보",
    copy_data={
        "logo": "MOONLIGHT CAFE",
        "slogan": "signature brewing collection",
        "headline": "오늘의 첫 잔을 더 깊게",
        "subheadline": "고소한 바디감과 산뜻한 끝맛",
        "body": "프리미엄 원두 블렌드",
        "price": "4,500원",
        "discount_badge": "NEW",
        "footer": "sample_ver1 demo",
        "hashtags": "#아메리카노 #신메뉴",
        "open_close": "매일 08:00 - 22:00",
    },
)

revised = apply_revision(
    image_path="inputs/images/아메리카노.png",
    output_path="outputs/finals/my_ad_revised.jpg",
    current_template_name=base.template_name,
    current_copy=base.copy_data,
    revision_prompt="조금 더 배달앱 할인 배너 느낌으로 바꾸고 가격 배지를 더 크게 해줘",
    business_type="카페",
    goal="신메뉴 홍보",
)

print(base.output_path)
print(revised.output_path)
PY
```

## 실제 서비스에 붙이는 방식

권장 흐름은 아래와 같다.

1. 프론트엔드에서 사용자 입력 수집
2. 백엔드에서 `select_template()` 호출
3. copywriter 또는 LLM이 `copy_data` 생성
4. 이미지 생성 모델이 최종 배경/제품 이미지를 생성
5. `generate_ad()`로 최종 1차 결과 생성
6. 사용자가 `"조금 더 밝게"`, `"가격만 더 크게"` 같은 수정 요청
7. `apply_revision()`으로 수정 반영
8. 수정 결과를 다시 사용자에게 보여주고 반복

## 수정 가능한 범위

- 문구만 수정
- 템플릿만 변경
- 색감/배경 톤 조정
- 가격 배지/리본 강조
- 텍스트 밀도 감소
- 메뉴판형/배달형/프리미엄형으로 컨셉 전환

현재 샘플 구현은 규칙 기반이다. 즉 자연어 수정 요청을 완벽한 의미 이해로 처리하는 것이 아니라, 자주 쓰는 키워드를 해석해 안전하게 반영하는 구조다. 이후 LLM을 붙이면 더 세밀한 수정 지시로 확장할 수 있다.

## 향후 확장 방향

- reference image 기반 style refinement
- image classifier 기반 자동 스타일 분류
- menu OCR 연동
- brand-specific template packs

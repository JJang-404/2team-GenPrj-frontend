# 소상공인 광고 콘텐츠 생성용 Template System (sample_ver2 - LLM 버전)

## 프로젝트 목표

- 음식/제품 사진 기반 광고 이미지 생성
- **LLM(OpenAI) 기반의 디자인 의도 분석 및 자동 레이아웃 조정 (ver2 핵심)**
- 사용자가 보유한 다양한 샘플 이미지(`.jpg`)를 템플릿(`.json`)으로 변환하여 선택의 폭 무한 확장
- 생성 후 "나노바나나나 망고보드" 수준의 폭넓은 자연어 수정 요청 지원

이 프로젝트는 제한된 하드코딩 방식에서 벗어나, GPT 모델이 사용자의 자연어를 분석해 최적의 템플릿과 색상, 폰트를 동적으로 조합하는 진정한 AI 디자인 플랫폼 백엔드 역할을 수행합니다.

## 동작 방식

1. 사용자 입력: `prompt`, `tone`, `business_type`, `goal`, 원본 이미지
2. **의도 분석 (LLM화):** `ai/template_selector.py`가 단순 단어 매칭이 아닌 gpt-5-mini를 사용해 프롬프트의 기저 의도("귀엽게", "팝아트 풍")를 파악하고 최적의 템플릿 후보를 선정합니다.
3. 템플릿 선택: 선택된 template JSON을 `ai/template_loader.py`가 로드
4. 광고 문구 생성: `copy_data`에 문구 매핑
5. **이미지 생성 기본 작동:** SDXL (기본 `sdxl_controlnet`) 모델이 개입해 분위기에 맞는 고품질 배경 및 제품 비주얼을 우선 생성합니다.
6. overlay / layout: `ai/overlay_engine.py`가 JSON 규칙에 따라 이미지 슬롯, 텍스트, 배지, 리본을 렌더링
7. 최종 이미지 저장: `outputs/finals`
8. **유연한 수정 처리 (LLM화):** `ai/revision_parser.py`가 "글씨 폰트를 동글동글하게 하고 핑크색으로 해줘" 등을 완벽히 번역해 요소별 색상/값 오버라이드 객체로 재구성한 후 디자인에 반영합니다.

## 폴더 구조 (ver2)

```text
sample_ver2/
├─ README.md
├─ ai/
│  ├─ ...
│  ├─ revision_parser.py (OpenAI 탑재)
│  ├─ sdxl_generator.py
│  └─ template_selector.py (OpenAI 탑재)
├─ assets/
│  ├─ fonts/
│  └─ templates/ (여기에 커스텀 JSON들이 위치)
├─ scripts/
│  ├─ generate_template_json.py (NEW: 이미지->JSON 추출기)
│  └─ batch_generate_templates.py (NEW: 샘플 전체 일괄 변환기)
├─ outputs/
└─ run_cli.py
```

## 핵심 업데이트 사항 (ver1 대비)

### 1. 강력해진 컨셉 지정 & 수정 방식 (LLM 활용)

과거엔 `"배달앱 썸네일", "고급화"` 같은 하드코딩된 단어에만 반응했습니다. `sample_ver2`에서는 OpenAI API를 연동하여 완전히 유연한 자연어를 이해합니다.

**실행 결과 예시:**
> 사용자: "나노바나나 풍으로 귀엽고 화사한 디저트 포스터를 만들어줘. 전체적으로 옐로우 톤이 돌게."
>
> -> `template_selector`가 이 문장을 분석해 밝고 가벼운 템플릿을 고릅니다.
> -> `revision_parser`가 옐로우 톤 그라데이션 값과 귀여운 배지 색상을 계산해 레이아웃에 즉각 반영합니다.

### 2. 무제한 템플릿 확장 스크립트 제공

과거 14개뿐이던 템플릿의 한계를 돌파하기 위해, 사용자가 가진 템플릿 이미지(`.jpg`)를 프로그램이 인식할 수 있는 레이아웃(`.json`)으로 변환하는 Vision API 스크립트가 추가되었습니다.

**단일 이미지 수동 변환 (선택 사항):**
```bash
python scripts/generate_template_json.py /home/ohs3201/codeit/project/2team-GenPrj/샘플/템플릿/카페/고급화/카페_고급화_3.jpg --output assets/templates/cafe_premium_3.json
```

**[강력 추천!] 폴더 전체 일괄 변환 (Batch Process):**
보유 중인 모든 샘플 `.jpg` 이미지를 알아서 스캔해서 변환하려면 아래 딱 한 줄만 입력하세요.
```bash
python scripts/batch_generate_templates.py
```
위 명령어를 실행하면, 내부적으로 폴더들을 싹 뒤져 수많은 이미지들을 한방에 읽어들인 뒤, X/Y 좌표와 역할을 뽑아내어 실사용 가능한 JSON 템플릿들을 `assets/templates/` 하위에 자동으로 꽉꽉 채워줍니다. 이제 선택할 수 있는 컨셉의 종류가 엄청나게 풍부해집니다!

## 실행 방법

기본 CLI 실행 (이제 기본적으로 SDXL이 작동합니다)

```bash
cd /home/ohs3201/codeit/project/2team-GenPrj/sample_ver2
python run_cli.py
```

사전 준비 사항:
- 루트의 `.env` 파일에 `OPENAI_API_KEY`와 `HF_TOKEN`이 올바르게 구성되어 있어야 완전한 기능을 경험할 수 있습니다.

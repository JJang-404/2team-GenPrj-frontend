#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from PIL import Image

# Setup paths
APP_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(APP_ROOT / ".env")


def encode_image(image_path: Path) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')


def generate_json_for_image(image_path: Path, output_json: Path):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Error] OPENAI_API_KEY가 등록되어 있지 않습니다. (.env 파일 확인 필요)")
        sys.exit(1)

    # Validate image exist
    img_path = image_path.resolve()
    if not img_path.exists():
        print(f"[Error] 파일을 찾을 수 없습니다: {img_path}")
        sys.exit(1)

    print(f"이미지 해상도 및 비전 분석을 준비중입니다: {img_path.name}")
    try:
        with Image.open(img_path) as img:
            width, height = img.size
    except Exception as e:
        print(f"[Error] 이미지 열기 실패: {e}")
        sys.exit(1)

    base64_image = encode_image(img_path)
    client = OpenAI(api_key=api_key)

    system_prompt = f"""
당신은 UI/UX 레이아웃 설계 전문가입니다. 
주어진 광고/포스터 시각화 이미지를 보고, {width}x{height} 해상도 기준으로 다음 요소들의 '예상 영역(bounding box 좌표)'과 '역할(font_role)'을 추출한 JSON을 내보내야 합니다.

- logo: 우측 또는 좌상단
- slogan: 캐치프레이즈 (주로 상단)
- headline: 메인 텍스트 (명확한 중앙/상단)
- subheadline: 제목 근처 수식어
- body: 하단 혹은 중앙 설명문
- price: 가격
- discount_badge: 할인 뱃지 등 (도형이 포함된다면 ribbons에 위치 및 모양 정의)
- footer: 하단 문구
- hashtags: 인스타 해시태그 요소

반드시 다음 형식의 JSON만 응답하세요. (불필요한 설명 금지)
{{
  "resolution": {{
    "width": {width},
    "height": {height}
  }},
  "background": {{
    "type": "image",
    "path": "이곳에 나중에 이미지가 로드될 경로"
  }},
  "typography": [
    {{
      "role": "headline",
      "font_role": "delivery_impact_kr",
      "content_key": "headline",
      "x": 100,
      "y": 200,
      "align": "left",
      "font_size": 90,
      "text_color": "#ffffff",
      "opacity": 255
    }}
  ]
}}
"""
    print("OpenAI GPT-4o에 비전 추출을 요청합니다. (이 과정은 10~20초 소요될 수 있습니다...)")
    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "이 이미지를 보고 해당 템플릿의 JSON 좌표 레이아웃을 생성해줘. (최대한 비슷한 좌표로)"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=1500
        )
        result_json_str = response.choices[0].message.content.strip()
        if result_json_str.startswith("```json"):
            result_json_str = result_json_str[7:]
        if result_json_str.endswith("```"):
            result_json_str = result_json_str[:-3]
        data = json.loads(result_json_str.strip())

        output_json.parent.mkdir(parents=True, exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"\n[성공] 템플릿 JSON이 추출되었습니다! -> {output_json}")
        print("이제 이 JSON 파일을 assets/templates 폴더에 넣고, template_selector에 스타일 그룹을 할당하면 실제 템플릿으로 쓸 수 있습니다.")

    except Exception as e:
        print(f"[Error] API 처리 중 문제가 발생했습니다: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Template JSON from Sample JPG using GPT-4 Vision")
    parser.add_argument("image_path", help="Path to the sample image (e.g. 샘플/템플릿/카페/고급화/카페_고급화_3.jpg)")
    parser.add_argument("--output", help="Output JSON path (e.g. assets/templates/premium_cafe_3.json)", required=True)
    
    args = parser.parse_args()
    generate_json_for_image(Path(args.image_path), Path(args.output))

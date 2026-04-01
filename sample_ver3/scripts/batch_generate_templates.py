#!/usr/bin/env python3
import base64
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from PIL import Image

# Setup paths
APP_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(APP_ROOT / ".env")

SAMPLE_DIR = APP_ROOT.parent / "샘플" / "템플릿"
OUTPUT_DIR = APP_ROOT / "assets" / "templates"

def encode_image(image_path: Path) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def generate_json_for_image(client, image_path: Path, output_json: Path):
    print(f"\n[{image_path.name}] 변환을 시작합니다...")
    try:
        with Image.open(image_path) as img:
            width, height = img.size
    except Exception as e:
        print(f"  -> 이미지 열기 실패: {e}")
        return False

    base64_image = encode_image(image_path)

    system_prompt = f"""
당신은 UI/UX 레이아웃 설계 전문가입니다. 
주어진 광고/포스터 시각화 이미지를 보고, {width}x{height} 해상도 기준으로 각 요소들의 '예상 영역(bounding box 좌표)'과 '역할(font_role)'을 추출한 JSON을 내보내야 합니다.

- logo: 우측 또는 좌상단
- slogan: 캐치프레이즈 (주로 상단)
- headline: 메인 텍스트 (단순 명확한 중앙/상단 등)
- body: 하단 혹은 중앙 설명문
- price: 가격
- discount_badge: 할인 뱃지 등

반드시 마크다운 코드 블록(```json ```) 없이, **순수한 JSON 텍스트 파싱 가능한 데이터**만 단일 객체 형식으로 리턴하세요. 
내부에는 반드시 "typography", "resolution" 등의 키가 존재해야 합니다.
"""
    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "이 이미지를 보고 템플릿의 JSON 좌표 레이아웃만 반환해 주세요."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
        )
        
        raw_output = response.choices[0].message.content.strip()
        if raw_output.startswith("```"):
            lines = raw_output.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_output = "\n".join(lines).strip()
            
        if not raw_output:
            print("  -> API가 빈 응답을 반환했습니다. (GPT-5-mini 비전 제약일 수 있음)")
            return False

        data = json.loads(raw_output)

        output_json.parent.mkdir(parents=True, exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"  -> [성공] {output_json.name} 생성 완료!")
        return True

    except Exception as e:
        print(f"  -> [실패] API 혹은 파싱 에러: {e}")
        return False

def main():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Error] OPENAI_API_KEY가 등록되어 있지 않습니다. (.env 확인 필요)")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    if not SAMPLE_DIR.exists():
        print(f"[Error] 샘플 디렉토리를 찾을 수 없습니다: {SAMPLE_DIR}")
        sys.exit(1)

    print("=== 일괄 템플릿 추출(Batch Generation) 스크립트 실행 ===")
    
    jpg_files = list(SAMPLE_DIR.rglob("*.jpg")) + list(SAMPLE_DIR.rglob("*.jpeg")) + list(SAMPLE_DIR.rglob("*.png"))
    if not jpg_files:
        print("변환할 이미지 파일이 없습니다.")
        return

    print(f"총 {len(jpg_files)}개의 샘플 이미지를 발견했습니다. 변환을 순차적으로 시도합니다.\n")

    success_count = 0
    for file_path in jpg_files:
        # 폴더 구조와 파일명을 합쳐서 깔끔한 JSON 이름 만들기 (예: 카페_고급화_3.jpg -> cafe_premium_3.json)
        # 한글 이름을 로마자로 다 바꾸기는 번거로우니 부모폴더명_파일명.json 형태로 저장 (예: 고급화_카페_고급화_3.json)
        parent_name = file_path.parent.name
        safe_name = file_path.stem
        out_name = f"{parent_name}_{safe_name}.json"
        out_path = OUTPUT_DIR / out_name

        if out_path.exists():
            print(f"[{file_path.name}] 이미 변환된 JSON이 존재하므로 건너뜁니다.")
            continue
            
        is_success = generate_json_for_image(client, file_path, out_path)
        if is_success:
            success_count += 1
        
        # API 레이트 리밋 방지를 위한 딜레이
        time.sleep(2)

    print(f"\n=== 완료! 총 {success_count}개의 새로운 템플릿 JSON이 추출되어 자동 등록되었습니다! ===")

if __name__ == "__main__":
    main()

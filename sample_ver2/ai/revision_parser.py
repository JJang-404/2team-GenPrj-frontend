from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@dataclass
class RevisionInstruction:
    template_name: str | None = None
    copy_updates: dict[str, str] = field(default_factory=dict)
    template_override: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


def parse_revision_prompt(
    revision_prompt: str,
    current_template_name: str,
    current_copy: dict[str, str],
    business_type: str = "",
    goal: str = "",
) -> RevisionInstruction:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Warning] OPENAI_API_KEY가 없습니다. 기본 하드코딩 빈 상태로 떨어집니다.")
        return RevisionInstruction()

    client = OpenAI(api_key=api_key)

    system_prompt = """
당신은 AI 포스터 디자인 시스템의 템플릿 수정(Revision) 파서입니다.
사용자의 자연어 요청(예: "글씨 좀 짧게 줄여주고, 가격 버튼을 핑크/노란색 계열로 톡톡 튀게 바꿔줘")을 해석해서, 디자인 레이아웃(JSON 속성) 및 텍스트 문구(copy)를 직접수정할 수 있는 지침객체를 만드세요.
사용자가 망고보드나 미리캔버스처럼 폭넓게 속성을 바꿀수 있도록 도와야합니다.

응답은 반드시 아래 JSON 구조여야 합니다:
{
    "template_name": "기존 템플릿을 다른 것으로 아예 바꾸고 싶을 때만 템플릿 이름(예: premium_magazine_cover 등) 기재, 없으면 null",
    "copy_updates": {
        "수정할 문구의 키(예: headline, body)": "수정된 문구 값 (짧게 줄이거나 분위기를 바꿈)"
    },
    "template_override": {
        "background": {
             "type": "gradient",
             "gradient_top": "선택된 디자인(예:노란배경) 색상 헥스코드",
             "gradient_bottom": "선택된 디자인 헥스코드"
        },
        "ribbons": [{
             "content_key": "price",
             "fill": "핑크나 사용자가 원하는 버튼 색",
             "font_role": "delivery_impact_kr"
        }]
    },
    "notes": ["적용한 수정 내역에 대한 설명들"]
}

만약 사용자의 요구사항 중 특이한 요소나 색감(예: 나노바나나 등)이 있다면 `template_override`의 background나 요소들의 fill 컬러를 비비드하게 바꾸는 식으로 즉각 반영하세요.
"""
    
    user_message = (
        f"수정 요청: {revision_prompt}\n"
        f"현재 템플릿: {current_template_name}\n"
        f"현재 카피본: {json.dumps(current_copy, ensure_ascii=False)}\n"
        f"비즈니스 타입: {business_type}, 목표: {goal}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        
        return RevisionInstruction(
            template_name=data.get("template_name"),
            copy_updates=data.get("copy_updates", {}),
            template_override=data.get("template_override", {}),
            notes=data.get("notes", ["llm:parsed_success"]),
        )
    except Exception as e:
        print(f"[Warning] OpenAI API 호출 오류 (Revision): {e}")
        return RevisionInstruction()

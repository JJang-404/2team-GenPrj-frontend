from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Existing groups for reference. We keep these logic mappings so SDXL generator knows the style_group
STYLE_GROUPS = {
    "premium": [
        "premium_restaurant_dark",
        "premium_magazine_cover",
        "premium_brunch_soft",
    ],
    "general_food": [
        "general_price_badge",
        "general_korean_menu",
        "general_japanese_poster",
        "general_fastfood_flyer",
    ],
    "vintage": [
        "vintage_classic",
        "vintage_retro_bold",
        "vintage_minimal",
    ],
    "delivery": [
        "delivery_thumbnail",
        "delivery_discount_banner",
    ],
    "menu_board": [
        "menu_single_item",
        "menu_multi_item_grid",
        "menu_price_list",
    ],
}

# The single list of all available templates in assets/templates/
def get_available_templates() -> list[str]:
    template_dir = Path(__file__).resolve().parent.parent / "assets" / "templates"
    if not template_dir.exists():
        return [template for templates in STYLE_GROUPS.values() for template in templates]
    return [file.stem for file in template_dir.rglob("*.json")]


@dataclass(frozen=True)
class TemplateDecision:
    style_group: str
    template_name: str
    confidence: float
    matched_keywords: list[str]


def select_template(
    prompt: str,
    tone: str = "",
    business_type: str = "",
    goal: str = "",
) -> TemplateDecision:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Warning] OPENAI_API_KEY가 없습니다. 기본 템플릿으로 떨어집니다.")
        return TemplateDecision(
            style_group="general_food",
            template_name="general_price_badge",
            confidence=0.0,
            matched_keywords=[],
        )

    client = OpenAI(api_key=api_key)
    available_templates = get_available_templates()

    system_prompt = f"""
당신은 AI 포스터 디자인 시스템의 템플릿(레이아웃) 선택기입니다.
사용자의 요청(prompt, tone, 비즈니스 타입, 목표)을 분석하고, 가장 가까운 템플릿 하나를 골라야 합니다.
사용자가 특정 트렌드('나노바나나', '망고보드', '팝아트', '귀여운')를 언급해도 당황하지 말고 현존하는 템플릿 중 가장 맥락에 어울리는 것을 고르세요.
수십 개의 샘플 템플릿 이름들을 보고(예: '고급화_카페_고급화_1', '빈티지_음식점_빈티지_3' 등), 분위기가 가장 잘 맞을 법한 것을 채택하세요.

가용 템플릿 리스트:
{available_templates}

반드시 다음 JSON 형식으로만 응답하세요.
{{
    "template_name": "가용 템플릿 중 정확히 일치하는 이름 하나",
    "confidence": 0.0 ~ 1.0 점수,
    "matched_keywords": ["사용자 요청에서 뽑아낸 트렌디한 핵심 키워드 리스트 (예: 팝아트, 귀여움 등)"]
}}
"""
    user_message = f"Prompt: {prompt}\nTone: {tone}\nBusiness Type: {business_type}\nGoal: {goal}"

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
        template_name = data.get("template_name", "general_price_badge")
        if template_name not in available_templates:
            template_name = "general_price_badge"
        
        # Find which style group it belongs to
        style_group = "general_food"
        for group, templates in STYLE_GROUPS.items():
            if template_name in templates:
                style_group = group
                break
        else:
            style_group = template_name.split("_")[0]

        return TemplateDecision(
            style_group=style_group,
            template_name=template_name,
            confidence=float(data.get("confidence", 0.7)),
            matched_keywords=data.get("matched_keywords", []),
        )
    except Exception as e:
        print(f"[Warning] OpenAI API 호출 오류: {e}")
        return TemplateDecision(
            style_group="general_food",
            template_name="general_price_badge",
            confidence=0.0,
            matched_keywords=[],
        )

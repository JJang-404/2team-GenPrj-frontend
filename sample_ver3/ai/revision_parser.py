from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from ai.template_catalog import get_template_catalog
from ai.template_selector import rule_select_template
from ai.validation import sanitize_copy_updates, sanitize_template_name, sanitize_template_override

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


TEXT_SHORTENERS = {
    "headline": 18,
    "subheadline": 34,
    "body": 48,
    "hashtags": 18,
}


@dataclass
class RevisionInstruction:
    template_name: str | None = None
    copy_updates: dict[str, str] = field(default_factory=dict)
    template_override: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


def _shorten(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def _merge_instruction(base: RevisionInstruction, override: RevisionInstruction) -> RevisionInstruction:
    merged = RevisionInstruction(
        template_name=override.template_name or base.template_name,
        copy_updates=dict(base.copy_updates),
        template_override=dict(base.template_override),
        notes=list(base.notes),
    )
    merged.copy_updates.update(override.copy_updates)
    if override.template_override:
        for key, value in override.template_override.items():
            if isinstance(value, dict) and isinstance(merged.template_override.get(key), dict):
                next_value = dict(merged.template_override[key])
                next_value.update(value)
                merged.template_override[key] = next_value
            else:
                merged.template_override[key] = value
    merged.notes.extend(note for note in override.notes if note not in merged.notes)
    return merged


def _rule_parse_revision(
    revision_prompt: str,
    current_template_name: str,
    current_copy: dict[str, str],
    business_type: str = "",
    goal: str = "",
) -> RevisionInstruction:
    normalized = revision_prompt.lower()
    instruction = RevisionInstruction(template_name=current_template_name)

    if any(keyword in normalized for keyword in ["고급", "프리미엄", "매거진", "브런치"]):
        decision = rule_select_template(prompt=revision_prompt, tone="premium", business_type=business_type, goal=goal)
        instruction.template_name = decision.template_name
        instruction.notes.append("rule:template_shift:premium")
    elif any(keyword in normalized for keyword in ["빈티지", "레트로", "옛날"]):
        decision = rule_select_template(prompt=revision_prompt, tone="vintage", business_type=business_type, goal=goal)
        instruction.template_name = decision.template_name
        instruction.notes.append("rule:template_shift:vintage")
    elif any(keyword in normalized for keyword in ["배달", "할인", "주문", "썸네일"]):
        decision = rule_select_template(prompt=revision_prompt, tone="delivery", business_type=business_type, goal=goal)
        instruction.template_name = decision.template_name
        instruction.notes.append("rule:template_shift:delivery")
    elif any(keyword in normalized for keyword in ["메뉴판", "가격표", "그리드", "카드형"]):
        decision = rule_select_template(prompt=revision_prompt, tone="menu_board", business_type=business_type, goal=goal)
        instruction.template_name = decision.template_name
        instruction.notes.append("rule:template_shift:menu_board")

    if "제목" in normalized and any(keyword in normalized for keyword in ["짧", "간결", "줄여"]):
        headline = current_copy.get("headline", "")
        if headline:
            instruction.copy_updates["headline"] = _shorten(headline, TEXT_SHORTENERS["headline"])
            instruction.notes.append("rule:copy:shorten_headline")

    if any(keyword in normalized for keyword in ["설명", "본문"]) and any(keyword in normalized for keyword in ["짧", "줄여", "간단"]):
        body = current_copy.get("body", "")
        if body:
            instruction.copy_updates["body"] = _shorten(body, TEXT_SHORTENERS["body"])
            instruction.notes.append("rule:copy:shorten_body")

    if any(keyword in normalized for keyword in ["가격", "배지"]) and any(keyword in normalized for keyword in ["크게", "강조", "더 크게"]):
        instruction.template_override["ribbons"] = [
            {
                "content_key": "price",
                "x": 70,
                "y": 760,
                "width": 340,
                "height": 120,
                "shape": "rounded_rectangle",
                "radius": 38,
                "fill": "#f4cf48",
                "opacity": 245,
                "font_role": "delivery_impact_kr",
                "font_size": 52,
                "text_color": "#2b1915",
            }
        ]
        instruction.notes.append("rule:layout:emphasize_price")

    if any(keyword in normalized for keyword in ["텍스트", "문구"]) and any(keyword in normalized for keyword in ["적게", "줄여", "덜"]):
        for key, limit in TEXT_SHORTENERS.items():
            text = current_copy.get(key, "")
            if text:
                instruction.copy_updates[key] = _shorten(text, limit)
        instruction.notes.append("rule:copy:reduce_text_density")

    if any(keyword in normalized for keyword in ["밝게", "환하게", "밝은"]):
        instruction.template_override["background"] = {
            "type": "gradient",
            "gradient_top": "#faf7f0",
            "gradient_bottom": "#e9dccb",
        }
        instruction.notes.append("rule:background:lighten")

    if any(keyword in normalized for keyword in ["어둡게", "무드", "다크"]):
        instruction.template_override["background"] = {
            "type": "gradient",
            "gradient_top": "#1b140f",
            "gradient_bottom": "#090707",
        }
        instruction.notes.append("rule:background:darken")

    if "cta" in normalized or "주문" in normalized:
        if "footer" in current_copy:
            instruction.copy_updates["footer"] = "지금 주문하고 오늘 바로 노출하세요"
            instruction.notes.append("rule:copy:cta_footer")

    return instruction


def parse_revision_prompt(
    revision_prompt: str,
    current_template_name: str,
    current_copy: dict[str, str],
    business_type: str = "",
    goal: str = "",
) -> RevisionInstruction:
    rule_instruction = _rule_parse_revision(
        revision_prompt=revision_prompt,
        current_template_name=current_template_name,
        current_copy=current_copy,
        business_type=business_type,
        goal=goal,
    )
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Warning] OPENAI_API_KEY가 없습니다. 규칙 기반 수정기로 폴백합니다.")
        return rule_instruction

    client = OpenAI(api_key=api_key)
    template_root = Path(__file__).resolve().parent.parent / "assets" / "templates"
    allowed_templates = {
        item.name for item in get_template_catalog(template_root, renderable_only=True)
    }

    system_prompt = """
당신은 광고 템플릿 수정 파서입니다.
응답은 반드시 JSON 객체만 반환하세요.
허용된 수정 범위만 반환하세요.
{
  "template_name": null,
  "copy_updates": {},
  "template_override": {},
  "notes": []
}
"""

    user_message = (
        f"수정 요청: {revision_prompt}\n"
        f"현재 템플릿: {current_template_name}\n"
        f"현재 카피본: {json.dumps(current_copy, ensure_ascii=False)}\n"
        f"비즈니스 타입: {business_type}, 목표: {goal}\n"
        f"허용 템플릿: {sorted(allowed_templates)}"
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
        llm_instruction = RevisionInstruction(
            template_name=sanitize_template_name(data.get("template_name"), allowed_templates),
            copy_updates=sanitize_copy_updates(data.get("copy_updates")),
            template_override=sanitize_template_override(data.get("template_override")),
            notes=["llm:parsed_success"],
        )
        notes = data.get("notes")
        if isinstance(notes, list):
            llm_instruction.notes.extend(str(note)[:80] for note in notes[:10])
        return _merge_instruction(rule_instruction, llm_instruction)
    except Exception as e:
        print(f"[Warning] OpenAI API 호출 오류 (Revision): {e}. 규칙 기반 수정기로 폴백합니다.")
        return rule_instruction

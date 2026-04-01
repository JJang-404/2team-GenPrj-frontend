from __future__ import annotations

from dataclasses import dataclass, field

from ai.template_selector import select_template


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


def parse_revision_prompt(
    revision_prompt: str,
    current_template_name: str,
    current_copy: dict[str, str],
    business_type: str = "",
    goal: str = "",
) -> RevisionInstruction:
    normalized = revision_prompt.lower()
    instruction = RevisionInstruction()

    if any(keyword in normalized for keyword in ["고급", "프리미엄", "매거진", "브런치"]):
        decision = select_template(
            prompt=revision_prompt,
            tone="premium",
            business_type=business_type,
            goal=goal,
        )
        instruction.template_name = decision.template_name
        instruction.notes.append("template_shift:premium")
    elif any(keyword in normalized for keyword in ["빈티지", "레트로", "옛날"]):
        decision = select_template(
            prompt=revision_prompt,
            tone="vintage",
            business_type=business_type,
            goal=goal,
        )
        instruction.template_name = decision.template_name
        instruction.notes.append("template_shift:vintage")
    elif any(keyword in normalized for keyword in ["배달", "할인", "주문", "썸네일"]):
        decision = select_template(
            prompt=revision_prompt,
            tone="delivery",
            business_type=business_type,
            goal=goal,
        )
        instruction.template_name = decision.template_name
        instruction.notes.append("template_shift:delivery")
    elif any(keyword in normalized for keyword in ["메뉴판", "가격표", "그리드", "카드형"]):
        decision = select_template(
            prompt=revision_prompt,
            tone="menu_board",
            business_type=business_type,
            goal=goal,
        )
        instruction.template_name = decision.template_name
        instruction.notes.append("template_shift:menu_board")
    else:
        instruction.template_name = current_template_name

    if "제목" in normalized and any(keyword in normalized for keyword in ["짧", "간결", "줄여"]):
        headline = current_copy.get("headline", "")
        if headline:
            instruction.copy_updates["headline"] = _shorten(headline, TEXT_SHORTENERS["headline"])
            instruction.notes.append("copy:shorten_headline")

    if any(keyword in normalized for keyword in ["설명", "본문"]) and any(keyword in normalized for keyword in ["짧", "줄여", "간단"]):
        body = current_copy.get("body", "")
        if body:
            instruction.copy_updates["body"] = _shorten(body, TEXT_SHORTENERS["body"])
            instruction.notes.append("copy:shorten_body")

    if any(keyword in normalized for keyword in ["가격", "배지"]) and any(keyword in normalized for keyword in ["크게", "강조", "더 크게"]):
        instruction.template_override.setdefault("ribbons", [])
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
        instruction.notes.append("layout:emphasize_price")

    if any(keyword in normalized for keyword in ["텍스트", "문구"]) and any(keyword in normalized for keyword in ["적게", "줄여", "덜"]):
        for key, limit in TEXT_SHORTENERS.items():
            text = current_copy.get(key, "")
            if text:
                instruction.copy_updates[key] = _shorten(text, limit)
        instruction.notes.append("copy:reduce_text_density")

    if any(keyword in normalized for keyword in ["밝게", "환하게", "밝은"]):
        instruction.template_override.setdefault("background", {})
        instruction.template_override["background"].update(
            {
                "type": "gradient",
                "gradient_top": "#faf7f0",
                "gradient_bottom": "#e9dccb",
            }
        )
        instruction.notes.append("background:lighten")

    if any(keyword in normalized for keyword in ["어둡게", "무드", "다크"]):
        instruction.template_override.setdefault("background", {})
        instruction.template_override["background"].update(
            {
                "type": "gradient",
                "gradient_top": "#1b140f",
                "gradient_bottom": "#090707",
            }
        )
        instruction.notes.append("background:darken")

    if "cta" in normalized or "주문" in normalized:
        if "footer" in current_copy:
            instruction.copy_updates["footer"] = "지금 주문하고 오늘 바로 노출하세요"
            instruction.notes.append("copy:cta_footer")

    return instruction


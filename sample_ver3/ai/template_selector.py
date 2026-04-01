from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from ai.template_catalog import TemplateMetadata, get_template_catalog
from ai.validation import sanitize_template_name

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

STYLE_GROUPS = {
    "premium": ["premium_restaurant_dark", "premium_magazine_cover", "premium_brunch_soft"],
    "general_food": ["general_price_badge", "general_korean_menu", "general_japanese_poster", "general_fastfood_flyer"],
    "vintage": ["vintage_classic", "vintage_retro_bold", "vintage_minimal"],
    "delivery": ["delivery_thumbnail", "delivery_discount_banner"],
    "menu_board": ["menu_single_item", "menu_multi_item_grid", "menu_price_list"],
}

TEMPLATE_FALLBACKS = {
    "premium_restaurant_dark": "premium_restaurant_dark",
    "premium_magazine_cover": "premium_magazine_cover",
    "premium_brunch_soft": "premium_magazine_cover",
    "general_price_badge": "general_price_badge",
    "general_korean_menu": "general_korean_menu",
    "general_japanese_poster": "general_price_badge",
    "general_fastfood_flyer": "general_price_badge",
    "vintage_classic": "vintage_classic",
    "vintage_retro_bold": "vintage_classic",
    "vintage_minimal": "vintage_classic",
    "delivery_thumbnail": "delivery_discount_banner",
    "delivery_discount_banner": "delivery_discount_banner",
    "menu_single_item": "menu_single_item",
    "menu_multi_item_grid": "menu_multi_item_grid",
    "menu_price_list": "menu_single_item",
}

KEYWORD_RULES = {
    "premium_restaurant_dark": {"고급", "프리미엄", "레스토랑", "파인다이닝", "다이닝", "호텔", "시그니처"},
    "premium_magazine_cover": {"매거진", "잡지", "커버", "에디토리얼", "브런치", "감성", "무드"},
    "general_korean_menu": {"한식", "국밥", "덮밥", "찌개", "분식", "볶음", "김치", "불고기"},
    "general_price_badge": {"일반", "메뉴홍보", "신메뉴", "행사", "프로모션", "세트", "가격"},
    "general_fastfood_flyer": {"버거", "피자", "샌드위치", "치킨", "핫도그", "토스트"},
    "delivery_discount_banner": {"할인", "배달", "주문", "썸네일", "쿠폰", "즉시", "특가", "앱"},
    "menu_single_item": {"메뉴판", "가격표", "메뉴소개", "단일메뉴", "시그니처메뉴"},
    "menu_multi_item_grid": {"복수메뉴", "그리드", "카드형", "카테고리", "목록"},
    "vintage_classic": {"빈티지", "레트로", "옛날", "클래식", "복고", "포스터"},
}

GROUP_HINTS = {
    "premium": {"고급", "프리미엄", "매거진", "브런치", "레스토랑"},
    "general_food": {"일반", "홍보", "메뉴", "음식", "카페"},
    "vintage": {"빈티지", "레트로", "옛날", "복고"},
    "delivery": {"배달", "주문", "썸네일", "쿠폰", "할인"},
    "menu_board": {"메뉴판", "가격표", "리스트", "카드형"},
}


@dataclass(frozen=True)
class TemplateDecision:
    style_group: str
    template_name: str
    confidence: float
    matched_keywords: list[str]
    strategy: str = "rule"


def _template_root() -> Path:
    return Path(__file__).resolve().parent.parent / "assets" / "templates"


def _renderable_catalog() -> list[TemplateMetadata]:
    return get_template_catalog(_template_root(), renderable_only=True)


def _tokenize(*parts: str) -> set[str]:
    text = " ".join(part for part in parts if part).lower()
    normalized = text.replace("/", " ").replace(",", " ").replace(".", " ").replace("_", " ").replace("-", " ")
    return {token.strip() for token in normalized.split() if token.strip()}


def _decision_from_metadata(
    metadata: TemplateMetadata,
    *,
    confidence: float,
    matched_keywords: list[str],
    strategy: str,
) -> TemplateDecision:
    return TemplateDecision(
        style_group=metadata.style_group,
        template_name=metadata.name,
        confidence=confidence,
        matched_keywords=matched_keywords,
        strategy=strategy,
    )


def rule_select_template(
    prompt: str,
    tone: str = "",
    business_type: str = "",
    goal: str = "",
) -> TemplateDecision:
    catalog = _renderable_catalog()
    if not catalog:
        raise RuntimeError("No renderable templates available in sample_ver3/assets/templates")
    metadata_by_name = {item.name: item for item in catalog}
    available_names = set(metadata_by_name)
    tokens = _tokenize(prompt, tone, business_type, goal)
    scores: dict[str, int] = {}
    matched: dict[str, list[str]] = {}

    for template_name, keywords in KEYWORD_RULES.items():
        resolved_name = TEMPLATE_FALLBACKS.get(template_name, template_name)
        if resolved_name not in available_names:
            continue
        hits = sorted(token for token in tokens if token in keywords)
        if hits:
            scores[resolved_name] = scores.get(resolved_name, 0) + len(hits) * 3
            matched.setdefault(resolved_name, []).extend(hits)

    for style_group, keywords in GROUP_HINTS.items():
        group_hits = [token for token in tokens if token in keywords]
        if not group_hits:
            continue
        for metadata in catalog:
            if metadata.style_group != style_group:
                continue
            scores[metadata.name] = scores.get(metadata.name, 0) + len(group_hits)
            matched.setdefault(metadata.name, []).extend(group_hits)

    if "카페" in tokens:
        for metadata in catalog:
            if metadata.business_type == "카페":
                scores[metadata.name] = scores.get(metadata.name, 0) + 1
    if "음식점" in tokens:
        for metadata in catalog:
            if metadata.business_type == "음식점":
                scores[metadata.name] = scores.get(metadata.name, 0) + 1
    if "메뉴판" in tokens:
        for metadata in catalog:
            if metadata.layout_type == "menu_board":
                scores[metadata.name] = scores.get(metadata.name, 0) + 2

    default_name = "general_price_badge" if "general_price_badge" in available_names else catalog[0].name
    if not scores:
        return _decision_from_metadata(
            metadata_by_name[default_name],
            confidence=0.45,
            matched_keywords=[],
            strategy="rule",
        )

    selected_name = max(scores, key=scores.get)
    confidence = min(0.99, 0.45 + (scores[selected_name] * 0.05))
    return _decision_from_metadata(
        metadata_by_name[selected_name],
        confidence=confidence,
        matched_keywords=sorted(set(matched.get(selected_name, []))),
        strategy="rule",
    )


def select_template(
    prompt: str,
    tone: str = "",
    business_type: str = "",
    goal: str = "",
) -> TemplateDecision:
    fallback = rule_select_template(prompt=prompt, tone=tone, business_type=business_type, goal=goal)
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[Warning] OPENAI_API_KEY가 없습니다. 규칙 기반 선택기로 폴백합니다.")
        return fallback

    client = OpenAI(api_key=api_key)
    catalog = _renderable_catalog()
    metadata_by_name = {item.name: item for item in catalog}
    available_names = set(metadata_by_name)
    catalog_summary = [
        {
            "name": item.name,
            "style_group": item.style_group,
            "business_type": item.business_type,
            "layout_type": item.layout_type,
        }
        for item in catalog
    ]

    system_prompt = f"""
당신은 광고 템플릿 선택기입니다.
반드시 아래 후보 중 하나만 선택하세요.
후보는 이미 렌더 가능 검증을 통과한 템플릿만 포함합니다.
유행어가 나와도 템플릿 이름을 상상하지 말고 후보 중 가장 가까운 것을 고르세요.

후보 템플릿:
{json.dumps(catalog_summary, ensure_ascii=False)}

응답은 반드시 JSON 객체만 반환하세요.
{{
    "template_name": "후보 템플릿 이름 하나",
    "confidence": 0.0,
    "matched_keywords": ["핵심 키워드"]
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
        template_name = sanitize_template_name(data.get("template_name"), available_names)
        if not template_name:
            return fallback
        metadata = metadata_by_name[template_name]
        matched_keywords = data.get("matched_keywords", [])
        if not isinstance(matched_keywords, list):
            matched_keywords = []
        keywords = [str(keyword)[:40] for keyword in matched_keywords[:8]]
        confidence_raw = data.get("confidence", 0.7)
        confidence = float(confidence_raw) if isinstance(confidence_raw, (int, float, str)) else 0.7
        confidence = max(0.0, min(1.0, confidence))
        return TemplateDecision(
            style_group=metadata.style_group,
            template_name=template_name,
            confidence=confidence,
            matched_keywords=keywords,
            strategy="llm",
        )
    except Exception as e:
        print(f"[Warning] OpenAI API 호출 오류: {e}. 규칙 기반 선택기로 폴백합니다.")
        return fallback

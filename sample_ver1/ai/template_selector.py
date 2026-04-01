from __future__ import annotations

from dataclasses import dataclass


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
    "premium_restaurant_dark": {
        "고급", "프리미엄", "레스토랑", "파인다이닝", "다이닝", "호텔", "시그니처"
    },
    "premium_magazine_cover": {
        "매거진", "잡지", "커버", "에디토리얼", "브런치", "감성", "무드"
    },
    "general_korean_menu": {
        "한식", "국밥", "덮밥", "찌개", "분식", "볶음", "김치", "불고기"
    },
    "general_price_badge": {
        "일반", "메뉴홍보", "신메뉴", "행사", "프로모션", "세트", "가격"
    },
    "general_fastfood_flyer": {
        "버거", "피자", "샌드위치", "치킨", "핫도그", "토스트"
    },
    "delivery_discount_banner": {
        "할인", "배달", "주문", "썸네일", "쿠폰", "즉시", "특가", "앱"
    },
    "menu_single_item": {
        "메뉴판", "가격표", "메뉴소개", "단일메뉴", "시그니처메뉴"
    },
    "menu_multi_item_grid": {
        "복수메뉴", "그리드", "카드형", "카테고리", "목록"
    },
    "vintage_classic": {
        "빈티지", "레트로", "옛날", "클래식", "복고", "포스터"
    },
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


def _tokenize(*parts: str) -> set[str]:
    text = " ".join(part for part in parts if part).lower()
    normalized = (
        text.replace("/", " ")
        .replace(",", " ")
        .replace(".", " ")
        .replace("_", " ")
        .replace("-", " ")
    )
    return {token.strip() for token in normalized.split() if token.strip()}


def select_template(
    prompt: str,
    tone: str = "",
    business_type: str = "",
    goal: str = "",
) -> TemplateDecision:
    tokens = _tokenize(prompt, tone, business_type, goal)
    scores: dict[str, int] = {}
    matched: dict[str, list[str]] = {}

    for template_name, keywords in KEYWORD_RULES.items():
        hits = sorted(token for token in tokens if token in keywords)
        if hits:
            scores[template_name] = len(hits) * 3
            matched[template_name] = hits

    for style_group, keywords in GROUP_HINTS.items():
        group_hits = [token for token in tokens if token in keywords]
        if not group_hits:
            continue
        for template_name in STYLE_GROUPS[style_group]:
            scores[template_name] = scores.get(template_name, 0) + len(group_hits)
            matched.setdefault(template_name, []).extend(group_hits)

    if "카페" in tokens and "premium_magazine_cover" in scores:
        scores["premium_magazine_cover"] += 2
    if "음식점" in tokens and "premium_restaurant_dark" in scores:
        scores["premium_restaurant_dark"] += 2
    if "할인" in tokens and "delivery_discount_banner" in scores:
        scores["delivery_discount_banner"] += 3
    if "메뉴판" in tokens and "menu_multi_item_grid" in scores and "복수메뉴" in tokens:
        scores["menu_multi_item_grid"] += 2

    if not scores:
        return TemplateDecision(
            style_group="general_food",
            template_name="general_price_badge",
            confidence=0.45,
            matched_keywords=[],
        )

    raw_name = max(scores, key=scores.get)
    template_name = TEMPLATE_FALLBACKS[raw_name]
    style_group = next(
        group for group, templates in STYLE_GROUPS.items() if raw_name in templates
    )
    confidence = min(0.99, 0.45 + (scores[raw_name] * 0.05))
    return TemplateDecision(
        style_group=style_group,
        template_name=template_name,
        confidence=confidence,
        matched_keywords=sorted(set(matched.get(raw_name, []))),
    )


from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from ai.validation import validate_renderable_template


STYLE_GROUP_KEYWORDS = {
    "premium": ("premium", "고급화"),
    "general_food": ("general_food", "일반"),
    "vintage": ("vintage", "빈티지"),
    "delivery": ("delivery", "배달"),
    "menu_board": ("menu_board", "menu", "메뉴판"),
}


@dataclass(frozen=True)
class TemplateMetadata:
    name: str
    path: Path
    style_group: str
    business_type: str
    layout_type: str
    source: str
    is_renderable: bool


def _infer_style_group(name: str, path: Path, payload: dict) -> str:
    raw_style_group = payload.get("style_group")
    if isinstance(raw_style_group, str) and raw_style_group:
        return raw_style_group

    haystack = f"{name} {' '.join(path.parts)}"
    for style_group, keywords in STYLE_GROUP_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return style_group
    return "general_food"


def _infer_business_type(name: str, path: Path) -> str:
    haystack = f"{name} {' '.join(path.parts)}"
    if "카페" in haystack or "cafe" in haystack:
        return "카페"
    if "음식점" in haystack or "restaurant" in haystack:
        return "음식점"
    return "공통"


def _infer_layout_type(name: str, path: Path) -> str:
    haystack = f"{name} {' '.join(path.parts)}"
    if "메뉴판" in haystack or "menu" in haystack:
        return "menu_board"
    if "delivery" in haystack or "배달" in haystack:
        return "delivery_banner"
    return "poster"


def load_template_metadata(template_path: Path) -> TemplateMetadata:
    with template_path.open("r", encoding="utf-8") as fp:
        payload = json.load(fp)

    validation = validate_renderable_template(payload)
    return TemplateMetadata(
        name=template_path.stem,
        path=template_path.resolve(),
        style_group=_infer_style_group(template_path.stem, template_path, payload),
        business_type=_infer_business_type(template_path.stem, template_path),
        layout_type=_infer_layout_type(template_path.stem, template_path),
        source="manual" if validation.is_valid else "generated",
        is_renderable=validation.is_valid,
    )


def get_template_catalog(template_root: Path, *, renderable_only: bool = False) -> list[TemplateMetadata]:
    catalog: list[TemplateMetadata] = []
    for template_path in sorted(template_root.rglob("*.json")):
        metadata = load_template_metadata(template_path)
        if renderable_only and not metadata.is_renderable:
            continue
        catalog.append(metadata)
    return catalog

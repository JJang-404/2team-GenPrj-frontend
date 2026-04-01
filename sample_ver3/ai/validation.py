from __future__ import annotations

import re
from dataclasses import dataclass, field


HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
ALLOWED_COPY_KEYS = {
    "logo",
    "slogan",
    "headline",
    "subheadline",
    "body",
    "price",
    "discount_badge",
    "footer",
    "hashtags",
    "open_close",
}
ALLOWED_LABEL_KEYS = {
    "content_key",
    "id",
    "x",
    "y",
    "width",
    "height",
    "shape",
    "radius",
    "fill",
    "opacity",
    "font_role",
    "font_size",
    "text_color",
    "default_text",
}
ALLOWED_BACKGROUND_KEYS = {
    "type",
    "color",
    "gradient_top",
    "gradient_bottom",
    "accent",
}


@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[str] = field(default_factory=list)


def validate_renderable_template(template: dict) -> ValidationResult:
    errors: list[str] = []
    canvas = template.get("canvas")
    background = template.get("background")
    image_slots = template.get("image_slots")
    text_blocks = template.get("text_blocks")

    if not isinstance(canvas, dict):
        errors.append("missing.canvas")
    else:
        if not isinstance(canvas.get("width"), int):
            errors.append("invalid.canvas.width")
        if not isinstance(canvas.get("height"), int):
            errors.append("invalid.canvas.height")

    if not isinstance(background, dict):
        errors.append("missing.background")

    if not isinstance(image_slots, list):
        errors.append("missing.image_slots")

    if not isinstance(text_blocks, dict):
        errors.append("missing.text_blocks")

    return ValidationResult(is_valid=not errors, errors=errors)


def sanitize_template_name(value: object, allowed_names: set[str]) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not value or value not in allowed_names:
        return None
    return value


def sanitize_copy_updates(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    cleaned: dict[str, str] = {}
    for key, raw in value.items():
        if key not in ALLOWED_COPY_KEYS or not isinstance(raw, str):
            continue
        text = " ".join(raw.split()).strip()
        if not text:
            continue
        cleaned[key] = text[:160]
    return cleaned


def sanitize_template_override(value: object) -> dict:
    if not isinstance(value, dict):
        return {}

    cleaned: dict = {}
    background = value.get("background")
    if isinstance(background, dict):
        next_background: dict[str, str] = {}
        for key, raw in background.items():
            if key not in ALLOWED_BACKGROUND_KEYS or not isinstance(raw, str):
                continue
            candidate = raw.strip()
            if key == "type":
                if candidate in {"gradient", "solid"}:
                    next_background[key] = candidate
            elif HEX_COLOR_RE.match(candidate):
                next_background[key] = candidate
        if next_background:
            cleaned["background"] = next_background

    for list_key in ("ribbons", "badges"):
        raw_items = value.get(list_key)
        if not isinstance(raw_items, list):
            continue
        next_items: list[dict] = []
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                continue
            next_item: dict = {}
            for key, raw in raw_item.items():
                if key not in ALLOWED_LABEL_KEYS:
                    continue
                if key in {"content_key", "id", "shape", "font_role", "default_text"} and isinstance(raw, str):
                    next_item[key] = raw[:80]
                elif key in {"x", "y", "width", "height", "radius", "font_size", "opacity"}:
                    if isinstance(raw, (int, float)):
                        next_item[key] = max(0, int(raw))
                elif key in {"fill", "text_color"} and isinstance(raw, str) and HEX_COLOR_RE.match(raw.strip()):
                    next_item[key] = raw.strip()
            if next_item:
                next_items.append(next_item)
        if next_items:
            cleaned[list_key] = next_items

    return cleaned

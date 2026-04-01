from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from copy import deepcopy

from PIL import Image, ImageColor, ImageDraw, ImageFont, ImageOps

from ai.font_registry import FontRegistry, build_default_registry
from ai.template_loader import TemplateLoader, build_default_loader


def _rgba(value: str | list[int] | tuple[int, ...], alpha: int | None = None) -> tuple[int, int, int, int]:
    if isinstance(value, str):
        rgb = ImageColor.getrgb(value)
        base = (*rgb, 255)
    else:
        channels = tuple(value)
        if len(channels) == 3:
            base = (*channels, 255)
        elif len(channels) == 4:
            base = channels  # type: ignore[assignment]
        else:
            raise ValueError(f"Unsupported color value: {value}")
    if alpha is None:
        return base
    return (base[0], base[1], base[2], alpha)


def _fit_image(image: Image.Image, box: tuple[int, int, int, int], fit: str) -> Image.Image:
    width = max(1, box[2] - box[0])
    height = max(1, box[3] - box[1])
    if fit == "contain":
        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        thumb = image.copy()
        thumb.thumbnail((width, height))
        offset = ((width - thumb.width) // 2, (height - thumb.height) // 2)
        frame.paste(thumb, offset, thumb if thumb.mode == "RGBA" else None)
        return frame
    return ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> str:
    if not text:
        return ""
    words = text.split()
    if len(words) <= 1:
        return _wrap_text_by_char(draw, text, font, max_width)
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        left, top, right, bottom = draw.textbbox((0, 0), trial, font=font)
        if right - left <= max_width:
            current = trial
        else:
            if _text_width(draw, current, font) > max_width:
                lines.extend(_wrap_text_by_char(draw, current, font, max_width).splitlines())
                current = word
                continue
            lines.append(current)
            current = word
    if _text_width(draw, current, font) > max_width:
        lines.extend(_wrap_text_by_char(draw, current, font, max_width).splitlines())
    else:
        lines.append(current)
    return "\n".join(lines)


def _wrap_text_by_char(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> str:
    if not text:
        return ""
    lines: list[str] = []
    current = ""
    for char in str(text):
        if char == "\n":
            lines.append(current)
            current = ""
            continue
        trial = f"{current}{char}"
        if _text_width(draw, trial, font) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return "\n".join(lines)


def _text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    return right - left


def _text_size(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    spacing: int = 8,
) -> tuple[int, int]:
    left, top, right, bottom = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing)
    return right - left, bottom - top


@dataclass
class OverlayEngine:
    template_loader: TemplateLoader
    font_registry: FontRegistry

    def render(
        self,
        template_name: str,
        image_path: str | Path,
        output_path: str | Path,
        copy_data: dict,
        secondary_images: Iterable[str | Path] | None = None,
        template_override: dict | None = None,
    ) -> Path:
        template = self.template_loader.load(template_name)
        if template_override:
            template = self._merge_dicts(template, template_override)
        canvas_meta = template["canvas"]
        canvas = self._create_canvas(template)
        image = Image.open(image_path).convert("RGBA")

        secondary_iter = iter(secondary_images or [])
        for slot in template["image_slots"]:
            slot_id = slot["id"]
            source = image if slot_id == "hero" else self._load_optional_image(next(secondary_iter, image_path))
            self._paste_slot(canvas, source, slot)

        self._draw_decorations(canvas, template)
        self._draw_badges(canvas, template, copy_data)
        self._draw_ribbons(canvas, template, copy_data)
        self._draw_text_blocks(canvas, template, copy_data)

        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        canvas.convert("RGB").resize(
            (canvas_meta["width"], canvas_meta["height"]),
            Image.Resampling.LANCZOS,
        ).save(output)
        return output

    def _merge_dicts(self, base: dict, updates: dict) -> dict:
        merged = deepcopy(base)
        for key, value in updates.items():
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self._merge_dicts(merged[key], value)
            else:
                merged[key] = value
        return merged

    def _create_canvas(self, template: dict) -> Image.Image:
        canvas_meta = template["canvas"]
        background = template["background"]
        base = Image.new(
            "RGBA",
            (canvas_meta["width"], canvas_meta["height"]),
            _rgba(background.get("color", "#111111")),
        )
        if background.get("type") == "gradient":
            self._draw_vertical_gradient(
                base,
                background.get("gradient_top", background.get("color", "#111111")),
                background.get("gradient_bottom", background.get("accent", "#000000")),
            )
        return base

    def _draw_vertical_gradient(self, image: Image.Image, top: str, bottom: str) -> None:
        draw = ImageDraw.Draw(image)
        top_rgba = _rgba(top)
        bottom_rgba = _rgba(bottom)
        height = image.height
        for y in range(height):
            ratio = y / max(1, height - 1)
            color = tuple(
                int(top_rgba[i] + ((bottom_rgba[i] - top_rgba[i]) * ratio))
                for i in range(4)
            )
            draw.line((0, y, image.width, y), fill=color)

    def _paste_slot(self, canvas: Image.Image, source: Image.Image, slot: dict) -> None:
        box = (slot["x"], slot["y"], slot["x"] + slot["width"], slot["y"] + slot["height"])
        fitted = _fit_image(source, box, slot.get("fit", "cover")).convert("RGBA")
        if slot.get("opacity", 1.0) < 1.0:
            alpha = fitted.getchannel("A")
            alpha = alpha.point(lambda px: int(px * slot["opacity"]))
            fitted.putalpha(alpha)
        canvas.alpha_composite(fitted, dest=(box[0], box[1]))

    def _draw_decorations(self, canvas: Image.Image, template: dict) -> None:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for shape in template.get("decoration", {}).get("shapes", []):
            fill = _rgba(shape["fill"], shape.get("opacity", 255))
            x1, y1 = shape["x"], shape["y"]
            x2, y2 = x1 + shape["width"], y1 + shape["height"]
            if shape["type"] == "rectangle":
                draw.rectangle((x1, y1, x2, y2), fill=fill)
            elif shape["type"] == "rounded_rectangle":
                draw.rounded_rectangle((x1, y1, x2, y2), radius=shape.get("radius", 16), fill=fill)
            elif shape["type"] == "ellipse":
                draw.ellipse((x1, y1, x2, y2), fill=fill)
        for line in template.get("decoration", {}).get("lines", []):
            draw.line(
                (line["x1"], line["y1"], line["x2"], line["y2"]),
                fill=_rgba(line["fill"]),
                width=line.get("width", 2),
            )
        canvas.alpha_composite(overlay)

    def _draw_badges(self, canvas: Image.Image, template: dict, copy_data: dict) -> None:
        for badge in template.get("badges", []):
            text = copy_data.get(badge["content_key"], badge.get("default_text", ""))
            if not text:
                continue
            self._draw_label(canvas, badge, text)

    def _draw_ribbons(self, canvas: Image.Image, template: dict, copy_data: dict) -> None:
        for ribbon in template.get("ribbons", []):
            text = copy_data.get(ribbon["content_key"], ribbon.get("default_text", ""))
            if not text:
                continue
            self._draw_label(canvas, ribbon, text)

    def _draw_label(self, canvas: Image.Image, spec: dict, text: str) -> None:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        x1, y1 = spec["x"], spec["y"]
        x2, y2 = x1 + spec["width"], y1 + spec["height"]
        fill = _rgba(spec.get("fill", "#ffffff"), spec.get("opacity"))
        if spec.get("shape", "rounded_rectangle") == "ellipse":
            draw.ellipse((x1, y1, x2, y2), fill=fill)
        else:
            draw.rounded_rectangle((x1, y1, x2, y2), radius=spec.get("radius", 20), fill=fill)
        font, fitted_text = self._fit_text_to_area(
            draw=draw,
            text=str(text),
            font_role=spec["font_role"],
            start_size=spec["font_size"],
            max_width=spec["width"] - spec.get("padding_x", 20),
            max_height=spec["height"] - spec.get("padding_y", 14),
            wrap=True,
            min_size=spec.get("min_font_size", 12),
            spacing=spec.get("line_spacing", 4),
        )
        text_width, text_height = _text_size(draw, fitted_text, font, spacing=spec.get("line_spacing", 4))
        text_x = x1 + (spec["width"] - text_width) / 2
        text_y = y1 + (spec["height"] - text_height) / 2 - 2
        if "\n" in fitted_text:
            draw.multiline_text(
                (text_x, text_y),
                fitted_text,
                font=font,
                fill=_rgba(spec.get("text_color", "#111111")),
                spacing=spec.get("line_spacing", 4),
                align="center",
            )
        else:
            draw.text((text_x, text_y), fitted_text, font=font, fill=_rgba(spec.get("text_color", "#111111")))
        canvas.alpha_composite(overlay)

    def _draw_text_blocks(self, canvas: Image.Image, template: dict, copy_data: dict) -> None:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        labeled_keys = {
            item["content_key"]
            for item in template.get("badges", []) + template.get("ribbons", [])
            if item.get("content_key")
        }
        for _, block in template["text_blocks"].items():
            if not block.get("enabled", True):
                continue
            if block.get("hidden_when_labeled") and block.get("content_key") in labeled_keys:
                continue
            value = copy_data.get(block["content_key"], block.get("default_text", ""))
            if not value:
                continue
            area = block["area"]
            spacing = block.get("line_spacing", 8)
            font, fitted_value = self._fit_text_to_area(
                draw=draw,
                text=str(value),
                font_role=block["font_role"],
                start_size=block["font_size"],
                max_width=area["width"] - block.get("padding_x", 0),
                max_height=area["height"] - block.get("padding_y", 0),
                wrap=block.get("wrap", True) and not block.get("vertical"),
                min_size=block.get("min_font_size", 12),
                spacing=spacing,
                vertical=block.get("vertical", False),
            )
            if block.get("vertical"):
                fitted_value = "\n".join(list(str(value)))
            if block.get("background_fill"):
                draw.rounded_rectangle(
                    (
                        area["x"],
                        area["y"],
                        area["x"] + area["width"],
                        area["y"] + area["height"],
                    ),
                    radius=block.get("background_radius", 16),
                    fill=_rgba(block["background_fill"], block.get("background_opacity", 220)),
                )
            draw.multiline_text(
                (area["x"], area["y"]),
                str(fitted_value),
                font=font,
                fill=_rgba(block.get("color", "#ffffff")),
                spacing=spacing,
                align=block.get("align", "left"),
            )
        canvas.alpha_composite(overlay)

    def _load_optional_image(self, path: str | Path) -> Image.Image:
        return Image.open(path).convert("RGBA")

    def _fit_text_to_area(
        self,
        *,
        draw: ImageDraw.ImageDraw,
        text: str,
        font_role: str,
        start_size: int,
        max_width: int,
        max_height: int,
        wrap: bool,
        min_size: int,
        spacing: int,
        vertical: bool = False,
    ) -> tuple[ImageFont.FreeTypeFont, str]:
        max_width = max(1, max_width)
        max_height = max(1, max_height)
        for size in range(start_size, min_size - 1, -2):
            font = ImageFont.truetype(self.font_registry.resolve(font_role), size)
            if vertical:
                candidate = "\n".join(list(text))
            elif wrap:
                candidate = _wrap_text(draw, text, font, max_width)
            else:
                candidate = text
            width, height = _text_size(draw, candidate, font, spacing=spacing)
            if width <= max_width and height <= max_height:
                return font, candidate
        final_font = ImageFont.truetype(self.font_registry.resolve(font_role), min_size)
        if vertical:
            final_text = "\n".join(list(text))
        elif wrap:
            final_text = _wrap_text(draw, text, final_font, max_width)
        else:
            final_text = text
        return final_font, final_text


def build_default_engine() -> OverlayEngine:
    return OverlayEngine(
        template_loader=build_default_loader(),
        font_registry=build_default_registry(),
    )

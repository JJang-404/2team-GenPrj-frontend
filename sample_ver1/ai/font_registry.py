from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class FontRegistry:
    base_dir: Path

    def __post_init__(self) -> None:
        object.__setattr__(self, "base_dir", self.base_dir.resolve())

    @property
    def roles(self) -> dict[str, Path]:
        return {
            "premium_serif_kr": self.base_dir / "NotoSansKR-Light.ttf",
            "premium_serif_en": self.base_dir / "NotoSansKR-Light.ttf",
            "premium_display_kr": self.base_dir / "NotoSansKR-Bold.ttf",
            "premium_display_en": self.base_dir / "NotoSansKR-Bold.ttf",
            "general_bold_kr": self.base_dir / "NotoSansKR-Black.ttf",
            "general_bold_en": self.base_dir / "NotoSansKR-Bold.ttf",
            "general_body_kr": self.base_dir / "NotoSansKR-Regular.ttf",
            "general_body_en": self.base_dir / "NotoSansKR-Regular.ttf",
            "vintage_decorative_kr": self.base_dir / "NotoSansKR-Bold.ttf",
            "vintage_decorative_en": self.base_dir / "NotoSansKR-Bold.ttf",
            "vintage_body_kr": self.base_dir / "NotoSansKR-Regular.ttf",
            "vintage_body_en": self.base_dir / "NotoSansKR-Regular.ttf",
            "menu_clean_kr": self.base_dir / "NotoSansKR-Medium.ttf",
            "menu_clean_en": self.base_dir / "NotoSansKR-Regular.ttf",
            "menu_bold_kr": self.base_dir / "NotoSansKR-Bold.ttf",
            "menu_bold_en": self.base_dir / "NotoSansKR-Bold.ttf",
            "delivery_impact_kr": self.base_dir / "NotoSansKR-Black.ttf",
            "delivery_impact_en": self.base_dir / "NotoSansKR-Black.ttf",
            "delivery_body_kr": self.base_dir / "NotoSansKR-Medium.ttf",
            "delivery_body_en": self.base_dir / "NotoSansKR-Regular.ttf",
        }

    def resolve(self, role: str) -> str:
        try:
            return str(self.roles[role])
        except KeyError as exc:
            raise KeyError(f"Unknown font role: {role}") from exc


def build_default_registry() -> FontRegistry:
    return FontRegistry(Path(__file__).resolve().parent.parent / "assets" / "fonts")


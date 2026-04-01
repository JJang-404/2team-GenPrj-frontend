from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from ai.template_catalog import get_template_catalog, load_template_metadata

@dataclass(frozen=True)
class TemplateLoader:
    template_root: Path

    def __post_init__(self) -> None:
        object.__setattr__(self, "template_root", self.template_root.resolve())

    def list_templates(self, *, renderable_only: bool = False) -> list[str]:
        if renderable_only:
            return [item.name for item in get_template_catalog(self.template_root, renderable_only=True)]
        names: list[str] = []
        for template_file in sorted(self.template_root.rglob("*.json")):
            names.append(template_file.stem)
        return names

    def resolve_path(self, template_name: str) -> Path:
        matches = list(self.template_root.rglob(f"{template_name}.json"))
        if not matches:
            raise FileNotFoundError(f"Template not found: {template_name}")
        return matches[0]

    def load(self, template_name: str) -> dict:
        with self.resolve_path(template_name).open("r", encoding="utf-8") as fp:
            payload = json.load(fp)
        payload.setdefault(
            "metadata",
            {
                "name": template_name,
                "style_group": load_template_metadata(self.resolve_path(template_name)).style_group,
            },
        )
        return payload


def build_default_loader() -> TemplateLoader:
    return TemplateLoader(Path(__file__).resolve().parent.parent / "assets" / "templates")

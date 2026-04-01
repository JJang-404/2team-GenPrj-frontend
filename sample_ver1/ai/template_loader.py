from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TemplateLoader:
    template_root: Path

    def __post_init__(self) -> None:
        object.__setattr__(self, "template_root", self.template_root.resolve())

    def list_templates(self) -> list[str]:
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
            return json.load(fp)


def build_default_loader() -> TemplateLoader:
    return TemplateLoader(Path(__file__).resolve().parent.parent / "assets" / "templates")


from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from ai.overlay_engine import OverlayEngine, build_default_engine
from ai.revision_parser import RevisionInstruction, parse_revision_prompt
from ai.template_selector import TemplateDecision, select_template


@dataclass
class RenderResult:
    template_name: str
    style_group: str
    output_path: Path
    copy_data: dict[str, str]
    revision_notes: list[str] = field(default_factory=list)


def generate_ad(
    *,
    image_path: str | Path,
    output_path: str | Path,
    prompt: str,
    tone: str,
    business_type: str,
    goal: str,
    copy_data: dict[str, str],
    engine: OverlayEngine | None = None,
) -> RenderResult:
    engine = engine or build_default_engine()
    decision: TemplateDecision = select_template(
        prompt=prompt,
        tone=tone,
        business_type=business_type,
        goal=goal,
    )
    rendered = engine.render(
        template_name=decision.template_name,
        image_path=image_path,
        output_path=output_path,
        copy_data=copy_data,
    )
    return RenderResult(
        template_name=decision.template_name,
        style_group=decision.style_group,
        output_path=rendered,
        copy_data=dict(copy_data),
    )


def apply_revision(
    *,
    image_path: str | Path,
    output_path: str | Path,
    current_template_name: str,
    current_copy: dict[str, str],
    revision_prompt: str,
    business_type: str = "",
    goal: str = "",
    engine: OverlayEngine | None = None,
) -> RenderResult:
    engine = engine or build_default_engine()
    revision: RevisionInstruction = parse_revision_prompt(
        revision_prompt=revision_prompt,
        current_template_name=current_template_name,
        current_copy=current_copy,
        business_type=business_type,
        goal=goal,
    )
    next_template = revision.template_name or current_template_name
    next_copy = dict(current_copy)
    next_copy.update(revision.copy_updates)
    rendered = engine.render(
        template_name=next_template,
        image_path=image_path,
        output_path=output_path,
        copy_data=next_copy,
        template_override=revision.template_override,
    )
    style_group = next_template.split("_", 1)[0]
    return RenderResult(
        template_name=next_template,
        style_group=style_group,
        output_path=rendered,
        copy_data=next_copy,
        revision_notes=revision.notes,
    )

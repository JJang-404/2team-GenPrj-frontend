#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from ai.template_catalog import get_template_catalog
from ai.validation import validate_renderable_template


TEMPLATE_ROOT = APP_ROOT / "assets" / "templates"
REPORT_PATH = APP_ROOT / "outputs" / "template_validation_report.json"


def main() -> None:
    report: list[dict] = []
    renderable_count = 0
    metadata_map = {
        item.name: item for item in get_template_catalog(TEMPLATE_ROOT, renderable_only=False)
    }
    for template_path in sorted(TEMPLATE_ROOT.rglob("*.json")):
        payload = json.loads(template_path.read_text(encoding="utf-8"))
        validation = validate_renderable_template(payload)
        item = metadata_map[template_path.stem]
        report.append(
            {
                "name": item.name,
                "path": str(template_path.relative_to(APP_ROOT)),
                "style_group": item.style_group,
                "business_type": item.business_type,
                "layout_type": item.layout_type,
                "source": item.source,
                "is_renderable": validation.is_valid,
                "errors": validation.errors,
            }
        )
        if validation.is_valid:
            renderable_count += 1

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"검사 완료: 총 {len(report)}개 템플릿, 렌더 가능 {renderable_count}개")
    print(f"리포트 저장: {REPORT_PATH}")


if __name__ == "__main__":
    main()

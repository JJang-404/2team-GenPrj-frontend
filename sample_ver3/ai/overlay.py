from __future__ import annotations

from pathlib import Path

from ai.overlay_engine import build_default_engine


def overlay_text(
    image_path: str,
    output_path: str,
    headline: str,
    subheadline: str,
    cta: str,
    template_name: str = "delivery_discount_banner",
) -> Path:
    engine = build_default_engine()
    return engine.render(
        template_name=template_name,
        image_path=image_path,
        output_path=output_path,
        copy_data={
            "headline": headline,
            "subheadline": subheadline,
            "cta": cta,
            "discount_badge": "오늘 한정",
            "price": "9,900원",
            "footer": "지금 바로 주문하세요",
            "hashtags": "#신메뉴 #배달가능",
            "logo": "SAMPLE STORE",
            "slogan": "small business ad generator",
            "body": "업로드한 음식 사진과 템플릿 규칙을 결합해 빠르게 광고 시안을 만듭니다.",
            "open_close": "매일 10:00 - 21:00",
        },
    )


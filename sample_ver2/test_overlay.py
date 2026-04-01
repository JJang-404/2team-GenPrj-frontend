from pathlib import Path

from ai.ad_workflow import apply_revision, generate_ad


def main() -> None:
    output_dir = Path("outputs/finals")
    output_dir.mkdir(parents=True, exist_ok=True)
    base_copy = {
        "logo": "MOONLIGHT CAFE",
        "slogan": "signature brewing collection",
        "headline": "오늘의 첫 잔을 더 깊게",
        "subheadline": "고소한 바디감과 산뜻한 끝맛을 가진 시그니처 아메리카노",
        "body": "프리미엄 원두 블렌드",
        "price": "4,500원",
        "discount_badge": "NEW MENU",
        "footer": "sample_ver1 demo",
        "hashtags": "#아메리카노 #신메뉴",
        "open_close": "매일 08:00 - 22:00",
    }
    result = generate_ad(
        image_path="inputs/images/아메리카노.png",
        output_path=output_dir / "sample_ad.jpg",
        prompt="고급스러운 카페 신메뉴 매거진 느낌 포스터",
        tone="고급, 감성",
        business_type="카페",
        goal="신메뉴 홍보",
        copy_data=base_copy,
    )
    revised = apply_revision(
        image_path="inputs/images/아메리카노.png",
        output_path=output_dir / "sample_ad_revised.jpg",
        current_template_name=result.template_name,
        current_copy=result.copy_data,
        revision_prompt="조금 더 배달앱 할인 배너 느낌으로 바꾸고 가격 배지를 더 크게, 텍스트는 조금 줄여줘",
        business_type="카페",
        goal="신메뉴 홍보",
    )
    print(f"saved: {result.output_path}")
    print(f"template: {result.template_name} ({result.style_group})")
    print(f"revised: {revised.output_path}")
    print(f"revision_notes: {', '.join(revised.revision_notes)}")


if __name__ == "__main__":
    main()

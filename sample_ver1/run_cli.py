from __future__ import annotations

from pathlib import Path
import os

from ai.ad_workflow import apply_revision, generate_ad
from ai.sdxl_generator import SDXLGenerator, build_visual_prompt
from ai.template_selector import select_template
from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parent
load_dotenv(APP_ROOT / ".env")


def ask(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or default


def ask_choice(label: str, choices: tuple[str, ...], default: str) -> str:
    value = ask(label, default)
    return value if value in choices else default


def resolve_user_path(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    if path.is_absolute():
        return path
    return (APP_ROOT / path).resolve()


def build_copy_defaults(template_name: str) -> dict[str, str]:
    if template_name.startswith("vintage"):
        return {
            "logo": "MOONLIGHT CAFE",
            "slogan": "since 2024",
            "headline": "옛 감성 한 잔",
            "subheadline": "깊고 부드러운 풍미",
            "body": "부드러운 바디감과 은은한 향을 살린 시그니처 메뉴",
            "price": "4,500원",
            "discount_badge": "RETRO PICK",
            "footer": "sample_ver1 demo",
            "hashtags": "#레트로 #시그니처",
            "open_close": "매일 08:00 - 22:00",
        }
    if template_name.startswith("delivery"):
        return {
            "logo": "MOONLIGHT CAFE",
            "slogan": "signature brewing collection",
            "headline": "지금 주문하면 바로 할인",
            "subheadline": "배달앱에서 가장 눈에 띄는 오늘의 시그니처",
            "body": "짧고 강한 메시지 중심으로 배치됩니다.",
            "price": "4,500원",
            "discount_badge": "NEW MENU",
            "footer": "지금 주문하세요",
            "hashtags": "#배달 #할인",
            "open_close": "매일 08:00 - 22:00",
        }
    if template_name.startswith("menu_"):
        return {
            "logo": "MOONLIGHT CAFE",
            "slogan": "today's menu",
            "headline": "시그니처 아메리카노",
            "subheadline": "메뉴 소개",
            "body": "원두 블렌드와 가격 정보를 메뉴판 구조에 맞게 보여줍니다.",
            "price": "4,500원",
            "discount_badge": "BEST",
            "footer": "sample_ver1 demo",
            "hashtags": "#메뉴판 #시그니처",
            "open_close": "매일 08:00 - 22:00",
        }
    return {
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


def main() -> None:
    print("=== Ad Generator CLI ===")
    print("빈 값으로 두면 기본값을 사용합니다.\n")

    image_path_input = ask("이미지 경로", "inputs/images/아메리카노.png")
    prompt = ask("컨셉 prompt", "고급스러운 카페 신메뉴 매거진 느낌 포스터")
    tone = ask("tone", "고급, 감성")
    business_type = ask("business_type", "카페")
    goal = ask("goal", "신메뉴 홍보")
    visual_source = ask_choice(
        "비주얼 소스(input/sdxl/sdxl_img2img/sdxl_controlnet)",
        ("input", "sdxl", "sdxl_img2img", "sdxl_controlnet"),
        "input",
    )

    decision = select_template(
        prompt=prompt,
        tone=tone,
        business_type=business_type,
        goal=goal,
    )
    defaults = build_copy_defaults(decision.template_name)
    print(f"\n선택된 템플릿: {decision.template_name} ({decision.style_group})")
    print("이 템플릿에 맞는 기본 문구를 제안합니다.\n")

    image_path = resolve_user_path(image_path_input)
    if not image_path.exists():
        raise FileNotFoundError(
            f"입력 이미지를 찾을 수 없습니다: {image_path}\n"
            f"절대경로나 sample_ver1 기준 상대경로를 입력해야 합니다."
        )
    print(f"resolved image: {image_path}")

    copy_data = {
        "logo": ask("logo", defaults["logo"]),
        "slogan": ask("slogan", defaults["slogan"]),
        "headline": ask("headline", defaults["headline"]),
        "subheadline": ask("subheadline", defaults["subheadline"]),
        "body": ask("body", defaults["body"]),
        "price": ask("price", defaults["price"]),
        "discount_badge": ask("discount_badge", defaults["discount_badge"]),
        "footer": ask("footer", defaults["footer"]),
        "hashtags": ask("hashtags", defaults["hashtags"]),
        "open_close": ask("open_close", defaults["open_close"]),
    }

    output_dir = APP_ROOT / "outputs" / "finals"
    output_dir.mkdir(parents=True, exist_ok=True)
    generated_dir = output_dir / "generated"
    generated_dir.mkdir(parents=True, exist_ok=True)

    render_image_path = str(image_path)
    if visual_source in {"sdxl", "sdxl_img2img", "sdxl_controlnet"}:
        visual_prompt = ask(
            "SDXL visual prompt",
            build_visual_prompt(
                business_type=business_type,
                prompt=prompt,
                tone=tone,
                goal=goal,
                style_group=decision.style_group,
                template_name=decision.template_name,
            ),
        )
        negative_prompt = ask(
            "SDXL negative prompt",
            "blurry, distorted typography, duplicate object, watermark, low quality",
        )
        generator = SDXLGenerator()
        generated_name = {
            "sdxl": "cli_visual_sdxl.png",
            "sdxl_img2img": "cli_visual_sdxl_img2img.png",
            "sdxl_controlnet": "cli_visual_sdxl_controlnet.png",
        }[visual_source]
        generated_image_path = generated_dir / generated_name
        try:
            if visual_source == "sdxl":
                render_image_path = str(
                    generator.generate(
                        prompt=visual_prompt,
                        negative_prompt=negative_prompt,
                        output_path=generated_image_path,
                    )
                )
            elif visual_source == "sdxl_img2img":
                strength = float(ask("img2img strength", "0.65"))
                render_image_path = str(
                    generator.generate_img2img(
                        prompt=visual_prompt,
                        init_image_path=str(image_path),
                        negative_prompt=negative_prompt,
                        strength=strength,
                        output_path=generated_image_path,
                    )
                )
            else:
                conditioning_scale = float(ask("controlnet conditioning scale", "0.8"))
                render_image_path = str(
                    generator.generate_controlnet(
                        prompt=visual_prompt,
                        control_image_path=str(image_path),
                        negative_prompt=negative_prompt,
                        conditioning_scale=conditioning_scale,
                        output_path=generated_image_path,
                    )
                )
            print(f"generated visual: {render_image_path}")
        except Exception as exc:
            print(f"SDXL generation failed: {exc}")
            print("기존 입력 이미지를 사용합니다.")
            render_image_path = str(image_path)

    base_output = output_dir / "cli_ad.jpg"
    result = generate_ad(
        image_path=render_image_path,
        output_path=base_output,
        prompt=prompt,
        tone=tone,
        business_type=business_type,
        goal=goal,
        copy_data=copy_data,
    )

    print("\n=== Base Result ===")
    print(f"template: {result.template_name} ({result.style_group})")
    print(f"saved: {result.output_path}")

    revision_prompt = ask(
        "수정 요청",
        "",
    )
    if revision_prompt:
        revised_output = output_dir / "cli_ad_revised.jpg"
        revised = apply_revision(
            image_path=render_image_path,
            output_path=revised_output,
            current_template_name=result.template_name,
            current_copy=result.copy_data,
            revision_prompt=revision_prompt,
            business_type=business_type,
            goal=goal,
        )
        print("\n=== Revised Result ===")
        print(f"template: {revised.template_name} ({revised.style_group})")
        print(f"saved: {revised.output_path}")
        print(f"revision_notes: {', '.join(revised.revision_notes)}")


if __name__ == "__main__":
    main()

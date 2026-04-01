from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from PIL import Image


DEFAULT_SDXL_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
DEFAULT_CONTROLNET_MODEL_ID = "diffusers/controlnet-canny-sdxl-1.0"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)


@dataclass
class SDXLConfig:
    model_id: str = DEFAULT_SDXL_MODEL_ID
    controlnet_model_id: str = DEFAULT_CONTROLNET_MODEL_ID
    guidance_scale: float = 7.0
    num_inference_steps: int = 30
    width: int = 1024
    height: int = 1024
    num_images_per_prompt: int = 1
    strength: float = 0.65
    controlnet_conditioning_scale: float = 0.8
    negative_prompt: str = (
        "blurry, low quality, distorted typography, extra dishes, duplicated object, "
        "deformed cup, broken plate, watermark, logo artifacts, bad anatomy"
    )
    device: str = "cuda"
    torch_dtype: str = "float16"
    hf_token: str | None = None

    def resolved_token(self) -> str | None:
        return self.hf_token or os.getenv("HF_TOKEN")


def build_visual_prompt(
    *,
    business_type: str,
    prompt: str,
    tone: str,
    goal: str,
    style_group: str,
    template_name: str,
) -> str:
    style_map = {
        "premium": "luxury food advertising photography, cinematic lighting, refined plating",
        "general_food": "clean commercial food poster visual, appetizing, bright promotional lighting",
        "vintage": "retro cafe poster image, warm nostalgic palette, editorial food still life",
        "delivery": "delivery app hero image, punchy commercial food shot, high contrast",
        "menu": "menu board hero photography, clean composition, readable negative space",
    }
    style_hint = style_map.get(style_group, "commercial food photography")
    return (
        f"{business_type} product visual, {prompt}, tone: {tone}, goal: {goal}, "
        f"style group: {style_group}, template: {template_name}, "
        f"{style_hint}, centered subject, room for text overlay, no visible typography"
    )


def _resize_image(image: Image.Image, width: int, height: int) -> Image.Image:
    return image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)


def build_canny_control_image(image_path: str | Path, width: int, height: int) -> Image.Image:
    try:
        import cv2
        import numpy as np
    except Exception as exc:  # pragma: no cover - env dependent
        raise RuntimeError(
            "ControlNet 전처리에 필요한 `opencv-python` 또는 `numpy`를 불러오지 못했습니다."
        ) from exc

    image = _resize_image(Image.open(image_path), width, height)
    image_np = np.array(image)
    edges = cv2.Canny(image_np, 100, 200)
    edges_rgb = np.stack([edges, edges, edges], axis=-1)
    return Image.fromarray(edges_rgb)


class SDXLGenerator:
    def __init__(self, config: SDXLConfig | None = None) -> None:
        self.config = config or SDXLConfig()
        self._text2img_pipeline: Any | None = None
        self._img2img_pipeline: Any | None = None
        self._controlnet_pipeline: Any | None = None

    def _torch_and_dtype(self) -> tuple[Any, Any]:
        try:
            import torch
        except Exception as exc:  # pragma: no cover - env dependent
            raise RuntimeError("SDXL 실행에 필요한 `torch`를 불러오지 못했습니다.") from exc
        dtype = getattr(torch, self.config.torch_dtype)
        return torch, dtype

    def _load_text2img_pipeline(self) -> Any:
        if self._text2img_pipeline is not None:
            return self._text2img_pipeline
        try:
            _, dtype = self._torch_and_dtype()
            from diffusers import StableDiffusionXLPipeline
        except Exception as exc:  # pragma: no cover - env dependent
            raise RuntimeError(
                "SDXL text2img 실행에 필요한 `diffusers`를 불러오지 못했습니다."
            ) from exc

        pipeline = StableDiffusionXLPipeline.from_pretrained(
            self.config.model_id,
            torch_dtype=dtype,
            use_safetensors=True,
            token=self.config.resolved_token(),
        )
        pipeline = pipeline.to(self.config.device)
        self._text2img_pipeline = pipeline
        return pipeline

    def _load_img2img_pipeline(self) -> Any:
        if self._img2img_pipeline is not None:
            return self._img2img_pipeline
        try:
            _, dtype = self._torch_and_dtype()
            from diffusers import StableDiffusionXLImg2ImgPipeline
        except Exception as exc:  # pragma: no cover - env dependent
            raise RuntimeError(
                "SDXL img2img 실행에 필요한 `diffusers`를 불러오지 못했습니다."
            ) from exc

        pipeline = StableDiffusionXLImg2ImgPipeline.from_pretrained(
            self.config.model_id,
            torch_dtype=dtype,
            use_safetensors=True,
            token=self.config.resolved_token(),
        )
        pipeline = pipeline.to(self.config.device)
        self._img2img_pipeline = pipeline
        return pipeline

    def _load_controlnet_pipeline(self) -> Any:
        if self._controlnet_pipeline is not None:
            return self._controlnet_pipeline
        try:
            _, dtype = self._torch_and_dtype()
            from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline
        except Exception as exc:  # pragma: no cover - env dependent
            raise RuntimeError(
                "SDXL ControlNet 실행에 필요한 `diffusers`를 불러오지 못했습니다."
            ) from exc

        controlnet = ControlNetModel.from_pretrained(
            self.config.controlnet_model_id,
            torch_dtype=dtype,
            use_safetensors=True,
            token=self.config.resolved_token(),
        )
        pipeline = StableDiffusionXLControlNetPipeline.from_pretrained(
            self.config.model_id,
            controlnet=controlnet,
            torch_dtype=dtype,
            use_safetensors=True,
            token=self.config.resolved_token(),
        )
        pipeline = pipeline.to(self.config.device)
        self._controlnet_pipeline = pipeline
        return pipeline

    def generate(
        self,
        *,
        prompt: str,
        output_path: str | Path,
        negative_prompt: str | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> Path:
        pipeline = self._load_text2img_pipeline()
        rendered = pipeline(
            prompt=prompt,
            negative_prompt=negative_prompt or self.config.negative_prompt,
            guidance_scale=self.config.guidance_scale,
            num_inference_steps=self.config.num_inference_steps,
            width=width or self.config.width,
            height=height or self.config.height,
            num_images_per_prompt=self.config.num_images_per_prompt,
        )
        return self._save_first_image(rendered, output_path)

    def generate_img2img(
        self,
        *,
        prompt: str,
        init_image_path: str | Path,
        output_path: str | Path,
        negative_prompt: str | None = None,
        strength: float | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> Path:
        pipeline = self._load_img2img_pipeline()
        image = _resize_image(
            Image.open(init_image_path),
            width or self.config.width,
            height or self.config.height,
        )
        rendered = pipeline(
            prompt=prompt,
            image=image,
            negative_prompt=negative_prompt or self.config.negative_prompt,
            guidance_scale=self.config.guidance_scale,
            num_inference_steps=self.config.num_inference_steps,
            strength=strength or self.config.strength,
        )
        return self._save_first_image(rendered, output_path)

    def generate_controlnet(
        self,
        *,
        prompt: str,
        control_image_path: str | Path,
        output_path: str | Path,
        negative_prompt: str | None = None,
        width: int | None = None,
        height: int | None = None,
        conditioning_scale: float | None = None,
    ) -> Path:
        pipeline = self._load_controlnet_pipeline()
        control_image = build_canny_control_image(
            control_image_path,
            width or self.config.width,
            height or self.config.height,
        )
        rendered = pipeline(
            prompt=prompt,
            image=control_image,
            negative_prompt=negative_prompt or self.config.negative_prompt,
            guidance_scale=self.config.guidance_scale,
            num_inference_steps=self.config.num_inference_steps,
            width=width or self.config.width,
            height=height or self.config.height,
            controlnet_conditioning_scale=conditioning_scale or self.config.controlnet_conditioning_scale,
        )
        return self._save_first_image(rendered, output_path)

    def _save_first_image(self, rendered: Any, output_path: str | Path) -> Path:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        rendered.images[0].save(output)
        return output

/**
 * AI 배경 생성용 고정 기본 프롬프트.
 *
 * 원본: 2team-GenPrj-backend/data/comfyui/changeimage.json
 *   - BG_BASE_POSITIVE_PROMPT: Node 8 (`CLIPTextEncode`) inputs.text
 *   - BG_BASE_NEGATIVE_PROMPT: Node 9 (`CLIPTextEncode`) inputs.text
 *
 * 백엔드 JSON 수정 시 이 파일도 수동 동기화 필요.
 */

export const BG_BASE_POSITIVE_PROMPT = `(masterpiece:1.3), (best quality:1.3), (professional advertising photography:1.2), (highly polished luxury marble surface with subtle reflections:1.4), (cinematic studio lighting:1.3).
(The entire scene is dynamically color-graded based on the dominant hues of the source image:1.5).
A pristine, tight-frame bust-shot of an exclusive product pedestal. In the foreground, a flat, exquisite texture surface is shown.
The entire background is (completely deconstructed into a soft, ethereal, and hazy wash of ambient light:1.6).
No distinct shapes, only (smooth color gradients and a dreamlike atmospheric glow extracted from the source image:1.5).
Extremely shallow depth of field, 105mm portrait lens perspective, 8k, flawless render.`;

export const BG_BASE_NEGATIVE_PROMPT = `(pillars:2.0), (arches:2.0), (building:2.0), (room:2.0), (hall:2.0), (large space:2.0), (distant view:2.0), (wide shot:2.0), (massive hall:1.8), (expansive background:1.8), (objects in background:1.7), cup, glass, coffee, beverage, drink, bottle, straw, liquid, text, logo, watermark, low quality.`;

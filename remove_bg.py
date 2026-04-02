"""
배경 제거 스크립트
  - 단색 배경  : BFS Flood Fill (테두리 연결 픽셀만 제거 → 내부 동일색 보존)
  - 복잡한 배경: rembg AI (가장 정확, 권장)
  - 자동 감지  : 테두리 픽셀 분석으로 단색/복잡 배경 판별

필요 패키지:
    uv pip install Pillow numpy
    uv pip install rembg onnxruntime   # AI 방식 (권장, 최초 실행 시 모델 ~170MB 다운로드)
    uv pip install opencv-python       # GrabCut 방식 사용 시
"""

import importlib.util
import os
from collections import deque

import numpy as np
from PIL import Image


# ──────────────────────────────────────────────
# 내부 유틸
# ──────────────────────────────────────────────
def _border_pixels(data: np.ndarray) -> np.ndarray:
    """이미지 최외곽 1px 링의 RGB 픽셀 배열 반환"""
    return np.concatenate(
        [
            data[0, :, :3],  # 상단
            data[-1, :, :3],  # 하단
            data[1:-1, 0, :3],  # 좌측 (모서리 중복 제외)
            data[1:-1, -1, :3],  # 우측
        ]
    ).astype(float)


def _detect_bg(border: np.ndarray, tolerance: int = 35):
    """
    테두리 픽셀에서 배경색과 단색 여부를 함께 반환.

    우선순위:
      1. 테두리의 5% 이상이 매우 밝은 색(>220) → 흰색 배경으로 간주
         (패턴 이미지처럼 오브젝트가 테두리를 가려도 틈새 흰 픽셀로 감지)
      2. 나머지 경우: 가장 밝은 상위 30% 평균으로 배경색 추정,
         테두리의 40% 이상이 그 색과 유사하면 단색 판별
    """
    # 1. 흰색/밝은 배경 우선 감지
    very_bright = (border > 220).all(axis=1)
    if very_bright.mean() >= 0.05:
        bg = np.array([255.0, 255.0, 255.0])
        return bg, True

    # 2. 일반 단색 배경 감지
    brightness = border.mean(axis=1)
    threshold = np.percentile(brightness, 70)
    bg = border[brightness >= threshold].mean(axis=0)
    diff = np.abs(border - bg).max(axis=1)
    solid = float((diff < tolerance).mean()) >= 0.40
    return bg, solid


# ──────────────────────────────────────────────
# 1. BFS Flood Fill (단색 배경용, 내부 색상 보존)
# ──────────────────────────────────────────────
def remove_bg_floodfill(
    input_path: str,
    output_path: str,
    tolerance: int = 35,
    fill_color: tuple = (0, 0, 0, 0),  # 기본: 투명. 흰색: (255, 255, 255, 255)
) -> None:
    """
    테두리에서 BFS로 연결된 배경 픽셀만 fill_color로 교체.
    배경색은 테두리 픽셀의 가장 밝은 30% 평균으로 자동 추정.
    내부의 같은 색상은 연결이 끊어져 있으면 보존됨.

    fill_color 예시:
      (0, 0, 0, 0)         → 투명
      (255, 255, 255, 255) → 흰색으로 교체
    """
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.int32)
    h, w = data.shape[:2]

    border = _border_pixels(data)
    bg, _ = _detect_bg(border, tolerance)

    def is_bg(y: int, x: int) -> bool:
        return bool(np.abs(data[y, x, :3] - bg).max() < tolerance)

    visited = np.zeros((h, w), dtype=bool)
    queue: deque = deque()

    for x in range(w):
        for y in (0, h - 1):
            if not visited[y, x] and is_bg(y, x):
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not visited[y, x] and is_bg(y, x):
                visited[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        data[y, x] = fill_color
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg(ny, nx):
                visited[ny, nx] = True
                queue.append((ny, nx))

    result = Image.fromarray(data.astype(np.uint8))  # RGBA
    if output_path.lower().endswith((".jpg", ".jpeg")):
        # JPEG는 알파채널 미지원 → 흰 배경 위에 합성 후 RGB로 저장
        bg_img = Image.new("RGB", result.size, (255, 255, 255))
        bg_img.paste(result, mask=result.split()[3])
        bg_img.save(output_path, quality=95)
    else:
        result.save(output_path)
    print(f"[BFS FloodFill] 저장 완료 → {output_path}")


# ──────────────────────────────────────────────
# 2. rembg AI (모든 이미지, 가장 정확 — 권장)
# ──────────────────────────────────────────────
def remove_bg_rembg(input_path: str, output_path: str) -> None:
    """
    rembg + U2Net 딥러닝 모델.
    단색/사진 구분 없이 정확하며, 내부 색상도 보존.
    최초 실행 시 모델 자동 다운로드 (~170 MB).
    """
    try:
        from rembg import remove
    except ImportError:
        print("[rembg] 패키지 없음. 'uv pip install rembg onnxruntime' 후 재시도.")
        return

    with open(input_path, "rb") as f:
        result = remove(f.read())
    with open(output_path, "wb") as f:
        f.write(result)
    print(f"[rembg AI]      저장 완료 → {output_path}")


# ──────────────────────────────────────────────
# 3. OpenCV GrabCut (복잡한 사진 배경, rembg 미설치 시 대안)
# ──────────────────────────────────────────────
def remove_bg_grabcut(
    input_path: str, output_path: str, iterations: int = 10, margin_ratio: float = 0.08
) -> None:
    """
    중앙 영역을 전경으로 지정하고 GrabCut으로 배경 분리.
    단일 피사체 사진에 적합. 패턴 이미지에는 부적합.
    """
    import cv2

    raw = np.fromfile(input_path, dtype=np.uint8)
    img_bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise FileNotFoundError(f"이미지를 열 수 없음: {input_path}")

    h, w = img_bgr.shape[:2]
    mx, my = int(w * margin_ratio), int(h * margin_ratio)
    rect = (mx, my, w - 2 * mx, h - 2 * my)

    mask = np.zeros((h, w), np.uint8)
    bgd_mdl = np.zeros((1, 65), np.float64)
    fgd_mdl = np.zeros((1, 65), np.float64)
    cv2.grabCut(
        img_bgr, mask, rect, bgd_mdl, fgd_mdl, iterations, cv2.GC_INIT_WITH_RECT
    )

    fg_mask = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    img_rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
    img_rgba[:, :, 3] = fg_mask

    _, buf = cv2.imencode(".png", img_rgba)
    buf.tofile(output_path)
    print(f"[GrabCut]       저장 완료 → {output_path}")


# ──────────────────────────────────────────────
# 4. 자동 감지: 단색 → FloodFill, 복잡 → rembg (없으면 FloodFill fallback)
# ──────────────────────────────────────────────
def remove_bg_auto(
    input_path: str,
    output_path: str,
    tolerance: int = 35,
    prefer_rembg: bool = True,
) -> None:
    """
    배경 유형을 자동 감지하여 적합한 방법 선택.
      단색 배경  → BFS FloodFill
      복잡 배경  → rembg AI (설치된 경우) → FloodFill fallback
    """
    print(f"\n[자동 감지] {os.path.basename(input_path)}")

    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.int32)
    border = _border_pixels(data)
    bg, solid = _detect_bg(border, tolerance)

    bg_rgb = tuple(int(v) for v in bg)
    print(f"  추정 배경색: RGB{bg_rgb}  →  {'단색' if solid else '복잡'}으로 판별")

    if solid:
        print("  → BFS FloodFill 사용")
        remove_bg_floodfill(input_path, output_path, tolerance=tolerance)
    elif prefer_rembg and importlib.util.find_spec("rembg") is not None:
        print("  → rembg AI 사용")
        remove_bg_rembg(input_path, output_path)
    else:
        if prefer_rembg:
            print("  → rembg 미설치, BFS FloodFill로 fallback")
        else:
            print("  → BFS FloodFill 사용 (prefer_rembg=False)")
        remove_bg_floodfill(input_path, output_path, tolerance=tolerance)


# ──────────────────────────────────────────────
# 실행
# ──────────────────────────────────────────────
if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(base, "img/picture")

    # ── 방법 A: 자동 감지 (권장) ──
    targets = [
        (
            "KakaoTalk_20260401_184320873_06.jpg",
            "KakaoTalk_20260401_184320873_06_nobg.jpg",
        ),
        (
            "KakaoTalk_20260401_184320873_07.jpg",
            "KakaoTalk_20260401_184320873_07_nobg.jpg",
        ),
    ]
    for src, dst in targets:
        remove_bg_auto(
            os.path.join(img_dir, src),
            os.path.join(img_dir, dst),
            tolerance=35,
            prefer_rembg=True,
        )

    # ── 방법 B: 개별 지정 ──
    # remove_bg_floodfill(os.path.join(img_dir, "아이스_아메리카노_플랫벡터(142)_1.png"),
    #                     os.path.join(img_dir, "test_floodfill.png"))
    # remove_bg_rembg(os.path.join(img_dir, "아이스_아메리카노_깔롱2.png"),
    #                 os.path.join(img_dir, "test_rembg.png"))

    print("\n완료! img/ 폴더에서 *_nobg.png 파일을 확인하세요.")

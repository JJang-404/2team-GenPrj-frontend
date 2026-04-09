#!/usr/bin/env python3
"""
draw.io wireframe PNG에서 슬롯 메타데이터를 추출하는 스크립트.

사용법:
    python extract_metadata.py                          # 전체 wireframe 분석 (테이블)
    python extract_metadata.py 4-4-1.png                # 특정 파일만 분석
    python extract_metadata.py --json                   # JSON을 stdout에 출력
    python extract_metadata.py --export                 # wireframeSlots.json 파일로 내보내기
    python extract_metadata.py --export out/my.json     # 지정 경로로 내보내기

캔버스: 1000 × 1250 (4:5)
출력: 각 슬롯의 Cx, Cy, sw, sh (캔버스 대비 %)
"""

import struct, urllib.parse, base64, zlib, re, os, glob, sys, json

CANVAS_W = 1000
CANVAS_H = 1250


# ─── 1. PNG에서 draw.io XML 추출 ───────────────────────────────────────────

def extract_xml(filepath):
    """PNG tEXt 청크에서 draw.io mxfile XML을 추출"""
    with open(filepath, 'rb') as f:
        data = f.read()
    pos = 8  # PNG 시그니처 건너뛰기
    while pos < len(data) - 12:
        length = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        chunk_data = data[pos+8:pos+8+length]
        if chunk_type == b'tEXt':
            null_idx = chunk_data.find(b'\x00')
            keyword = chunk_data[:null_idx].decode('utf-8', errors='replace')
            if keyword == 'mxfile':
                text = chunk_data[null_idx+1:].decode('utf-8', errors='replace')
                xml = urllib.parse.unquote(text)
                m = re.search(r'<diagram[^>]*>(.*?)</diagram>', xml, re.DOTALL)
                if m:
                    compressed = base64.b64decode(m.group(1))
                    decompressed = zlib.decompress(compressed, -15)
                    return urllib.parse.unquote(decompressed.decode('utf-8'))
        pos += 12 + length
    return None


# ─── 2. XML 파싱 ──────────────────────────────────────────────────────────

def parse_cells(xml):
    """mxCell 요소들을 파싱하여 {id: {parent, value, style, geo}} 딕셔너리 반환"""
    cells = {}

    # mxCell + mxGeometry를 함께 캡처
    for m in re.finditer(
        r'<mxCell\s+([^>]*?)>'
        r'\s*<mxGeometry\s+([^/]*?)\s*(?:as="geometry"\s*)?/>'
        r'\s*</mxCell>',
        xml, re.DOTALL
    ):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        geo_raw = m.group(2)
        geo = {}
        for k, v in re.findall(r'(x|y|width|height)="([^"]*)"', geo_raw):
            geo[k] = float(v)
        cell_id = attrs.get('id', '')
        cells[cell_id] = {
            'parent': attrs.get('parent', ''),
            'value': re.sub(r'<[^>]+>', '', urllib.parse.unquote(attrs.get('value', ''))).strip(),
            'style': attrs.get('style', ''),
            'geo': geo,
        }

    # self-closing mxCell (geometry가 attribute로 인라인된 경우는 드뭄 — 주로 id 0, 1)
    for m in re.finditer(r'<mxCell\s+([^/]*?)/>', xml):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        cell_id = attrs.get('id', '')
        if cell_id not in cells:
            cells[cell_id] = {
                'parent': attrs.get('parent', ''),
                'value': '',
                'style': attrs.get('style', ''),
                'geo': {},
            }

    return cells


def resolve_abs(cells, cell_id):
    """부모 체인을 따라가며 절대 좌표(x, y) 계산"""
    x, y = 0.0, 0.0
    cid = cell_id
    visited = set()
    while cid in cells and cid not in visited:
        visited.add(cid)
        g = cells[cid].get('geo', {})
        x += g.get('x', 0.0)
        y += g.get('y', 0.0)
        cid = cells[cid]['parent']
        if cid in ('0', '1', ''):
            break
    return x, y


# ─── 3. 슬롯 탐색 및 분류 ────────────────────────────────────────────────

def find_image_slots(cells):
    """이미지 영역 슬롯 탐색 (라벨이 있는 부모의 이미지 자식)"""
    slots = []
    for cid, cell in cells.items():
        g = cell['geo']
        w = g.get('width', 0)
        h = g.get('height', 0)
        val = cell['value']
        style = cell['style']

        # 필터: 이미지 영역 = 값 없음, 크기 충분, group/text 아님, 캔버스 자체 아님
        if w < 80 or h < 150 or val or 'group' in style or 'text' in style:
            continue
        if w >= 900 and h >= 1100:  # 캔버스 자체
            continue

        abs_x, abs_y = resolve_abs(cells, cid)

        # 같은 부모 아래에 "가격" 라벨이 있는지 확인
        parent = cell['parent']
        has_label = any(
            '가격' in c['value']
            for c in cells.values()
            if c['parent'] == parent
        )

        if has_label:
            slots.append({
                'id': cid,
                'abs_x': abs_x,
                'abs_y': abs_y,
                'w': w,
                'h': h,
                'parent': parent,
            })

    return slots


def classify_groups(slots):
    """슬롯들을 pair(CropPair/GridPair) 또는 single로 분류"""
    # 같은 부모끼리 묶기
    by_parent = {}
    for s in slots:
        by_parent.setdefault(s['parent'], []).append(s)

    groups = []
    used_ids = set()

    for parent, children in by_parent.items():
        if len(children) == 2:
            c1, c2 = sorted(children, key=lambda s: s['abs_x'])
            gap = c2['abs_x'] - (c1['abs_x'] + c1['w'])

            if gap < 5:  # 인접 또는 겹침
                total_w = c1['w'] + c2['w']
                cx = (c1['abs_x'] + total_w / 2) / CANVAS_W * 100
                cy = (c1['abs_y'] + c1['h'] / 2) / CANVAS_H * 100

                group = {
                    'type': 'pair',
                    'Cx': round(cx, 1),
                    'Cy': round(cy, 1),
                    'sw': round(c1['w'] / CANVAS_W * 100, 1),
                    'sh': round(c1['h'] / CANVAS_H * 100, 1),
                    'total_w_pct': round(total_w / CANVAS_W * 100, 1),
                    'abs_x': c1['abs_x'],
                    'abs_y': c1['abs_y'],
                    'slot_w_px': c1['w'],
                    'slot_h_px': c1['h'],
                }

                # 겹침 여부 판별
                if gap < -5:
                    overlap_px = (c1['abs_x'] + c1['w']) - c2['abs_x']
                    group['overlap_px'] = round(overlap_px, 1)
                    group['overlap_ratio'] = round(overlap_px / total_w, 3)

                groups.append(group)
                used_ids.update(s['id'] for s in children)

    # 나머지 = single
    for s in slots:
        if s['id'] not in used_ids:
            cx = (s['abs_x'] + s['w'] / 2) / CANVAS_W * 100
            cy = (s['abs_y'] + s['h'] / 2) / CANVAS_H * 100
            groups.append({
                'type': 'single',
                'Cx': round(cx, 1),
                'Cy': round(cy, 1),
                'sw': round(s['w'] / CANVAS_W * 100, 1),
                'sh': round(s['h'] / CANVAS_H * 100, 1),
                'abs_x': s['abs_x'],
                'abs_y': s['abs_y'],
                'slot_w_px': s['w'],
                'slot_h_px': s['h'],
            })

    groups.sort(key=lambda g: (g['abs_y'], g['abs_x']))
    return groups


# ─── 4. 출력 ─────────────────────────────────────────────────────────────

def print_table(all_data):
    """테이블 형태로 출력"""
    sep = "=" * 110
    header = (
        f"{'Wireframe':<14} {'#':>2} {'Type':<7} "
        f"{'Cx%':>7} {'Cy%':>7} {'sw%':>7} {'sh%':>7} "
        f"{'totalW%':>8} {'absX':>6} {'absY':>6} "
        f"{'slotW':>6} {'slotH':>6} {'overlap':>8}"
    )
    print(sep)
    print(header)
    print(sep)

    for name, groups in sorted(all_data.items()):
        for i, g in enumerate(groups):
            tw = f"{g['total_w_pct']:.1f}" if 'total_w_pct' in g else '-'
            ol = f"{g['overlap_ratio']:.3f}" if 'overlap_ratio' in g else '-'
            sw_px = g.get('slot_w_px', '-')
            sh_px = g.get('slot_h_px', '-')
            print(
                f"{name:<14} {i:>2} {g['type']:<7} "
                f"{g['Cx']:>7.1f} {g['Cy']:>7.1f} {g['sw']:>7.1f} {g['sh']:>7.1f} "
                f"{tw:>8} {g['abs_x']:>6.0f} {g['abs_y']:>6.0f} "
                f"{sw_px:>6} {sh_px:>6} {ol:>8}"
            )
        print("-" * 110)


def parse_wireframe_name(name):
    """wireframe 파일명을 파싱: '{type}-{count}-{slogan}' → (type, count, hasSlogan)
       특수 케이스: 'n-1-1' / 'n-1-2' 등 (공통 1개 제품)"""
    parts = name.split('-')
    if len(parts) == 3:
        t, c, s = parts
        return t, int(c), s == '1'
    return name, 0, False


def build_json(all_data):
    """JS에서 import할 수 있는 구조로 변환"""
    canvas = {'width': CANVAS_W, 'height': CANVAS_H, 'ratio': '4:5'}

    wireframes = {}
    for name, groups in sorted(all_data.items()):
        wf_type, count, has_slogan = parse_wireframe_name(name)

        slots = []
        for g in groups:
            slot = {
                'Cx': g['Cx'],
                'Cy': g['Cy'],
                'sw': g['sw'],
                'sh': g['sh'],
            }
            slots.append(slot)

        wireframes[name] = {
            'type': wf_type,
            'productCount': count,
            'hasSlogan': has_slogan,
            'slots': slots,
        }

    return {'canvas': canvas, 'wireframes': wireframes}


def print_json(all_data):
    """JSON을 stdout에 출력"""
    print(json.dumps(build_json(all_data), indent=2, ensure_ascii=False))


def export_json(all_data, dest_path):
    """JSON 파일로 내보내기"""
    payload = build_json(all_data)
    os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
    with open(dest_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    count_wf = len(payload['wireframes'])
    count_slots = sum(len(w['slots']) for w in payload['wireframes'].values())
    print(f"Exported {count_wf} wireframes, {count_slots} slots → {dest_path}")


# ─── 5. 메인 ─────────────────────────────────────────────────────────────

DEFAULT_EXPORT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'react', 'src', 'modules', 'initPage', 'components', 'wireframe',
    'wireframeSlots.json'
)


def main():
    args = sys.argv[1:]
    json_mode = '--json' in args
    export_mode = '--export' in args

    # 플래그 제거
    clean_args = [a for a in args if a not in ('--json', '--export')]

    # --export 뒤에 경로가 있으면 사용, 없으면 기본 경로
    export_path = DEFAULT_EXPORT_PATH
    if export_mode and clean_args and clean_args[-1].endswith('.json'):
        export_path = clean_args.pop()

    folder = os.path.dirname(os.path.abspath(__file__))

    if clean_args:
        pngs = [os.path.join(folder, a) for a in clean_args]
    else:
        pngs = sorted(glob.glob(os.path.join(folder, '*.png')))

    all_data = {}

    for png in pngs:
        if not os.path.exists(png):
            print(f"[SKIP] {png} 파일 없음", file=sys.stderr)
            continue

        name = os.path.basename(png).replace('.png', '')
        xml = extract_xml(png)
        if not xml:
            print(f"[SKIP] {name}: draw.io XML 없음", file=sys.stderr)
            continue

        cells = parse_cells(xml)
        slots = find_image_slots(cells)
        groups = classify_groups(slots)

        if groups:
            all_data[name] = groups

    if export_mode:
        export_json(all_data, export_path)
    elif json_mode:
        print_json(all_data)
    else:
        print(f"\n캔버스: {CANVAS_W} × {CANVAS_H}  (비율 {CANVAS_W}:{CANVAS_H})\n")
        print_table(all_data)
        print(f"\n총 {len(all_data)}개 wireframe, "
              f"{sum(len(g) for g in all_data.values())}개 슬롯/그룹 분석 완료")


if __name__ == '__main__':
    main()

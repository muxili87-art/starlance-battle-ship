#!/usr/bin/env python3
"""
Slice Direction 1 (32-bit Japanese Arcade Pixel Art) fighters (9), pilot portraits (9),
enemies (15), and bosses (3) into clean transparent PNGs, generate public/assets/manifest.json,
and render a checkerboard verification contact sheet at docs/v2-assets-preview.png.
"""
import json
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
FIGHTERS_SRC = ROOT / "public/assets/source/user_fighters_9.jpg"
PILOTS_SRC = ROOT / "public/assets/source/dir1_pilots_9.png"
ENEMIES_SRC = ROOT / "public/assets/source/dir1_enemies_32bit.png"

OUT_FIGHTERS = ROOT / "public/assets/fighters"
OUT_PILOTS = ROOT / "public/assets/pilots"
OUT_ENEMIES = ROOT / "public/assets/enemies"
OUT_BOSSES = ROOT / "public/assets/bosses"
MANIFEST_PATH = ROOT / "public/assets/manifest.json"
PREVIEW_PATH = ROOT / "docs/v2-assets-preview.png"


def remove_bg_floodfill(rgb_arr: np.ndarray, tol: float = 34.0) -> Image.Image:
    """Edge-seeded BFS flood-fill background removal preserving crisp pixel edges."""
    h, w, _ = rgb_arr.shape
    border = np.concatenate([
        rgb_arr[0, :, :],
        rgb_arr[h - 1, :, :],
        rgb_arr[:, 0, :],
        rgb_arr[:, w - 1, :],
    ], axis=0)
    bg = np.median(border, axis=0)

    dist = np.linalg.norm(rgb_arr.astype(np.float32) - bg.astype(np.float32), axis=2)
    is_bg_cand = dist <= tol

    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if is_bg_cand[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if is_bg_cand[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_bg_cand[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if is_bg_cand[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = np.where(visited, 0, 255).astype(np.uint8)

    fg_y, fg_x = np.where(alpha == 255)
    for y, x in zip(fg_y, fg_x):
        if dist[y, x] <= tol + 14:
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and visited[ny, nx]:
                    alpha[y, x] = 0
                    break

    rgba = np.dstack([rgb_arr, alpha])
    im = Image.fromarray(rgba)
    bbox = im.getbbox()
    if bbox:
        x0 = max(0, bbox[0] - 2)
        y0 = max(0, bbox[1] - 2)
        x1 = min(w, bbox[2] + 2)
        y1 = min(h, bbox[3] + 2)
        im = im.crop((x0, y0, x1, y1))
    return im


def find_segments(active: np.ndarray, offset: int, limit_max: int, expected_count: int, min_len: int = 14, merge_gap: int = 10, pad: int = 4):
    """Find contiguous 1D projection segments, merge small internal gaps, and pad."""
    segments = []
    in_seg = False
    start = 0
    for i, val in enumerate(active):
        if val and not in_seg:
            in_seg = True
            start = i
        elif not val and in_seg:
            if i - start >= min_len:
                segments.append((offset + start, offset + i))
            in_seg = False
    if in_seg and (len(active) - start >= min_len):
        segments.append((offset + start, offset + len(active)))

    merged = []
    for seg in segments:
        if merged and seg[0] - merged[-1][1] < merge_gap:
            merged[-1] = (merged[-1][0], seg[1])
        else:
            merged.append(seg)

    if len(merged) == expected_count:
        return [(max(offset, a - pad), min(limit_max, b + pad)) for a, b in merged]

    step = (limit_max - offset) / expected_count
    return [(int(offset + i * step), int(offset + (i + 1) * step)) for i in range(expected_count)]


def find_y_bands(rgb_arr: np.ndarray, expected_rows: int, tol: float = 20.0):
    h, _, _ = rgb_arr.shape
    bg = np.median(rgb_arr[:10, :10], axis=(0, 1))
    mask = np.linalg.norm(rgb_arr.astype(np.float32) - bg.astype(np.float32), axis=2) > tol
    row_sums = mask.sum(axis=1)
    return find_segments(row_sums > 2, 0, h, expected_rows, min_len=20, merge_gap=2, pad=2)


def find_x_bands(rgb_arr: np.ndarray, y0: int, y1: int, expected_cols: int, tol: float = 20.0):
    _, w, _ = rgb_arr.shape
    band = rgb_arr[y0:y1, :]
    bg = np.median(band[:, :8], axis=(0, 1))
    mask = np.linalg.norm(band.astype(np.float32) - bg.astype(np.float32), axis=2) > tol
    col_sums = mask.sum(axis=0)
    return find_segments(col_sums > 1, 0, w, expected_cols, min_len=14, merge_gap=4, pad=2)


def main():
    for d in (OUT_FIGHTERS, OUT_PILOTS, OUT_ENEMIES, OUT_BOSSES):
        d.mkdir(parents=True, exist_ok=True)
    PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)

    f_arr = np.array(Image.open(FIGHTERS_SRC).convert("RGB"))
    p_arr = np.array(Image.open(PILOTS_SRC).convert("RGB"))
    e_arr = np.array(Image.open(ENEMIES_SRC).convert("RGB"))

    fighters_meta = [
        ("01_chifeng", "赤锋", "力量 · 高单发穿甲"),
        ("02_jifeng", "疾风", "速度 · 高机动高射速"),
        ("03_leiting", "雷霆", "雷电 · 连锁闪电"),
        ("04_fusu", "复苏", "生命 · 击杀回血狂战"),
        ("05_lieyang", "烈阳", "爆破 · 范围连锁殉爆"),
        ("06_xukong", "虚空", "引力 · 黑洞聚怪坍缩"),
        ("07_hanxing", "寒星", "冰冻 · 减速冻结碎冰"),
        ("08_tiandun", "天盾", "防御 · 护盾反震清弹"),
        ("09_fengqun", "蜂群", "召唤 · 追踪无人机海"),
    ]
    fighter_row_y = [(2, 214), (328, 526), (632, 846)]
    fighter_col_x = [(0, 311), (311, 623), (623, 935)]

    manifest = {
        "fighters": [],
        "pilots": [],
        "enemies": [],
        "bosses": [],
        "backgrounds": [
            {"id": "stage1_carrier", "path": "assets/backgrounds/stage1_carrier.png"},
            {"id": "stage2_asteroid", "path": "assets/backgrounds/stage2_asteroid.png"},
            {"id": "stage3_overmind", "path": "assets/backgrounds/stage3_overmind.png"},
        ],
    }
    preview_items = []

    # 1. Native 32-bit 9 fighters (zero downscaling!)
    for idx, (fid, cname, role) in enumerate(fighters_meta):
        r, c = divmod(idx, 3)
        y0, y1 = fighter_row_y[r]
        x0, x1 = fighter_col_x[c]
        crop = f_arr[y0:y1, x0:x1]
        spr = remove_bg_floodfill(crop, tol=34.0)
        spr.save(OUT_FIGHTERS / f"{fid}.png")
        manifest["fighters"].append({
            "id": fid,
            "cnName": cname,
            "role": role,
            "category": "fighter",
            "path": f"assets/fighters/{fid}.png",
            "width": spr.width,
            "height": spr.height,
            "facing": "up",
        })
        preview_items.append((fid, spr))

    # 2. 9 Pilot Bust Portraits (3x3 grid -> 96x96 crisp square PNGs)
    p_y_bands = find_y_bands(p_arr, 3, tol=20.0)
    print("Pilot Y bands:", p_y_bands)
    for r, (y0, y1) in enumerate(p_y_bands):
        p_x_bands = find_x_bands(p_arr, y0, y1, 3, tol=20.0)
        print(f"Pilot row {r} X bands:", p_x_bands)
        for c, (x0, x1) in enumerate(p_x_bands):
            fid, cname, _ = fighters_meta[r * 3 + c]
            crop = Image.fromarray(p_arr[y0:y1, x0:x1])
            side = max(crop.width, crop.height)
            sq = Image.new("RGBA", (side, side), (11, 16, 32, 255))
            sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
            sq = sq.resize((96, 96), Image.NEAREST)
            sq.save(OUT_PILOTS / f"{fid}.png")
            manifest["pilots"].append({
                "id": fid,
                "cnName": cname,
                "path": f"assets/pilots/{fid}.png",
                "width": 96,
                "height": 96,
            })
            preview_items.append((f"pilot_{fid[:2]}", sq))

    # 3. 32-bit Japanese Arcade Enemies (15) & Bosses (3)
    enemy_rows = [
        ("normal", [
            ("normal_light_fighter", "轻型战机", "基础俯冲单位"),
            ("normal_scout", "侦察机", "高速S型穿插"),
            ("normal_gunner", "火力机", "双发直射弹"),
            ("normal_interceptor", "拦截机", "斜向封锁切入"),
            ("normal_rusher", "速攻机", "高机动突袭"),
            ("normal_bomber", "自爆机", "近身自爆威胁"),
        ]),
        ("elite", [
            ("elite_fighter", "精英战机", "高血量连射"),
            ("elite_shield", "护盾机", "双弧能量护盾"),
            ("elite_missile", "导弹机", "发射追踪导弹"),
            ("elite_spread", "散射机", "扇形弹幕压制"),
            ("elite_jammer", "干扰机", "电磁脉冲光环"),
        ]),
        ("medium", [
            ("medium_transport", "武装运输机", "掉落大量晶体/补给"),
            ("medium_gunship", "炮艇", "双侧连续压制火力"),
            ("medium_fortress", "空中堡垒", "高护甲区域压制"),
            ("medium_launcher", "发射平台", "多管导弹齐射"),
        ]),
        ("boss", [
            ("boss_marshal", "拦截统帅", "第1关Boss · 灵活多武装切换"),
            ("boss_citadel", "重装要塞", "第2关Boss · 高耐久部位破坏"),
            ("boss_overmind", "核心主脑", "第3关Boss · 多阶段全屏弹幕"),
        ]),
    ]

    e_y_bands = find_y_bands(e_arr, 4, tol=22.0)
    print("Enemy Y bands:", e_y_bands)
    for (tier, specs), (y0, y1) in zip(enemy_rows, e_y_bands):
        segs = find_x_bands(e_arr, y0, y1, len(specs), tol=22.0)
        print(f"Enemy tier {tier} X bands:", segs)
        for (sx0, sx1), (eid, cname, role) in zip(segs, specs):
            crop = e_arr[y0:y1, sx0:sx1]
            spr = remove_bg_floodfill(crop, tol=26.0)
            is_boss = tier == "boss"
            out_dir = OUT_BOSSES if is_boss else OUT_ENEMIES
            sub_dir = "bosses" if is_boss else "enemies"
            spr.save(out_dir / f"{eid}.png")
            manifest["bosses" if is_boss else "enemies"].append({
                "id": eid,
                "cnName": cname,
                "role": role,
                "category": tier,
                "path": f"assets/{sub_dir}/{eid}.png",
                "width": spr.width,
                "height": spr.height,
                "facing": "down",
            })
            preview_items.append((eid, spr))

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Build checkerboard contact sheet (6 cols x 6 rows)
    cols = 6
    rows = (len(preview_items) + cols - 1) // cols
    cell_w, cell_h = 220, 200
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (24, 30, 40, 255))
    draw = ImageDraw.Draw(sheet)

    for i, (label, spr) in enumerate(preview_items):
        r, c = divmod(i, cols)
        ox, oy = c * cell_w, r * cell_h
        for cy in range(oy + 12, oy + cell_h - 28, 12):
            for cx in range(ox + 12, ox + cell_w - 12, 12):
                col = (44, 52, 66, 255) if ((cx // 12 + cy // 12) % 2 == 0) else (30, 36, 48, 255)
                draw.rectangle([cx, cy, min(ox + cell_w - 12, cx + 11), min(oy + cell_h - 28, cy + 11)], fill=col)

        scale = min(176 / spr.width, 144 / spr.height, 2.0)
        nw = max(1, int(round(spr.width * scale)))
        nh = max(1, int(round(spr.height * scale)))
        resized = spr.resize((nw, nh), Image.NEAREST)
        px = ox + (cell_w - nw) // 2
        py = oy + 12 + (152 - nh) // 2
        sheet.alpha_composite(resized, (px, py))
        draw.text((ox + 10, oy + cell_h - 22), f"{label} ({spr.width}x{spr.height})", fill=(220, 232, 248, 255))

    sheet.save(PREVIEW_PATH)
    print(f"Exported {len(manifest['fighters'])} fighters, {len(manifest['pilots'])} pilots, {len(manifest['enemies'])} enemies, {len(manifest['bosses'])} bosses.")


if __name__ == "__main__":
    main()

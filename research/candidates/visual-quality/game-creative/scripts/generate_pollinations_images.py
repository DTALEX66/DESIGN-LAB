#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pollinations.ai 批量 AI 图片生成脚本模板
免费 API，无需 key，通过 curl 下载

用法:
  python -u generate_pollinations_images.py --output-dir ./my-assets --workers 2
  python -u generate_pollinations_images.py --limit 30 --workers 2
  python -u generate_pollinations_images.py --category cards --workers 2
"""
import argparse
import subprocess
import urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ============================================================
# 配置区：修改这里的任务定义来生成你自己的图片
# ============================================================

# 共享风格前缀（保证同批次风格统一）
CARD_STYLE = (
    "game card illustration, fantasy art, clean centered composition, "
    "dark background, digital painting, detailed, vibrant colors, "
    "no text, no border, no frame, no UI elements, single subject"
)

# 图片任务定义：按类别组织
# 每个任务: (文件名, 英文prompt描述, 尺寸)
# 文件名可用中文，但 prompt 必须用英文

CARD_TASKS = {
    "fire": [
        ("火花", "small fire spark, tiny orange flame, cute fire spirit, warm glow"),
        ("烈焰", "column of fire rising from ground, intense orange flames, burning heat"),
        ("焚天", "apocalyptic sea of fire, red sky, massive flames, overwhelming destruction"),
    ],
    "water": [
        ("水滴", "single crystal water droplet, translucent, sparkling, blue teal liquid"),
        ("激流", "rushing water stream, dynamic flowing water, splashing waves"),
        ("洪潮", "giant tidal wave, tsunami, powerful ocean surge, blue white foam"),
    ],
    # ... 添加更多元素
}

SPECIAL_CARDS = [
    ("炸弹", "classic round bomb with burning fuse, cartoon style, explosive"),
    ("变色", "prismatic crystal, rainbow refraction, color shifting gem, magical"),
    # ... 添加更多
]

ENEMIES = [
    ("slime", "cute green jelly slime monster, transparent, big eyes, fantasy creature"),
    ("goblin", "small green goblin scout, holding dagger, sneaky expression, fantasy"),
    ("golem", "stone golem, cracks in rock body, heavy, earth elemental, fantasy"),
    # ... 添加更多
]

RELICS = [
    ("fire_heart", "burning heart, ruby gem, flames, fantasy artifact"),
    ("water_tear", "blue teardrop gem, water droplet, magical artifact"),
    # ... 添加更多
]

ICONS = [
    ("fire", "fire element symbol, flame icon, orange red, simple geometric"),
    ("water", "water drop symbol, droplet icon, blue, simple geometric"),
    # ... 添加更多
]

UI_ASSETS = [
    ("board_background", "3x5 grid board background, dark stone texture, game UI"),
    ("energy_bar", "blue energy bar, mana crystal, game UI element"),
    ("hp_bar", "red health bar, game UI element"),
    # ... 添加更多
]

SCENES = [
    ("battle_normal", "dark dungeon cave background, torches, fantasy battle arena"),
    ("battle_boss", "elemental altar, six colored pillars, epic boss arena"),
    # ... 添加更多
]

# ============================================================
# 核心逻辑（一般不需要修改）
# ============================================================

def build_jobs(base_dir):
    """构建所有图片生成任务"""
    jobs = []

    # 卡牌插画
    for elem, cards in CARD_TASKS.items():
        for name, desc in cards:
            jobs.append({
                "path": base_dir / "cards" / elem / f"{name}.jpg",
                "prompt": f"{desc}, {CARD_STYLE}",
                "size": (512, 512),
            })

    # 特殊牌
    for name, desc in SPECIAL_CARDS:
        jobs.append({
            "path": base_dir / "cards" / "special" / f"{name}.jpg",
            "prompt": f"{desc}, {CARD_STYLE}",
            "size": (512, 512),
        })

    # 敌人立绘
    for name, desc in ENEMIES:
        jobs.append({
            "path": base_dir / "enemies" / f"{name}.jpg",
            "prompt": f"{desc}, fantasy creature illustration, dark background, detailed, no text, no UI",
            "size": (512, 512),
        })

    # 遗物图标
    for name, desc in RELICS:
        jobs.append({
            "path": base_dir / "relics" / f"{name}.jpg",
            "prompt": f"{desc}, magical artifact, centered, dark background, no text, no UI",
            "size": (256, 256),
        })

    # 元素/状态图标
    for name, desc in ICONS:
        jobs.append({
            "path": base_dir / "icons" / f"{name}.jpg",
            "prompt": f"{desc}, icon, simple, flat design, no background, game ability icon",
            "size": (256, 256),
        })

    # UI 素材
    for name, desc in UI_ASSETS:
        jobs.append({
            "path": base_dir / "ui" / f"{name}.jpg",
            "prompt": f"{desc}, game UI asset, clean, no text, dark fantasy style",
            "size": (512, 256) if "bar" in name or "button" in name else (512, 512),
        })

    # 场景背景
    for name, desc in SCENES:
        jobs.append({
            "path": base_dir / "scenes" / f"{name}.jpg",
            "prompt": f"{desc}, background illustration, atmospheric, no characters, no text",
            "size": (800, 600),
        })

    return jobs


def generate_one(job, max_retries=5):
    """生成单张图片，带重试和验证"""
    path = Path(job["path"])

    # 已存在且有效的文件跳过
    if path.exists() and path.stat().st_size > 1000:
        try:
            from PIL import Image
            img = Image.open(path)
            img.verify()
            return (str(path), "exists", 0)
        except Exception:
            path.unlink()  # 损坏文件删除

    path.parent.mkdir(parents=True, exist_ok=True)
    prompt = job["prompt"]
    w, h = job["size"]
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={w}&height={h}&nologo=true&seed={hash(prompt) % 1000000}"

    for attempt in range(max_retries):
        try:
            # 使用 curl --insecure --tlsv1.2 绕过沙箱 SSL 限制
            cmd = [
                "curl", "--insecure", "--tlsv1.2", "-s", "-L",
                "-o", str(path), url, "--max-time", "120"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=150)

            if result.returncode == 0 and path.exists() and path.stat().st_size > 1000:
                # PIL 验证图片完整性
                try:
                    from PIL import Image
                    img = Image.open(path)
                    img.verify()
                    return (str(path), "ok", attempt + 1)
                except Exception:
                    continue  # 损坏图片，重试
            else:
                continue
        except Exception:
            continue

    return (str(path), "failed", max_retries)


def main(output_dir="./output", limit=None, workers=2, category=None):
    """主函数：批量生成图片"""
    base_dir = Path(output_dir)
    jobs = build_jobs(base_dir)

    # 按类别过滤
    if category:
        jobs = [j for j in jobs if category in str(j["path"])]
    if limit:
        jobs = jobs[:limit]

    print(f"Total jobs: {len(jobs)}, workers: {workers}, output: {base_dir}")
    print("-" * 60)

    failed = []
    exists_count = 0
    ok_count = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_job = {executor.submit(generate_one, job): job for job in jobs}
        for future in as_completed(future_to_job):
            path, status, attempts = future.result()
            if status == "ok":
                ok_count += 1
                print(f"  OK [{ok_count}/{len(jobs)}]: {Path(path).name}")
            elif status == "exists":
                exists_count += 1
                print(f"  SKIP: {Path(path).name}")
            else:
                failed.append(path)
                print(f"  FAILED: {Path(path).name}")

    print("\n" + "=" * 60)
    print(f"Done: {ok_count} generated, {exists_count} existed, {len(failed)} failed")

    if failed:
        print("\nFailed files (rerun script to retry):")
        for f in failed:
            print(f"  - {f}")

    return failed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pollinations.ai batch image generator")
    parser.add_argument("--output-dir", type=str, default="./output",
                        help="Output directory (default: ./output)")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max number of images to generate")
    parser.add_argument("--workers", type=int, default=2,
                        help="Concurrent workers (recommended: 2, max: 5)")
    parser.add_argument("--category", type=str, default=None,
                        help="Filter by category: cards, enemies, relics, icons, ui, scenes")
    args = parser.parse_args()

    main(output_dir=args.output_dir, limit=args.limit,
         workers=args.workers, category=args.category)

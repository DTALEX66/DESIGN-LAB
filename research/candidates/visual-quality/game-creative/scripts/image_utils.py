#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图像处理工具集：裁剪、验证、清理损坏图片、生成总览页

用法:
  python image_utils.py crop --src big.png --dir output --regions regions.json
  python image_utils.py validate --dir ./assets
  python image_utils.py clean --dir ./assets
  python image_utils.py gallery --dir ./assets --out index.html
"""
import argparse
import json
import html
from pathlib import Path
from PIL import Image


def crop_image(src_path, output_dir, regions):
    """
    将一张大图按区域裁剪成多张小图
    regions: [(name, x1, y1, x2, y2), ...]
    """
    img = Image.open(src_path)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    for name, x1, y1, x2, y2 in regions:
        cropped = img.crop((x1, y1, x2, y2))
        out_path = out / f"{name}.png"
        cropped.save(out_path)
        print(f"  Saved: {out_path} ({x2-x1}x{y2-y1})")

    print(f"\nDone: {len(regions)} images cropped to {out}")


def validate_images(directory):
    """验证目录下所有图片是否有效"""
    base = Path(directory)
    extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
    files = [f for f in base.rglob('*') if f.suffix.lower() in extensions]

    valid = 0
    broken = []

    for f in files:
        try:
            img = Image.open(f)
            img.verify()
            valid += 1
        except Exception as e:
            broken.append((f, str(e)))

    print(f"Total: {len(files)}, Valid: {valid}, Broken: {len(broken)}")
    if broken:
        print("\nBroken files:")
        for f, e in broken:
            print(f"  {f}: {e}")

    return valid, broken


def clean_broken_images(directory):
    """删除损坏的图片文件"""
    base = Path(directory)
    extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')
    files = [f for f in base.rglob('*') if f.suffix.lower() in extensions]

    deleted = 0
    for f in files:
        try:
            img = Image.open(f)
            img.verify()
        except Exception:
            f.unlink()
            deleted += 1
            print(f"  Deleted: {f}")

    print(f"\nDone: {deleted} broken files deleted out of {len(files)} total")
    return deleted


def generate_gallery(directory, output_file="index.html"):
    """生成图片总览 HTML 页面"""
    base = Path(directory)
    extensions = ('.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp')
    files = sorted([f for f in base.rglob('*') if f.suffix.lower() in extensions])

    # 按目录分组
    categories = {}
    for f in files:
        rel = f.relative_to(base)
        category = rel.parts[0] if len(rel.parts) > 1 else "root"
        if category not in categories:
            categories[category] = []
        categories[category].append(rel)

    # 生成 HTML
    parts = [
        "<!DOCTYPE html>",
        "<html lang='zh-CN'><head><meta charset='UTF-8'>",
        "<style>",
        "  body { background: #0d1117; color: #c9d1d9; font-family: system-ui; padding: 20px; }",
        "  h1 { color: #58a6ff; }",
        "  h2 { color: #f0883e; border-bottom: 1px solid #30363d; padding-bottom: 8px; }",
        "  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }",
        "  .item { background: #161b22; border-radius: 8px; padding: 12px; text-align: center; }",
        "  .item img { max-width: 100%; border-radius: 4px; }",
        "  .item .name { color: #8b949e; font-size: 12px; margin-top: 8px; word-break: break-all; }",
        "</style>",
        "</head><body>",
        f"<h1>Image Gallery ({len(files)} files)</h1>",
    ]

    for category in sorted(categories.keys()):
        parts.append(f"<h2>{category} ({len(categories[category])})</h2>")
        parts.append("<div class='grid'>")
        for rel in categories[category]:
            src = html.escape(str(rel).replace('\\', '/'))
            name = html.escape(rel.stem)
            parts.append(f"<div class='item'><img src='{src}' loading='lazy'><div class='name'>{name}</div></div>")
        parts.append("</div>")

    parts.append("</body></html>")

    out_path = base / output_file
    out_path.write_text('\n'.join(parts), encoding='utf-8')
    print(f"Gallery generated: {out_path} ({len(files)} images in {len(categories)} categories)")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Image processing utilities")
    sub = parser.add_subparsers(dest="command")

    # crop
    p_crop = sub.add_parser("crop", help="Crop image into regions")
    p_crop.add_argument("--src", required=True, help="Source image path")
    p_crop.add_argument("--dir", required=True, help="Output directory")
    p_crop.add_argument("--regions", required=True,
                        help="JSON file with regions: [[name, x1, y1, x2, y2], ...]")

    # validate
    p_val = sub.add_parser("validate", help="Validate all images in directory")
    p_val.add_argument("--dir", required=True, help="Directory to validate")

    # clean
    p_clean = sub.add_parser("clean", help="Delete broken images")
    p_clean.add_argument("--dir", required=True, help="Directory to clean")

    # gallery
    p_gallery = sub.add_parser("gallery", help="Generate HTML gallery")
    p_gallery.add_argument("--dir", required=True, help="Image directory")
    p_gallery.add_argument("--out", default="index.html", help="Output filename")

    args = parser.parse_args()

    if args.command == "crop":
        with open(args.regions, 'r', encoding='utf-8') as f:
            regions = json.load(f)
        crop_image(args.src, args.dir, regions)
    elif args.command == "validate":
        validate_images(args.dir)
    elif args.command == "clean":
        clean_broken_images(args.dir)
    elif args.command == "gallery":
        generate_gallery(args.dir, args.out)
    else:
        parser.print_help()

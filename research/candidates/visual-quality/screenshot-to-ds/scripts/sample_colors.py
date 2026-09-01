#!/usr/bin/env python3
"""Sample pixel colors from a screenshot at given coordinates.

Usage:
  python sample_colors.py --image screenshot.png --points 120,200 300,400
  python sample_colors.py --image screenshot.png --grid 4 4   # 4x4 grid sample

Requires: Pillow (pip install Pillow)
"""

import argparse
import json
import sys

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def sample_point(img: Image.Image, x: int, y: int) -> dict:
    x = max(0, min(x, img.width - 1))
    y = max(0, min(y, img.height - 1))
    pixel = img.getpixel((x, y))
    if len(pixel) >= 3:
        r, g, b = pixel[:3]
    else:
        r = g = b = pixel[0]
    return {"x": x, "y": y, "hex": rgb_to_hex(r, g, b), "rgb": [r, g, b]}


def sample_grid(img: Image.Image, cols: int, rows: int) -> list:
    results = []
    for row in range(rows):
        for col in range(cols):
            x = int((col + 0.5) * img.width / cols)
            y = int((row + 0.5) * img.height / rows)
            results.append(sample_point(img, x, y))
    return results


def main():
    parser = argparse.ArgumentParser(description="Sample colors from screenshot")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument(
        "--points",
        nargs="*",
        help="Coordinates as x,y (e.g. 120,200 300,400)",
    )
    parser.add_argument(
        "--grid",
        nargs=2,
        type=int,
        metavar=("COLS", "ROWS"),
        help="Sample a COLS x ROWS grid across the image",
    )
    args = parser.parse_args()

    img = Image.open(args.image).convert("RGB")
    results = []

    if args.points:
        for pt in args.points:
            x, y = map(int, pt.split(","))
            results.append(sample_point(img, x, y))
    elif args.grid:
        results = sample_grid(img, args.grid[0], args.grid[1])
    else:
        # Default: center point
        results.append(sample_point(img, img.width // 2, img.height // 2))

    print(json.dumps({"image": args.image, "size": [img.width, img.height], "samples": results}, indent=2))


if __name__ == "__main__":
    main()

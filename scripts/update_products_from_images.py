#!/usr/bin/env python3
"""
Script: update_products_from_images.py
Scans assets/img, groups images by base name (e.g. macbook.jpg, macbook1.jpg, ...)
and appends missing product entries to data/product.json without modifying existing products.

Usage:
    python scripts/update_products_from_images.py [--dry-run] [--assets-dir assets/img] [--products data/product.json]

Behavior:
 - Excludes well-known filenames/prefixes
 - Groups by base name where trailing numbers indicate variants
 - Detects if ANY image of a group already exists in products.json (image or variants)
 - Appends missing product objects with a generated `id` and creation date
 - Safe to run multiple times (idempotent)
"""

from __future__ import annotations
import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import shutil
import sys

EXCLUDE_FILENAMES = {
    "card.jpg",
    "contact-bg.jpg",
    "LOGO.jpg",
    "web-logo.jpg",
    "home1.jpg",
    "home2.jpg",
    "home3.jpg",
    "delv.jpg",
    "delv2.jpg",
    "delv3.jpg",
    "delv.png",
}
# treat some prefixes as exclusions too (e.g. any filename starting with these)
EXCLUDE_PREFIXES = {"card", "contact-bg", "logo", "web-logo", "home", "delv"}

IMG_EXT_RE = re.compile(r"^(?P<name>.+?)(?P<num>\d+)?\.(?P<ext>[^.]+)$")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--assets-dir", default="assets/img", help="Path to assets images directory"
    )
    p.add_argument(
        "--products", default="data/product.json", help="Path to products JSON file"
    )
    p.add_argument(
        "--dry-run", action="store_true", help="Show changes without writing file"
    )
    return p.parse_args()


def is_excluded(filename: str) -> bool:
    name_l = filename
    if name_l in EXCLUDE_FILENAMES:
        return True
    lowered = name_l.lower()
    for pref in EXCLUDE_PREFIXES:
        if lowered.startswith(pref):
            return True
    return False


def extract_base_and_number(filename: str) -> tuple[str, int | None]:
    m = IMG_EXT_RE.match(filename)
    if not m:
        return filename.rsplit(".", 1)[0], None
    base = m.group("name")
    num = m.group("num")
    # strip trailing separators produced when base ends with non-alphanum
    base = base.rstrip("-_. ")
    return base, (int(num) if num is not None else None)


def slugify_base(base: str) -> str:
    s = base.replace("_", " ").strip()
    # collapse whitespace
    s = re.sub(r"\s+", " ", s)
    # slug
    slug = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return slug


def load_products(path: Path) -> list:
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError(f"Expected products JSON to be a list, got {type(data)}")
    return data


def all_existing_images(products: list) -> set:
    s = set()
    for p in products:
        img = p.get("image")
        if img:
            s.add(img.replace("\\", "/").lower())
        for v in p.get("variants", []):
            s.add(v.replace("\\", "/").lower())
    return s


def group_images(img_dir: Path) -> dict:
    groups = defaultdict(list)
    for p in sorted(img_dir.iterdir()):
        if not p.is_file():
            continue
        filename = p.name
        if is_excluded(filename):
            continue
        base, num = extract_base_and_number(filename)
        key = base.lower()
        groups[key].append((filename, num))
    return groups


def make_product_object(
    base: str, filenames: list[str], first_id: int, created_date: int
) -> dict:
    # filenames should be already sorted so that base (no number) comes first
    image_path = f"assets/img/{filenames[0]}"
    variants = [f"assets/img/{f}" for f in filenames]
    name = base.replace("-", " ").replace("_", " ").strip()
    name = re.sub(r"\s+", " ", name).title()
    product = {
        "id": first_id,
        "name": name,
        "price": "",
        "oldPrice": "",
        "image": image_path,
        "tag": "",
        "inStock": True,
        "premium": False,
        "trending": False,
        "created": created_date,
        "description": "",
        "highlights": [],
        "variants": variants
    }
    return product


def main():
    args = parse_args()
    assets_dir = Path(args.assets_dir)
    products_file = Path(args.products)

    if not assets_dir.exists() or not assets_dir.is_dir():
        print(f"Assets directory not found: {assets_dir}")
        sys.exit(1)
    if not products_file.exists():
        print(f"Products file not found: {products_file}")
        sys.exit(1)

    products = load_products(products_file)
    existing_images = all_existing_images(products)

    groups = group_images(assets_dir)

    print(f"Found {len(groups)} image groups in {assets_dir}")

    # prepare groups: sort variant filenames with base (no number) first
    def sort_filenames(group_items: list[tuple[str, int | None]]) -> list[str]:
        # key: (has_number, number or 0, filename)
        def k(t):
            fn, num = t
            has_num = 1 if num is not None else 0
            # prefer no-number (has_num=0) first
            return (has_num, num or 0, fn)

        return [fn for fn, _ in sorted(group_items, key=k)]

    # compute next id
    existing_ids = [p.get("id") for p in products if isinstance(p.get("id"), int)]
    max_id = max(existing_ids) if existing_ids else 0
    next_id = max_id + 1

    today_int = int(datetime.utcnow().strftime("%Y%m%d"))

    to_add = []
    for key, items in sorted(groups.items()):
        filenames = sort_filenames(items)
        # build full paths
        full_paths = [f"assets/img/{fn}".lower() for fn in filenames]
        # if ANY of the group's images appear in existing_images, skip entirely
        if any(fp in existing_images for fp in full_paths):
            continue
        # else prepare product
        product = make_product_object(key, filenames, next_id, today_int)
        next_id += 1
        to_add.append(product)

    if not to_add:
        print("No new products to add. Exiting.")
        return

    print(f"{len(to_add)} new product(s) will be added:")
    for p in to_add:
        print(f" - {p['name']} (id={p['id']}) with {len(p['variants'])} images")

    if args.dry_run:
        print("Dry-run mode: no changes written to products file.")
        return

    # backup existing products file
    bak = products_file.with_suffix(
        products_file.suffix + f".bak-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    )
    shutil.copy2(products_file, bak)
    print(f"Backup created at: {bak}")

    # append and write
    products.extend(to_add)
    with products_file.open("w", encoding="utf-8") as fh:
        json.dump(products, fh, ensure_ascii=False, indent=4)

    print(f"Appended {len(to_add)} new product(s) to {products_file}")


if __name__ == "__main__":
    main()

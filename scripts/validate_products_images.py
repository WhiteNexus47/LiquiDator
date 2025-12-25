#!/usr/bin/env python3
"""
Validate product image references:
- Ensure every `image` and each entry in `variants` exists in `assets/img`
- Detect duplicate references (same image path used in multiple products)
- Report duplicate filenames within a product and across products

Usage:
    python scripts/validate_products_images.py [--products data/product.json] [--assets assets/img]
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from collections import defaultdict


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--products", default="data/product.json")
    p.add_argument("--assets", default="assets/img")
    return p.parse_args()


def main():
    args = parse_args()
    products_file = Path(args.products)
    assets_dir = Path(args.assets)

    if not products_file.exists():
        print(f"Products file not found: {products_file}")
        sys.exit(2)
    if not assets_dir.exists() or not assets_dir.is_dir():
        print(f"Assets directory not found: {assets_dir}")
        sys.exit(2)

    with products_file.open("r", encoding="utf-8") as fh:
        products = json.load(fh)

    # gather available files (lowercased for case-insensitive matching)
    available = {p.name.lower(): p for p in assets_dir.iterdir() if p.is_file()}

    missing = []
    referenced = defaultdict(list)  # path(lower) -> list of (id, name)
    duplicates_within = []

    total_refs = 0
    for prod in products:
        pid = prod.get("id")
        pname = prod.get("name")
        imgs = []
        img_main = prod.get("image")
        if img_main:
            imgs.append(img_main)
        imgs.extend(prod.get("variants", []))

        seen_in_prod = set()
        for img in imgs:
            total_refs += 1
            key = img.replace("\\", "/").lower()
            # Normalize to filename only for existence checking
            filename = Path(key).name
            if filename not in available:
                missing.append((pid, pname, img))
            referenced[filename].append((pid, pname, img))
            if filename in seen_in_prod:
                duplicates_within.append((pid, pname, img))
            seen_in_prod.add(filename)

    duplicates_across = {fn: refs for fn, refs in referenced.items() if len(refs) > 1}

    # Summary
    print("Validation report")
    print("-----------------")
    print(f"Products checked: {len(products)}")
    print(f"Total image references: {total_refs}")
    print(f"Missing files: {len(missing)}")
    if missing:
        print("Missing file references (product id, name, referenced path):")
        for pid, pname, img in missing:
            print(f" - ({pid}) {pname} -> {img}")

    print(f"Duplicate references across products: {len(duplicates_across)}")
    if duplicates_across:
        print("Duplicates used by multiple products (filename -> list of products):")
        for fn, refs in duplicates_across.items():
            print(f" - {fn} used in:")
            for pid, pname, img in refs:
                print(f"    - ({pid}) {pname} -> {img}")

    print(f"Duplicate references within a single product: {len(duplicates_within)}")
    if duplicates_within:
        print("Duplicates within product (product id, name, referenced path):")
        for pid, pname, img in duplicates_within:
            print(f" - ({pid}) {pname} -> {img}")

    # Exit with non-zero if any problems
    if missing or duplicates_across or duplicates_within:
        print("\nValidation failed: issues found.")
        sys.exit(1)
    else:
        print(
            "\nValidation passed: all referenced images exist and no duplicates found."
        )
        sys.exit(0)


if __name__ == "__main__":
    main()

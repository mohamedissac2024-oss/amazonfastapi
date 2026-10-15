"""Puts the pictures in `images/` on their products.

Each file is copied into uploads/products/ (that folder is served at
/uploads/products/...) and its URL is saved on the matching product row.

Safe to run again: it just overwrites the copy and the same URL.
Run once:  python attach_images.py
"""
import shutil

from config import MAX_IMAGE_BYTES, UPLOAD_DIR
from db import db

BASE_DIR = UPLOAD_DIR.parent

# product name -> file inside images/
PICTURES = {
    "Running Shoes": "running.webp",
    "Leather Shoes": "learther.webp",
    "Wireless Mouse": "wireless.png",
    "Mechanical Keyboard": "mechanica.jpg",
    "Water Bottle": "water.avif",
}

SOURCE_DIR = BASE_DIR / "images"
TARGET_DIR = UPLOAD_DIR / "products"

with db.cursor() as cur:
    cur.execute("SELECT id, name, image_url FROM products")
    products = cur.fetchall()

TARGET_DIR.mkdir(parents=True, exist_ok=True)

attached = []
problems = []
used_names = set()

for product in products:
    filename = PICTURES.get(product["name"])
    if not filename:
        continue  # this product has no picture in images/
    used_names.add(product["name"])

    source = SOURCE_DIR / filename
    if not source.is_file():
        problems.append(f"missing images/{filename} for '{product['name']}'")
        continue
    if source.stat().st_size > MAX_IMAGE_BYTES:
        problems.append(f"images/{filename} is larger than {MAX_IMAGE_BYTES // (1024 * 1024)} MB")
        continue

    shutil.copyfile(source, TARGET_DIR / filename)
    image_url = f"/uploads/products/{filename}"

    with db.cursor() as cur:
        cur.execute(
            "UPDATE products SET image_url = %s WHERE id = %s",
            (image_url, product["id"]),
        )

    attached.append(f"  {product['name']:20} -> {image_url}")

for name, filename in PICTURES.items():
    if name not in used_names:
        problems.append(f"images/{filename} has no product named '{name}'")

if attached:
    print("Attached pictures:")
    print("\n".join(attached))
else:
    print("Nothing attached.")

if problems:
    print("\nProblems:")
    print("\n".join(f"  {problem}" for problem in problems))
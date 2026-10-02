"""Adds a few sample products so you can try the search.  Run:  python seed.py"""
from db import db

SAMPLES = [
    ("Running Shoes", "Lightweight shoes for daily running", 59.99, 25),
    ("Leather Shoes", "Black formal leather shoes", 89.50, 10),
    ("Wireless Mouse", "2.4GHz wireless mouse with USB receiver", 15.00, 50),
    ("Mechanical Keyboard", "Backlit keyboard with blue switches", 45.00, 30),
    ("Water Bottle", "1 litre stainless steel bottle", 12.75, 100),
]

with db.cursor() as cur:
    cur.execute("SELECT COUNT(*) AS n FROM products")
    if cur.fetchone()["n"] > 0:
        print("Products already exist - nothing added.")
    else:
        for name, description, price, stock in SAMPLES:
            cur.execute(
                "INSERT INTO products (name, description, price, stock) VALUES (%s, %s, %s, %s)",
                (name, description, price, stock),
            )
        print(f"Added {len(SAMPLES)} sample products.")

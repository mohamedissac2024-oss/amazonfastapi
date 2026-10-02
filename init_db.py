"""Creates the tables. Run once:  python init_db.py"""
from config import BASE_DIR
from db import db

with db.cursor() as cur:
    cur.execute((BASE_DIR / "schema.sql").read_text())

print("Tables created (or already existed).")

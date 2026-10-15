"""All the SQL lives here. The routes never write SQL themselves."""
from typing import Dict, List, Optional

from db import db


class OrderError(Exception):
    """Raised when an order can't be placed (unknown product, not enough stock...)."""


# ---------------------------------------------------------------- Users
class Users:
    def __init__(self, database):
        self.db = database

    def create(self, email: str, full_name: str, password_hash: str, is_admin: bool = False):
        with self.db.cursor() as cur:
            cur.execute(
                """INSERT INTO users (email, full_name, password_hash, is_admin)
                   VALUES (%s, %s, %s, %s)
                   RETURNING id, email, full_name, is_admin, created_at""",
                (email, full_name, password_hash, is_admin),
            )
            return cur.fetchone()

    def get_by_email(self, email: str):
        with self.db.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email,))
            return cur.fetchone()

    def get_by_id(self, user_id: int):
        with self.db.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()


# ------------------------------------------------------------- Products
class Products:
    UPDATABLE = {"name", "description", "price", "stock"}

    def __init__(self, database):
        self.db = database

    def list_all(self, search: Optional[str] = None, limit: int = 20, offset: int = 0):
        sql = "SELECT * FROM products"
        params: list = []
        if search:
            # escape LIKE wildcards so a user typing "%" or "_" searches for them literally
            safe = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{safe}%"
            sql += " WHERE name ILIKE %s OR description ILIKE %s"
            params += [pattern, pattern]
        sql += " ORDER BY id DESC LIMIT %s OFFSET %s"
        params += [limit, offset]
        with self.db.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    def get(self, product_id: int):
        with self.db.cursor() as cur:
            cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
            return cur.fetchone()

    def create(self, name: str, description: str, price, stock: int):
        with self.db.cursor() as cur:
            cur.execute(
                """INSERT INTO products (name, description, price, stock)
                   VALUES (%s, %s, %s, %s) RETURNING *""",
                (name, description, price, stock),
            )
            return cur.fetchone()

    def update(self, product_id: int, fields: Dict):
        fields = {k: v for k, v in fields.items() if k in self.UPDATABLE}
        if not fields:
            return self.get(product_id)
        # column names come from the UPDATABLE whitelist above, values are parameters
        sets = ", ".join(f"{col} = %s" for col in fields)
        with self.db.cursor() as cur:
            cur.execute(
                f"UPDATE products SET {sets} WHERE id = %s RETURNING *",
                [*fields.values(), product_id],
            )
            return cur.fetchone()

    def set_image(self, product_id: int, image_url: str):
        with self.db.cursor() as cur:
            cur.execute(
                "UPDATE products SET image_url = %s WHERE id = %s RETURNING *",
                (image_url, product_id),
            )
            return cur.fetchone()

    def delete(self, product_id: int) -> bool:
        with self.db.cursor() as cur:
            cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
            return cur.rowcount > 0


# --------------------------------------------------------------- Orders
class Orders:
    def __init__(self, database):
        self.db = database

    def create(self, user_id: int, items: List[Dict]):
        """Places an order. Everything happens in ONE transaction:
        if any product is missing or out of stock, nothing is saved."""
        # merge duplicate product ids: [{1,2},{1,3}] -> {1: 5}
        wanted: Dict[int, int] = {}
        for item in items:
            wanted[item["product_id"]] = wanted.get(item["product_id"], 0) + item["quantity"]

        with self.db.cursor() as cur:
            lines = []
            total = 0
            # sorted order + FOR UPDATE locks the rows so two buyers can't take the last item
            for product_id in sorted(wanted):
                qty = wanted[product_id]
                cur.execute(
                    "SELECT id, name, price, stock FROM products WHERE id = %s FOR UPDATE",
                    (product_id,),
                )
                product = cur.fetchone()
                if not product:
                    raise OrderError(f"Product {product_id} does not exist")
                if product["stock"] < qty:
                    raise OrderError(
                        f"Not enough stock for '{product['name']}' "
                        f"(requested {qty}, available {product['stock']})"
                    )
                lines.append((product, qty))
                total += product["price"] * qty

            cur.execute(
                """INSERT INTO orders (user_id, total) VALUES (%s, %s)
                   RETURNING id, status, total, created_at""",
                (user_id, total),
            )
            order = cur.fetchone()

            items_out = []
            for product, qty in lines:
                cur.execute(
                    """INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                       VALUES (%s, %s, %s, %s)""",
                    (order["id"], product["id"], qty, product["price"]),
                )
                cur.execute(
                    "UPDATE products SET stock = stock - %s WHERE id = %s",
                    (qty, product["id"]),
                )
                items_out.append(
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "quantity": qty,
                        "unit_price": product["price"],
                    }
                )
            order["items"] = items_out
            return order

    def list_for_user(self, user_id: int):
        with self.db.cursor() as cur:
            cur.execute(
                """SELECT id, status, total, created_at FROM orders
                   WHERE user_id = %s ORDER BY id DESC""",
                (user_id,),
            )
            orders = cur.fetchall()
            self._attach_items(cur, orders)
            return orders

    def get_for_user(self, order_id: int, user_id: int):
        with self.db.cursor() as cur:
            cur.execute(
                """SELECT id, status, total, created_at FROM orders
                   WHERE id = %s AND user_id = %s""",
                (order_id, user_id),
            )
            order = cur.fetchone()
            if not order:
                return None
            self._attach_items(cur, [order])
            return order

    @staticmethod
    def _attach_items(cur, orders):
        for order in orders:
            order["items"] = []
        if not orders:
            return
        by_id = {order["id"]: order for order in orders}
        cur.execute(
            """SELECT oi.order_id, oi.product_id, p.name AS product_name,
                      oi.quantity, oi.unit_price
               FROM order_items oi JOIN products p ON p.id = oi.product_id
               WHERE oi.order_id = ANY(%s) ORDER BY oi.id""",
            (list(by_id),),
        )
        for row in cur.fetchall():
            by_id[row.pop("order_id")]["items"].append(row)


users_repo = Users(db)
products_repo = Products(db)
orders_repo = Orders(db)

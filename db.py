from contextlib import contextmanager

from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from config import DATABASE_URL


class Database:
    """Keeps a small pool of PostgreSQL connections.

    Use it like this:

        with db.cursor() as cur:
            cur.execute("SELECT * FROM products")
            rows = cur.fetchall()

    When the `with` block ends the transaction is committed.
    If an error happens inside it, everything is rolled back.
    """

    def __init__(self, dsn: str, minconn: int = 1, maxconn: int = 10):
        self.pool = ThreadedConnectionPool(minconn, maxconn, dsn=dsn)

    @contextmanager
    def cursor(self):
        conn = self.pool.getconn()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)


db = Database(DATABASE_URL)

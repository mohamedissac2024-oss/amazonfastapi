from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import UPLOAD_DIR
from routers import auth_routes, orders, products

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Amazon API (MVP)", version="1.0.0")

# Lets a browser front-end (HTML/JS) call this API.
# In production replace ["*"] with your real front-end address.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded product images are available at /uploads/products/<file>
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_routes.router)
app.include_router(products.router)
app.include_router(orders.router)


@app.get("/", tags=["Root"])
def root():
    return {"message": "Amazon API is running", "docs": "/docs"}

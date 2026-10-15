# Amazon FastAPI + Web

A small Amazon-style storefront with two apps in one repository:

- **Backend** — a **FastAPI + PostgreSQL** REST API (the Python files at the repo root: `app.py`, `orm.py`, `routers/`, ...). Supports user registration and JWT login, a product catalog with search and admin-managed image uploads, and order placement with transactional stock checks.
- **Frontend** — **amazonweb**, a **React (Vite)** single-page app (`index.html`, `vite.config.js`, `src/`) that lets customers sign up, log in, browse and search products, and place orders against that API.

Interactive backend docs are served at **`/docs`** (Swagger UI) once the API is running; the frontend runs on **`http://localhost:5173`**.

---

## Contents

- [Backend (FastAPI)](#backend-fastapi)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Backend Setup](#backend-setup)
  - [API Reference](#api-reference)
- [Frontend (amazonweb / React)](#frontend-amazonweb--react)
  - [Frontend Tech Stack](#frontend-tech-stack)
  - [Getting Started](#getting-started)
  - [Environment Variables](#environment-variables)
  - [Connecting Frontend to Backend](#connecting-frontend-to-backend)
  - [Frontend Project Structure](#frontend-project-structure)
  - [Authentication Flow](#authentication-flow)
  - [Available Scripts](#available-scripts)
  - [Troubleshooting](#troubleshooting)

---

# Backend (FastAPI)

## Features

- **Authentication**
  - Register / login with bcrypt-hashed passwords and JWT bearer tokens.
  - `GET /auth/me` returns the currently logged-in user.
  - The user registering with the `ADMIN_EMAIL` address automatically gets admin rights.
- **Products**
  - Public search across name and description (case-insensitive, with `limit`/`offset` pagination).
  - Admin-only create / update (`PATCH`) / delete.
  - Admin-only image upload (JPEG, PNG, WEBP; max 5 MB), served from `/uploads/...`.
  - Deleting a product that appears in existing orders is blocked with a `409` (set `stock` to `0` instead).
- **Orders**
  - Placing an order runs in **one transaction** with `SELECT ... FOR UPDATE` row locks: if any product is missing or lacks stock, nothing is saved.
  - Users can list their own orders and fetch a single order (ownership enforced — other users get `404`).

## Tech Stack

| Layer      | Choice |
|------------|--------|
| Framework  | FastAPI + Uvicorn |
| Database   | PostgreSQL (via `psycopg2` thread-safe connection pool) |
| Auth       | PyJWT (HS256) + bcrypt |
| Validation | Pydantic schemas |
| Config     | `python-dotenv` (`.env` file) |

## Backend Setup

### Prerequisites

- Python 3.8+
- A running PostgreSQL server

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` (see [Environment Variables](#environment-variables) below). `config.py` raises a clear error at startup if `DATABASE_URL` or `SECRET_KEY` is missing.

### 3. Create the tables

```bash
python init_db.py
```

### 4. (Optional) Load sample data

```bash
python seed.py          # 5 sample products (skipped if products already exist)
python attach_images.py # copies images/ into uploads/ and sets each product's image_url
```

### 5. Run the API

```bash
uvicorn app:app --reload --port 8000
```

- API root: <http://127.0.0.1:8000/>
- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>

## API Reference

### Authentication — `/auth`

| Method | Path             | Auth   | Description |
|--------|------------------|--------|-------------|
| POST   | `/auth/register` | Public | Create an account. `201` on success, `409` if the email exists. |
| POST   | `/auth/login`    | Public | OAuth2 form login (`username` = email, `password`). Returns `{access_token, token_type}`. |
| GET    | `/auth/me`       | Bearer | Current user's profile. |

### Products — `/products`

| Method | Path                           | Auth  | Description |
|--------|--------------------------------|-------|-------------|
| GET    | `/products?search=&limit=&offset=` | Public | Search/paginate products. `limit` 1–100 (default 20). |
| GET    | `/products/{id}`               | Public | Single product (`404` if not found). |
| POST   | `/products`                    | Admin | Create a product. `201`. |
| PATCH  | `/products/{id}`               | Admin | Partial update of `name`, `description`, `price`, `stock`. |
| DELETE | `/products/{id}`               | Admin | Delete a product. `204`; `409` if referenced by orders. |
| POST   | `/products/{id}/image`         | Admin | Upload JPEG/PNG/WEBP (≤ 5 MB); replaces any previous image. |

### Orders — `/orders`

| Method | Path        | Auth   | Description |
|--------|-------------|--------|-------------|
| POST   | `/orders`   | Bearer | Place an order: `{"items": [{"product_id": 1, "quantity": 2}]}`. `400` on unknown product / insufficient stock. |
| GET    | `/orders`   | Bearer | List the current user's orders. |
| GET    | `/orders/{id}` | Bearer | Fetch one of the current user's orders (`404` otherwise). |

### Example: place an order with curl

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -d "username=admin@example.com" -d "password=secret123" \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://127.0.0.1:8000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"product_id": 1, "quantity": 2}]}'
```

> **Admin tip:** set `ADMIN_EMAIL` in `.env`, then register with that email — the account gets `is_admin = true` and can call the admin product endpoints.

---

# Frontend (amazonweb / React)

React frontend for this API's online shop. It lets customers sign up, log in, browse and search products, and place orders, using the FastAPI backend for all data.

## Frontend Tech Stack

- [React](https://react.dev/) 19 with [Vite](https://vitejs.dev/)
- [React Router](https://reactrouter.com/) for routing
- [Axios](https://axios-http.com/) for API requests
- [Tailwind CSS](https://tailwindcss.com/) 4 for styling
- [react-hot-toast](https://react-hot-toast.com/) for notifications
- [ESLint](https://eslint.org/) for linting

## Prerequisites

- Node.js 18 or newer (tested on Node 22)
- npm
- The backend running locally (default: `http://localhost:8000`)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create the environment file
cp .env.example .env     # or edit the existing .env

# 3. Start the dev server (in a second terminal, keep the backend running too)
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment Variables

The repo uses a **single `.env` at the root, shared by both apps** (`python-dotenv` reads everything, Vite only exposes variables prefixed with `VITE_`):

| Variable                  | Used by  | Description |
| ------------------------- | -------- | ----------- |
| `DATABASE_URL`            | backend  | PostgreSQL connection string (required) |
| `SECRET_KEY`              | backend  | JWT signing secret (required) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | Token lifetime, default `60` |
| `ADMIN_EMAIL`             | backend  | Registering this email creates the admin |
| `VITE_API_URL`            | frontend | Base URL of the backend, default `http://localhost:8000` |

Vite only reads `.env` at startup, so restart `npm run dev` after changing it.

## Connecting Frontend to Backend

1. Start the backend:

   ```bash
   uvicorn app:app --reload --port 8000
   ```

2. Make sure the backend allows the frontend origin (CORS). `app.py` already ships with an open policy for development:

   ```python
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],  # currently ["*"] in app.py
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. Start the frontend with `npm run dev` and open `http://localhost:5173`.

All requests go through the `useAxios` hook (`src/APP/Hooks/useAxios.jsx`). It adds `VITE_API_URL` as the base URL and, when a token is stored, the `Authorization: Bearer <token>` header. Failed requests show a toast and resolve with `{ _error: true }`, so screens never crash on API errors.

Product image paths returned by the API (e.g. `/uploads/products/x.jpg`) are turned into full URLs with the exported `assetUrl()` helper from the same hook.

## Frontend Project Structure

```
.
├── public/                    # static files (robots.txt)
├── src/
│   ├── APP/
│   │   ├── Asset/             # images (e.g. bg.svg used by the auth screens)
│   │   ├── Hooks/             # useAxios (API client) and useApp (auth state)
│   │   ├── Provider/          # AppContext + AppProvider (token / user / login)
│   │   ├── Routes/            # route definitions + Layout (navbar shell)
│   │   └── Screen/
│   │       ├── Login/         # login page
│   │       ├── SignUp/        # registration page
│   │       ├── Product/       # product listing + search + ordering
│   │       └── Order/         # the user's orders
│   ├── index.css              # Tailwind entry
│   └── main.jsx               # React root (providers, router, toasts)
├── app.py, orm.py, routers/   # backend (see Backend section above)
├── .env                       # shared config (git-ignored)
├── .env.example
├── eslint.config.js
├── index.html
├── package.json
└── vite.config.js
```

## Authentication Flow

1. The user submits email and password on the Login screen.
2. The app sends `POST /auth/login` as an OAuth2 form where **`username` is the email** (`src/APP/Provider/AppProvider.jsx`).
3. On success, the returned token is saved in `localStorage` under `token`, state updates, and the user is redirected to `/products`.
4. Every later request gets `Authorization: Bearer <token>` from the axios request interceptor; `GET /auth/me` loads the profile.
5. `/orders` is behind `RequireAuth` — without a token you are redirected to `/login`.
6. Log out clears the token from `localStorage` and state.

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite development server    |
| `npm run build`   | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

## Troubleshooting

- **CORS error in the browser console:** the backend is not allowing `http://localhost:5173`. In this repo `app.py` uses `allow_origins=["*"]`, which already works — if you tightened it, add the frontend origin back.
- **`DATABASE_URL is not set` / `SECRET_KEY is not set`:** copy `.env.example` to `.env` and fill it in before starting the backend.
- **"Cannot reach the API. Is the backend running on port 8000?":** start the backend with `uvicorn app:app --reload --port 8000`, or point `VITE_API_URL` elsewhere (and restart `npm run dev`).
- **422 Unprocessable Entity:** the request body does not match the backend schema. Compare the field names (`email`, `full_name`, `password`) with the Pydantic models in `schemas.py`.
- **401 Unauthorized:** the token is missing or expired (default 60 minutes). Log in again.
- **`Relation "users" does not exist`:** run `python init_db.py` (and optionally `seed.py`, `attach_images.py`).

---

## Development Notes & Assumptions

- **CORS** is open (`allow_origins=["*"]`) for development — restrict it to `http://localhost:5173` in production (see the comment in `app.py`).
- **Order status** starts as `pending`; there is no payment or status-transition flow in this MVP, and the UI has no admin panel (product create/update/delete/image upload are API-only via `/docs`).
- **Image safety** on the backend: uploads are size-checked, type-checked, stored under generated UUID names, and old files are removed on replace/delete.
- **No migrations tool** — schema changes are applied idempotently by re-running `init_db.py` (`CREATE TABLE IF NOT EXISTS`).
- Git-ignored: `.env`, `venv/`, `__pycache__/`, `uploads/`, `node_modules/`, `dist/`.

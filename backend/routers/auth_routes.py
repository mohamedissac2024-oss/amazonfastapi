from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from psycopg2.errors import UniqueViolation

from auth import create_access_token, get_current_user, hash_password, verify_password
from config import ADMIN_EMAIL
from orm import users_repo
from schemas import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate):
    email = payload.email.lower()
    if users_repo.get_by_email(email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    is_admin = bool(ADMIN_EMAIL) and email == ADMIN_EMAIL
    try:
        return users_repo.create(
            email, payload.full_name.strip(), hash_password(payload.password), is_admin
        )
    except UniqueViolation:  # two people registering the same email at the same moment
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2 forms call the email field "username"
    user = users_repo.get_by_email(form.username.strip().lower())
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(user["id"]), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    return user

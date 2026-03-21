from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


@router.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    expected_username = os.getenv("LOGIN_USERNAME")
    expected_password = os.getenv("LOGIN_PASSWORD")
    token = os.getenv("AUTH_TOKEN_SECRET")

    if body.username != expected_username or body.password != expected_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return LoginResponse(token=token)

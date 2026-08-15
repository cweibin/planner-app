from datetime import timedelta
from typing import Annotated
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..core.auth import get_current_user
from ..core.security import create_access_token, get_password_hash, verify_password
from ..dependencies import get_db
from ..models.user import User
import httpx
from ..schemas.auth import Token
from ..schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, db: Annotated[Session, Depends(get_db)]):
    existing = (
        db.query(User)
        .filter(
            (User.email == user_in.email)
            | (User.phone_number == user_in.phone_number)
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with given email or phone already exists",
        )

    user = User(
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class WeChatLoginRequest(BaseModel):
    code: str


@router.post("/wechat-login", response_model=Token)
def wechat_login(payload: WeChatLoginRequest, db: Annotated[Session, Depends(get_db)]):
    if not settings.WECHAT_APPID or not settings.WECHAT_APPSECRET:
        raise HTTPException(status_code=500, detail="微信登录未配置")
    try:
        resp = httpx.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": settings.WECHAT_APPID,
                "secret": settings.WECHAT_APPSECRET,
                "js_code": payload.code,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"微信服务调用失败: {exc}") from exc
    openid = data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail=data.get("errmsg", "微信登录失败"))
    unionid = data.get("unionid")
    user = db.query(User).filter(User.wechat_openid == openid).first()
    if user is None:
        user = User(
            email=f"{openid}@wechat.local",
            wechat_openid=openid,
            unionid=unionid,
            hashed_password=get_password_hash(secrets.token_hex(16)),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token)


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = (
        db.query(User)
        .filter(
            (User.email == form_data.username)
            | (User.phone_number == form_data.username)
        )
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token)


@router.get("/profile", response_model=UserRead)
def read_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


@router.put("/profile", response_model=UserRead)
def update_profile(
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if payload.email is not None and payload.email != current_user.email:
        existing = (
            db.query(User)
            .filter(User.email == payload.email, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该邮箱已被注册",
            )
        current_user.email = payload.email

    if payload.phone_number is not None:
        existing = (
            db.query(User)
            .filter(User.phone_number == payload.phone_number, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered",
            )
        current_user.phone_number = payload.phone_number

    if payload.new_password:
        if len(payload.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="密码至少 6 位",
            )
        current_user.hashed_password = get_password_hash(payload.new_password)

    db.commit()
    db.refresh(current_user)
    return current_user


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


@router.put("/change-password")
def change_password(
    payload: PasswordChange,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


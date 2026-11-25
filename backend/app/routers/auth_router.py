from typing import Any, Dict
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from app.aws.cognito import cognito_idp
from app.dependencies.auth import bearer_scheme, get_current_user
from app.schemas.models import (
    ConfirmSignupRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
)

router = APIRouter(tags=["Authentication"])


@router.post("/auth/login")
async def login(payload: LoginRequest) -> Dict[str, Any]:
    data = cognito_idp.authenticate(payload.email, payload.password)
    return {"success": True, "data": data}


@router.post("/auth/register", status_code=201)
async def register(payload: RegisterRequest) -> Dict[str, Any]:
    data = cognito_idp.register_customer(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        phone=payload.phone,
    )
    return {"success": True, "data": data}


@router.post("/auth/confirm-signup")
async def confirm_signup(payload: ConfirmSignupRequest) -> Dict[str, Any]:
    data = cognito_idp.confirm_registration(payload.email, payload.confirmation_code)
    return {"success": True, "data": data}


@router.post("/auth/refresh")
async def refresh_token(payload: RefreshTokenRequest) -> Dict[str, Any]:
    data = cognito_idp.refresh_session(payload.refresh_token)
    return {"success": True, "data": data}


@router.post("/auth/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Dict[str, Any]:
    token = credentials.credentials if credentials else ""
    cognito_idp.logout(token)
    return {"success": True, "data": {"message": "Signed out successfully."}}


@router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest) -> Dict[str, Any]:
    code = cognito_idp.initiate_password_reset(payload.email)
    resp_data: Dict[str, Any] = {
        "message": "If an account exists for this email, a verification code has been issued.",
    }
    if code:
        resp_data["reset_code_hint"] = code
    return {"success": True, "data": resp_data}


@router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest) -> Dict[str, Any]:
    cognito_idp.confirm_password_reset(
        payload.email, payload.verification_code, payload.new_password
    )
    return {
        "success": True,
        "data": {"message": "Password has been reset successfully. You may now sign in."},
    }


@router.get("/auth/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return {"success": True, "data": user}

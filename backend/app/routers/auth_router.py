from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.aws.cognito import cognito_idp
from app.dependencies.auth import get_current_user, require_customer
from app.repositories.customer_repo import AddressRepository
from app.schemas.models import (
    AddressCreateRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
)

router = APIRouter(tags=["Authentication & Profile"])
addr_repo = AddressRepository()


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


@router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest) -> Dict[str, Any]:
    code = cognito_idp.initiate_password_reset(payload.email)
    return {
        "success": True,
        "data": {
            "message": "Verification code issued. Please check your email or use the dev code hint.",
            "reset_code_hint": code,
        },
    }


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


@router.get("/profile/addresses")
async def list_my_addresses(user: Dict[str, Any] = Depends(require_customer)) -> Dict[str, Any]:
    addresses = addr_repo.list_addresses(user["sub"])
    return {"success": True, "data": addresses}


@router.post("/profile/addresses", status_code=201)
async def create_my_address(
    payload: AddressCreateRequest,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    created = addr_repo.create_address(user["sub"], payload.model_dump())
    return {"success": True, "data": created}


@router.delete("/profile/addresses/{address_id}")
async def delete_my_address(
    address_id: str,
    user: Dict[str, Any] = Depends(require_customer),
) -> Dict[str, Any]:
    deleted = addr_repo.delete_address(user["sub"], address_id)
    return {"success": True, "data": {"deleted": deleted}}


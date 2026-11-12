from typing import Any, Dict
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.aws.cognito import cognito_idp
from app.middleware.security import AppError

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise AppError(
            "UNAUTHORIZED",
            "Authentication required. Please provide a valid Bearer JWT token.",
            status.HTTP_401_UNAUTHORIZED,
        )
    return cognito_idp.verify_jwt(credentials.credentials)


async def require_customer(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    roles = user.get("roles", [])
    if "Customer" not in roles and "Admin" not in roles:
        raise AppError(
            "FORBIDDEN",
            "Customer access role is required for this operation.",
            status.HTTP_403_FORBIDDEN,
        )
    return user


async def require_admin(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    roles = user.get("roles", [])
    if "Admin" not in roles:
        raise AppError(
            "ADMIN_REQUIRED",
            "Administrator privileges are required to perform this action.",
            status.HTTP_403_FORBIDDEN,
        )
    return user


import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
import jwt
from fastapi import status
from app.config import settings
from app.middleware.security import AppError


class CognitoIdentityProvider:
    """
    Amazon Cognito User Pool identity & JWT provider.
    Uses Cognito-compatible JWT claims (`sub`, `email`, `name`, `cognito:groups`, `token_use`)
    so the backend verification pipeline and RBAC dependencies work identically in local
    development/testing and AWS Lambda production.
    """

    def __init__(self) -> None:
        self._users_by_email: Dict[str, Dict[str, Any]] = {}
        self._users_by_sub: Dict[str, Dict[str, Any]] = {}
        self._reset_codes: Dict[str, str] = {}
        self._seed_default_users()

    def _hash_password(self, password: str) -> str:
        return hmac.new(
            settings.JWT_SECRET_KEY.encode("utf-8"),
            password.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _seed_default_users(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        default_accounts = [
            {
                "sub": "usr-admin-001",
                "email": "admin@lenscart.store",
                "name": "Marcus Sterling (Chief Curator)",
                "phone": "+1 212 555 0101",
                "password_hash": self._hash_password("Admin@Lens2026"),
                "roles": ["Admin", "Customer"],
                "status": "ACTIVE",
                "created_at": now,
            },
            {
                "sub": "usr-cust-001",
                "email": "elena.vance@lenscart.store",
                "name": "Elena Vance",
                "phone": "+1 415 555 0192",
                "password_hash": self._hash_password("Customer@Lens2026"),
                "roles": ["Customer"],
                "status": "ACTIVE",
                "created_at": now,
            },
            {
                "sub": "usr-cust-002",
                "email": "julian.chen@lenscart.store",
                "name": "Julian Chen",
                "phone": "+1 310 555 0148",
                "password_hash": self._hash_password("Customer@Lens2026"),
                "roles": ["Customer"],
                "status": "ACTIVE",
                "created_at": now,
            },
        ]
        for acc in default_accounts:
            self._users_by_email[acc["email"].lower()] = acc
            self._users_by_sub[acc["sub"]] = acc

    def issue_tokens(self, user: Dict[str, Any]) -> Dict[str, str]:
        now = datetime.now(timezone.utc)
        exp = now + timedelta(hours=settings.JWT_EXPIRE_HOURS)
        claims = {
            "sub": user["sub"],
            "email": user["email"],
            "name": user["name"],
            "cognito:groups": user["roles"],
            "iss": f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.COGNITO_USER_POOL_ID}",
            "client_id": settings.COGNITO_CLIENT_ID,
            "token_use": "access",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
        }
        token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return {"access_token": token, "id_token": token}

    def verify_jwt(self, token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False},
            )
            sub = payload.get("sub")
            if not sub:
                raise AppError("INVALID_TOKEN", "Token missing subject claim", status.HTTP_401_UNAUTHORIZED)
            stored_user = self._users_by_sub.get(sub)
            if stored_user and stored_user.get("status") == "SUSPENDED":
                raise AppError(
                    "ACCOUNT_SUSPENDED",
                    "This customer account has been suspended by an administrator.",
                    status.HTTP_403_FORBIDDEN,
                )
            return {
                "sub": sub,
                "email": payload.get("email", stored_user["email"] if stored_user else ""),
                "name": payload.get("name", stored_user["name"] if stored_user else ""),
                "phone": stored_user.get("phone") if stored_user else None,
                "roles": payload.get("cognito:groups", ["Customer"]),
                "status": stored_user.get("status", "ACTIVE") if stored_user else "ACTIVE",
                "created_at": stored_user.get("created_at", "") if stored_user else "",
            }
        except jwt.ExpiredSignatureError:
            raise AppError("TOKEN_EXPIRED", "Your session has expired. Please sign in again.", status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            raise AppError("INVALID_TOKEN", "Invalid authentication token.", status.HTTP_401_UNAUTHORIZED)

    def register_customer(
        self, name: str, email: str, password: str, phone: str | None = None
    ) -> Dict[str, Any]:
        normalized = email.strip().lower()
        if normalized in self._users_by_email:
            raise AppError(
                "EMAIL_EXISTS",
                "An account with this email address already exists.",
                status.HTTP_409_CONFLICT,
            )
        sub = f"usr-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        record = {
            "sub": sub,
            "email": normalized,
            "name": name.strip(),
            "phone": phone,
            "password_hash": self._hash_password(password),
            "roles": ["Customer"],
            "status": "ACTIVE",
            "created_at": now,
        }
        self._users_by_email[normalized] = record
        self._users_by_sub[sub] = record
        tokens = self.issue_tokens(record)
        return {**tokens, "user": self._public_user(record)}

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        normalized = email.strip().lower()
        user = self._users_by_email.get(normalized)
        if not user or user["password_hash"] != self._hash_password(password):
            raise AppError(
                "INVALID_CREDENTIALS",
                "Invalid email address or password.",
                status.HTTP_401_UNAUTHORIZED,
            )
        if user.get("status") == "SUSPENDED":
            raise AppError(
                "ACCOUNT_SUSPENDED",
                "Your account is currently suspended. Please contact support.",
                status.HTTP_403_FORBIDDEN,
            )
        tokens = self.issue_tokens(user)
        return {**tokens, "user": self._public_user(user)}

    def initiate_password_reset(self, email: str) -> str:
        normalized = email.strip().lower()
        user = self._users_by_email.get(normalized)
        if not user:
            # Return deterministic code without leaking account existence
            return "482910"
        code = "482910"
        self._reset_codes[normalized] = code
        return code

    def confirm_password_reset(self, email: str, code: str, new_password: str) -> None:
        normalized = email.strip().lower()
        expected = self._reset_codes.get(normalized)
        if not expected or expected != code.strip():
            raise AppError(
                "INVALID_RESET_CODE",
                "Invalid or expired password reset verification code.",
                status.HTTP_400_BAD_REQUEST,
            )
        user = self._users_by_email[normalized]
        user["password_hash"] = self._hash_password(new_password)
        del self._reset_codes[normalized]

    def list_all_customers(self) -> List[Dict[str, Any]]:
        return [self._public_user(u) for u in self._users_by_sub.values()]

    def update_user_status(self, sub: str, new_status: str) -> Dict[str, Any]:
        user = self._users_by_sub.get(sub)
        if not user:
            raise AppError("USER_NOT_FOUND", f"User '{sub}' not found.", status.HTTP_404_NOT_FOUND)
        if "Admin" in user["roles"] and new_status == "SUSPENDED":
            raise AppError(
                "CANNOT_SUSPEND_ADMIN",
                "Administrator accounts cannot be suspended.",
                status.HTTP_400_BAD_REQUEST,
            )
        user["status"] = new_status
        return self._public_user(user)

    @staticmethod
    def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "sub": user["sub"],
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone"),
            "roles": user["roles"],
            "status": user.get("status", "ACTIVE"),
            "created_at": user["created_at"],
        }


cognito_idp = CognitoIdentityProvider()


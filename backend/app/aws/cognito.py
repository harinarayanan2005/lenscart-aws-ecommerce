import hashlib
import hmac
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set
import boto3
from botocore.exceptions import ClientError
import jwt
from jwt import PyJWKClient
from fastapi import status
from app.config import settings
from app.middleware.security import AppError
from app.utils.logger import logger


def normalize_cognito_roles(raw_groups: List[str]) -> List[str]:
    """
    Normalizes Cognito User Pool group names (`customers`, `administrators`, `Customer`, `Admin`)
    so both canonical AWS Cognito group names and UI role checks work consistently.
    """
    lowered = {g.strip().lower() for g in (raw_groups or []) if g}
    roles: List[str] = ["Customer", "customers"]
    if "admin" in lowered or "administrators" in lowered or "administrator" in lowered:
        roles = ["Admin", "Customer", "administrators", "customers"]
    return roles


class CognitoIdentityProvider:
    """
    Production Amazon Cognito User Pool Identity & JWT Verification Provider.

    - In Production (`USE_LOCAL_AWS=False`):
      Uses `boto3.client('cognito-idp')` for `sign_up`, `confirm_sign_up`,
      `initiate_auth` (`USER_PASSWORD_AUTH` & `REFRESH_TOKEN_AUTH`), `global_sign_out`,
      `forgot_password`, `confirm_forgot_password`, `admin_add_user_to_group`, and
      verifies RS256 JWTs against the Cognito User Pool JWKS endpoint
      (`https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json`),
      enforcing signature, expiration (`exp`), issuer (`iss`), `token_use`, and `client_id`/`aud`.

    - In Local Development / Offline Testing (`USE_LOCAL_AWS=True`):
      Provides a deterministic local Cognito User Pool emulator with identical claim
      validation (`iss`, `client_id`, `token_use`, `exp`, signature) and group semantics.
    """

    def __init__(self) -> None:
        self._users_by_email: Dict[str, Dict[str, Any]] = {}
        self._users_by_sub: Dict[str, Dict[str, Any]] = {}
        self._reset_codes: Dict[str, str] = {}
        self._signup_codes: Dict[str, str] = {}
        self._refresh_tokens: Dict[str, str] = {}
        self._revoked_tokens: Set[str] = set()
        self._jwks_client: Optional[PyJWKClient] = None
        if settings.USE_LOCAL_AWS:
            self._seed_default_users()

    def _get_cognito_client(self):
        if not settings.COGNITO_USER_POOL_ID or not settings.COGNITO_CLIENT_ID:
            raise AppError(
                "COGNITO_NOT_CONFIGURED",
                "Amazon Cognito User Pool ID and Client ID must be configured when USE_LOCAL_AWS=false.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return boto3.client("cognito-idp", region_name=settings.AWS_REGION)

    def _get_jwks_client(self) -> PyJWKClient:
        if self._jwks_client is None:
            self._jwks_client = PyJWKClient(settings.cognito_jwks_url)
        return self._jwks_client

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
                "phone": "+91 98200 10101",
                "password_hash": self._hash_password("Admin@Lens2026"),
                "alt_password_hash": self._hash_password("Admin@123"),
                "roles": ["Admin", "Customer", "administrators", "customers"],
                "status": "ACTIVE",
                "email_verified": True,
                "created_at": now,
            },
            {
                "sub": "usr-cust-001",
                "email": "elena.vance@lenscart.store",
                "name": "Elena Vance",
                "phone": "+91 98200 10192",
                "password_hash": self._hash_password("Customer@Lens2026"),
                "alt_password_hash": self._hash_password("Customer@123"),
                "roles": ["Customer", "customers"],
                "status": "ACTIVE",
                "email_verified": True,
                "created_at": now,
            },
            {
                "sub": "usr-cust-002",
                "email": "julian.chen@lenscart.store",
                "name": "Julian Chen",
                "phone": "+91 98200 10148",
                "password_hash": self._hash_password("Customer@Lens2026"),
                "alt_password_hash": self._hash_password("Customer@123"),
                "roles": ["Customer", "customers"],
                "status": "ACTIVE",
                "email_verified": True,
                "created_at": now,
            },
            {
                "sub": "usr-cust-003",
                "email": "alex.rivera@example.com",
                "name": "Alex Rivera",
                "phone": "+91 98200 10200",
                "password_hash": self._hash_password("Customer@123"),
                "alt_password_hash": self._hash_password("Customer@Lens2026"),
                "roles": ["Customer", "customers"],
                "status": "ACTIVE",
                "email_verified": True,
                "created_at": now,
            },
            {
                "sub": "usr-6ebc1a4136fc",
                "email": "aarav.mehta@lenscart.com",
                "name": "Aarav Mehta",
                "phone": "+91 98201 44580",
                "password_hash": self._hash_password("Photographer@123"),
                "alt_password_hash": self._hash_password("Customer@123"),
                "roles": ["Customer", "customers"],
                "status": "ACTIVE",
                "email_verified": True,
                "created_at": now,
            },
        ]
        for acc in default_accounts:
            self._users_by_email[acc["email"].lower()] = acc
            self._users_by_sub[acc["sub"]] = acc

    def issue_tokens(self, user: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        exp = now + timedelta(hours=settings.JWT_EXPIRE_HOURS)
        client_id = settings.COGNITO_CLIENT_ID or "lenscart-web-client"
        normalized_roles = normalize_cognito_roles(user.get("roles", ["Customer"]))

        access_claims = {
            "sub": user["sub"],
            "email": user["email"],
            "name": user["name"],
            "cognito:groups": normalized_roles,
            "iss": settings.cognito_issuer,
            "client_id": client_id,
            "token_use": "access",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": uuid.uuid4().hex,
        }
        id_claims = {
            "sub": user["sub"],
            "email": user["email"],
            "email_verified": user.get("email_verified", True),
            "name": user["name"],
            "cognito:groups": normalized_roles,
            "iss": settings.cognito_issuer,
            "aud": client_id,
            "token_use": "id",
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
        }
        access_token = jwt.encode(
            access_claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        id_token = jwt.encode(
            id_claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )
        refresh_token = f"rt-{uuid.uuid4().hex}{uuid.uuid4().hex}"
        self._refresh_tokens[refresh_token] = user["sub"]
        return {
            "access_token": access_token,
            "id_token": id_token,
            "refresh_token": refresh_token,
            "expires_in": settings.JWT_EXPIRE_HOURS * 3600,
        }

    def verify_jwt(self, token: str) -> Dict[str, Any]:
        """
        Verifies a Cognito JWT (RS256 against Cognito JWKS in production;
        HS256 with strict claim verification in local dev mode).
        """
        if not token or token in self._revoked_tokens:
            raise AppError(
                "TOKEN_REVOKED",
                "Authentication token has been signed out or revoked.",
                status.HTTP_401_UNAUTHORIZED,
            )

        if not settings.USE_LOCAL_AWS:
            return self._verify_production_cognito_jwt(token)

        return self._verify_local_jwt(token)

    def _verify_production_cognito_jwt(self, token: str) -> Dict[str, Any]:
        if not settings.COGNITO_USER_POOL_ID or not settings.COGNITO_CLIENT_ID:
            raise AppError(
                "COGNITO_NOT_CONFIGURED",
                "Cognito User Pool ID and Client ID are required in production mode.",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        try:
            jwks_client = self._get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=settings.cognito_issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iss": True,
                    "verify_aud": False,
                },
            )
            token_use = payload.get("token_use")
            if token_use not in ("access", "id"):
                raise AppError(
                    "INVALID_TOKEN_USE",
                    "Invalid Cognito token_use claim.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            if token_use == "access":
                if payload.get("client_id") != settings.COGNITO_CLIENT_ID:
                    raise AppError(
                        "INVALID_CLIENT_ID",
                        "Token client_id does not match configured Cognito App Client.",
                        status.HTTP_401_UNAUTHORIZED,
                    )
            else:
                if payload.get("aud") != settings.COGNITO_CLIENT_ID:
                    raise AppError(
                        "INVALID_AUDIENCE",
                        "Token audience does not match configured Cognito App Client.",
                        status.HTTP_401_UNAUTHORIZED,
                    )

            sub = payload.get("sub")
            if not sub:
                raise AppError(
                    "INVALID_TOKEN",
                    "Cognito JWT missing subject (sub) claim.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            raw_groups = payload.get("cognito:groups", ["customers"])
            if isinstance(raw_groups, str):
                raw_groups = [raw_groups]
            roles = normalize_cognito_roles(raw_groups)

            return {
                "sub": sub,
                "email": payload.get("email", payload.get("username", "")),
                "name": payload.get("name", payload.get("email", "LensCart Customer")),
                "phone": payload.get("phone_number"),
                "roles": roles,
                "status": "ACTIVE",
                "created_at": "",
            }
        except AppError:
            raise
        except jwt.ExpiredSignatureError:
            raise AppError(
                "TOKEN_EXPIRED",
                "Your Cognito session has expired. Please sign in again.",
                status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as exc:
            logger.warning(f"Cognito JWT verification failed: {exc}")
            raise AppError(
                "INVALID_TOKEN",
                "Invalid or untrusted Cognito authentication token.",
                status.HTTP_401_UNAUTHORIZED,
            )

    def _verify_local_jwt(self, token: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                issuer=settings.cognito_issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iss": True,
                    "verify_aud": False,
                },
            )
            token_use = payload.get("token_use")
            if token_use not in ("access", "id"):
                raise AppError(
                    "INVALID_TOKEN_USE",
                    "Invalid token_use claim.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            expected_client = settings.COGNITO_CLIENT_ID or "lenscart-web-client"
            actual_client = payload.get("client_id") or payload.get("aud")
            if actual_client != expected_client:
                raise AppError(
                    "INVALID_CLIENT_ID",
                    "Token client_id/aud mismatch.",
                    status.HTTP_401_UNAUTHORIZED,
                )

            sub = payload.get("sub")
            if not sub:
                raise AppError(
                    "INVALID_TOKEN", "Token missing subject claim", status.HTTP_401_UNAUTHORIZED
                )
            stored_user = self._users_by_sub.get(sub)
            if stored_user and stored_user.get("status") == "SUSPENDED":
                raise AppError(
                    "ACCOUNT_SUSPENDED",
                    "This customer account has been suspended by an administrator.",
                    status.HTTP_403_FORBIDDEN,
                )
            roles = normalize_cognito_roles(payload.get("cognito:groups", ["Customer"]))
            return {
                "sub": sub,
                "email": payload.get("email", stored_user["email"] if stored_user else ""),
                "name": payload.get("name", stored_user["name"] if stored_user else ""),
                "phone": stored_user.get("phone") if stored_user else None,
                "roles": roles,
                "status": stored_user.get("status", "ACTIVE") if stored_user else "ACTIVE",
                "created_at": stored_user.get("created_at", "") if stored_user else "",
            }
        except AppError:
            raise
        except jwt.ExpiredSignatureError:
            raise AppError(
                "TOKEN_EXPIRED",
                "Your session has expired. Please sign in again.",
                status.HTTP_401_UNAUTHORIZED,
            )
        except jwt.InvalidTokenError:
            raise AppError(
                "INVALID_TOKEN",
                "Invalid authentication token.",
                status.HTTP_401_UNAUTHORIZED,
            )

    def register_customer(
        self, name: str, email: str, password: str, phone: str | None = None
    ) -> Dict[str, Any]:
        """
        Registers a new customer account.
        IMPORTANT SECURITY INVARIANT: Self-registration ALWAYS assigns the `customers` / `Customer`
        role. Administrator privileges can never be requested during registration.
        """
        normalized = email.strip().lower()

        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            user_attrs = [
                {"Name": "email", "Value": normalized},
                {"Name": "name", "Value": name.strip()},
            ]
            if phone:
                cleaned_phone = re.sub(r"[\s\-\(\)]", "", phone.strip())
                if cleaned_phone and not cleaned_phone.startswith("+"):
                    cleaned_phone = f"+91{cleaned_phone}"
                if re.match(r"^\+\d{8,15}$", cleaned_phone):
                    user_attrs.append({"Name": "phone_number", "Value": cleaned_phone})
            try:
                resp = cognito.sign_up(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    Username=normalized,
                    Password=password,
                    UserAttributes=user_attrs,
                )
                user_sub = resp.get("UserSub", f"usr-{uuid.uuid4().hex[:12]}")
                # Assign to 'customers' group in Cognito User Pool
                for grp in ("customers", "Customer"):
                    try:
                        cognito.admin_add_user_to_group(
                            UserPoolId=settings.COGNITO_USER_POOL_ID,
                            Username=normalized,
                            GroupName=grp,
                        )
                        break
                    except ClientError:
                        continue

                user_Confirmed = resp.get("UserConfirmed", False)
                user_profile = {
                    "sub": user_sub,
                    "email": normalized,
                    "name": name.strip(),
                    "phone": phone,
                    "roles": ["Customer", "customers"],
                    "status": "ACTIVE" if user_Confirmed else "UNCONFIRMED",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                if user_Confirmed:
                    return self.authenticate(normalized, password)
                return {
                    "access_token": "",
                    "id_token": "",
                    "refresh_token": "",
                    "requires_confirmation": True,
                    "user": user_profile,
                }
            except ClientError as exc:
                code = exc.response["Error"]["Code"]
                msg = exc.response["Error"]["Message"]
                if code == "UsernameExistsException":
                    raise AppError(
                        "EMAIL_EXISTS",
                        "An account with this email address already exists.",
                        status.HTTP_409_CONFLICT,
                    )
                if code == "InvalidPasswordException":
                    raise AppError("WEAK_PASSWORD", msg, status.HTTP_400_BAD_REQUEST)
                raise AppError("COGNITO_REGISTER_ERROR", msg, status.HTTP_400_BAD_REQUEST)

        # Local emulation mode (USE_LOCAL_AWS=True)
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
            "roles": ["Customer", "customers"],
            "status": "ACTIVE",
            "email_verified": True,
            "created_at": now,
        }
        self._users_by_email[normalized] = record
        self._users_by_sub[sub] = record
        self._signup_codes[normalized] = "654321"
        tokens = self.issue_tokens(record)
        return {
            **tokens,
            "requires_confirmation": False,
            "user": self._public_user(record),
        }

    def confirm_registration(self, email: str, confirmation_code: str) -> Dict[str, Any]:
        normalized = email.strip().lower()
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                cognito.confirm_sign_up(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    Username=normalized,
                    ConfirmationCode=confirmation_code.strip(),
                )
                return {"confirmed": True, "email": normalized}
            except ClientError as exc:
                raise AppError(
                    "CONFIRMATION_FAILED",
                    exc.response["Error"].get("Message", "Invalid confirmation code."),
                    status.HTTP_400_BAD_REQUEST,
                )

        user = self._users_by_email.get(normalized)
        if not user:
            raise AppError("USER_NOT_FOUND", "Account not found.", status.HTTP_404_NOT_FOUND)
        expected = self._signup_codes.get(normalized, "654321")
        if confirmation_code.strip() != expected:
            raise AppError(
                "INVALID_CONFIRMATION_CODE",
                "Invalid email verification code.",
                status.HTTP_400_BAD_REQUEST,
            )
        user["email_verified"] = True
        user["status"] = "ACTIVE"
        return {"confirmed": True, "email": normalized}

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        normalized = email.strip().lower()

        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                resp = cognito.initiate_auth(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    AuthFlow="USER_PASSWORD_AUTH",
                    AuthParameters={
                        "USERNAME": normalized,
                        "PASSWORD": password,
                    },
                )
                auth_result = resp.get("AuthenticationResult", {})
                access_token = auth_result.get("AccessToken", "")
                id_token = auth_result.get("IdToken", access_token)
                refresh_token = auth_result.get("RefreshToken", "")
                user_claims = self.verify_jwt(id_token or access_token)
                return {
                    "access_token": access_token,
                    "id_token": id_token,
                    "refresh_token": refresh_token,
                    "expires_in": auth_result.get("ExpiresIn", 3600),
                    "user": user_claims,
                }
            except ClientError as exc:
                code = exc.response["Error"]["Code"]
                if code in ("NotAuthorizedException", "UserNotFoundException"):
                    raise AppError(
                        "INVALID_CREDENTIALS",
                        "Invalid email address or password.",
                        status.HTTP_401_UNAUTHORIZED,
                    )
                if code == "UserNotConfirmedException":
                    raise AppError(
                        "EMAIL_NOT_VERIFIED",
                        "Please verify your email address before signing in.",
                        status.HTTP_403_FORBIDDEN,
                    )
                raise AppError(
                    "COGNITO_AUTH_ERROR",
                    exc.response["Error"].get("Message", "Authentication failed."),
                    status.HTTP_401_UNAUTHORIZED,
                )

        # Local emulation mode
        user = self._users_by_email.get(normalized)
        pw_hash = self._hash_password(password)
        valid_pw = user and (
            user["password_hash"] == pw_hash or user.get("alt_password_hash") == pw_hash
        )
        if not valid_pw:
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

    def refresh_session(self, refresh_token: str) -> Dict[str, Any]:
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                resp = cognito.initiate_auth(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    AuthFlow="REFRESH_TOKEN_AUTH",
                    AuthParameters={"REFRESH_TOKEN": refresh_token},
                )
                auth_result = resp.get("AuthenticationResult", {})
                access_token = auth_result.get("AccessToken", "")
                id_token = auth_result.get("IdToken", access_token)
                return {
                    "access_token": access_token,
                    "id_token": id_token,
                    "refresh_token": refresh_token,
                    "expires_in": auth_result.get("ExpiresIn", 3600),
                }
            except ClientError:
                raise AppError(
                    "INVALID_REFRESH_TOKEN",
                    "Refresh token is invalid or expired.",
                    status.HTTP_401_UNAUTHORIZED,
                )

        sub = self._refresh_tokens.get(refresh_token)
        if not sub or sub not in self._users_by_sub:
            raise AppError(
                "INVALID_REFRESH_TOKEN",
                "Refresh token is invalid or expired.",
                status.HTTP_401_UNAUTHORIZED,
            )
        user = self._users_by_sub[sub]
        return self.issue_tokens(user)

    def logout(self, access_token: str) -> None:
        if not settings.USE_LOCAL_AWS and access_token:
            try:
                cognito = self._get_cognito_client()
                cognito.global_sign_out(AccessToken=access_token)
            except ClientError as exc:
                logger.warning(f"Cognito global_sign_out notice: {exc}")
        if access_token:
            self._revoked_tokens.add(access_token)

    def initiate_password_reset(self, email: str) -> Optional[str]:
        normalized = email.strip().lower()
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                cognito.forgot_password(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    Username=normalized,
                )
            except ClientError:
                # Avoid leaking account existence
                pass
            return None

        user = self._users_by_email.get(normalized)
        code = "482910"
        if user:
            self._reset_codes[normalized] = code
        return code

    def confirm_password_reset(self, email: str, code: str, new_password: str) -> None:
        normalized = email.strip().lower()
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                cognito.confirm_forgot_password(
                    ClientId=settings.COGNITO_CLIENT_ID,
                    Username=normalized,
                    ConfirmationCode=code.strip(),
                    Password=new_password,
                )
                return
            except ClientError as exc:
                raise AppError(
                    "INVALID_RESET_CODE",
                    exc.response["Error"].get("Message", "Invalid or expired verification code."),
                    status.HTTP_400_BAD_REQUEST,
                )

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
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                resp = cognito.list_users(UserPoolId=settings.COGNITO_USER_POOL_ID, Limit=60)
                users: List[Dict[str, Any]] = []
                for u in resp.get("Users", []):
                    attrs = {a["Name"]: a["Value"] for a in u.get("Attributes", [])}
                    users.append(
                        {
                            "sub": attrs.get("sub", u.get("Username", "")),
                            "email": attrs.get("email", u.get("Username", "")),
                            "name": attrs.get("name", attrs.get("email", "Customer")),
                            "phone": attrs.get("phone_number"),
                            "roles": ["Customer", "customers"],
                            "status": "ACTIVE" if u.get("Enabled", True) else "SUSPENDED",
                            "created_at": u.get("UserCreateDate", datetime.now(timezone.utc)).isoformat()
                            if hasattr(u.get("UserCreateDate"), "isoformat")
                            else str(u.get("UserCreateDate", "")),
                        }
                    )
                return users
            except ClientError as exc:
                logger.warning(f"Cognito list_users fallback: {exc}")
                return []

        return [self._public_user(u) for u in self._users_by_sub.values()]

    def update_user_status(self, sub: str, new_status: str) -> Dict[str, Any]:
        if not settings.USE_LOCAL_AWS:
            cognito = self._get_cognito_client()
            try:
                if new_status == "SUSPENDED":
                    cognito.admin_disable_user(
                        UserPoolId=settings.COGNITO_USER_POOL_ID, Username=sub
                    )
                else:
                    cognito.admin_enable_user(
                        UserPoolId=settings.COGNITO_USER_POOL_ID, Username=sub
                    )
                return {
                    "sub": sub,
                    "email": sub,
                    "name": sub,
                    "phone": None,
                    "roles": ["Customer", "customers"],
                    "status": new_status,
                    "created_at": "",
                }
            except ClientError as exc:
                raise AppError(
                    "COGNITO_STATUS_UPDATE_ERROR",
                    exc.response["Error"].get("Message", "Failed to update user status."),
                    status.HTTP_400_BAD_REQUEST,
                )

        user = self._users_by_sub.get(sub)
        if not user:
            raise AppError("USER_NOT_FOUND", f"User '{sub}' not found.", status.HTTP_404_NOT_FOUND)
        if ("Admin" in user["roles"] or "administrators" in user["roles"]) and new_status == "SUSPENDED":
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
            "roles": normalize_cognito_roles(user.get("roles", ["Customer"])),
            "status": user.get("status", "ACTIVE"),
            "created_at": user["created_at"],
        }


cognito_idp = CognitoIdentityProvider()

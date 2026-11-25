from tests.conftest import InProcessASGIClient, get_auth_headers


def test_cognito_login_and_rbac_protection(client: InProcessASGIClient):
    unauth = client.get("/auth/me")
    assert unauth.status_code == 401

    cust_headers = get_auth_headers(client, "elena.vance@lenscart.store", "Customer@Lens2026")
    me = client.get("/auth/me", headers=cust_headers)
    assert me.status_code == 200
    user_data = me.json()["data"]
    assert user_data["email"] == "elena.vance@lenscart.store"
    assert "customers" in user_data["roles"]
    assert "Admin" not in user_data["roles"]

    # Customer cannot access Admin endpoints (403 Forbidden)
    admin_attempt = client.get("/admin/dashboard", headers=cust_headers)
    assert admin_attempt.status_code == 403
    assert admin_attempt.json()["error"]["code"] == "ADMIN_REQUIRED"

    prod_attempt = client.post("/admin/products", headers=cust_headers, json={})
    assert prod_attempt.status_code == 403


def test_cognito_registration_refresh_and_logout(client: InProcessASGIClient):
    reg_res = client.post(
        "/auth/register",
        json={
            "name": "Rohan Sharma",
            "email": "rohan.sharma@studio.in",
            "password": "Password@2026",
            "phone": "+91 98200 12345",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()["data"]
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    # Self-registration must NEVER assign Admin privileges
    assert "Admin" not in reg_data["user"]["roles"]
    assert "administrators" not in reg_data["user"]["roles"]

    # Confirm signup endpoint
    conf_res = client.post(
        "/auth/confirm-signup",
        json={"email": "rohan.sharma@studio.in", "confirmation_code": "654321"},
    )
    assert conf_res.status_code == 200
    assert conf_res.json()["data"]["confirmed"] is True

    # Refresh token flow
    ref_res = client.post(
        "/auth/refresh",
        json={"refresh_token": reg_data["refresh_token"]},
    )
    assert ref_res.status_code == 200
    new_access = ref_res.json()["data"]["access_token"]

    # Logout revokes the access token
    logout_res = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert logout_res.status_code == 200
    after_logout = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert after_logout.status_code == 401


def test_cognito_forgot_and_reset_password(client: InProcessASGIClient):
    fp_res = client.post(
        "/auth/forgot-password",
        json={"email": "rohan.sharma@studio.in"},
    )
    assert fp_res.status_code == 200
    code = fp_res.json()["data"].get("reset_code_hint", "482910")

    rst_res = client.post(
        "/auth/reset-password",
        json={
            "email": "rohan.sharma@studio.in",
            "verification_code": code,
            "new_password": "NewPassword@2026",
        },
    )
    assert rst_res.status_code == 200

    login_res = client.post(
        "/auth/login",
        json={"email": "rohan.sharma@studio.in", "password": "NewPassword@2026"},
    )
    assert login_res.status_code == 200


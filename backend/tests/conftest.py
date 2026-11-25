import json
from urllib.parse import unquote, urlencode
import pytest
from app.main import app


class ASGIResponse:
    def __init__(self, status_code: int, headers: dict[str, str], body: bytes):
        self.status_code = status_code
        self.headers = headers
        self.content = body
        self.text = body.decode("utf-8", errors="replace")

    def json(self):
        return json.loads(self.text)


def _drive_coroutine(coro):
    """Drives a pure in-memory ASGI coroutine to completion without Windows loopback sockets."""
    try:
        while True:
            coro.send(None)
    except StopIteration as stop:
        return stop.value


class InProcessASGIClient:
    """Executes HTTP requests against the FastAPI ASGI app in-process without socketpair."""

    __test__ = False

    def __init__(self, asgi_app):
        self.app = asgi_app

    def request(
        self,
        method: str,
        url: str,
        params: dict | None = None,
        json_body: dict | None = None,
        headers: dict | None = None,
        **kwargs,
    ) -> ASGIResponse:
        if "json" in kwargs and json_body is None:
            json_body = kwargs.pop("json")

        if "?" in url:
            raw_path_str, query_str = url.split("?", 1)
        else:
            raw_path_str, query_str = url, ""
        path = unquote(raw_path_str or "/")
        if params:
            extra_q = urlencode({k: v for k, v in params.items() if v is not None})
            query_str = f"{query_str}&{extra_q}".lstrip("&") if query_str else extra_q

        body_bytes = json.dumps(json_body).encode("utf-8") if json_body is not None else b""

        raw_headers = [
            (b"host", b"testserver"),
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body_bytes)).encode("ascii")),
        ]
        if headers:
            for k, v in headers.items():
                raw_headers.append((k.lower().encode("latin-1"), str(v).encode("latin-1")))

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method.upper(),
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("ascii"),
            "query_string": query_str.encode("ascii"),
            "headers": raw_headers,
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
        }

        request_sent = False
        status_code = 200
        resp_headers: dict[str, str] = {}
        resp_chunks: list[bytes] = []

        async def receive():
            nonlocal request_sent
            if not request_sent:
                request_sent = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                for hk, hv in message.get("headers", []):
                    resp_headers[hk.decode("latin-1").lower()] = hv.decode("latin-1")
            elif message["type"] == "http.response.body":
                resp_chunks.append(message.get("body", b""))

        _drive_coroutine(self.app(scope, receive, send))
        return ASGIResponse(status_code, resp_headers, b"".join(resp_chunks))

    def get(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs) -> ASGIResponse:
        return self.request("DELETE", url, **kwargs)


@pytest.fixture(scope="session")
def client() -> InProcessASGIClient:
    return InProcessASGIClient(app)


def get_auth_headers(client: InProcessASGIClient, email: str, password: str) -> dict[str, str]:
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


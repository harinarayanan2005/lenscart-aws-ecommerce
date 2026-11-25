from mangum import Mangum
from app.main import app

# Primary AWS Lambda Function URL / ASGI entrypoint for the FastAPI application
handler = Mangum(app, lifespan="off")


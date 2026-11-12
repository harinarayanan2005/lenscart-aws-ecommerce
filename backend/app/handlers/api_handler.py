from mangum import Mangum
from app.main import app

# AWS Lambda Function URL entrypoint via Mangum
handler = Mangum(app, lifespan="auto")


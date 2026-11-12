@echo off
echo ============================================================================
echo   LENSCART - Photography Equipment Store (Full-Stack Local Launcher)
echo ============================================================================
echo Starting FastAPI + DynamoDB Serverless Backend on http://127.0.0.1:8000 ...
start "LensCart Backend API" cmd /k "cd /d d:\PROJECTS\lenscart\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Starting React + Vite Frontend on http://localhost:5173 ...
start "LensCart Frontend UI" cmd /k "cd /d d:\PROJECTS\lenscart\frontend && npm.cmd run dev"

echo.
echo Both servers are launching!
echo   - Storefront & Admin UI : http://localhost:5173
echo   - FastAPI Swagger Docs  : http://127.0.0.1:8000/docs
echo ============================================================================


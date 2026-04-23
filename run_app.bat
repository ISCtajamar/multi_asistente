@echo off
:: Lanzador optimizado: Abre solo las dos terminales necesarias y se cierra.

:: 1. Backend
start "Backend - FastAPI" cmd /k "cd backend && ..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

:: 2. Frontend
start "Frontend - Next.js" cmd /k "cd frontend && npm run dev"

:: Cerrar esta ventana
exit

@echo off
TITLE Multi-Asistente RAG - Runner
SETLOCAL

:: Color verde para el texto
color 0A

echo ==========================================
echo   LANZADOR MULTI-ASISTENTE RAG
echo ==========================================
echo.

:: 1. Verificar existencia de .env
if not exist .env (
    color 0C
    echo [ERROR] No se encuentra el archivo .env en la raiz.
    echo Por favor, crea el archivo .env con tus credenciales.
    pause
    exit /b
)

:: 2. Iniciar Backend en una nueva ventana
echo [1/2] Iniciando Backend FastAPI...
start "Backend - FastAPI" cmd /k "call .\.venv\Scripts\activate && cd backend && uvicorn app.main:app --reload --port 8000"

:: 3. Iniciar Frontend en una nueva ventana
echo [2/2] Iniciando Frontend Next.js...
start "Frontend - Next.js" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo ==========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Las ventanas de comando se mantendran abiertas.
echo Para detener los servicios, cierra sus respectivas ventanas.
echo.
pause

@echo off
echo.
echo  ShadowGuard Shield v3.0 - Starting all services...
echo ========================================================
echo.

REM Start AI Service
echo [1/3] Starting AI Service...
cd ai-service
start "AI-Service" cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 8000"
cd ..
timeout /t 3 /nobreak > nul

REM Start Backend
echo [2/3] Starting Backend...
cd backend
if not exist .env copy .env.example .env
start "Backend" cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python app.py"
cd ..
timeout /t 3 /nobreak > nul

REM Start Frontend
echo [3/3] Starting Frontend...
cd frontend
if not exist .env copy .env.example .env
start "Frontend" cmd /k "npm install && npm start"
cd ..

echo.
echo ========================================================
echo  Services are starting in separate windows!
echo  Frontend:   http://localhost:3000
echo  Backend:    http://localhost:5000
echo  AI Service: http://localhost:8000
echo ========================================================
pause

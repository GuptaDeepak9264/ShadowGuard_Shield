#!/bin/bash
# ShadowGuard Shield - Quick Start Script
# Run: chmod +x start.sh && ./start.sh

set -e

echo ""
echo "🛡️  ShadowGuard Shield v3.0 — Starting all services..."
echo "========================================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.9+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Setup AI Service
echo "🤖 [1/3] Setting up AI Service..."
cd ai-service
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn app:app --host 0.0.0.0 --port 8000 &
AI_PID=$!
echo "   ✅ AI Service started (PID: $AI_PID) → http://localhost:8000"
cd ..

sleep 2

# Setup Backend
echo "🔧 [2/3] Setting up Backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
[ ! -f ".env" ] && cp .env.example .env
python app.py &
BACK_PID=$!
echo "   ✅ Backend started (PID: $BACK_PID) → http://localhost:5000"
cd ..

sleep 2

# Setup Frontend
echo "⚛️  [3/3] Setting up Frontend..."
cd frontend
[ ! -f ".env" ] && cp .env.example .env
if [ ! -d "node_modules" ]; then
    npm install -q
fi
npm start &
FRONT_PID=$!
echo "   ✅ Frontend starting → http://localhost:3000"
cd ..

echo ""
echo "========================================================"
echo "✅ All services running!"
echo "   Frontend:   http://localhost:3000"
echo "   Backend:    http://localhost:5000"
echo "   AI Service: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================================"

# Wait for all
trap "kill $AI_PID $BACK_PID $FRONT_PID 2>/dev/null; echo 'Services stopped.'; exit" INT
wait

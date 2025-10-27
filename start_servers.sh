#!/bin/bash

echo "🚀 Starting RoadRunner Servers..."
echo ""

# Kill any existing servers
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start backend
echo "✓ Starting backend on port 5001..."
cd backend
python3 app.py > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 2

# Start frontend  
echo "✓ Starting frontend on port 8000..."
cd frontend
python3 -m http.server 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "✅ Servers started!"
echo "   Backend:  http://localhost:5001 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:8000 (PID: $FRONTEND_PID)"
echo ""
echo "🌐 Opening browser..."
open http://localhost:8000/login_page.html

echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"

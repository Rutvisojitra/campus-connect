#!/bin/bash
echo "============================================================"
echo "     🚀 Starting CampusConnect Application Suite 🚀"
echo "============================================================"
echo ""

cd CampusConnect

# Start Backend in background
echo "[1/2] Starting Express Backend..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Start Frontend in background
echo "[2/2] Starting React Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================================"
echo "✅ BOTH SERVERS ARE LAUNCHED!"
echo "🌐 Backend running at: http://localhost:5000"
echo "🌐 Frontend running at: http://localhost:3000"
echo "============================================================"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait

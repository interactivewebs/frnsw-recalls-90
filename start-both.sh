#!/bin/bash
echo "🚒 Starting FRNSW Recalls 90 (Full Application)"

# Function to kill background processes on exit
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend..."
cd backend && NODE_ENV=development npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background  
echo "Starting frontend..."
cd ../frontend && BROWSER=none npm start &
FRONTEND_PID=$!

echo ""
echo "🚒 FRNSW Recalls 90 Development Server"
echo "======================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001" 
echo "API:      http://localhost:3001/api"
echo "Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
wait

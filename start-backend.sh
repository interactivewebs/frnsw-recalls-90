#!/bin/bash
echo "🚒 Starting FRNSW Recalls 90 Backend (Development)"
cd backend
echo "Backend will be available at: http://localhost:3001"
echo "API endpoints: http://localhost:3001/api/*"
echo "Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop"
NODE_ENV=development npm run dev

#!/bin/bash

echo "🔍 FRNSW Deployment Debug Script"
echo "=================================="

echo -e "\n📁 Checking directory structure:"
ls -la /var/www/frnsw/
echo -e "\n📁 Frontend directory:"
ls -la /var/www/frnsw/frontend/
echo -e "\n📁 Frontend build directory:"
ls -la /var/www/frnsw/frontend/build/ 2>/dev/null || echo "❌ Build directory does not exist!"

echo -e "\n🔧 Checking if frontend build exists:"
if [ -d "/var/www/frnsw/frontend/build" ]; then
    echo "✅ Build directory exists"
    echo "📁 Contents:"
    ls -la /var/www/frnsw/frontend/build/
    echo -e "\n📁 Static JS files:"
    ls -la /var/www/frnsw/frontend/build/static/js/ 2>/dev/null || echo "❌ No static/js directory"
    echo -e "\n📁 Static CSS files:"
    ls -la /var/www/frnsw/frontend/build/static/css/ 2>/dev/null || echo "❌ No static/css directory"
else
    echo "❌ Build directory does not exist!"
fi

echo -e "\n👤 Checking ownership:"
ls -la /var/www/frnsw/frontend/ | head -5

echo -e "\n🌐 Checking Nginx configuration:"
nginx -t 2>&1 | head -5

echo -e "\n📊 Checking PM2 status:"
pm2 status

echo -e "\n📝 Checking backend logs:"
tail -10 /var/www/frnsw/backend/logs/combined.log 2>/dev/null || echo "❌ No backend logs found"

echo -e "\n🔍 Testing static file access:"
curl -I http://localhost/static/js/main.af62fa23.js 2>/dev/null | head -3 || echo "❌ Cannot test localhost"

echo -e "\n✅ Debug script completed"

#!/bin/bash

echo "🔍 Checking FRNSW Database State..."
echo "=================================="

# Test database connection
echo -e "\n📊 Testing database connection..."
if mysql -u frnsw_user -p'frnsw5678!@#' -e "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Check if database exists
echo -e "\n🗄️ Checking database..."
if mysql -u frnsw_user -p'frnsw5678!@#' -e "USE frnsw_recalls_90;" 2>/dev/null; then
    echo "✅ Database frnsw_recalls_90 exists"
else
    echo "❌ Database frnsw_recalls_90 does not exist"
    exit 1
fi

# Check tables
echo -e "\n📋 Checking tables..."
TABLES=$(mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SHOW TABLES;" 2>/dev/null | tail -n +2)
if [ -n "$TABLES" ]; then
    echo "✅ Tables found:"
    echo "$TABLES"
else
    echo "❌ No tables found"
    exit 1
fi

# Check users table structure
echo -e "\n👥 Checking users table..."
if mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "DESCRIBE users;" 2>/dev/null; then
    echo "✅ Users table structure OK"
else
    echo "❌ Users table structure check failed"
    exit 1
fi

# Check if users exist
echo -e "\n👤 Checking existing users..."
USER_COUNT=$(mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT COUNT(*) FROM users;" 2>/dev/null | tail -1)
echo "Found $USER_COUNT user(s)"

if [ "$USER_COUNT" -gt 0 ]; then
    echo -e "\n📝 User details:"
    mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT id, staff_number, first_name, last_name, email, is_admin, email_verified FROM users;" 2>/dev/null
fi

# Check approved_staff
echo -e "\n✅ Checking approved_staff..."
APPROVED_COUNT=$(mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT COUNT(*) FROM approved_staff;" 2>/dev/null | tail -1)
echo "Found $APPROVED_COUNT approved staff"

echo -e "\n✅ Database check completed"

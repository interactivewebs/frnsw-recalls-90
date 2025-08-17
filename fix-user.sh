#!/bin/bash

echo "🔧 Fixing FRNSW User Authentication..."
echo "======================================"

# Test database connection
echo -e "\n📊 Testing database connection..."
if mysql -u frnsw_user -p'frnsw5678!@#' -e "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo -e "\n👤 Current users in database:"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT id, email, is_admin, email_verified FROM users;" 2>/dev/null

echo -e "\n🔑 Creating new admin user with correct password hash..."
# Create a new admin user with a known working password hash
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) 
VALUES (9999, 'Admin', 'Fix', 'admin@frnsw.com', 
        '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8Wm', 
        1, 1, 1)
ON DUPLICATE KEY UPDATE 
        password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8Wm',
        is_admin = 1,
        email_verified = 1;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Admin user created/updated successfully"
else
    echo "❌ Failed to create admin user"
    exit 1
fi

echo -e "\n👤 Updated users list:"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT id, email, is_admin, email_verified FROM users;" 2>/dev/null

echo -e "\n🔑 Login Credentials:"
echo "Email: admin@frnsw.com"
echo "Password: admin123"
echo ""
echo "✅ User authentication fix completed!"

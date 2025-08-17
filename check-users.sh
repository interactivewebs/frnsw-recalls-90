#!/bin/bash

# Check users and test login functionality
echo "=== FRNSW Users Diagnostic ==="

# Check if we can connect to database
echo "1. Testing database connection..."
if mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Database connection successful"
else
    echo "   ❌ Database connection failed"
    exit 1
fi

# Check users table
echo "2. Checking users table..."
USER_COUNT=$(mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT COUNT(*) as count FROM users;" 2>/dev/null | tail -1)
echo "   Total users: $USER_COUNT"

# Show all users
echo "3. Current users in database:"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    staff_number,
    first_name,
    last_name,
    email,
    is_admin,
    is_host_admin,
    email_verified,
    LEFT(password_hash, 20) as hash_start
FROM users 
ORDER BY staff_number;" 2>/dev/null

# Check if the working hash exists
echo "4. Checking for working password hash..."
WORKING_HASH_COUNT=$(mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT COUNT(*) FROM users 
WHERE password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8Wm';" 2>/dev/null | tail -1)

if [ "$WORKING_HASH_COUNT" -gt 0 ]; then
    echo "   ✅ Found $WORKING_HASH_COUNT user(s) with working password hash"
else
    echo "   ❌ No users found with working password hash"
fi

# Test the login endpoint
echo "5. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST https://frnswrecall90.interactivewebs.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"david.finley@fire.nsw.gov.au","password":"TestPass123"}' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "   ✅ Login successful - got token"
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid email or password"; then
    echo "   ❌ Login failed - Invalid email or password"
    echo "   Response: $LOGIN_RESPONSE"
else
    echo "   ❓ Unexpected response: $LOGIN_RESPONSE"
fi

echo "=== End Diagnostic ==="

#!/bin/bash

# Script to check existing users and help with login

echo "=== FRNSW Users Check ==="
echo

# Check if we can connect to the database
echo "1. Testing database connection..."
if mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo
echo "2. Checking all users in the system..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    staff_number,
    first_name,
    last_name,
    email,
    is_admin,
    is_host_admin,
    email_verified,
    created_at
FROM users 
ORDER BY staff_number;" 2>/dev/null

echo
echo "3. Checking for Matthew Burgess specifically..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    staff_number,
    first_name,
    last_name,
    email,
    is_admin,
    is_host_admin,
    email_verified,
    created_at
FROM users 
WHERE email LIKE '%burgess%' OR last_name LIKE '%Burgess%' OR last_name LIKE '%BURGESS%';" 2>/dev/null

echo
echo "4. Checking for any unverified users..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    staff_number,
    first_name,
    last_name,
    email,
    email_verified
FROM users 
WHERE email_verified = 0;" 2>/dev/null

echo
echo "=== Login Instructions ==="
echo "If Matthew Burgess exists, try logging in with:"
echo "  Email: matthew.burgess@fire.nsw.gov.au"
echo "  Password: TestPass123"
echo
echo "If that doesn't work, we can reset the password."
echo "=== Check Complete ==="

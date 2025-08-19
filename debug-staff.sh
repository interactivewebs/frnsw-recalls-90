#!/bin/bash

# Debug script to check approved staff list and registration issues

echo "=== FRNSW Staff Registration Debug ==="
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
echo "2. Checking approved_staff table contents..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    last_name, 
    first_initial,
    UPPER(last_name) as last_name_upper
FROM approved_staff 
ORDER BY last_name;" 2>/dev/null

echo
echo "3. Testing specific staff member lookup..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    last_name, 
    first_initial,
    UPPER(last_name) as last_name_upper
FROM approved_staff 
WHERE UPPER(last_name) = 'BURGESS' AND first_initial = 'M';" 2>/dev/null

echo
echo "4. Testing case variations..."
echo "Testing 'Burgess' (proper case):"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    last_name, 
    first_initial,
    UPPER(last_name) as last_name_upper
FROM approved_staff 
WHERE UPPER(last_name) = 'BURGESS';" 2>/dev/null

echo
echo "5. Checking users table for existing registrations..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT 
    staff_number,
    first_name,
    last_name,
    email,
    email_verified
FROM users 
WHERE last_name LIKE '%Burgess%' OR last_name LIKE '%BURGESS%';" 2>/dev/null

echo
echo "=== Debug Complete ==="

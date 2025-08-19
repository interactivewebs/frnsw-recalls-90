#!/bin/bash

# Script to fix the approved_staff table with the correct FRNSW staff list

echo "=== Fix Approved Staff List ==="
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
echo "2. Current approved staff list:"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT last_name, first_initial FROM approved_staff ORDER BY last_name;" 2>/dev/null

echo
echo "3. Clearing existing approved staff list..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
DELETE FROM approved_staff;" 2>/dev/null

echo
echo "4. Adding correct FRNSW staff list..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
INSERT INTO approved_staff (last_name, first_initial) VALUES
('BARTON', 'R'),
('BURGESS', 'M'),
('CLARKE', 'B'),
('Clingan', 'W'),
('Crossin', 'A'),
('Dutton', 'B'),
('Finley', 'D'),
('Finley', 'F'),
('McLachlan', 'C'),
('MILLER', 'B'),
('Smithson', 'M'),
('WALSH', 'G'),
('WHITE', 'C');" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Approved staff list updated successfully"
else
    echo "❌ Failed to update approved staff list"
    exit 1
fi

echo
echo "5. Verifying updated approved staff list:"
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT last_name, first_initial FROM approved_staff ORDER BY last_name;" 2>/dev/null

echo
echo "6. Testing Matthew Burgess lookup..."
mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT last_name, first_initial, UPPER(last_name) as last_name_upper
FROM approved_staff 
WHERE UPPER(last_name) = 'BURGESS' AND first_initial = 'M';" 2>/dev/null

echo
echo "=== Fix Complete ==="
echo "Matthew Burgess should now be able to register with:"
echo "  First Name: Matthew"
echo "  Last Name: Burgess (any case)"
echo "  Staff Number: 520501"
echo "  Password: TestPass123 (must have uppercase, lowercase, and number)"

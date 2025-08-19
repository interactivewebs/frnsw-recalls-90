#!/bin/bash

# Script to reset Matthew Burgess's password

echo "=== Reset Matthew Burgess Password ==="
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
echo "2. Checking if Matthew Burgess exists..."
BURGESS_EXISTS=$(mysql -N -B -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
SELECT COUNT(*) FROM users 
WHERE email = 'matthew.burgess@fire.nsw.gov.au';" 2>/dev/null)

if [ "$BURGESS_EXISTS" -gt 0 ]; then
    echo "✅ Matthew Burgess found in database"
    
    echo
    echo "3. Resetting password to TestPass123..."
    
    # Generate the working password hash
    SEED_HASH='$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
    
    # Update the password
    mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
    UPDATE users 
    SET password_hash = '$SEED_HASH',
        email_verified = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE email = 'matthew.burgess@fire.nsw.gov.au';" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Password reset successful"
        echo
        echo "=== Login Credentials ==="
        echo "Email: matthew.burgess@fire.nsw.gov.au"
        echo "Password: TestPass123"
        echo
        echo "You can now log in at: https://frnswrecall90.interactivewebs.com/login"
    else
        echo "❌ Password reset failed"
    fi
else
    echo "❌ Matthew Burgess not found in database"
    echo "Creating Matthew Burgess account..."
    
    # Generate the working password hash
    SEED_HASH='$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
    
    # Create the user
    mysql -u frnsw_user -p'frnsw5678!@#' frnsw_recalls_90 -e "
    INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified)
    VALUES (520501, 'Matthew', 'BURGESS', 'matthew.burgess@fire.nsw.gov.au', '$SEED_HASH', 0, 0, 1);" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Matthew Burgess account created"
        echo
        echo "=== Login Credentials ==="
        echo "Email: matthew.burgess@fire.nsw.gov.au"
        echo "Password: TestPass123"
        echo
        echo "You can now log in at: https://frnswrecall90.interactivewebs.com/login"
    else
        echo "❌ Account creation failed"
    fi
fi

echo
echo "=== Reset Complete ==="

-- Test and fix FRNSW Recalls 90 database setup
USE frnsw_recalls_90;

-- Check if tables exist
SHOW TABLES;

-- Check if users table has the right structure
DESCRIBE users;

-- Check if approved_staff table has data
SELECT * FROM approved_staff;

-- Check if any users exist
SELECT id, staff_number, first_name, last_name, email, is_admin, email_verified FROM users;

-- Insert test admin user if none exist
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) 
VALUES (9000, 'Admin', 'Test', 'admin@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', 1, 1, 1)
ON DUPLICATE KEY UPDATE id=id;

-- Verify the user was created
SELECT id, staff_number, first_name, last_name, email, is_admin, email_verified FROM users WHERE email = 'admin@fire.nsw.gov.au';

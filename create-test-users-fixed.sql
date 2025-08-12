-- FRNSW Recalls 90 Test Users
-- Password for all test users: "TestPass123"

USE frnsw_recalls_90_test;

-- Test admin user (David Finley)
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(1001, 'David', 'Finley', 'david.finley@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', TRUE, TRUE, TRUE);

-- Test admin user (Brady Clarke)  
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(1002, 'Brady', 'Clarke', 'brady.clarke@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', TRUE, FALSE, TRUE);

-- Test regular users
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(2001, 'Test', 'User1', 'test1@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', FALSE, FALSE, TRUE),
(2002, 'Test', 'User2', 'test2@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', FALSE, FALSE, TRUE),
(2003, 'Test', 'User3', 'test3@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', FALSE, FALSE, TRUE),
(2004, 'Charlie', 'White', 'charlie.white@fire.nsw.gov.au', '$2b$04$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', FALSE, FALSE, TRUE);

-- Add test users to approved staff if not already there
INSERT IGNORE INTO approved_staff (last_name, first_initial) VALUES
('User1', 'T'),
('User2', 'T'), 
('User3', 'T');


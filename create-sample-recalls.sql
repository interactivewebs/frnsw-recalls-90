-- Sample recall data for testing
USE frnsw_recalls_90_test;

-- Sample recalls
INSERT INTO recalls (date, start_time, end_time, suburb, description, created_by, status) VALUES
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00', '16:00:00', 'Menai', 'Structure fire response training', 1, 'active'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '18:00:00', 'Sutherland', 'Emergency response', 1, 'active'),
(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '06:00:00', '14:00:00', 'Cronulla', 'Beach rescue operations', 2, 'active');


-- FRNSW Recalls 90 Database Schema
-- Fire and Rescue NSW Menai Station 90 Recall Management System

-- Create database
CREATE DATABASE IF NOT EXISTS frnsw_recalls_90;
USE frnsw_recalls_90;

-- Approved staff list (whitelist for registration)
CREATE TABLE approved_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_initial VARCHAR(1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_staff (last_name, first_initial)
);

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_number INT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_host_admin BOOLEAN DEFAULT FALSE,
    notify BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    total_recall_hours DECIMAL(10,2) DEFAULT 0.00,
    last_recall_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_staff_number (staff_number),
    INDEX idx_email (email),
    INDEX idx_verification_token (verification_token)
);

-- Recalls table
CREATE TABLE recalls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    suburb VARCHAR(100) NOT NULL,
    station VARCHAR(10) DEFAULT '90',
    description TEXT,
    status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
    cancellation_reason TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Recall responses (available/not available)
CREATE TABLE recall_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recall_id INT NOT NULL,
    user_id INT NOT NULL,
    response ENUM('available', 'not_available') NOT NULL,
    response_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    token VARCHAR(255) UNIQUE,
    FOREIGN KEY (recall_id) REFERENCES recalls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_response (recall_id, user_id),
    INDEX idx_recall_id (recall_id),
    INDEX idx_user_id (user_id),
    INDEX idx_token (token)
);

-- Recall assignments
CREATE TABLE recall_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recall_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_manual_assignment BOOLEAN DEFAULT FALSE,
    assignment_note TEXT,
    conflict_override BOOLEAN DEFAULT FALSE,
    hours DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (recall_id) REFERENCES recalls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_assignment (recall_id, user_id),
    INDEX idx_recall_id (recall_id),
    INDEX idx_user_id (user_id),
    INDEX idx_assigned_by (assigned_by)
);

-- Recall edit history
CREATE TABLE recall_edits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recall_id INT NOT NULL,
    edited_by INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    edit_reason TEXT,
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recall_id) REFERENCES recalls(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id),
    INDEX idx_recall_id (recall_id),
    INDEX idx_edited_by (edited_by)
);

-- Admin audit log
CREATE TABLE admin_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type ENUM('user', 'recall', 'admin', 'system') NOT NULL,
    target_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_target_type (target_type),
    INDEX idx_created_at (created_at)
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Archive tables for data retention (24 months)
CREATE TABLE recalls_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    suburb VARCHAR(100) NOT NULL,
    station VARCHAR(10) DEFAULT '90',
    description TEXT,
    status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
    cancellation_reason TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_original_id (original_id),
    INDEX idx_date (date),
    INDEX idx_archived_at (archived_at)
);

CREATE TABLE recall_assignments_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_id INT NOT NULL,
    recall_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP,
    is_manual_assignment BOOLEAN DEFAULT FALSE,
    assignment_note TEXT,
    conflict_override BOOLEAN DEFAULT FALSE,
    hours DECIMAL(5,2) NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_original_id (original_id),
    INDEX idx_recall_id (recall_id),
    INDEX idx_user_id (user_id),
    INDEX idx_archived_at (archived_at)
);

-- Seed data: Approved staff list
INSERT INTO approved_staff (last_name, first_initial) VALUES
('White', 'C'),
('Clarke', 'B'),
('Miller', 'B'),
('Finley', 'D');

-- Note: Default admin users will be inserted after password hashing is set up
-- These will be added via the application initialization:
-- David Finley (Host Admin) - staff_number: 1001
-- Brady Clarke (Admin) - staff_number: 1002  
-- Ben Miller (Admin) - staff_number: 1003
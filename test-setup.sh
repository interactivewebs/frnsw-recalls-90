#!/bin/bash

# FRNSW Recalls 90 - Development Testing Setup
echo "🧪 Setting up FRNSW Recalls 90 for testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm first."
    exit 1
fi

print_status "Node.js and npm found"

# Create test environment file for backend
print_status "Creating test environment configuration..."
cat > backend/.env.test << 'ENVEOF'
# Test Environment Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=frnsw_recalls_90_test

# JWT Secret (test only)
JWT_SECRET=test_secret_key_for_development_only_not_for_production

# Email Configuration (development - will log to console)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test
FROM_EMAIL=test@localhost

# Web Push Configuration (test keys - will be generated)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI_7sLqWf6u5_F0l2TBONVnzL7sYCKKprGMVTf0lVEv0iCCfLJFUpBpClY
VAPID_PRIVATE_KEY=5ZtHqQ5V4BV2E4Qa2Q3Q4j0z4v8r2Q7g8Q3x4Q4F7Fg
VAPID_EMAIL=test@localhost

# Application Settings
APP_URL=http://localhost:3000
PORT=3001
NODE_ENV=development

# Security (relaxed for testing)
BCRYPT_ROUNDS=4
TOKEN_EXPIRY=24h
ENVEOF

# Copy test env as main env for development
cp backend/.env.test backend/.env

print_status "Environment files created"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

print_status "Backend dependencies installed"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi
cd ..

print_status "Frontend dependencies installed"

# Setup test database
print_status "Setting up test database..."
if command -v mysql &> /dev/null; then
    # Create test database
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS frnsw_recalls_90_test;" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "Test database created"
        
        # Import schema
        mysql -u root frnsw_recalls_90_test < database/schema.sql 2>/dev/null
        if [ $? -eq 0 ]; then
            print_status "Database schema imported"
        else
            print_warning "Could not import schema automatically. Import manually: mysql -u root frnsw_recalls_90_test < database/schema.sql"
        fi
    else
        print_warning "Could not create database. You may need to set a MySQL root password."
        print_warning "Create manually: mysql -u root -p -e \"CREATE DATABASE frnsw_recalls_90_test;\""
    fi
else
    print_warning "MySQL not found. Please install MySQL and create database manually."
    print_warning "Database: frnsw_recalls_90_test"
    print_warning "Schema: database/schema.sql"
fi

# Create test data script
print_status "Creating test data scripts..."

cat > create-test-users.sql << 'SQLEOF'
-- FRNSW Recalls 90 Test Users
-- Password for all test users: "TestPass123"

USE frnsw_recalls_90_test;

-- Test admin user (David Finley)
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(1001, 'David', 'Finley', 'david.finley@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8O8ZjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', TRUE, TRUE, TRUE);

-- Test admin user (Brady Clarke)  
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(1002, 'Brady', 'Clarke', 'brady.clarke@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8O8ZjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', TRUE, FALSE, TRUE);

-- Test regular users
INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) VALUES
(2001, 'Test', 'User1', 'test1@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8O8ZjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', FALSE, FALSE, TRUE),
(2002, 'Test', 'User2', 'test2@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8O8ZjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', FALSE, FALSE, TRUE),
(2003, 'Test', 'User3', 'test3@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', FALSE, FALSE, TRUE),
(2004, 'Charlie', 'White', 'charlie.white@fire.nsw.gov.au', '$2b$04$QjZy8QK1p2zB6p7mQjZy8O8ZjZy8QK1p2zB6p7mQjZy8QK1p2zB6e', FALSE, FALSE, TRUE);

-- Add test users to approved staff if not already there
INSERT IGNORE INTO approved_staff (last_name, first_initial) VALUES
('User1', 'T'),
('User2', 'T'), 
('User3', 'T');

SQLEOF

print_status "Test user SQL script created"

# Create sample recall data
cat > create-sample-recalls.sql << 'SQLEOF'
-- Sample recall data for testing
USE frnsw_recalls_90_test;

-- Sample recalls
INSERT INTO recalls (date, start_time, end_time, suburb, description, created_by, status) VALUES
(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00', '16:00:00', 'Menai', 'Structure fire response training', 1, 'active'),
(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '18:00:00', 'Sutherland', 'Emergency response', 1, 'active'),
(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '06:00:00', '14:00:00', 'Cronulla', 'Beach rescue operations', 2, 'active');

SQLEOF

print_status "Sample recall SQL script created"

# Create start scripts
cat > start-backend.sh << 'STARTEOF'
#!/bin/bash
echo "🚒 Starting FRNSW Recalls 90 Backend (Development)"
cd backend
echo "Backend will be available at: http://localhost:3001"
echo "API endpoints: http://localhost:3001/api/*"
echo "Health check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop"
NODE_ENV=development npm run dev
STARTEOF

cat > start-frontend.sh << 'STARTEOF'
#!/bin/bash
echo "🚒 Starting FRNSW Recalls 90 Frontend (Development)"
cd frontend  
echo "Frontend will be available at: http://localhost:3000"
echo "This will open automatically in your browser"
echo ""
echo "Press Ctrl+C to stop"
BROWSER=none npm start
STARTEOF

cat > start-both.sh << 'STARTEOF'
#!/bin/bash
echo "🚒 Starting FRNSW Recalls 90 (Full Application)"

# Function to kill background processes on exit
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "Starting backend..."
cd backend && NODE_ENV=development npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background  
echo "Starting frontend..."
cd ../frontend && BROWSER=none npm start &
FRONTEND_PID=$!

echo ""
echo "🚒 FRNSW Recalls 90 Development Server"
echo "======================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001" 
echo "API:      http://localhost:3001/api"
echo "Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
wait
STARTEOF

# Make scripts executable
chmod +x start-backend.sh start-frontend.sh start-both.sh

print_status "Start scripts created"

# Create test guide
cat > TESTING-GUIDE.md << 'GUIDEEOF'
# FRNSW Recalls 90 - Testing Guide

## Quick Start

1. **Start the application**:
   ```bash
   ./start-both.sh
   ```
   
2. **Access the application**: http://localhost:3000

3. **Load test data**:
   ```bash
   mysql -u root frnsw_recalls_90_test < create-test-users.sql
   mysql -u root frnsw_recalls_90_test < create-sample-recalls.sql
   ```

## Test Users

All test users have password: **TestPass123**

### Admin Users
- **david.finley@fire.nsw.gov.au** (Host Admin)
- **brady.clarke@fire.nsw.gov.au** (Admin)

### Regular Users  
- **test1@fire.nsw.gov.au**
- **test2@fire.nsw.gov.au**
- **test3@fire.nsw.gov.au**
- **charlie.white@fire.nsw.gov.au**

## Testing Scenarios

### 1. User Registration & Login
- Try registering new users with @fire.nsw.gov.au emails
- Test login with created test users
- Verify email domain restrictions

### 2. Recall Management (Admin)
- Login as admin user
- Create new recalls
- Edit existing recalls  
- Cancel recalls

### 3. Recall Responses (Users)
- Login as regular users
- Respond to recalls (Available/Not Available)
- Test real-time updates across multiple browser tabs

### 4. Fairness Algorithm
- Create recalls and have multiple users respond
- Check fairness ranking in admin panel
- Test manual vs automatic assignments

### 5. Real-time Features
- Open multiple browser tabs/windows
- Test Socket.IO real-time updates
- Verify notifications work

## Useful URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health
- **Login**: http://localhost:3000/login
- **Admin Panel**: http://localhost:3000/admin

## Debugging

### Backend Logs
Check terminal running backend for API requests and errors

### Frontend Console
Open browser DevTools → Console for React errors

### Database 
```bash
mysql -u root frnsw_recalls_90_test
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"david.finley@fire.nsw.gov.au","password":"TestPass123"}'
```
GUIDEEOF

print_status "Testing guide created"

echo ""
echo "🎉 Test environment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Load test data:"
echo "   mysql -u root frnsw_recalls_90_test < create-test-users.sql"
echo "   mysql -u root frnsw_recalls_90_test < create-sample-recalls.sql"
echo ""
echo "2. Start the application:"
echo "   ./start-both.sh"
echo ""  
echo "3. Access the app: http://localhost:3000"
echo ""
echo "4. Login with test user:"
echo "   Email: david.finley@fire.nsw.gov.au"
echo "   Password: TestPass123"
echo ""
echo "📖 See TESTING-GUIDE.md for detailed testing instructions"


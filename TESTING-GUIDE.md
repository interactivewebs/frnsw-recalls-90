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

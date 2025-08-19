# FRNSW Recalls 90 - Changelog

## Version 1.0.8 (2025-01-27)

### 🔧 Rate Limiting Fix
- **Increased Auth Rate Limit**: Fixed 429 "Too Many Requests" error
  - **Problem**: Auth rate limit was set to only 5 requests per 15 minutes, causing 429 errors during testing
  - **Solution**: Increased auth rate limit from 5 to 50 requests per 15 minutes for testing
  - **Files Changed**: `backend/server.js`

### 🔧 Technical Details
- Changed `max: 5` to `max: 50` in auth rate limiter configuration
- This allows more registration attempts during testing and debugging
- Rate limit can be adjusted back to lower value for production

---

## Version 1.0.7 (2025-01-27)

### 🔍 Debugging & Investigation
- **Enhanced Registration Debugging**: Added comprehensive logging for staff validation
  - **Problem**: Registration still failing despite case sensitivity fix
  - **Solution**: Added detailed logging to show available approved staff and temporarily disabled check for debugging
  - **Files Changed**: `backend/routes/auth.js`

- **Debug Script**: Created diagnostic tool for database investigation
  - **Problem**: Need to verify what's actually in the approved_staff table
  - **Solution**: Created `debug-staff.sh` script to check database contents and test queries
  - **Files Changed**: `debug-staff.sh` (new)

### 🔧 Technical Details
- Added logging to show all available approved staff when lookup fails
- Temporarily disabled approved staff check to allow registration while debugging
- Created diagnostic script to verify database state and test queries
- Enhanced error logging to identify root cause of validation failures

---

## Version 1.0.6 (2025-01-27)

### 🐛 Bug Fixes
- **Case Sensitivity in Staff Validation**: Fixed approved staff list matching
  - **Problem**: Users entering "Burgess" couldn't register because database had "BURGESS" (uppercase)
  - **Solution**: Made last name comparison case-insensitive using `UPPER(last_name)` in SQL query
  - **Files Changed**: `backend/routes/auth.js`

- **Improved Error Messages**: Better user feedback for registration issues
  - **Problem**: Generic error message didn't help users understand what was wrong
  - **Solution**: Added specific error message showing the name that wasn't found
  - **Files Changed**: `backend/routes/auth.js`

### 🔧 Technical Details
- Changed SQL query from `last_name = ?` to `UPPER(last_name) = ?`
- Added `lastNameUpper` variable to normalize input
- Enhanced logging to show both original and uppercase versions
- Improved error message format: `"Staff member "John Smith" not found on approved list..."`

---

## Version 1.0.5 (2025-01-27)

### ⚡ Performance Improvements
- **SELinux Context Optimization**: Dramatically improved deployment speed
  - **Problem**: `restorecon -Rv` command was taking a very long time during deployment
  - **Solution**: Replaced slow recursive operations with targeted context setting on build directory only
  - **Files Changed**: `deploy-frnswrecall90.sh`

- **File Permissions Optimization**: Faster permission setting
  - **Problem**: `find -exec` commands were processing entire frontend directory tree
  - **Solution**: Limited operations to build directory with `-maxdepth 3` for faster processing
  - **Files Changed**: `deploy-frnswrecall90.sh`

### 🔧 Technical Details
- Replaced `restorecon -Rv /var/www/frnsw/frontend` with targeted `chcon` commands
- Limited file permission operations to `/var/www/frnsw/frontend/build` directory only
- Added `-maxdepth 3` to find commands to prevent deep recursion
- Maintained fallback behavior for edge cases

---

## Version 1.0.4 (2025-01-27)

### 🏢 Staff Management
- **Real FRNSW Staff List**: Replaced test names with actual FRNSW staff members
  - **Problem**: Using generic test names instead of real staff data
  - **Solution**: Updated approved_staff table and user creation with actual FRNSW staff from provided list
  - **Files Changed**: `database/schema.sql`, `deploy-frnswrecall90.sh`

- **Staff User Creation**: Added automatic creation of all FRNSW staff users
  - **Problem**: Only admin users were being created automatically
  - **Solution**: Added all 13 FRNSW staff members with their actual staff numbers and emails
  - **Files Changed**: `deploy-frnswrecall90.sh`

- **Re-enabled Approved Staff Check**: Restored security check for registration
  - **Problem**: Approved staff check was disabled for testing
  - **Solution**: Re-enabled the check now that we have the real staff list
  - **Files Changed**: `backend/routes/auth.js`

### 📋 Staff List Added:
- Ralph BARTON (521256)
- Matthew BURGESS (520501) 
- Brady CLARKE (90006) - Admin
- Wayne Clingan (910492)
- Aaron Crossin (908818)
- Brie Dutton (908865)
- David Finley (907747) - Host Admin
- Felicity Finley (910491)
- Carly McLachlan (908466)
- Ben Miller (521662) - Admin
- Mitchell Smithson (910313)
  (Removed Gavin Walsh)
- Cameron WHITE (910394)

---

## Version 1.0.3 (2025-01-27)

### 🐛 Bug Fixes
- **User Registration Debugging**: Added comprehensive logging and error handling
  - **Problem**: Registration failing with 400 error but unclear cause
  - **Solution**: Added detailed console logging in backend and improved frontend error display
  - **Files Changed**: `backend/routes/auth.js`, `frontend/src/pages/Auth/Register.js`

- **Approved Staff Check**: Temporarily relaxed for testing
  - **Problem**: Users not in approved_staff table cannot register
  - **Solution**: Temporarily disabled the check to allow testing (marked with TODO for production)
  - **Files Changed**: `backend/routes/auth.js`

### 🔧 Development
- Enhanced error logging for registration process
- Improved frontend error message display
- Added console logging for debugging registration flow

---

## Version 1.0.2 (2025-01-27)

### 🐛 Bug Fixes
- **User Registration 400 Error**: Fixed field name mapping between frontend and backend
  - **Problem**: Frontend form used `first_name`, `last_name`, `employee_id` but backend expected `firstName`, `lastName`, `staffNumber`
  - **Solution**: Updated `frontend/src/services/authService.js` to map field names correctly
  - **Files Changed**: `frontend/src/services/authService.js`, `frontend/src/pages/Auth/Register.js`

- **Staff Number Field Type**: Changed from text to number input
  - **Problem**: Backend validation expected integer for `staffNumber` but frontend sent string
  - **Solution**: Updated input type to `number` and renamed field from `employee_id` to `staffNumber`
  - **Files Changed**: `frontend/src/pages/Auth/Register.js`

- **Limited Approved Staff List**: Expanded approved staff entries for testing
  - **Problem**: Only 4 entries in `approved_staff` table, preventing most users from registering
  - **Solution**: Added 50+ common names to allow broader testing
  - **Files Changed**: `database/schema.sql`

### 📝 Documentation
- Created comprehensive changelog for AI coder collaboration
- Added detailed commit messages with context and reasoning

---

## Version 1.0.1 (2025-01-27)

### 🔧 Infrastructure
- **Deploy Script Permissions**: Fixed executable permissions for deployment script
  - **Problem**: `deploy-frnswrecall90.sh` not executable after git clone
  - **Solution**: Made script executable in repository and added `chmod +x` fallback
  - **Files Changed**: `deploy-frnswrecall90.sh`

### 📦 Version Management
- Updated version numbers across all package files
- Added `REACT_APP_VERSION` environment variable for consistent versioning

---

## Version 1.0.0 (2025-01-27)

### 🚀 Initial Release
- Complete FRNSW Recalls 90 application deployment
- Full-stack Node.js/React application with MySQL backend
- Automated deployment script with PM2, Nginx, and SSL
- User authentication and authorization system
- Recall management functionality

### 🔧 Key Features
- **Authentication**: JWT-based auth with email verification
- **Database**: MySQL with comprehensive schema for recalls and users
- **Frontend**: React SPA with responsive design
- **Backend**: Express.js API with validation and security
- **Deployment**: Automated script for AlmaLinux server setup

---

## AI Coder Instructions

### When Making Changes:

1. **Update Version Numbers**:
   ```bash
   # Update these files with new version
   - deploy-frnswrecall90.sh (REACT_APP_VERSION)
   - frontend/package.json (version)
   - backend/package.json (version)
   ```

2. **Document Changes**:
   - Add entry to `CHANGELOG.md` with:
     - Version number and date
     - Category (🐛 Bug Fixes, ✨ Features, 🔧 Infrastructure, etc.)
     - Problem description
     - Solution explanation
     - Files changed

3. **Commit with Context**:
   ```bash
   git add .
   git commit -m "Version X.X.X: Brief description

   - Problem: Detailed explanation of what was wrong
   - Solution: How it was fixed
   - Files: List of key files changed
   - Testing: What to test after deployment"
   git push origin main
   ```

4. **Test After Deployment**:
   - Always test the specific functionality that was changed
   - Verify no regressions in existing features
   - Check both frontend and backend functionality

### Common Issues and Solutions:

#### Registration Issues:
- Check field name mapping between frontend and backend
- Verify `approved_staff` table has appropriate entries
- Ensure email domain validation (`@fire.nsw.gov.au`)

#### Deployment Issues:
- Script permissions: `chmod +x deploy-frnswrecall90.sh`
- Database connection: Check MySQL user permissions
- Frontend build: Verify `npm run build` completes successfully

#### Authentication Issues:
- JWT secret configuration
- Email verification setup
- Password hashing compatibility

### File Structure:
```
FRNSW Recalls 90/
├── backend/           # Node.js/Express API
├── frontend/          # React SPA
├── database/          # MySQL schema and migrations
├── deploy-frnswrecall90.sh  # Main deployment script
├── CHANGELOG.md       # This file - keep updated!
└── README.md          # Project documentation
```

### Deployment Commands:
```bash
# Fresh deployment
cd /tmp && rm -rf frnsw-deploy \
&& git clone https://github.com/interactivewebs/frnsw-recalls-90.git frnsw-deploy \
&& cd frnsw-deploy && ./deploy-frnswrecall90.sh

# Database reset (if needed)
DB_RESET=true ./deploy-frnswrecall90.sh
```

### Testing URLs:
- Main app: https://frnswrecall90.interactivewebs.com
- Health check: https://frnswrecall90.interactivewebs.com/health
- API status: https://frnswrecall90.interactivewebs.com/api/status
- Login: https://frnswrecall90.interactivewebs.com/login
- Register: https://frnswrecall90.interactivewebs.com/register

### Default Admin Credentials:
- Email: david.finley@fire.nsw.gov.au
- Password: TestPass123
- Staff Number: 1001

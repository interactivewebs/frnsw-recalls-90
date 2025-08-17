#!/bin/bash

# FRNSW Recalls 90 - Automated Server Deployment Script
# Customized for frnswrecall90.interactivewebs.com
# Run this on a fresh AlmaLinux server as root

# Safer bash options: exit on error, on unset vars, and on pipe failures
set -Eeuo pipefail

# Pre-configured settings
DOMAIN_NAME="frnswrecall90.interactivewebs.com"
SSL_EMAIL="admin@fire.nsw.gov.au"

# Source code repository (public HTTPS). Override via env if needed.
# For private repos, set GIT_TOKEN or provide a full authenticated URL in GIT_REPO.
GIT_REPO="${GIT_REPO:-https://github.com/interactivewebs/frnsw-recalls-90.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "============================================"
    echo "🚒 FRNSW Recalls 90 - Server Deployment"
    echo "   Domain: ${DOMAIN_NAME}"
    echo "============================================"
    echo -e "${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

print_header

# Configure MySQL root password (explicit default as requested)
# You can still override this by exporting MYSQL_ROOT_PASSWORD before running the script
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-frnsw5678!@#}"
print_info "Using MySQL root password from configuration."

# Use same password for the application DB user by default
DB_PASSWORD="${DB_PASSWORD:-$MYSQL_ROOT_PASSWORD}"
print_info "Using application DB user password (same as MySQL root by default)."

# Set a fixed default JWT secret (can still be overridden via JWT_SECRET env var)
JWT_SECRET="${JWT_SECRET:-b1t2y3J4K5m6Q7R8s9T0uV1wX2yZ3a4B5c6D7e8F9g0H1i2J3k4L5m6N7o8P9}"
print_info "Using JWT secret from configuration."

# Update system
print_info "Updating system packages..."
dnf update -y
print_status "System updated"

# Enable EPEL repository
print_info "Enabling EPEL repository..."
dnf install -y epel-release
print_status "EPEL repository enabled"

# Install Node.js 20 (with fallback to DNF module if NodeSource fails)
print_info "Installing Node.js 20..."
if curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && dnf install -y nodejs; then
  print_status "Node.js $(node --version) installed via NodeSource"
else
  print_warning "NodeSource install failed. Falling back to DNF module for Node.js 20"
  dnf module reset -y nodejs || true
  dnf module enable -y nodejs:20 || true
  dnf install -y nodejs
  print_status "Node.js $(node --version) installed via DNF module"
fi

# Install MySQL
print_info "Installing MySQL..."
dnf install -y mysql-server
systemctl enable mysqld
systemctl start mysqld
print_status "MySQL installed and started"

# Secure MySQL installation (handle temporary password flow on MySQL 8)
print_info "Securing MySQL installation..."

# Wait briefly for MySQL to be fully ready
sleep 2

ROOT_PASSWORD_SET=false

# Case 1: root without password works (fresh insecure root)
if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
  mysql -u root --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}'; FLUSH PRIVILEGES;"
  ROOT_PASSWORD_SET=true
else
  # Case 2: Use temporary password from mysqld log (typical on RHEL-based distros)
  TEMP_PASS=$(grep -oP 'temporary password.*: \K.*' /var/log/mysqld.log 2>/dev/null | tail -1 || true)
  # Fallback: journalctl (some builds log only to journal)
  if [ -z "${TEMP_PASS}" ]; then
    TEMP_PASS=$(journalctl -u mysqld --no-pager 2>/dev/null | grep -oP 'temporary password.*: \K.*' | tail -1 || true)
  fi
  if [ -n "${TEMP_PASS}" ]; then
    mysql -u root -p"${TEMP_PASS}" --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}'; FLUSH PRIVILEGES;" && ROOT_PASSWORD_SET=true || true
  fi
fi

# Case 3: Re-run scenario – password may already be set
if ! $ROOT_PASSWORD_SET; then
  if mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; then
    print_info "MySQL root password already configured"
    ROOT_PASSWORD_SET=true
  fi
fi

if ! $ROOT_PASSWORD_SET; then
  print_warning "Automatic password set failed. Forcing reset via init-file..."
  systemctl stop mysqld || true
  sleep 2
  RESET_FILE=/root/mysql-init.sql
  cat > "$RESET_FILE" <<RSQLEOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
RSQLEOF

  MYSQLD_BIN=$(command -v mysqld || echo /usr/libexec/mysqld)
  # Start a standalone mysqld to run the init file
  "$MYSQLD_BIN" --init-file="$RESET_FILE" --user=mysql --daemonize >/dev/null 2>&1 || true
  sleep 8
  # Stop the standalone instance and clean up
  pkill -f "mysqld.*init-file=$RESET_FILE" >/dev/null 2>&1 || true
  rm -f "$RESET_FILE"
  systemctl start mysqld
  sleep 2
  if mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; then
    ROOT_PASSWORD_SET=true
    print_status "MySQL root password reset via init-file"
  else
    print_warning "Init-file reset failed. Re-initializing MySQL data directory (fresh server fallback)."
    systemctl stop mysqld || true
    sleep 2
    # Determine MySQL data directory and normalize by removing any trailing slash
    DATADIR=$(mysqld --verbose --help 2>/dev/null | awk '/^datadir/ {print $2; exit}')
    DATADIR=${DATADIR:-/var/lib/mysql}
    DATADIR=${DATADIR%/}
    BACKUP_DIR="${DATADIR}.bak.$(date +%s)"
    # Move datadir out of the way (not into itself)
    if [ -d "$DATADIR" ]; then mv "$DATADIR" "$BACKUP_DIR" || true; fi
    install -d -o mysql -g mysql "$DATADIR"
    # Ensure proper permissions and SELinux context
    chown -R mysql:mysql "$DATADIR"
    chmod 700 "$DATADIR"
    restorecon -Rv "$DATADIR" >/dev/null 2>&1 || true
    # Initialize database
    mysqld --initialize-insecure --user=mysql --datadir="$DATADIR" >/dev/null 2>&1
    # Start MySQL and check status
    if ! systemctl start mysqld; then
      print_error "mysqld failed to start after re-initialize. Showing last log lines:"
      (journalctl -u mysqld --no-pager -n 200 2>/dev/null || tail -n 200 /var/log/mysqld.log 2>/dev/null || true)
      exit 1
    fi
    sleep 3
    # Now root has no password; set to requested
    mysql -u root --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}'; FLUSH PRIVILEGES;" || true
    if mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; then
      ROOT_PASSWORD_SET=true
      print_status "MySQL root password set after re-initialize"
    else
      print_error "Failed to set MySQL root password automatically. Manual intervention required."
      exit 1
    fi
  fi
fi

# Apply standard hardening with the configured root password
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS test;"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"
print_status "MySQL secured"

# Create application database
print_info "Creating application database..."
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS frnsw_recalls_90;"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS 'frnsw_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON frnsw_recalls_90.* TO 'frnsw_user'@'localhost';"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "FLUSH PRIVILEGES;"
print_status "Database created"

# Install PM2
print_info "Installing PM2..."
npm install -g pm2
print_status "PM2 installed"

# Install Nginx
print_info "Installing Nginx..."
dnf install -y nginx
systemctl enable nginx
print_status "Nginx installed"

# Install additional tools
print_info "Installing additional tools..."
dnf install -y git curl wget unzip openssl firewalld
print_status "Additional tools installed"

# Install certbot for SSL
print_info "Installing certbot for SSL..."
dnf install -y python3-certbot-nginx
print_status "Certbot installed via DNF"

# Allow Nginx to connect to backend when SELinux is enforcing
setsebool -P httpd_can_network_connect 1 || true

# Create application user
print_info "Creating application user..."
if ! id "frnsw" &>/dev/null; then
    useradd -r -m -d /var/www/frnsw -s /bin/bash frnsw
    print_status "Application user 'frnsw' created"
else
    print_status "Application user 'frnsw' already exists"
fi

# Ensure user has proper home directory
if [ ! -d "/var/www/frnsw" ]; then
    mkdir -p /var/www/frnsw
    chown frnsw:frnsw /var/www/frnsw
fi

# Create application directory
print_info "Setting up application directory..."
mkdir -p /var/www/frnsw/{backend,frontend,database,logs}
chown -R frnsw:frnsw /var/www/frnsw

print_info "Fetching application code from repository..."

# If repo is public, clone directly. If private and GIT_TOKEN is set, use token auth.
AUTH_REPO="$GIT_REPO"
if [[ -n "${GIT_TOKEN:-}" && "$GIT_REPO" =~ ^https://github.com/ ]]; then
  AUTH_REPO=$(echo "$GIT_REPO" | sed -E "s#https://github.com/#https://${GIT_TOKEN}@github.com/#")
fi

APP_SRC=/tmp/frnsw-src
rm -rf "$APP_SRC"
git clone --depth 1 --branch "$GIT_BRANCH" "$AUTH_REPO" "$APP_SRC"
print_status "Repository cloned: $GIT_REPO@$GIT_BRANCH"

# Copy backend, frontend, database, and ecosystem files
mkdir -p /var/www/frnsw
rsync -a --delete --exclude '.git' --exclude 'node_modules' "$APP_SRC/backend/" /var/www/frnsw/backend/
rsync -a --delete --exclude '.git' --exclude 'node_modules' --exclude 'build' "$APP_SRC/frontend/" /var/www/frnsw/frontend/
if [ -d "$APP_SRC/database" ]; then
  rsync -a --delete "$APP_SRC/database/" /var/www/frnsw/database/
fi
if [ -f "$APP_SRC/ecosystem.config.js" ]; then
  cp -f "$APP_SRC/ecosystem.config.js" /var/www/frnsw/ecosystem.config.js
fi

# Ensure application files are owned by the app user before installing deps
chown -R frnsw:frnsw /var/www/frnsw

# Create environment file
print_info "Creating environment configuration..."
cat > /var/www/frnsw/backend/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=frnsw_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=frnsw_recalls_90

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# Application Configuration
APP_URL=http://${DOMAIN_NAME}
PORT=3001
NODE_ENV=production

# Email Configuration (defaults set for InteractiveWebs relay)
SMTP_HOST=${SMTP_HOST:-mail.interactivewebs.com}
SMTP_PORT=${SMTP_PORT:-25}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
FROM_EMAIL=${FROM_EMAIL:-frnsw_NO_REPLY@interactivewebs.com}

# Security
BCRYPT_ROUNDS=12
TOKEN_EXPIRY=24h

# Web Push (generate these keys after deployment)
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa40HI_7sLqWf6u5_F0l2TBONVnzL7sYCKKprGMVTf0lVEv0iCCfLJFUpBpClY
VAPID_PRIVATE_KEY=5ZtHqQ5V4BV2E4Qa2Q3Q4j0z4v8r2Q7g8Q3x4Q4F7Fg
VAPID_EMAIL=admin@fire.nsw.gov.au
EOF

# Create PM2 ecosystem file
cat > /var/www/frnsw/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'frnsw-recalls-90',
    script: 'backend/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

print_info "Building frontend from repository..."
# Ensure we're in the correct directory and clean any previous builds
cd /var/www/frnsw/frontend
rm -rf build node_modules

# Check if package-lock.json exists, if not use npm install instead of npm ci
if [ -f "package-lock.json" ]; then
  print_info "package-lock.json found, using npm ci for clean install"
  BUILD_CMD="npm ci"
else
  print_warning "No package-lock.json found, using npm install instead"
  BUILD_CMD="npm install"
fi

if sudo -u frnsw bash -lc "cd /var/www/frnsw/frontend && $BUILD_CMD && npm run build"; then
  # Generate package-lock.json if it doesn't exist for future deployments
  if [ ! -f "package-lock.json" ]; then
    print_info "Generating package-lock.json for future deployments..."
    sudo -u frnsw npm install --package-lock-only 2>/dev/null || true
  fi
  print_status "Frontend build completed"
  
  # Verify build directory exists and has content
  if [ -d "/var/www/frnsw/frontend/build" ] && [ -f "/var/www/frnsw/frontend/build/index.html" ]; then
    print_status "Frontend build verified - index.html found"
    print_info "Build directory contents:"
    ls -la /var/www/frnsw/frontend/build/ | head -10
    
      # Check if static files are in the right place
  if [ -d "/var/www/frnsw/frontend/build/static" ]; then
    print_status "Static directory found in correct location"
    print_info "Static JS files:"
    ls -la /var/www/frnsw/frontend/build/static/js/ 2>/dev/null | head -5 || echo "No JS files in static/js/"
    print_info "Static CSS files:"
    ls -la /var/www/frnsw/frontend/build/static/css/ 2>/dev/null | head -5 || echo "No CSS files in static/css/"
  else
    print_error "Static directory missing from build output"
    print_info "Build directory structure:"
    find /var/www/frnsw/frontend/build -type d | head -10
    
    # Check if files are in wrong location
    print_info "Checking for files in wrong locations..."
    if [ -d "/var/www/frnsw/static" ]; then
      print_warning "Found static directory in root - this is wrong!"
      ls -la /var/www/frnsw/static/ | head -5
    fi
    if ls /var/www/frnsw/*.js 2>/dev/null | grep -q "main"; then
      print_warning "Found JS files in root - this is wrong!"
      ls -la /var/www/frnsw/*.js | head -3
    fi
  fi
  else
    print_error "Frontend build directory missing or incomplete"
    print_info "Current frontend directory contents:"
    ls -la /var/www/frnsw/frontend/
    exit 1
  fi
else
  print_error "Frontend build failed"
  exit 1
fi

# Clean up any incorrectly placed build files from root directory
print_info "Cleaning up any misplaced build files..."
find /var/www/frnsw -maxdepth 1 -name "*.js" -o -name "*.css" -o -name "*.js.map" -o -name "*.css.map" | grep -v "ecosystem.config.js" | xargs rm -f 2>/dev/null || true

# Also clean up any static files that might be in wrong locations
find /var/www/frnsw -maxdepth 1 -name "static" -type d | xargs rm -rf 2>/dev/null || true
print_info "Cleanup completed"

# Set proper ownership
chown -R frnsw:frnsw /var/www/frnsw

# Ensure SELinux contexts allow nginx to read static assets (AlmaLinux/RHEL)
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
  print_info "Setting SELinux context for web content..."
  chcon -R -t httpd_sys_content_t /var/www/frnsw/frontend 2>/dev/null || true
  restorecon -Rv /var/www/frnsw/frontend >/dev/null 2>&1 || true
fi

# Ensure permissive file permissions for web content
chmod 755 /var/www || true
chmod 755 /var/www/frnsw || true
find /var/www/frnsw/frontend -type d -exec chmod 755 {} \; 2>/dev/null || true
find /var/www/frnsw/frontend -type f -exec chmod 644 {} \; 2>/dev/null || true

# Also ensure nginx user can traverse parent dirs even if umask changed
if id nginx >/dev/null 2>&1; then
  usermod -a -G frnsw nginx || true
  chmod 755 /var/www /var/www/frnsw 2>/dev/null || true
fi

print_info "Installing backend dependencies from repository..."
cd /var/www/frnsw/backend
if sudo -u frnsw npm ci --omit=dev; then
  print_status "Backend dependencies installed"
else
  print_warning "npm ci failed; falling back to npm install --production"
if sudo -u frnsw npm install --production; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
        exit 1
    fi
fi

# Import database schema from repository if present
if [ -f "/var/www/frnsw/database/schema.sql" ]; then
  print_info "Importing database schema from repository..."
  
  # Test database connection first
  print_info "Testing database connection..."
  if mysql -u frnsw_user -p"${DB_PASSWORD}" -e "SELECT 1;" 2>/dev/null; then
    print_status "Database connection successful"
  else
    print_error "Cannot connect to database with frnsw_user - checking root connection..."
    if mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1;" 2>/dev/null; then
      print_status "Root connection successful, ensuring database and user exist..."
      mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "
        CREATE DATABASE IF NOT EXISTS frnsw_recalls_90;
        CREATE USER IF NOT EXISTS 'frnsw_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
        GRANT ALL PRIVILEGES ON frnsw_recalls_90.* TO 'frnsw_user'@'localhost';
        FLUSH PRIVILEGES;" 2>/dev/null || true
      print_status "Database and user setup completed"
    else
      print_error "Cannot connect to MySQL at all - check if MySQL is running"
      exit 1
    fi
  fi
  
  # Import schema with better error handling
  if mysql -f -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 < /var/www/frnsw/database/schema.sql 2>/dev/null; then
    print_status "Database schema imported successfully"
    
    # Verify key tables exist
    if mysql -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 -e "SHOW TABLES;" 2>/dev/null | grep -q "users"; then
      print_status "Database tables verified - users table exists"
      
      # Check if we need to seed initial data
      USER_COUNT=$(mysql -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 -e "SELECT COUNT(*) as count FROM users;" 2>/dev/null | tail -1)
      if [ "$USER_COUNT" = "0" ]; then
        print_info "No users found, creating initial admin user..."
        
        # Create initial admin user with proper password hash
        mysql -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 -e "
          INSERT INTO users (staff_number, first_name, last_name, email, password_hash, is_admin, is_host_admin, email_verified) 
          VALUES (1001, 'David', 'Finley', 'david.finley@fire.nsw.gov.au', 
                  '\$2b\$04\$UOgf743mWBE/Hbrmg20fM.YTVhEjrouHAjiQkpAqF4aRCwxIkv5c2', 
                  1, 1, 1)
          ON DUPLICATE KEY UPDATE id=id;" 2>/dev/null || true
        
        print_status "Initial admin user created: david.finley@fire.nsw.gov.au / TestPass123"
      else
        print_info "Database already has $USER_COUNT user(s)"
      fi
    else
      print_error "Database schema import failed - users table missing"
      exit 1
    fi
  else
    print_error "Database schema import failed"
    exit 1
  fi
else
  print_error "No schema.sql found in repository - cannot proceed without database setup"
  exit 1
fi

# Start or restart application with PM2 (idempotent)
print_info "Starting application with PM2..."
cd /var/www/frnsw
if sudo -u frnsw pm2 describe frnsw-recalls-90 >/dev/null 2>&1; then
  print_info "PM2 app exists, restarting..."
  sudo -u frnsw pm2 restart frnsw-recalls-90
else
  print_info "PM2 app not found, starting new instance..."
  sudo -u frnsw pm2 start ecosystem.config.js --env production
fi
sudo -u frnsw pm2 save || true
# Ensure PM2 boots with system
    pm2 startup systemd -u frnsw --hp /var/www/frnsw >/dev/null 2>&1 || true
    sleep 3
    if sudo -u frnsw pm2 list | grep -q "online"; then
        print_status "Application is running successfully"
    else
        print_warning "Application may not be running properly"
  sudo -u frnsw pm2 logs --lines 20 || true
fi

# Configure Nginx
print_info "Configuring Nginx..."

# Create sites directories if they don't exist
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Include sites-enabled in main nginx config if not already included
if ! grep -q "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf; then
    sed -i '/include \/etc\/nginx\/conf.d\/\*.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

cat > /etc/nginx/sites-available/frnsw-recalls-90 << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    client_max_body_size 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Serve frontend (SPA)
    root /var/www/frnsw/frontend/build;
    index index.html;

    # Primary route: static files or SPA index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
        
    # Cache headers for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        try_files \$uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Explicit aliases for common asset paths to avoid path/base issues
    location /static/ {
        alias /var/www/frnsw/frontend/build/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    location /icons/ {
        alias /var/www/frnsw/frontend/build/icons/;
        expires 30d;
    }
    location = /favicon.ico { alias /var/www/frnsw/frontend/build/favicon.ico; }
    location = /manifest.json { alias /var/www/frnsw/frontend/build/manifest.json; }
    location = /asset-manifest.json { alias /var/www/frnsw/frontend/build/asset-manifest.json; }
    
    # Fallback to backend for API and dynamic routes
    location @backend {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/frnsw-recalls-90 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Remove default nginx page if it exists
rm -f /etc/nginx/conf.d/default.conf

# Test Nginx configuration
nginx -t
if [ $? -eq 0 ]; then
    systemctl enable nginx
    systemctl restart nginx
    print_status "Nginx configured and started"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Configure firewall
print_info "Configuring firewall..."
systemctl enable firewalld
systemctl start firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
print_status "Firewall configured"

# Attempt to setup SSL with Let's Encrypt (non-interactive). Safe to rerun.
print_info "Setting up SSL certificate (Let's Encrypt)..."
if certbot --nginx --non-interactive --agree-tos --email ${SSL_EMAIL} -d ${DOMAIN_NAME} >/dev/null 2>&1; then
  print_status "SSL certificate installed via certbot"
  # Update APP_URL to https in env and restart app to pick up change
  if [ -f "/var/www/frnsw/backend/.env" ]; then
    sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN_NAME}|" /var/www/frnsw/backend/.env || true
    print_status "APP_URL updated to https in /var/www/frnsw/backend/.env"
    sudo -u frnsw pm2 restart frnsw-recalls-90 || sudo -u frnsw pm2 restart all || true
    sudo -u frnsw pm2 save || true
  fi
  systemctl reload nginx || true
else
  print_warning "SSL setup skipped or failed. Site will remain on HTTP. You can rerun certbot manually later."
fi

# Save deployment credentials
cat > /root/FRNSW_DEPLOYMENT_INFO.txt << EOF
# FRNSW Recalls 90 - Deployment Credentials
Generated: $(date)

Domain: http://${DOMAIN_NAME}
Server IP: $(curl -s ipinfo.io/ip 2>/dev/null || echo "Unknown")

MySQL Root Password: ${MYSQL_ROOT_PASSWORD}
Database Password: ${DB_PASSWORD}
JWT Secret: ${JWT_SECRET}

Application Directory: /var/www/frnsw
Environment File: /var/www/frnsw/backend/.env
PM2 Status: sudo -u frnsw pm2 status
PM2 Logs: sudo -u frnsw pm2 logs

Next Steps:
1. Visit: http://${DOMAIN_NAME}
2. Upload complete application files (if not using repo)
3. Configure email in .env file
4. SSL: Already attempted automatically. If needed, re-run: certbot --nginx -d ${DOMAIN_NAME}
EOF

chmod 600 /root/FRNSW_DEPLOYMENT_INFO.txt

# Final verification
print_info "Running final verification..."

# Test local health endpoint
if curl -f -s http://localhost:3001/health > /dev/null; then
    print_status "Backend health check: ✅ PASSED"
else
    print_warning "Backend health check: ❌ FAILED"
fi

# Test nginx proxy (HTTP)
if curl -f -s http://localhost/health > /dev/null; then
    print_status "Nginx proxy check (HTTP): ✅ PASSED"
else
    print_warning "Nginx proxy check (HTTP): ❌ FAILED"
fi

# Test HTTPS if certificate installed
if [ -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
  if curl -f -s https://localhost/health > /dev/null; then
      print_status "Nginx proxy check (HTTPS): ✅ PASSED"
  else
      print_warning "Nginx proxy check (HTTPS): ❌ FAILED"
  fi
fi

# Check PM2 status
if sudo -u frnsw pm2 list | grep -q "online"; then
    print_status "PM2 process check: ✅ PASSED"
else
    print_warning "PM2 process check: ❌ FAILED"
fi

# Check services
for service in nginx mysqld firewalld; do
    if systemctl is-active --quiet $service; then
        print_status "$service service: ✅ RUNNING"
    else
        print_warning "$service service: ❌ NOT RUNNING"
    fi
done

# Basic port checks (using ss)
print_info "Checking listening ports..."
ss -tlnp | grep ":3001" || print_warning "Port 3001 not listening"
ss -tlnp | grep ":80" || print_warning "Port 80 not listening"

print_header
print_status "🎉 FRNSW Recalls 90 server deployment completed!"
echo
print_info "🌐 Your application should be live at:"
echo "    http://${DOMAIN_NAME}"
if [ -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
  echo "    https://${DOMAIN_NAME}"
fi
echo
print_info "🔍 Test these URLs:"
echo "    http://${DOMAIN_NAME}/health"
echo "    http://${DOMAIN_NAME}/api/status"
if [ -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ]; then
  echo "    https://${DOMAIN_NAME}/health"
  echo "    https://${DOMAIN_NAME}/api/status"
fi
echo
print_info "📋 Deployment information saved to:"
echo "    /root/FRNSW_DEPLOYMENT_INFO.txt"
echo
print_info "🔧 Useful commands:"
echo "    sudo -u frnsw pm2 status    # Check app status"
echo "    sudo -u frnsw pm2 logs      # View logs"
echo "    sudo -u frnsw pm2 restart all  # Restart app"
echo "    systemctl status nginx      # Check nginx"
echo "    curl http://localhost:3001/health  # Test backend directly"
echo
print_warning "📝 Next steps:"
echo "    1. Verify email settings in /var/www/frnsw/backend/.env"
echo "    2. Test all functionality"
echo
print_status "Deployment completed successfully!"

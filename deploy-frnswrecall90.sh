#!/bin/bash

# FRNSW Recalls 90 - Automated Server Deployment Script
# Customized for frnswrecall90.interactivewebs.com
# Run this on a fresh AlmaLinux server as root

# Safer bash options: exit on error, on unset vars, and on pipe failures
set -Eeuo pipefail

# Pre-configured settings
DOMAIN_NAME="frnswrecall90.interactivewebs.com"
SSL_EMAIL="admin@fire.nsw.gov.au"

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

DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24)}"
print_info "Using application DB user password (auto-generated unless provided)."

JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"
print_info "Using JWT secret (auto-generated unless provided)."

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
  print_error "Failed to set MySQL root password automatically. Check /var/log/mysqld.log for the temporary password."
  exit 1
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

# Create package.json for backend
print_info "Creating backend structure..."
cat > /var/www/frnsw/backend/package.json << 'EOF'
{
  "name": "frnsw-recalls-90-backend",
  "version": "1.0.0",
  "description": "Backend for FRNSW Recalls 90",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "nodemailer": "^6.9.4",
    "socket.io": "^4.7.2",
    "web-push": "^3.6.3",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.10.0",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0",
    "moment": "^2.29.4",
    "cron": "^2.4.4"
  }
}
EOF

# Create minimal server.js for initial deployment
cat > /var/www/frnsw/backend/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'FRNSW Recalls 90 Server is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API route
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'FRNSW Recalls 90 API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚒 FRNSW Recalls 90 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
EOF

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

# Email Configuration (configure with your SMTP details)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@fire.nsw.gov.au
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@fire.nsw.gov.au

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

# Create simple frontend
print_info "Creating basic frontend..."
mkdir -p /var/www/frnsw/frontend/build
cat > /var/www/frnsw/frontend/build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FRNSW Recalls 90</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: #cc0000;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .status {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .success {
            color: #28a745;
            font-weight: bold;
        }
        .info {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #007bff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚒 FRNSW Recalls 90</h1>
        <p>Fire and Rescue NSW Menai Station 90 Recall Management System</p>
    </div>
    
    <div class="status">
        <h2 class="success">✅ Server Successfully Deployed!</h2>
        
        <div class="info">
            <h3>Deployment Status</h3>
            <p><strong>Domain:</strong> frnswrecall90.interactivewebs.com</p>
            <p><strong>Backend API:</strong> <a href="/api/status">/api/status</a></p>
            <p><strong>Health Check:</strong> <a href="/health">/health</a></p>
            <p><strong>Deployment Time:</strong> <span id="deployTime"></span></p>
        </div>
        
        <div class="info">
            <h3>Next Steps</h3>
            <ol>
                <li>Upload your complete application files</li>
                <li>Configure email settings</li>
                <li>Setup database schema</li>
                <li>Test all functionality</li>
            </ol>
        </div>
        
        <div class="info">
            <h3>Server Information</h3>
            <p><strong>Server Status:</strong> <span class="success">Running</span></p>
            <p><strong>Node.js:</strong> Ready</p>
            <p><strong>MySQL:</strong> Configured</p>
            <p><strong>SSL:</strong> Ready for setup</p>
        </div>
    </div>
    
    <script>
        document.getElementById('deployTime').textContent = new Date().toLocaleString();
        
        // Test API connectivity
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                console.log('API Status:', data);
            })
            .catch(error => {
                console.error('API Error:', error);
            });
    </script>
</body>
</html>
EOF

# Set proper ownership
chown -R frnsw:frnsw /var/www/frnsw

# Install backend dependencies
print_info "Installing backend dependencies..."
cd /var/www/frnsw/backend

# Install dependencies with error checking
if sudo -u frnsw npm install --production; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    print_info "Retrying with cache clean..."
    sudo -u frnsw npm cache clean --force
    sudo -u frnsw npm install --production
    if [ $? -eq 0 ]; then
        print_status "Backend dependencies installed after retry"
    else
        print_error "Failed to install backend dependencies after retry"
        exit 1
    fi
fi

# Create basic database schema
print_info "Creating basic database schema..."
cat > /var/www/frnsw/database/schema.sql << 'EOF'
-- Basic schema for FRNSW Recalls 90
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    staff_number INT UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_host_admin BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    notify BOOLEAN DEFAULT TRUE,
    total_recall_hours DECIMAL(10,2) DEFAULT 0,
    last_recall_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approved_staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    last_name VARCHAR(50) NOT NULL,
    first_initial CHAR(1) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert approved staff
INSERT INTO approved_staff (last_name, first_initial) VALUES 
('Finley', 'D'),
('Clarke', 'B'),
('White', 'C'),
('User1', 'T'),
('User2', 'T'),
('User3', 'T');
EOF

mysql -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 < /var/www/frnsw/database/schema.sql
print_status "Database schema created"

# Start application with PM2
print_info "Starting application with PM2..."
cd /var/www/frnsw

# Start PM2 with error checking
if sudo -u frnsw pm2 start ecosystem.config.js --env production; then
    sudo -u frnsw pm2 save
    # Setup PM2 to start on boot for user 'frnsw'
    pm2 startup systemd -u frnsw --hp /var/www/frnsw >/dev/null 2>&1 || true
    print_status "Application started with PM2"
    
    # Wait a moment and check if app is actually running
    sleep 3
    if sudo -u frnsw pm2 list | grep -q "online"; then
        print_status "Application is running successfully"
    else
        print_warning "Application may not be running properly"
        sudo -u frnsw pm2 logs --lines 10
    fi
else
    print_error "Failed to start application with PM2"
    print_info "Checking PM2 logs..."
    sudo -u frnsw pm2 logs --lines 10
    exit 1
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
    
    # Serve static files
    location / {
        root /var/www/frnsw/frontend/build;
        try_files \$uri \$uri/ @backend;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
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
2. Upload complete application files
3. Configure email in .env file
4. Setup SSL: certbot --nginx -d ${DOMAIN_NAME}
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

# Test nginx proxy
if curl -f -s http://localhost/health > /dev/null; then
    print_status "Nginx proxy check: ✅ PASSED"
else
    print_warning "Nginx proxy check: ❌ FAILED"
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
echo
print_info "🔍 Test these URLs:"
echo "    http://${DOMAIN_NAME}/health"
echo "    http://${DOMAIN_NAME}/api/status"
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
echo "    1. Upload your complete application files"
echo "    2. Configure email settings in /var/www/frnsw/backend/.env"
echo "    3. Setup SSL certificate: certbot --nginx -d ${DOMAIN_NAME}"
echo "    4. Test all functionality"
echo
print_status "Deployment completed successfully!"

#!/bin/bash

# FRNSW Recalls 90 - Automated Server Deployment Script
# Run this on a fresh Ubuntu 22.04 server as root

set -e  # Exit on any error

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
    echo "============================================"
    echo -e "${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_header

# Get deployment configuration
print_info "Setting up deployment configuration..."

# Prompt for essential configuration
read -p "Enter your domain name (e.g., recalls.fire.nsw.gov.au): " DOMAIN_NAME
read -p "Enter your email for SSL certificates: " SSL_EMAIL
read -s -p "Enter MySQL root password: " MYSQL_ROOT_PASSWORD
echo
read -s -p "Enter application database password: " DB_PASSWORD
echo
read -s -p "Enter JWT secret (min 32 characters): " JWT_SECRET
echo

if [[ ${#JWT_SECRET} -lt 32 ]]; then
    print_error "JWT secret must be at least 32 characters long"
    exit 1
fi

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System updated"

# Install Node.js 20
print_info "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
print_status "Node.js $(node --version) installed"

# Install MySQL
print_info "Installing MySQL..."
export DEBIAN_FRONTEND=noninteractive
apt install -y mysql-server
print_status "MySQL installed"

# Secure MySQL installation
print_info "Securing MySQL installation..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';"
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
apt install -y nginx
print_status "Nginx installed"

# Install additional tools
print_info "Installing additional tools..."
apt install -y git curl wget unzip certbot python3-certbot-nginx ufw
print_status "Additional tools installed"

# Create application user
print_info "Creating application user..."
if ! id "frnsw" &>/dev/null; then
    adduser --system --group --home /var/www/frnsw --shell /bin/bash frnsw
    usermod -aG sudo frnsw
fi
print_status "Application user created"

# Create application directory
print_info "Setting up application directory..."
mkdir -p /var/www/frnsw
chown frnsw:frnsw /var/www/frnsw

# Create a temporary directory for our files
TEMP_DIR="/tmp/frnsw-deploy"
mkdir -p $TEMP_DIR

# Since we can't clone directly, we'll create the application structure
print_info "Creating application structure..."

# Create backend structure
mkdir -p /var/www/frnsw/{backend,frontend,database,logs}
chown -R frnsw:frnsw /var/www/frnsw

# Create package.json for backend
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
    "uuid": "^9.0.0",
    "moment": "^2.29.4",
    "cron": "^2.4.4"
  }
}
EOF

# Create basic server.js (you'll need to upload your actual files)
cat > /var/www/frnsw/backend/server.js << 'EOF'
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'FRNSW Recalls 90 Server is running - Please upload application files'
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
  console.log(`Server running on port ${PORT}`);
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
APP_URL=https://${DOMAIN_NAME}
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
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
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

# Set proper ownership
chown -R frnsw:frnsw /var/www/frnsw

# Install backend dependencies
print_info "Installing backend dependencies..."
cd /var/www/frnsw/backend
sudo -u frnsw npm install --production
print_status "Backend dependencies installed"

# Create basic database schema
print_info "Creating basic database schema..."
cat > /var/www/frnsw/database/basic_schema.sql << 'EOF'
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

-- Insert some basic approved staff (you can modify this)
INSERT INTO approved_staff (last_name, first_initial) VALUES 
('Finley', 'D'),
('Clarke', 'B'),
('Test', 'U');
EOF

mysql -u frnsw_user -p"${DB_PASSWORD}" frnsw_recalls_90 < /var/www/frnsw/database/basic_schema.sql
print_status "Basic database schema created"

# Start application with PM2
print_info "Starting application with PM2..."
cd /var/www/frnsw
sudo -u frnsw pm2 start ecosystem.config.js --env production
sudo -u frnsw pm2 save
sudo -u frnsw pm2 startup | grep 'sudo env' | bash
print_status "Application started with PM2"

# Configure Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/frnsw-recalls-90 << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    location / {
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
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/frnsw-recalls-90 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
systemctl enable nginx
systemctl restart nginx
print_status "Nginx configured"

# Setup SSL with Let's Encrypt
print_info "Setting up SSL certificate..."
certbot --nginx --non-interactive --agree-tos --email ${SSL_EMAIL} -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}
print_status "SSL certificate installed"

# Configure firewall
print_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
print_status "Firewall configured"

# Create deployment info file
cat > /var/www/frnsw/DEPLOYMENT_INFO.md << EOF
# FRNSW Recalls 90 - Deployment Information

## Server Details
- **Domain**: https://${DOMAIN_NAME}
- **Server IP**: $(curl -s ipinfo.io/ip)
- **Deployment Date**: $(date)

## Application Status
- **Health Check**: https://${DOMAIN_NAME}/health
- **PM2 Status**: \`sudo -u frnsw pm2 status\`
- **Logs**: \`sudo -u frnsw pm2 logs\`

## Next Steps
1. Upload your application files to \`/var/www/frnsw/\`
2. Update database schema with your full schema file
3. Configure email settings in \`/var/www/frnsw/backend/.env\`
4. Restart application: \`sudo -u frnsw pm2 restart all\`

## Important Files
- Application: \`/var/www/frnsw/\`
- Environment: \`/var/www/frnsw/backend/.env\`
- PM2 Config: \`/var/www/frnsw/ecosystem.config.js\`
- Nginx Config: \`/etc/nginx/sites-available/frnsw-recalls-90\`
- Database: MySQL on localhost:3306

## Commands
- View logs: \`sudo -u frnsw pm2 logs\`
- Restart app: \`sudo -u frnsw pm2 restart all\`
- Check status: \`sudo -u frnsw pm2 status\`
- Nginx reload: \`systemctl reload nginx\`
EOF

print_header
print_status "🎉 FRNSW Recalls 90 server deployment completed!"
echo
print_info "Server Details:"
echo "  🌐 Domain: https://${DOMAIN_NAME}"
echo "  🔍 Health Check: https://${DOMAIN_NAME}/health"
echo "  📊 Server IP: $(curl -s ipinfo.io/ip)"
echo
print_info "Next Steps:"
echo "  1. Upload your application files to /var/www/frnsw/"
echo "  2. Configure email settings in /var/www/frnsw/backend/.env"
echo "  3. Upload your database schema"
echo "  4. Restart the application: sudo -u frnsw pm2 restart all"
echo
print_info "Useful Commands:"
echo "  📋 Check app status: sudo -u frnsw pm2 status"
echo "  📄 View logs: sudo -u frnsw pm2 logs"
echo "  🔄 Restart app: sudo -u frnsw pm2 restart all"
echo
print_warning "Remember to:"
echo "  - Configure your email SMTP settings"
echo "  - Upload your complete application code"
echo "  - Test all functionality"
echo "  - Setup regular backups"
echo
print_status "Deployment information saved to: /var/www/frnsw/DEPLOYMENT_INFO.md"
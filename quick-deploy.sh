#!/bin/bash

# FRNSW Recalls 90 - Quick Deploy Script
# This uploads your application to the server after running deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get server details
read -p "Enter your server IP address: " SERVER_IP
read -p "Enter your domain name: " DOMAIN_NAME

print_info "Preparing application files for upload..."

# Create a deployment package
DEPLOY_DIR="frnsw-deploy-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy application files (excluding node_modules and build artifacts)
rsync -av --exclude='node_modules' \
          --exclude='build' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='backend/__tests__' \
          backend/ "$DEPLOY_DIR/backend/"

rsync -av --exclude='node_modules' \
          --exclude='build' \
          --exclude='.git' \
          --exclude='*.log' \
          frontend/ "$DEPLOY_DIR/frontend/"

# Copy other important files
cp database/schema.sql "$DEPLOY_DIR/database/" 2>/dev/null || echo "No schema.sql found"
cp ecosystem.config.js "$DEPLOY_DIR/" 2>/dev/null || echo "No ecosystem.config.js found"

print_status "Application package created: $DEPLOY_DIR"

# Create upload script
cat > upload-to-server.sh << EOF
#!/bin/bash
echo "🚀 Uploading FRNSW Recalls 90 to server..."

# Upload files to server
scp -r "$DEPLOY_DIR"/* root@${SERVER_IP}:/var/www/frnsw/

# Run commands on server
ssh root@${SERVER_IP} << 'ENDSSH'
# Set ownership
chown -R frnsw:frnsw /var/www/frnsw

# Install backend dependencies
cd /var/www/frnsw/backend
sudo -u frnsw npm install --production

# Build frontend
cd /var/www/frnsw/frontend
sudo -u frnsw npm install
sudo -u frnsw npm run build

# Update database schema if provided
if [ -f "/var/www/frnsw/database/schema.sql" ]; then
    mysql -u frnsw_user -p frnsw_recalls_90 < /var/www/frnsw/database/schema.sql
    echo "Database schema updated"
fi

# Restart application
cd /var/www/frnsw
sudo -u frnsw pm2 restart all
sudo -u frnsw pm2 save

echo "✅ Application deployed successfully!"
echo "🌐 Visit: https://${DOMAIN_NAME}"
echo "🔍 Health check: https://${DOMAIN_NAME}/health"
ENDSSH
EOF

chmod +x upload-to-server.sh

print_status "Upload script created: upload-to-server.sh"
print_info "To complete deployment:"
echo "  1. Run: ./upload-to-server.sh"
echo "  2. Test: https://${DOMAIN_NAME}/health"
echo "  3. Configure email settings in /var/www/frnsw/backend/.env"
echo ""
print_info "Or manually upload with:"
echo "  scp -r $DEPLOY_DIR/* root@${SERVER_IP}:/var/www/frnsw/"

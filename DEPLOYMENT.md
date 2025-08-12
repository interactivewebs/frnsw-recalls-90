# FRNSW Recalls 90 - Server Deployment Guide

## 🚀 Quick Deploy to DigitalOcean (Recommended)

### Step 1: Create Server
1. Go to [DigitalOcean](https://digitalocean.com)
2. Create a Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic $24/month (4GB RAM, 2 vCPUs)
   - **Location**: Sydney (closest to NSW)
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `frnsw-recalls-90`

### Step 2: Initial Server Setup
```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install MySQL
apt install -y mysql-server

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Create application user
adduser --system --group --home /var/www/frnsw frnsw
```

### Step 3: Setup Database
```bash
# Secure MySQL installation
mysql_secure_installation

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE frnsw_recalls_90;
CREATE USER 'frnsw_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON frnsw_recalls_90.* TO 'frnsw_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Deploy Application
```bash
# Switch to app user
su - frnsw

# Clone your repository (you'll need to create a git repo first)
cd /var/www/frnsw
git clone https://github.com/your-username/frnsw-recalls-90.git .

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies and build
cd ../frontend
npm install
npm run build

# Create production environment file
cd ../backend
```

Create `.env` file:
```bash
# Database
DB_HOST=localhost
DB_USER=frnsw_user
DB_PASSWORD=your_secure_password_here
DB_NAME=frnsw_recalls_90

# JWT Secret (generate a strong secret)
JWT_SECRET=your_very_long_secure_jwt_secret_here

# Email Configuration
SMTP_HOST=your_smtp_server
SMTP_PORT=587
SMTP_USER=your_email@fire.nsw.gov.au
SMTP_PASS=your_email_password
FROM_EMAIL=noreply@fire.nsw.gov.au

# Application
APP_URL=https://your-domain.com
PORT=3001
NODE_ENV=production

# Security
BCRYPT_ROUNDS=12
TOKEN_EXPIRY=24h

# Web Push (generate VAPID keys)
VAPID_PUBLIC_KEY=generate_with_web_push_lib
VAPID_PRIVATE_KEY=generate_with_web_push_lib
VAPID_EMAIL=admin@fire.nsw.gov.au
```

```bash
# Import database schema
mysql -u frnsw_user -p frnsw_recalls_90 < ../database/schema.sql

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 5: Setup Nginx Reverse Proxy
```bash
# Exit back to root user
exit

# Create Nginx configuration
nano /etc/nginx/sites-available/frnsw-recalls-90
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (setup Let's Encrypt first)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Serve React build files
    location / {
        root /var/www/frnsw/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/frnsw-recalls-90 /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Install SSL Certificate (Let's Encrypt)
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com

# Start Nginx
systemctl enable nginx
systemctl start nginx
```

### Step 6: Setup Firewall
```bash
# Configure UFW firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 🔧 Alternative: One-Click Deploy Script

Run this on a fresh Ubuntu 22.04 server:

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/frnsw-recalls-90/main/deploy.sh | bash
```

## 📊 Monitoring & Maintenance

### View Application Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Database
```bash
# Create backup
mysqldump -u frnsw_user -p frnsw_recalls_90 > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u frnsw_user -p frnsw_recalls_90 < backup_file.sql
```

### Update Application
```bash
su - frnsw
cd /var/www/frnsw
git pull origin main
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart all
```

## 🛠 Development/Testing Server (Cheaper Option)

For testing only, you can use a smaller server:
- **DigitalOcean**: $12/month (2GB RAM, 1 vCPU)
- **Vultr**: $6/month (1GB RAM, 1 vCPU) - Very basic but works for testing

## 🔐 Security Checklist

- [ ] Use strong passwords for all accounts
- [ ] Enable SSH key authentication (disable password auth)
- [ ] Configure firewall (UFW)
- [ ] Setup SSL certificates
- [ ] Regular security updates
- [ ] Database user with minimal privileges
- [ ] Backup strategy in place
- [ ] Monitor logs regularly

## 📞 Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `/var/log/nginx/error.log`
3. Check database connectivity: `mysql -u frnsw_user -p`
4. Verify environment variables in `.env` file

## 💰 Cost Estimation

**Monthly Costs:**
- **Server**: $12-24/month (depending on specs)
- **Domain**: $10-15/year
- **SSL**: Free (Let's Encrypt)
- **Total**: ~$25-30/month

**One-time Setup:**
- Domain registration: $10-15
- Initial configuration: 2-4 hours of time

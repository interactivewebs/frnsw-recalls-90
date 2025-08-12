#!/bin/bash

# FRNSW Recalls 90 - Zero-touch Docker deployment
# One command on a fresh AlmaLinux/RHEL9 server:
#   curl -fsSL https://raw.githubusercontent.com/interactivewebs/frnsw-recalls-90/main/deploy-docker.sh | bash

set -Eeuo pipefail

DOMAIN_NAME=${DOMAIN_NAME:-frnswrecall90.interactivewebs.com}
APP_DIR=${APP_DIR:-/opt/frnsw}
REPO_URL=${REPO_URL:-https://github.com/interactivewebs/frnsw-recalls-90.git}

# Credentials (override via env if needed)
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-frnsw5678!@#}
MYSQL_DATABASE=${MYSQL_DATABASE:-frnsw_recalls_90}
MYSQL_USER=${MYSQL_USER:-frnsw_user}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-$(openssl rand -base64 24)}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 48)}

GREEN="\033[0;32m"; RED="\033[0;31m"; BLUE="\033[0;34m"; YELLOW="\033[1;33m"; NC="\033[0m"
ok(){ echo -e "${GREEN}✅ $*${NC}"; }
info(){ echo -e "${BLUE}ℹ️  $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $*${NC}"; }
err(){ echo -e "${RED}❌ $*${NC}"; }

header(){
  echo -e "${BLUE}\n============================================"
  echo   "🚒 FRNSW Recalls 90 - Docker Deployment"
  echo   "Domain: ${DOMAIN_NAME}"
  echo -e "============================================${NC}\n"
}

require_root(){ if [[ $EUID -ne 0 ]]; then err "Run as root"; exit 1; fi; }

install_docker(){
  info "Installing Docker and Compose..."
  dnf -y install yum-utils >/dev/null
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo >/dev/null 2>&1 || true
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker
  ok "Docker installed"
}

prepare_dirs(){
  info "Preparing directories at ${APP_DIR}..."
  mkdir -p "${APP_DIR}"/{data/mysql,nginx,app}
  ok "Directories ready"
}

clone_repo(){
  info "Fetching application repo..."
  if [[ ! -d "${APP_DIR}/app/.git" ]]; then
    git clone --depth 1 "${REPO_URL}" "${APP_DIR}/app" >/dev/null
  else
    (cd "${APP_DIR}/app" && git pull --ff-only >/dev/null) || true
  fi
  ok "Repository synced"
}

write_backend_dockerfile(){
  cat > "${APP_DIR}/app/backend/Dockerfile" <<'DF'
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . ./
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["node","server.js"]
DF
}

write_nginx_conf(){
  cat > "${APP_DIR}/nginx/nginx.conf" <<NGINX
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events { worker_connections 1024; }

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile        on;
  keepalive_timeout  65;
  gzip on;

  server {
    listen 80;
    server_name ${DOMAIN_NAME};
    client_max_body_size 10m;

    location /api/ {
      proxy_pass http://backend:3001;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
      proxy_pass http://backend:3001/health;
    }

    # Optional: serve static landing page if present
    root   /usr/share/nginx/html;
    index  index.html index.htm;
    try_files $uri @api_fallback;

    location @api_fallback {
      proxy_pass http://backend:3001;
    }
  }
}
NGINX

  # Minimal landing page
  mkdir -p "${APP_DIR}/nginx/html"
  cat > "${APP_DIR}/nginx/html/index.html" <<HTML
<!DOCTYPE html><html><head><meta charset="utf-8"/><title>FRNSW Recalls 90</title></head>
<body style="font-family:Arial,sans-serif;padding:40px"><h1>🚒 FRNSW Recalls 90</h1>
<p>Backend health: <a href="/health">/health</a></p>
<p>API status: <a href="/api/status">/api/status</a></p></body></html>
HTML
}

write_compose(){
  cat > "${APP_DIR}/docker-compose.yml" <<COMPOSE
name: frnsw-recalls-90
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD}"
      MYSQL_DATABASE: "${MYSQL_DATABASE}"
      MYSQL_USER: "${MYSQL_USER}"
      MYSQL_PASSWORD: "${MYSQL_PASSWORD}"
    command: ["mysqld","--default-authentication-plugin=mysql_native_password"]
    volumes:
      - ${APP_DIR}/data/mysql:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL","mysqladmin ping -uroot -p${MYSQL_ROOT_PASSWORD} --silent"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ${APP_DIR}/app/backend
      dockerfile: Dockerfile
    environment:
      DB_HOST: db
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      DB_NAME: ${MYSQL_DATABASE}
      JWT_SECRET: ${JWT_SECRET}
      APP_URL: http://localhost
      PORT: 3001
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ${APP_DIR}/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ${APP_DIR}/nginx/html:/usr/share/nginx/html:ro
    depends_on:
      - backend
COMPOSE
}

bring_up(){
  info "Building and starting containers..."
  (cd "${APP_DIR}" && docker compose pull db >/dev/null 2>&1 || true)
  (cd "${APP_DIR}" && docker compose build --no-cache backend >/dev/null)
  (cd "${APP_DIR}" && docker compose up -d)
  ok "Stack started"
}

post_checks(){
  info "Waiting for backend health..."
  for i in {1..30}; do
    if curl -fsS http://localhost/health >/dev/null 2>&1; then ok "Health OK"; break; fi
    sleep 2
  done
  info "Services:"; docker compose -f "${APP_DIR}/docker-compose.yml" ps
  echo -e "\nLanding page: http://${DOMAIN_NAME}/\nHealth: http://${DOMAIN_NAME}/health\n"
}

main(){
  header; require_root; install_docker; prepare_dirs; clone_repo; write_backend_dockerfile; write_nginx_conf; write_compose; bring_up; post_checks
}

main "$@"




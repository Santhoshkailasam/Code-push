# 🏢 Netlify to Self-Hosted Server Migration Guide
### Complete Production Manual: Moving CodePush from Netlify to Your Own Dedicated VPS / Cloud Server

---

## 📑 Table of Contents
1. [Architecture Overview: Netlify vs. Self-Hosted](#1-architecture-overview-netlify-vs-self-hosted)
2. [Zero Code Rewrite: The Express Server Adapter](#2-zero-code-rewrite-the-express-server-adapter)
3. [Step-by-Step Migration Plan](#3-step-by-step-migration-plan)
4. [Deployment Option A: Docker & Docker Compose (Recommended)](#4-deployment-option-a-docker--docker-compose-recommended)
5. [Deployment Option B: Bare-Metal Ubuntu VPS (PM2 + Nginx)](#5-deployment-option-b-bare-metal-ubuntu-vps-pm2--nginx)
6. [SSL Termination & Domain DNS Setup](#6-ssl-termination--domain-dns-setup)
7. [Zero-Downtime Cutover & Mobile SDK Compatibility](#7-zero-downtime-cutover--mobile-sdk-compatibility)
8. [Updating CI/CD Workflows (GitHub Actions)](#8-updating-cicd-workflows-github-actions)
9. [Production Security Hardening & Backups](#9-production-security-hardening--backups)
10. [Troubleshooting & Verification Checklist](#10-troubleshooting--verification-checklist)

---

## 1. Architecture Overview: Netlify vs. Self-Hosted

Currently, your CodePush deployment runs on **Netlify** using serverless edge functions and static SPA hosting. Moving to your own server gives you **unlimited request concurrency**, **zero function timeout limits (Netlify 10s limit removed)**, **full disk storage control for large binary bundles**, and **drastically lower long-term operating costs**.

```
CURRENT (Netlify Serverless):
┌───────────────────────────┐
│     Client / Browser      │
└─────────────┬─────────────┘
              │ (HTTPS)
              ▼
┌───────────────────────────┐     ┌──────────────────────────┐
│   Netlify Edge Router     │────►│  Static Frontend (dist)  │
│  (10s timeout limit)      │     └──────────────────────────┘
└─────────────┬─────────────┘
              │ Calls /.netlify/functions/*
              ▼
┌───────────────────────────┐     ┌──────────────────────────┐
│ Netlify Serverless Lambdas│────►│ Remote PostgreSQL DB     │
└───────────────────────────┘     └──────────────────────────┘

TARGET (Self-Hosted Dedicated Server / VPS):
┌───────────────────────────┐
│  Mobile Apps / Dashboard  │
└─────────────┬─────────────┘
              │ (HTTPS :443)
              ▼
┌────────────────────────────────────────────────────────┐
│   Nginx Reverse Proxy + SSL (Certbot Let's Encrypt)    │
│   • Gzip/Brotli Compression & Rate Limiting            │
│   • Backward-compatible route aliases                  │
└──────────────┬──────────────────────────┬──────────────┘
               │ (Proxy pass :5000)       │ (Static files)
               ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────┐
│  Node.js + Express App Server│  │ Frontend SPA (dist/) │
│  (PM2 Cluster / Docker)      │  └──────────────────────┘
└──────────────┬───────────────┘
               │
       ┌───────┴───────────────────────┐
       ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────┐
│ PostgreSQL (Local or Cloud)  │ │ Local / S3 Bundles   │
│ codepush_schema              │ │ Persistent Storage   │
└──────────────────────────────┘ └──────────────────────┘
```

### Key Differences & Benefits

| Feature | Netlify Serverless (Current) | Self-Hosted VPS / Docker (Target) |
| :--- | :--- | :--- |
| **Max Request Timeout** | 10 seconds (hard limit) | **Unlimited** (ideal for large 100MB+ OTA uploads) |
| **Execution Model** | Ephemeral functions (cold starts) | **Persistent Node.js Process** (0ms cold start) |
| **Bundle Storage** | Ephemeral disk (must use external DB/S3) | **Direct local NVMe / block storage** or S3 |
| **Cost at Scale** | Charges per million invocations & bandwidth | **Fixed VPS cost** ($10-$40/mo for millions of pings) |
| **Rate Limiting** | Netlify platform rules | **Nginx level fine-grained IP & API rate-limiting** |
| **P2P Mesh Discovery** | 5-minute memory cache resets on cold boot | **Persistent in-memory state & WebSockets** |

---

## 2. Zero Code Rewrite: The Express Server Adapter

You do **NOT** need to rewrite your existing 16 Netlify functions (`check-update.cjs`, `publish-release.cjs`, `mesh-relay.cjs`, etc.). 

A lightweight **Express Server Adapter** maps incoming Express HTTP requests `(req, res)` directly to Netlify's `(event, context)` signature. It allows your existing functions to run unmodified on your own server.

Create this file at `server.cjs` (or `server/index.cjs`):

```javascript
// server.cjs - Standalone Express Adapter for CodePush Netlify Functions
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '150mb' })); // Large payload support for OTA zip bundles
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Helper to convert Express req to Netlify event object
function createNetlifyEvent(req) {
  return {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query || {},
    body: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
    path: req.path,
    isBase64Encoded: false,
  };
}

// Helper to dispatch to a Netlify function handler
function createFunctionHandler(functionFileName) {
  const functionPath = path.resolve(__dirname, 'netlify/functions', functionFileName);
  let handler;
  try {
    handler = require(functionPath).handler;
  } catch (err) {
    console.error(`Failed to load function: ${functionFileName}`, err);
    return (req, res) => res.status(500).json({ error: `Function ${functionFileName} not found` });
  }

  return async (req, res) => {
    try {
      const event = createNetlifyEvent(req);
      const context = {};
      const response = await handler(event, context);

      // Forward response headers
      if (response.headers) {
        Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
      }

      res.status(response.statusCode || 200);

      try {
        const parsed = JSON.parse(response.body);
        res.json(parsed);
      } catch {
        res.send(response.body);
      }
    } catch (err) {
      console.error(`Error in ${functionFileName}:`, err);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  };
}

// -------------------------------------------------------------
// Route Mappings (Supports both /.netlify/functions/ and /api/)
// -------------------------------------------------------------
const functions = [
  { route: 'check-update', file: 'check-update.cjs' },
  { route: 'download-bundle', file: 'download-bundle.cjs' },
  { route: 'publish-release', file: 'publish-release.cjs' },
  { route: 'releases', file: 'releases.cjs' },
  { route: 'projects', file: 'projects.cjs' },
  { route: 'remote-config', file: 'remote-config.cjs' },
  { route: 'report-crash', file: 'report-crash.cjs' },
  { route: 'report-status', file: 'report-status.cjs' },
  { route: 'send-alert', file: 'send-alert.cjs' },
  { route: 'send-push-notification', file: 'send-push-notification.cjs' },
  { route: 'auto-patch', file: 'auto-patch.cjs' },
  { route: 'mesh-relay', file: 'mesh-relay.cjs' },
  { route: 'auth', file: 'auth.cjs' },
  { route: 'github-webhook', file: 'github-webhook.cjs' },
];

functions.forEach(({ route, file }) => {
  const handler = createFunctionHandler(file);
  // Support both legacy Netlify URL and new REST URL
  app.all(`/.netlify/functions/${route}`, handler);
  app.all(`/api/${route}`, handler);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), server: 'CodePush-SelfHosted' });
});

// Serve compiled React frontend
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA Catch-all route
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CodePush Self-Hosted Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Legacy Netlify route support: ACTIVE (/.netlify/functions/*)`);
  console.log(`🌐 Modern API route support: ACTIVE (/api/*)`);
});
```

---

## 3. Step-by-Step Migration Plan

```
┌────────────────────────────────────────────────────────┐
│                  MIGRATION CHECKLIST                   │
├────────────────────────────────────────────────────────┤
│ [ ] Step 1: Provision Cloud VPS (Ubuntu 22.04/24.04)   │
│ [ ] Step 2: Configure Environment Variables (.env)     │
│ [ ] Step 3: Install Docker OR Setup Node.js + PM2      │
│ [ ] Step 4: Configure Nginx Reverse Proxy              │
│ [ ] Step 5: Issue Free SSL Certificate (Certbot)       │
│ [ ] Step 6: Test Health & Endpoints with curl          │
│ [ ] Step 7: Update DNS Records (A / CNAME)             │
│ [ ] Step 8: Update Mobile App CONFIG.serverUrl         │
│ [ ] Step 9: Setup Automated PostgreSQL Backups         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Deployment Option A: Docker & Docker Compose (Recommended)

Docker provides an isolated, portable, reproducible production environment that runs identically on any cloud provider (AWS EC2, DigitalOcean Droplet, Hetzner, Linode, Google Cloud Compute).

### Step 4.1: Create `Dockerfile`
Create `Dockerfile` in the `frontend/` directory:

```dockerfile
# Multi-stage Dockerfile for CodePush Self-Hosted
# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm install express cors dotenv

# Copy built frontend assets and function source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/netlify ./netlify
COPY --from=builder /app/db ./db
COPY server.cjs ./server.cjs

EXPOSE 5000

USER node
CMD ["node", "server.cjs"]
```

### Step 4.2: Create `docker-compose.yml`
Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  codepush-app:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: codepush-server
    restart: always
    ports:
      - "127.0.0.1:5000:5000"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - DATABASE_URL=postgres://mxmw:YOUR_PASSWORD@187.127.162.246:5434/codepush?options=-csearch_path%3Dcodepush_schema,public
      - JWT_SECRET=your_super_secure_jwt_secret_change_this_in_prod
      - FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
    volumes:
      - codepush_bundles:/app/bundle-storage

volumes:
  codepush_bundles:
    driver: local
```

### Step 4.3: Build & Start Containers
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

---

## 5. Deployment Option B: Bare-Metal Ubuntu VPS (PM2 + Nginx)

If you prefer deploying directly to an Ubuntu server without Docker:

### Step 5.1: Initial Server Setup
Connect to your fresh Ubuntu 22.04 or 24.04 VPS:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Essential Utilities
sudo apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# Configure UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 5.2: Install Node.js 20 LTS & PM2
```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager globally
sudo npm install -g pm2
```

### Step 5.3: Clone Repository & Build
```bash
# Clone project into /var/www
sudo mkdir -p /var/www/codepush
sudo chown -R $USER:$USER /var/www/codepush
git clone https://github.com/your-username/codepush.git /var/www/codepush
cd /var/www/codepush/frontend

# Install dependencies and build frontend
npm install
npm install express cors dotenv
npm run build
```

### Step 5.4: Setup Production Environment Variables
Create `/var/www/codepush/frontend/.env`:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgres://mxmw:YOUR_PASSWORD@187.127.162.246:5434/codepush?options=-csearch_path%3Dcodepush_schema,public
JWT_SECRET=production_random_secret_string_minimum_32_chars
```

### Step 5.5: Configure PM2 for Zero-Downtime Clustering
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'codepush-server',
      script: './server.cjs',
      instances: 'max',       // Utilize all CPU cores in cluster mode
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

Launch with PM2:
```bash
# Start cluster
pm2 start ecosystem.config.js --env production

# Ensure PM2 restarts automatically on server reboot
pm2 startup
pm2 save
```

---

## 6. SSL Termination & Domain DNS Setup

### Step 6.1: Nginx Configuration
Create `/etc/nginx/sites-available/codepush.conf`:

```nginx
# Rate limiting zone (100 req/min per IP with burst of 30)
limit_req_zone $binary_remote_addr zone=codepush_limit:10m rate=100r/m;

server {
    listen 80;
    server_name codepush.yourdomain.com;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    # Max upload size for 100MB+ React Native bundles
    client_max_body_size 150M;

    # Static Frontend SPA
    root /var/www/codepush/frontend/dist;
    index index.html;

    # Forward API and Legacy Netlify endpoints to Node.js backend
    location ~ ^/(\.netlify/functions|api)/ {
        limit_req zone=codepush_limit burst=30 nodelay;

        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for large bundle uploads
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Static Assets Caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/codepush.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6.2: Obtain Free HTTPS SSL Certificate
```bash
sudo certbot --nginx -d codepush.yourdomain.com
```
*Certbot will automatically install the certificate, configure HTTPS on port 443, and set up automatic renewal via systemd timer.*

---

## 7. Zero-Downtime Cutover & Mobile SDK Compatibility

### Backward Compatibility Guarantee
> [!IMPORTANT]
> Because mobile apps already installed on users' phones are pinging `https://codepushs.netlify.app/.netlify/functions/check-update`, **you must not break them**.

The Nginx configuration and Express adapter retain support for:
1. `/.netlify/functions/check-update`
2. `/.netlify/functions/download-bundle`
3. `/api/check-update`
4. `/api/download-bundle`

### Netlify Cloud Redirect (Cutover Step)
When you switch DNS, update `netlify.toml` on your old Netlify site to proxy or redirect traffic to your new server seamlessly:

```toml
# Old Netlify netlify.toml during transition
[[redirects]]
  from = "/.netlify/functions/*"
  to = "https://codepush.yourdomain.com/.netlify/functions/:splat"
  status = 301
  force = true

[[redirects]]
  from = "/*"
  to = "https://codepush.yourdomain.com/:splat"
  status = 301
  force = true
```

### Update Mobile SDK Configuration
In your React Native project, update `src/services/CodePushService.ts`:

```typescript
const CONFIG = {
  // Update from https://codepushs.netlify.app to your new domain
  serverUrl: 'https://codepush.yourdomain.com',
  appId: 'your_app_id',
  apiKey: 'your_api_key',
  appName: 'SkillSwap',
  version: '1.0.0',
};
```

---

## 8. Updating CI/CD Workflows (GitHub Actions)

When you deploy via your own server, replace the Netlify deployment step in `.github/workflows/codepush-release.yml` with direct deployment via **SSH rsync** or **Docker Registry**:

```yaml
# Add to .github/workflows/deploy-server.yml
name: Deploy CodePush to Self-Hosted Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/codepush/frontend
            git pull origin main
            npm install
            npm run build
            pm2 reload ecosystem.config.js --env production
```

---

## 9. Production Security Hardening & Backups

### 9.1: Automated Daily PostgreSQL Backups
Create a backup script `/usr/local/bin/backup-codepush-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/codepush"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Dump database
pg_dump -d "postgres://mxmw:YOUR_PASSWORD@187.127.162.246:5434/codepush" -F c -b -v -f "$BACKUP_DIR/codepush_$TIMESTAMP.dump"

# Retain only last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -exec rm {} \;
```

Set up Cron job (`crontab -e`):
```cron
# Run daily at 03:00 AM UTC
0 3 * * * /usr/local/bin/backup-codepush-db.sh > /var/log/codepush-backup.log 2>&1
```

### 9.2: Fail2Ban Protection
Prevent brute-force SSH and API attacks:
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 10. Troubleshooting & Verification Checklist

Once your self-hosted server is running, verify all endpoints using `curl`:

| Test Command | Expected Result |
| :--- | :--- |
| `curl -I https://codepush.yourdomain.com/health` | `HTTP/2 200` with JSON `{ status: 'healthy' }` |
| `curl -I https://codepush.yourdomain.com/.netlify/functions/check-update` | `HTTP/2 200` (Legacy Netlify route active) |
| `curl -I https://codepush.yourdomain.com/api/check-update` | `HTTP/2 200` (Modern API route active) |
| `curl -I https://codepush.yourdomain.com/` | `HTTP/2 200` (Frontend Dashboard loaded) |
| `pm2 status` | All cluster instances showing `online` status |
| `sudo nginx -t` | `syntax is ok / test is successful` |

> [!TIP]
> Keep this document handy when planning your infrastructure migration. Because the Express adapter supports both legacy Netlify routes (`/.netlify/functions/*`) and standard API routes (`/api/*`), you can switch traffic with **zero disruption** to your active mobile users.

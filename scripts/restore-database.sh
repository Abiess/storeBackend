#!/bin/bash

# Database Restore Script
# Stellt ein Backup der PostgreSQL Datenbank wieder her

BACKUP_DIR="/opt/storebackend/backups/database"

echo "🔄 Store Backend - Database Restore"
echo "===================================="
echo ""

# Liste verfügbare Backups
echo "📋 Available backups:"
ls -lht $BACKUP_DIR/storedb-*.sql.gz 2>/dev/null | head -10

echo ""
echo "Enter the backup filename to restore (e.g., storedb-20250117-120000.sql.gz):"
read BACKUP_FILE

FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$FULL_PATH" ]; then
    echo "❌ Backup file not found: $FULL_PATH"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will replace the current database!"
echo "Do you want to continue? (yes/no)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Stoppe Application
echo "⏹️  Stopping application..."
sudo systemctl stop storebackend

# Backup der aktuellen DB
echo "💾 Creating backup of current database..."
sudo -u postgres pg_dump storedb > "$BACKUP_DIR/storedb-pre-restore-$(date +%Y%m%d-%H%M%S).sql"

# Restore
echo "🔄 Restoring database..."
gunzip -c "$FULL_PATH" | sudo -u postgres psql storedb

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"

    # Starte Application
    echo "🚀 Starting application..."
    sudo systemctl start storebackend

    echo "✅ Restore completed!"
else
    echo "❌ Restore failed!"
    exit 1
fi
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS (wird von Certbot automatisch hinzugefügt)
    # return 301 https://$server_name$request_uri;

    # Logging
    access_log /var/log/nginx/storebackend-access.log;
    error_log /var/log/nginx/storebackend-error.log;

    # Client Upload Limit (für Datei-Uploads)
    client_max_body_size 50M;

    # Proxy zu Spring Boot Application
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket Support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Health Check Endpoint (ohne Logging)
    location /actuator/health {
        proxy_pass http://localhost:8080/actuator/health;
        access_log off;
    }

    # Static Files (falls vorhanden)
    location /static/ {
        alias /opt/storebackend/static/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;
}

# SSL Configuration (wird von Certbot hinzugefügt)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com www.your-domain.com;
#
#     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
#     include /etc/letsencrypt/options-ssl-nginx.conf;
#     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
#
#     # ... Rest der Configuration wie oben ...
# }


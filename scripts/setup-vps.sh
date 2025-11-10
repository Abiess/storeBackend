#!/bin/bash

# VPS Setup Script für Store Backend
# Dieses Script bereitet Ihren VPS für das Deployment vor

set -e

echo "🔧 Setting up VPS for Store Backend deployment..."

# Update System
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Java 17 installieren
echo "☕ Installing Java 17..."
sudo apt install -y openjdk-17-jdk

# PostgreSQL installieren
echo "🗄️  Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL starten und aktivieren
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Datenbank und User erstellen
echo "🔐 Setting up database..."
sudo -u postgres psql << EOF
CREATE DATABASE storedb;
CREATE USER storeuser WITH ENCRYPTED PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE storedb TO storeuser;
ALTER DATABASE storedb OWNER TO storeuser;
\q
EOF

# Benutzer für Application erstellen
echo "👤 Creating application user..."
sudo useradd -r -s /bin/bash -d /opt/storebackend storebackend || true

# Verzeichnisse erstellen
echo "📁 Creating directories..."
sudo mkdir -p /opt/storebackend/{scripts,backups}
sudo mkdir -p /var/log/storebackend
sudo chown -R storebackend:storebackend /opt/storebackend
sudo chown -R storebackend:storebackend /var/log/storebackend

# Nginx installieren (Reverse Proxy)
echo "🌐 Installing Nginx..."
sudo apt install -y nginx

# Nginx Configuration
echo "⚙️  Configuring Nginx..."
sudo tee /etc/nginx/sites-available/storebackend > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # ÄNDERN SIE DIES

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
    }

    # Health Check Endpoint
    location /actuator/health {
        proxy_pass http://localhost:8080/actuator/health;
        access_log off;
    }
}
EOF

# Nginx aktivieren
sudo ln -sf /etc/nginx/sites-available/storebackend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Firewall konfigurieren
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# SSL mit Let's Encrypt (optional)
echo "🔒 Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "✅ VPS Setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Generieren Sie ein JWT Secret:"
echo "   openssl rand -base64 64"
echo ""
echo "2. Fügen Sie folgende Secrets in GitHub hinzu:"
echo "   - VPS_HOST: Ihre VPS IP-Adresse"
echo "   - VPS_USER: root oder Ihr SSH User"
echo "   - VPS_SSH_KEY: Ihr privater SSH Key"
echo "   - VPS_PORT: 22 (oder Ihr SSH Port)"
echo "   - DB_PASSWORD: Ihr PostgreSQL Passwort"
echo "   - JWT_SECRET: Das generierte JWT Secret"
echo ""
echo "3. SSL Zertifikat einrichten:"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""
echo "4. SystemD Service installieren:"
echo "   sudo cp /opt/storebackend/scripts/storebackend.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable storebackend"
echo ""
echo "5. Push zu GitHub um das Deployment zu starten!"


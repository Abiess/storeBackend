### Mit Command Line:

```bash
# Von Ihrem lokalen PC:

# Haupt-Domain
nslookup markt.ma

# App/Backend
nslookup app.markt.ma

# MinIO
nslookup minio.markt.ma

# Wildcard (Test-Subdomain)
nslookup testshop.markt.ma

# Alle sollten Ihre VPS-IP zurückgeben
```

---

## 🔒 SSL-Zertifikate mit Let's Encrypt

Nachdem DNS korrekt konfiguriert ist, können Sie SSL-Zertifikate erstellen:

```bash
# Auf Ihrem VPS:

# Für Haupt-Domain und Subdomains
sudo certbot --nginx -d markt.ma -d www.markt.ma -d app.markt.ma

# Für MinIO
sudo certbot --nginx -d minio.markt.ma -d console.minio.markt.ma

# Wildcard-Zertifikat (erfordert DNS-Challenge)
sudo certbot certonly --manual --preferred-challenges dns -d "*.markt.ma" -d markt.ma
```

**Wichtig für Wildcard:**
- Sie müssen TXT-Records temporär erstellen (Certbot zeigt Ihnen wie)
- Format: `_acme-challenge.markt.ma` → `RANDOM_STRING`

---

## 🧪 Testing nach DNS-Setup

### 1. Test von extern (Ihr lokaler PC):

```bash
# Backend Health Check
curl https://app.markt.ma/actuator/health

# Sollte zurückgeben:
# {"status":"UP"}

# MinIO (wird 403 geben, aber zeigt dass es erreichbar ist)
curl https://minio.markt.ma

# Store-Subdomain (nachdem ein Store erstellt wurde)
curl https://testshop.markt.ma/api/public/store/resolve?host=testshop.markt.ma
```

### 2. Test von VPS:

```bash
# Auf dem VPS:
curl -I https://app.markt.ma
curl -I https://minio.markt.ma
curl -I https://console.minio.markt.ma
```

---

## 📊 Subdomain-Übersicht

| Subdomain | Zweck | Service | Port | SSL |
|-----------|-------|---------|------|-----|
| markt.ma | Haupt-Website/Landing | Nginx | 443 | ✅ |
| www.markt.ma | Redirect zu markt.ma | Nginx | 443 | ✅ |
| app.markt.ma | Backend REST API | Spring Boot | 8080 | ✅ |
| minio.markt.ma | MinIO S3 API | MinIO | 9000 | ✅ |
| console.minio.markt.ma | MinIO Admin Console | MinIO | 9001 | ✅ |
| *.markt.ma | Store-Subdomains | Angular Frontend | - | ✅ |

---

## 🔄 Custom Domains für Stores

Wenn ein Store-Owner eine eigene Domain verwenden will (z.B. `shop.customer.com`):

### Im Backend:

1. Store-Owner erstellt Domain über API:
   ```json
   POST /api/stores/{storeId}/domains
   {
     "host": "shop.customer.com",
     "type": "CUSTOM"
   }
   ```

2. Backend gibt Verification-Token zurück

3. Store-Owner muss DNS-Record erstellen:
   ```
   TXT  _marktma-verification.shop.customer.com  "TOKEN_VALUE"
   ```

4. Nach Verification: A-Record zeigt auf VPS:
   ```
   A    shop.customer.com    YOUR_VPS_IP
   ```

5. SSL-Zertifikat erstellen:
   ```bash
   sudo certbot --nginx -d shop.customer.com
   ```

---

## 🚨 Troubleshooting

### Problem: Domain nicht erreichbar

```bash
# DNS prüfen
nslookup app.markt.ma

# Sollte Ihre VPS-IP zeigen
# Falls nicht: DNS-Propagation abwarten (bis zu 24h)

# Firewall prüfen
sudo ufw status
# Port 80 und 443 müssen offen sein!

# Nginx prüfen
sudo nginx -t
sudo systemctl status nginx
```

### Problem: SSL-Zertifikat schlägt fehl

```bash
# Port 80 muss für Certbot erreichbar sein
sudo ufw allow 80/tcp

# Nginx muss laufen
sudo systemctl start nginx

# DNS muss korrekt sein (vorher prüfen!)
nslookup app.markt.ma
```

### Problem: Wildcard funktioniert nicht

```bash
# Wildcard-Record prüfen
nslookup testshop.markt.ma

# Muss Ihre VPS-IP zeigen
# Falls nicht: Wildcard-Record (*.markt.ma) im DNS-Provider erstellen
```

---

## 📝 Checkliste DNS-Setup

- [ ] VPS-IP-Adresse notiert
- [ ] Haupt-Domain (markt.ma) → VPS-IP
- [ ] www.markt.ma → VPS-IP
- [ ] app.markt.ma → VPS-IP
- [ ] minio.markt.ma → VPS-IP
- [ ] console.minio.markt.ma → VPS-IP
- [ ] Wildcard (*.markt.ma) → VPS-IP
- [ ] DNS-Propagation abgewartet (5-60 Min)
- [ ] DNS mit nslookup/dig geprüft
- [ ] SSL-Zertifikate mit Certbot erstellt
- [ ] HTTPS funktioniert für alle Domains
- [ ] Backend API erreichbar (curl Test)
- [ ] MinIO Console erreichbar

---

**Nach erfolgreichem DNS-Setup können Sie mit dem VPS-Deployment fortfahren!**

Siehe: `VPS_DEPLOYMENT_GUIDE.md`
# DNS-Konfiguration für markt.ma

## Übersicht

Diese Anleitung zeigt, wie Sie die DNS-Records für Ihre Domain **markt.ma** konfigurieren müssen, damit alle Subdomains und Services korrekt funktionieren.

---

## 🌐 Benötigte DNS-Records

Ersetzen Sie `YOUR_VPS_IP` mit der tatsächlichen IP-Adresse Ihres VPS.

### 1. Haupt-Domain

| Typ | Name | Wert | TTL | Zweck |
|-----|------|------|-----|-------|
| A | @ | YOUR_VPS_IP | 3600 | Haupt-Domain markt.ma |
| A | www | YOUR_VPS_IP | 3600 | www.markt.ma Redirect |

### 2. Platform/Backend

| Typ | Name | Wert | TTL | Zweck |
|-----|------|------|-----|-------|
| A | app | YOUR_VPS_IP | 3600 | Backend API (app.markt.ma) |

### 3. MinIO Object Storage

| Typ | Name | Wert | TTL | Zweck |
|-----|------|------|-----|-------|
| A | minio | YOUR_VPS_IP | 3600 | MinIO API (minio.markt.ma) |
| A | console.minio | YOUR_VPS_IP | 3600 | MinIO Admin Console |

### 4. Wildcard für Store-Subdomains

| Typ | Name | Wert | TTL | Zweck |
|-----|------|------|-----|-------|
| A | * | YOUR_VPS_IP | 3600 | Alle Store-Subdomains (*.markt.ma) |

---

## 📋 Beispiel: Komplette DNS-Konfiguration

Wenn Ihre VPS-IP z.B. `203.0.113.45` ist:

```
A    @                  203.0.113.45    3600
A    www                203.0.113.45    3600
A    app                203.0.113.45    3600
A    minio              203.0.113.45    3600
A    console.minio      203.0.113.45    3600
A    *                  203.0.113.45    3600
```

---

## 🔧 Konfiguration bei Domain-Providern

### Bei IONOS

1. Login bei IONOS
2. **Domains & SSL** → Ihre Domain auswählen
3. **DNS-Einstellungen** → **Verwalten**
4. Fügen Sie die oben genannten A-Records hinzu

### Bei Namecheap

1. Login bei Namecheap
2. **Domain List** → Ihre Domain → **Manage**
3. **Advanced DNS**
4. Fügen Sie die A-Records hinzu

### Bei CloudFlare (empfohlen für CDN + DDoS-Schutz)

1. Domain zu CloudFlare transferieren oder DNS ändern
2. **DNS** → **Records**
3. Fügen Sie die A-Records hinzu
4. **Proxy-Status**: 
   - Für `app`, `minio`, `console.minio`: **Proxied** (orange Cloud)
   - Für Wildcard `*`: **DNS only** (graue Cloud) für die erste Einrichtung

---

## ✅ DNS-Propagation prüfen

Nach der Konfiguration dauert es 5-60 Minuten, bis die DNS-Änderungen weltweit verfügbar sind.

### Online-Tools zum Prüfen:

- https://dnschecker.org
- https://www.whatsmydns.net

# VPS Deployment Guide - MarktMA Backend mit MinIO

## Übersicht

Diese Anleitung beschreibt Schritt-für-Schritt, wie Sie das MarktMA Multi-Tenant E-Commerce Backend mit MinIO Object Storage auf einem VPS (Ubuntu/Debian) deployen.

---

## 📋 Voraussetzungen

- **VPS**: Ubuntu 20.04/22.04 oder Debian 11/12
- **Root-Zugriff** oder sudo-Berechtigungen
- **Domain**: markt.ma (bereits registriert)
- **Mindest-Ressourcen**: 
  - 2 GB RAM
  - 2 CPU Cores
  - 20 GB SSD (+ zusätzlicher Storage für MinIO)

---

## 🚀 Teil 1: VPS Grundsetup

### 1.1 Server aktualisieren und absichern

```bash
# Als root oder mit sudo
sudo apt update && sudo apt upgrade -y

# Firewall einrichten
sudo apt install ufw -y
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Non-root User erstellen (falls noch nicht vorhanden)
sudo adduser marktma
sudo usermod -aG sudo marktma

# SSH-Key-basierte Authentifizierung einrichten (empfohlen)
# Auf Ihrem lokalen PC:
# ssh-copy-id marktma@YOUR_VPS_IP
```

### 1.2 Hostname und Timezone setzen

```bash
# Hostname setzen
sudo hostnamectl set-hostname marktma-prod

# Timezone setzen (z.B. Europa/Berlin)
sudo timedatectl set-timezone Europe/Berlin
```

---

## 🗄️ Teil 2: PostgreSQL installieren

### 2.1 PostgreSQL 15 installieren

```bash
# PostgreSQL Repository hinzufügen
sudo apt install wget ca-certificates -y
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# PostgreSQL installieren
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15 -y

# PostgreSQL Status prüfen
sudo systemctl status postgresql
```

### 2.2 Datenbank und User erstellen

```bash
# Als postgres User einloggen
sudo -u postgres psql

# In der PostgreSQL-Konsole:
CREATE DATABASE storedb;
CREATE USER marktma_user WITH ENCRYPTED PASSWORD 'IHR_SICHERES_PASSWORT_HIER';
GRANT ALL PRIVILEGES ON DATABASE storedb TO marktma_user;
\q

# PostgreSQL-Konfiguration für Remote-Zugriff (optional, nur für Entwicklung)
# sudo nano /etc/postgresql/15/main/postgresql.conf
# listen_addresses = 'localhost'  # Für Production nur localhost!

# sudo nano /etc/postgresql/15/main/pg_hba.conf
# Zeile hinzufügen:
# local   storedb         marktma_user                            md5

# PostgreSQL neu starten
sudo systemctl restart postgresql
```

---

## ☕ Teil 3: Java 17 installieren

```bash
# OpenJDK 17 installieren
sudo apt install openjdk-17-jdk -y

# Java-Version prüfen
java -version

# JAVA_HOME setzen (dauerhaft)
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
source ~/.bashrc

# JAVA_HOME prüfen
echo $JAVA_HOME
```

---

## 📦 Teil 4: MinIO installieren und konfigurieren

### 4.1 MinIO Server installieren

```bash
# MinIO Binary herunterladen
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# MinIO Version prüfen
minio --version

# MinIO User und Verzeichnisse erstellen
sudo useradd -r minio-user -s /sbin/nologin
sudo mkdir -p /var/minio/data
sudo mkdir -p /var/minio/config
sudo chown -R minio-user:minio-user /var/minio
```

### 4.2 MinIO als systemd Service konfigurieren

```bash
# Systemd Service-Datei erstellen
sudo nano /etc/systemd/system/minio.service
```

**Inhalt von `/etc/systemd/system/minio.service`:**

```ini
[Unit]
Description=MinIO Object Storage
Documentation=https://docs.min.io
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=minio-user
Group=minio-user
WorkingDirectory=/var/minio

# WICHTIG: Ändern Sie die Credentials!
Environment="MINIO_ROOT_USER=admin_marktma"
Environment="MINIO_ROOT_PASSWORD=SEHR_SICHERES_PASSWORT_HIER_MINDESTENS_16_ZEICHEN"
Environment="MINIO_VOLUMES=/var/minio/data"
Environment="MINIO_OPTS=--console-address :9001"

ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES

# Security hardening
PrivateTmp=true
NoNewPrivileges=true

# Restart policy
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4.3 MinIO Service starten

```bash
# Systemd neu laden
sudo systemctl daemon-reload

# MinIO aktivieren und starten
sudo systemctl enable minio
sudo systemctl start minio

# Status prüfen
sudo systemctl status minio

# Logs prüfen (falls Probleme)
sudo journalctl -u minio -f
```

### 4.4 MinIO Initial Setup (über Console)

```bash
# Temporär Port 9001 freigeben (nur für initiales Setup)
sudo ufw allow 9001/tcp

# Jetzt können Sie auf die MinIO Console zugreifen:
# http://YOUR_VPS_IP:9001

# Login mit:
# Username: admin_marktma
# Password: <Ihr Passwort aus minio.service>

# Nach Login:
# 1. Bucket "markt-media" erstellen (wird auch automatisch vom Backend erstellt)
# 2. Access Key und Secret Key für Backend erstellen:
#    - Gehe zu: Access Keys → Create Access Key
#    - Speichern Sie: Access Key + Secret Key (brauchen wir für application.yml)
```

---

## 🌐 Teil 5: Nginx installieren und konfigurieren

### 5.1 Nginx installieren

```bash
sudo apt install nginx -y

# Nginx starten
sudo systemctl start nginx
sudo systemctl enable nginx

# Status prüfen
sudo systemctl status nginx
```

### 5.2 SSL-Zertifikat mit Let's Encrypt

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat für Ihre Domain(s) erstellen
# WICHTIG: Ersetzen Sie mit Ihren echten Domains!
sudo certbot --nginx -d markt.ma -d www.markt.ma -d app.markt.ma

# Folgen Sie den Anweisungen:
# - Email eingeben
# - Terms akzeptieren
# - "Redirect HTTP to HTTPS" wählen (empfohlen)

# Auto-Renewal testen
sudo certbot renew --dry-run
```

### 5.3 Nginx Konfiguration für Backend + MinIO

```bash
# Neue Site-Konfiguration erstellen
sudo nano /etc/nginx/sites-available/marktma
```

**Inhalt von `/etc/nginx/sites-available/marktma`:**

```nginx
# Backend API (app.markt.ma)
server {
    listen 80;
    server_name app.markt.ma;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.markt.ma;

    # SSL Zertifikate (von Certbot generiert)
    ssl_certificate /etc/letsencrypt/live/app.markt.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.markt.ma/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client body size (für File-Uploads)
    client_max_body_size 10M;

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        
        # Timeouts für lange Requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check Endpoint
    location /actuator/health {
        proxy_pass http://localhost:8080/actuator/health;
        proxy_set_header Host $host;
    }

    # Optionally serve frontend here (Angular später)
    location / {
        root /var/www/marktma/frontend;
        try_files $uri $uri/ /index.html;
    }
}

# MinIO API (für Backend-Zugriff)
upstream minio {
    server localhost:9000;
}

# MinIO Console (Admin-Interface)
upstream minio_console {
    server localhost:9001;
}

# MinIO API Server
server {
    listen 80;
    server_name minio.markt.ma;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name minio.markt.ma;

    ssl_certificate /etc/letsencrypt/live/minio.markt.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minio.markt.ma/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Allow large file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://minio;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        chunked_transfer_encoding off;
    }
}

# MinIO Console (Admin-Interface)
server {
    listen 80;
    server_name console.minio.markt.ma;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name console.minio.markt.ma;

    ssl_certificate /etc/letsencrypt/live/console.minio.markt.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/console.minio.markt.ma/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://minio_console;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-NginX-Proxy true;
        
        # WebSocket support (für MinIO Console)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Wildcard für Store-Subdomains (*.markt.ma)
# Diese werden vom Angular Frontend bzw. Public API gehandhabt
server {
    listen 80;
    server_name *.markt.ma;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name *.markt.ma;

    ssl_certificate /etc/letsencrypt/live/markt.ma/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/markt.ma/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy zu Backend (Public Store API)
    location /api/public/ {
        proxy_pass http://localhost:8080/api/public/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (später Angular Storefront)
    location / {
        root /var/www/marktma/storefront;
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.4 Nginx Konfiguration aktivieren

```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/marktma /etc/nginx/sites-enabled/

# Default-Site deaktivieren
sudo rm /etc/nginx/sites-enabled/default

# Nginx-Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx
```

---

## 🚀 Teil 6: Backend deployen

### 6.1 Projekt-Verzeichnis erstellen

```bash
# Als marktma User
cd ~
mkdir -p ~/marktma-backend
cd ~/marktma-backend
```

### 6.2 Backend JAR hochladen

**Option A: Mit SCP (von Ihrem lokalen PC):**

```bash
# Auf Ihrem lokalen PC (im storeBackend-Verzeichnis):
mvn clean package -DskipTests

# JAR hochladen
scp target/storeBackend-0.0.1-SNAPSHOT.jar marktma@YOUR_VPS_IP:~/marktma-backend/
```

**Option B: Mit Git (empfohlen für CI/CD später):**

```bash
# Auf dem VPS
cd ~/marktma-backend
git clone https://github.com/YOUR_USERNAME/storeBackend.git .

# Build auf dem Server
mvn clean package -DskipTests
```

### 6.3 application.yml für Production konfigurieren

```bash
# Production Config erstellen
nano ~/marktma-backend/application-prod.yml
```

**Inhalt von `application-prod.yml`:**

```yaml
spring:
  application:
    name: storeBackend

  datasource:
    url: jdbc:postgresql://localhost:5432/storedb
    username: marktma_user
    password: ${DB_PASSWORD}  # Aus Environment Variable
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update  # Für erste Deployment; später auf "validate" ändern!
    show-sql: false  # Für Production
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false

  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

jwt:
  secret: ${JWT_SECRET}  # Aus Environment Variable
  expiration: 86400000  # 24 Stunden

server:
  port: 8080
  address: localhost  # Nur auf localhost binden (Nginx ist Proxy)

# SaaS Multi-Tenant Configuration
saas:
  baseDomain: markt.ma
  platformDomain: app.markt.ma
  subdomainPattern: "{slug}.markt.ma"
  domainVerification:
    txtRecordPrefix: "_marktma-verification"
    tokenLength: 32

# MinIO Configuration (Production)
minio:
  endpoint: https://minio.markt.ma  # Über Nginx Proxy
  accessKey: ${MINIO_ACCESS_KEY}
  secretKey: ${MINIO_SECRET_KEY}
  bucket: markt-media
  region: us-east-1
  secure: true  # HTTPS

# Actuator für Health Checks
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized
```

### 6.4 Environment Variables erstellen

```bash
# Environment-Datei erstellen
nano ~/marktma-backend/.env
```

**Inhalt von `.env`:**

```bash
# Database
DB_PASSWORD=IHR_POSTGRESQL_PASSWORT

# JWT Secret (generieren Sie einen sicheren String!)
JWT_SECRET=SEHR_LANGER_ZUFAELLIGER_STRING_MINDESTENS_256_BIT

# MinIO Credentials (von MinIO Console Access Keys)
MINIO_ACCESS_KEY=IHR_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=IHR_MINIO_SECRET_KEY
```

**Wichtig:** Sichern Sie die Datei!

```bash
chmod 600 ~/marktma-backend/.env
```

### 6.5 Systemd Service für Backend erstellen

```bash
sudo nano /etc/systemd/system/marktma-backend.service
```

**Inhalt von `/etc/systemd/system/marktma-backend.service`:**

```ini
[Unit]
Description=MarktMA Backend Service
After=network.target postgresql.service minio.service
Wants=postgresql.service minio.service

[Service]
Type=simple
User=marktma
WorkingDirectory=/home/marktma/marktma-backend

# Environment Variables laden
EnvironmentFile=/home/marktma/marktma-backend/.env

# Java Heap Size (anpassen je nach VPS-RAM)
Environment="JAVA_OPTS=-Xms512m -Xmx1024m"

# Backend starten
ExecStart=/usr/bin/java $JAVA_OPTS -jar /home/marktma/marktma-backend/target/storeBackend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod --spring.config.location=file:/home/marktma/marktma-backend/application-prod.yml

# Restart Policy
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=marktma-backend

[Install]
WantedBy=multi-user.target
```

### 6.6 Backend Service starten

```bash
# Systemd neu laden
sudo systemctl daemon-reload

# Service aktivieren und starten
sudo systemctl enable marktma-backend
sudo systemctl start marktma-backend

# Status prüfen
sudo systemctl status marktma-backend

# Logs live verfolgen
sudo journalctl -u marktma-backend -f

# Bei Fehlern: Logs prüfen
sudo journalctl -u marktma-backend --no-pager -n 100
```

---

## 🧪 Teil 7: Testing & Verification

### 7.1 Services prüfen

```bash
# Alle Services prüfen
sudo systemctl status postgresql
sudo systemctl status minio
sudo systemctl status marktma-backend
sudo systemctl status nginx

# Ports prüfen
sudo netstat -tulpn | grep LISTEN
# Sollte zeigen:
# :5432 (PostgreSQL)
# :9000 (MinIO API)
# :9001 (MinIO Console)
# :8080 (Backend - nur localhost!)
# :80, :443 (Nginx)
```

### 7.2 Backend API testen

```bash
# Health Check
curl https://app.markt.ma/actuator/health

# Sollte zurückgeben:
# {"status":"UP"}

# Register Test User
curl -X POST https://app.markt.ma/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login Test
curl -X POST https://app.markt.ma/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### 7.3 MinIO prüfen

```bash
# MinIO Console aufrufen:
# https://console.minio.markt.ma

# Bucket "markt-media" sollte existieren (automatisch vom Backend erstellt)
```

---

## 🔒 Teil 8: Security Hardening

### 8.1 Firewall final konfigurieren

```bash
# Nur notwendige Ports offen lassen
sudo ufw status

# Port 9001 wieder schließen (nach MinIO Initial Setup)
sudo ufw delete allow 9001/tcp

# Final sollte nur noch offen sein:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
```

### 8.2 Fail2Ban installieren (gegen Brute-Force)

```bash
sudo apt install fail2ban -y

# Konfiguration erstellen
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Aktivieren Sie:
# [sshd]
# enabled = true

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 8.3 Automatische Updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 🔄 Teil 9: CI/CD mit GitHub Actions (optional)

### 9.1 Deploy-Schlüssel erstellen

```bash
# Auf dem VPS als marktma User
ssh-keygen -t ed25519 -C "deploy@marktma"
cat ~/.ssh/id_ed25519.pub
# Fügen Sie diesen Key zu GitHub Deploy Keys hinzu
```

### 9.2 GitHub Actions Workflow

Erstellen Sie `.github/workflows/deploy.yml` in Ihrem Repository:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Build with Maven
        run: mvn clean package -DskipTests
      
      - name: Deploy to VPS
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "target/storeBackend-0.0.1-SNAPSHOT.jar"
          target: "/home/marktma/marktma-backend/"
      
      - name: Restart Backend Service
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            sudo systemctl restart marktma-backend
            sleep 10
            sudo systemctl status marktma-backend
```

**GitHub Secrets konfigurieren:**
- `VPS_HOST`: Ihre VPS IP
- `VPS_USERNAME`: marktma
- `VPS_SSH_KEY`: Privater SSH-Key

---

## 📊 Teil 10: Monitoring & Logs

### 10.1 Log-Management

```bash
# Backend Logs
sudo journalctl -u marktma-backend -f

# Nginx Access Logs
sudo tail -f /var/log/nginx/access.log

# Nginx Error Logs
sudo tail -f /var/log/nginx/error.log

# MinIO Logs
sudo journalctl -u minio -f

# PostgreSQL Logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### 10.2 Disk Space überwachen

```bash
# Speicher prüfen
df -h

# MinIO Daten-Verzeichnis
du -sh /var/minio/data

# PostgreSQL Datenbank-Größe
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('storedb'));"
```

---

## 🔧 Teil 11: Wartung & Troubleshooting

### 11.1 Backend neu deployen

```bash
# JAR hochladen (siehe Teil 6.2)

# Service neu starten
sudo systemctl restart marktma-backend

# Status und Logs prüfen
sudo systemctl status marktma-backend
sudo journalctl -u marktma-backend -f
```

### 11.2 Database Backup

```bash
# Backup erstellen
sudo -u postgres pg_dump storedb > ~/backups/storedb-$(date +%Y%m%d).sql

# Backup automatisieren (Cron)
crontab -e
# Zeile hinzufügen:
# 0 2 * * * sudo -u postgres pg_dump storedb > ~/backups/storedb-$(date +\%Y\%m\%d).sql
```

### 11.3 MinIO Backup

```bash
# MinIO Client installieren (mc)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# MinIO konfigurieren
mc alias set local https://minio.markt.ma YOUR_ACCESS_KEY YOUR_SECRET_KEY

# Backup erstellen
mc mirror local/markt-media ~/backups/minio/
```

### 11.4 Häufige Probleme

**Problem: Backend startet nicht**
```bash
# Logs prüfen
sudo journalctl -u marktma-backend -n 100 --no-pager

# Häufige Ursachen:
# - PostgreSQL nicht erreichbar
# - Falsche DB-Credentials
# - MinIO nicht verfügbar
# - Port 8080 bereits belegt
```

**Problem: 502 Bad Gateway**
```bash
# Nginx Logs prüfen
sudo tail -f /var/log/nginx/error.log

# Backend-Status prüfen
sudo systemctl status marktma-backend

# Mögliche Lösungen:
# - Backend neu starten
# - Nginx-Konfiguration testen: sudo nginx -t
```

**Problem: MinIO nicht erreichbar**
```bash
# MinIO Status
sudo systemctl status minio

# MinIO Logs
sudo journalctl -u minio -f

# Port prüfen
sudo netstat -tulpn | grep 9000
```

---

## ✅ Checkliste für Production-Readiness

- [ ] PostgreSQL läuft und ist gesichert
- [ ] MinIO läuft mit sicheren Credentials
- [ ] Backend läuft als systemd Service
- [ ] Nginx läuft mit SSL (Let's Encrypt)
- [ ] Firewall ist konfiguriert (nur 22, 80, 443)
- [ ] Fail2Ban ist aktiv
- [ ] Automatische Backups sind eingerichtet
- [ ] Monitoring/Logs funktionieren
- [ ] Environment Variables sind gesichert (chmod 600)
- [ ] DNS-Records sind korrekt gesetzt:
  - `markt.ma` → VPS IP
  - `app.markt.ma` → VPS IP
  - `minio.markt.ma` → VPS IP
  - `console.minio.markt.ma` → VPS IP
  - `*.markt.ma` (Wildcard) → VPS IP

---

## 🎯 Nächste Schritte

1. **Angular Frontend deployen** (wenn fertig)
2. **GitHub Actions CI/CD aktivieren**
3. **Monitoring-Tool einrichten** (z.B. Prometheus + Grafana)
4. **CDN für Media-Files** (CloudFlare vor MinIO)
5. **Database Migrations** (Flyway/Liquibase)
6. **API Rate Limiting** (in Nginx oder Backend)

---

## 📞 Support & Dokumentation

- **Backend Logs**: `sudo journalctl -u marktma-backend -f`
- **Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
- **MinIO Docs**: https://min.io/docs/minio/linux/index.html
- **Spring Boot Actuator**: https://app.markt.ma/actuator

**Bei Problemen**: Prüfen Sie immer zuerst die Logs!

```bash
# Alle Services auf einen Blick
sudo systemctl status postgresql minio marktma-backend nginx
```

---

**Viel Erfolg mit Ihrem Deployment! 🚀**


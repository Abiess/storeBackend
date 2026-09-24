#!/bin/bash

# 🔧 Subdomain-Support für markt.ma aktivieren
# Dieses Skript muss auf dem VPS (212.227.58.56) ausgeführt werden

set -e

echo "🌐 Subdomain-Support Setup für markt.ma"
echo "========================================"
echo ""

# Farbcodes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Überprüfe ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bitte als root ausführen: sudo $0${NC}"
    exit 1
fi

# 1. Nginx-Konfiguration für Subdomains erstellen
echo -e "${YELLOW}📝 Erstelle Nginx Wildcard-Konfiguration...${NC}"

cat > /etc/nginx/sites-available/markt.ma-subdomains << 'EOF'
# ================================================================
# Wildcard-Konfiguration für Store-Subdomains (*.markt.ma)
# Automatisch generiert - Änderungen werden überschrieben!
# ================================================================

# Alle Subdomains außer api.markt.ma
server {
    listen 80;
    listen [::]:80;

    # Regex-Pattern für Subdomains (außer api und www)
    server_name ~^(?<subdomain>(?!api|www)[^.]+)\.markt\.ma$;

    # Logging für Debugging
    access_log /var/log/nginx/subdomain-access.log combined;
    error_log /var/log/nginx/subdomain-error.log warn;

    # Root für Frontend-Dateien
    root /var/www/markt.ma;
    index index.html;

    # Sicherheits-Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "0" always;

    # Frontend-Routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;

        # Cache-Control für statische Dateien
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API-Proxy (zu Backend weiterleiten)
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;

        # Headers für Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Subdomain $subdomain;

        # CORS Headers
        add_header Access-Control-Allow-Origin "https://$subdomain.markt.ma" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Expose-Headers "Authorization, Content-Type" always;

        # OPTIONS-Requests (Preflight)
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$subdomain.markt.ma" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Health-Check Endpoint
    location /health {
        access_log off;
        return 200 "Subdomain $subdomain.markt.ma is healthy\n";
        add_header Content-Type text/plain;
    }
}

# Hauptdomain markt.ma und www.markt.ma
server {
    listen 80;
    listen [::]:80;
    server_name markt.ma www.markt.ma;

    root /var/www/markt.ma;
    index index.html;

    access_log /var/log/nginx/markt.ma-access.log combined;
    error_log /var/log/nginx/markt.ma-error.log warn;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo -e "${GREEN}✅ Nginx-Konfiguration erstellt${NC}"

# 2. Symlink erstellen (falls nicht existiert)
if [ ! -L /etc/nginx/sites-enabled/markt.ma-subdomains ]; then
    ln -s /etc/nginx/sites-available/markt.ma-subdomains /etc/nginx/sites-enabled/
    echo -e "${GREEN}✅ Symlink erstellt${NC}"
else
    echo -e "${YELLOW}⚠️  Symlink existiert bereits${NC}"
fi

# 3. Nginx-Konfiguration testen
echo -e "${YELLOW}🧪 Teste Nginx-Konfiguration...${NC}"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx-Konfiguration ist gültig${NC}"
else
    echo -e "${RED}❌ Nginx-Konfiguration fehlerhaft!${NC}"
    nginx -t
    exit 1
fi

# 4. Nginx neu laden
echo -e "${YELLOW}🔄 Lade Nginx neu...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx neu geladen${NC}"

# 5. Domain-Einträge in Datenbank erstellen
echo ""
echo -e "${YELLOW}📊 Erstelle Domain-Einträge für existierende Stores...${NC}"

# Datenbank-Credentials aus Environment oder .env
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-storebackend}"
DB_USER="${DB_USER:-storeuser}"

# Frage nach Passwort falls nicht gesetzt
if [ -z "$DB_PASSWORD" ]; then
    read -sp "MySQL Passwort für $DB_USER: " DB_PASSWORD
    echo ""
fi

# SQL-Skript zum Erstellen fehlender Domain-Einträge
MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME"

echo -e "${YELLOW}Füge Subdomain-Einträge hinzu...${NC}"

$MYSQL_CMD << 'EOSQL'
-- Erstelle Domain-Einträge für alle Stores ohne Subdomain
INSERT INTO domains (store_id, host, domain_type, status, is_verified, created_at, updated_at)
SELECT
    s.id as store_id,
    CONCAT(s.slug, '.markt.ma') as host,
    'SUBDOMAIN' as domain_type,
    'ACTIVE' as status,
    1 as is_verified,
    NOW() as created_at,
    NOW() as updated_at
FROM stores s
WHERE s.status = 'ACTIVE'
AND NOT EXISTS (
    SELECT 1 FROM domains d
    WHERE d.store_id = s.id
    AND d.host = CONCAT(s.slug, '.markt.ma')
);

-- Zeige alle erstellten Domains
SELECT
    s.name as store_name,
    s.slug,
    d.host,
    d.domain_type,
    d.status,
    d.is_verified
FROM stores s
INNER JOIN domains d ON s.id = d.store_id
WHERE d.domain_type = 'SUBDOMAIN'
ORDER BY s.created_at DESC;
EOSQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Domain-Einträge erstellt${NC}"
else
    echo -e "${RED}❌ Fehler beim Erstellen der Domain-Einträge${NC}"
    exit 1
fi

# 6. Test-Ausgabe
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Subdomain-Support erfolgreich eingerichtet!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📝 ${YELLOW}Nächste Schritte:${NC}"
echo ""
echo "1. DNS Wildcard Record erstellen (bei Ihrem DNS-Provider):"
echo "   Type: A"
echo "   Host: *"
echo "   Value: $(curl -s ifconfig.me)"
echo "   TTL: 3600"
echo ""
echo "2. Warten Sie 5-10 Minuten für DNS-Propagation"
echo ""
echo "3. Testen Sie eine Subdomain:"
echo "   curl -I http://abdellah.markt.ma"
echo "   oder im Browser: http://abdellah.markt.ma"
echo ""
echo -e "${YELLOW}📊 Logging:${NC}"
echo "   Access-Log: tail -f /var/log/nginx/subdomain-access.log"
echo "   Error-Log: tail -f /var/log/nginx/subdomain-error.log"
echo ""
echo -e "${GREEN}🎉 Fertig!${NC}"
# 🔧 Subdomain-Funktionalität aktivieren - Schnellstart

## Problem
Sie haben einen Store mit Slug "abdellah" erstellt, aber `abdellah.markt.ma` funktioniert nicht.

## Ursache
Die Subdomain-Logik ist im Code implementiert, aber **DNS und Nginx müssen konfiguriert werden**.

---

## ✅ Lösung - 3 Schritte

### Schritt 1: DNS Wildcard Record erstellen

Gehen Sie zu Ihrem DNS-Provider (wo markt.ma registriert ist) und erstellen Sie:

```
Type: A
Host: *
Value: 212.227.58.56
TTL: 3600
```

Dieser Wildcard-Record (`*.markt.ma`) leitet ALLE Subdomains auf Ihren Server weiter:
- `abdellah.markt.ma` → 212.227.58.56
- `shop1.markt.ma` → 212.227.58.56
- `test.markt.ma` → 212.227.58.56
- usw.

**⚠️ Wichtig:** Behalten Sie Ihre existierenden A-Records für `markt.ma` und `api.markt.ma`!

---

### Schritt 2: Nginx auf dem VPS konfigurieren

SSH zum Server und führen Sie dieses Skript aus:

```bash
ssh root@212.227.58.56

# Nginx Subdomain-Konfiguration erstellen
cat > /etc/nginx/sites-available/markt.ma-subdomains << 'EOF'
# Wildcard-Konfiguration für alle Store-Subdomains
server {
    listen 80;
    listen [::]:80;
    server_name ~^(?<subdomain>.+)\.markt\.ma$;

    # Logging für Debugging
    access_log /var/log/nginx/subdomain-access.log;
    error_log /var/log/nginx/subdomain-error.log;

    # Root für Frontend-Dateien
    root /var/www/markt.ma;
    index index.html;

    # Frontend-Routing (alle Anfragen an index.html)
    location / {
        try_files $uri $uri/ /index.html;

        # CORS Headers
        add_header Access-Control-Allow-Origin https://api.markt.ma always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    }

    # API-Anfragen weiterleiten
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS für API
        add_header Access-Control-Allow-Origin https://$subdomain.markt.ma always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    }
}

# Hauptdomain markt.ma (Frontend)
server {
    listen 80;
    listen [::]:80;
    server_name markt.ma www.markt.ma;

    root /var/www/markt.ma;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Konfiguration aktivieren
ln -sf /etc/nginx/sites-available/markt.ma-subdomains /etc/nginx/sites-enabled/

# Nginx-Konfiguration testen
nginx -t

# Nginx neu laden
systemctl reload nginx

echo "✅ Nginx für Subdomains konfiguriert!"
```

---

### Schritt 3: Domain-Eintrag in der Datenbank erstellen

Für jeden Store-Slug muss ein Domain-Eintrag in der Datenbank existieren:

```bash
# Auf dem VPS - MySQL-Verbindung
mysql -u storeuser -p storebackend

# Domain für Store erstellen
INSERT INTO domains (store_id, host, domain_type, status, is_verified, created_at)
SELECT
    id as store_id,
    CONCAT(slug, '.markt.ma') as host,
    'SUBDOMAIN' as domain_type,
    'ACTIVE' as status,
    true as is_verified,
    NOW() as created_at
FROM stores
WHERE slug = 'abdellah'
AND NOT EXISTS (
    SELECT 1 FROM domains WHERE store_id = stores.id AND host = CONCAT(stores.slug, '.markt.ma')
);

# Überprüfen
SELECT s.name, s.slug, d.host, d.status
FROM stores s
LEFT JOIN domains d ON s.id = d.store_id
WHERE s.slug = 'abdellah';

EXIT;
```

---

## 🧪 Testen

Nach 5-10 Minuten (DNS-Propagation):

```bash
# 1. DNS testen
nslookup abdellah.markt.ma
# Sollte zeigen: 212.227.58.56

# 2. HTTP testen
curl -I http://abdellah.markt.ma
# Sollte zeigen: 200 OK

# 3. Im Browser öffnen
https://abdellah.markt.ma
```

---

## 🔍 Debugging

Falls es nicht funktioniert:

```bash
# Auf dem VPS:

# 1. Nginx-Logs prüfen
tail -f /var/log/nginx/subdomain-error.log
tail -f /var/log/nginx/subdomain-access.log

# 2. Domain-Auflösung testen
curl -H "Host: abdellah.markt.ma" http://localhost

# 3. Alle Domains in DB anzeigen
mysql -u storeuser -p storebackend -e "SELECT * FROM domains;"

# 4. Store-Slug prüfen
mysql -u storeuser -p storebackend -e "SELECT id, name, slug, status FROM stores WHERE slug = 'abdellah';"
```

---

## 🚀 Automatisches Domain-Setup beim Store-Erstellen

Um zukünftig automatisch Domains zu erstellen, müssen Sie das Backend anpassen:

**Datei:** `src/main/java/storebackend/service/StoreService.java`

Die Methode `createStore()` sollte automatisch einen Domain-Eintrag erstellen. Dies wurde bereits implementiert in der SaaS-Version.

---

## 📝 Zusammenfassung

1. **DNS Wildcard** (`*.markt.ma`) → Leitet alle Subdomains zum Server
2. **Nginx Wildcard-Config** → Routet Subdomain-Anfragen korrekt
3. **Domain-Eintrag in DB** → Verbindet Subdomain mit Store
4. **Frontend-Code** → Bereits implementiert (erkennt Subdomain automatisch)

Nach diesen Schritten funktioniert `abdellah.markt.ma` automatisch! 🎉


#!/bin/bash

# Monitoring Script für Prometheus/Grafana
# Exportiert Metriken im Prometheus Format

echo "# HELP storebackend_up Application is up (1) or down (0)"
echo "# TYPE storebackend_up gauge"

# Application Health Check
if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "storebackend_up 1"
else
    echo "storebackend_up 0"
fi

# PostgreSQL Status
echo "# HELP postgresql_up PostgreSQL is up (1) or down (0)"
echo "# TYPE postgresql_up gauge"
if systemctl is-active --quiet postgresql; then
    echo "postgresql_up 1"
else
    echo "postgresql_up 0"
fi

# Nginx Status
echo "# HELP nginx_up Nginx is up (1) or down (0)"
echo "# TYPE nginx_up gauge"
if systemctl is-active --quiet nginx; then
    echo "nginx_up 1"
else
    echo "nginx_up 0"
fi

# Memory Usage
echo "# HELP system_memory_usage_percent System memory usage in percent"
echo "# TYPE system_memory_usage_percent gauge"
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
echo "system_memory_usage_percent $MEMORY_USAGE"

# Disk Usage
echo "# HELP system_disk_usage_percent System disk usage in percent"
echo "# TYPE system_disk_usage_percent gauge"
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
echo "system_disk_usage_percent $DISK_USAGE"

# Backup Count
echo "# HELP database_backup_count Number of database backups"
echo "# TYPE database_backup_count gauge"
BACKUP_COUNT=$(ls -1 /opt/storebackend/backups/database/storedb-*.sql.gz 2>/dev/null | wc -l)
echo "database_backup_count $BACKUP_COUNT"
# 🚀 Store Backend - Schnellstart

## Lokale Entwicklung

### Windows:
```bash
start-local.bat
```

### Linux/Mac:
```bash
chmod +x start-local.sh
./start-local.sh
```

## VPS Deployment

### 1. VPS vorbereiten (einmalig):
```bash
ssh root@IHR_VPS_IP
# Laden Sie setup-vps.sh auf den VPS
./setup-vps.sh
```

### 2. GitHub Secrets einrichten:
- `VPS_HOST` - Ihre VPS IP
- `VPS_USER` - SSH Benutzer (meist `root`)
- `VPS_SSH_KEY` - Ihr privater SSH Key
- `VPS_PORT` - SSH Port (meist `22`)
- `DB_PASSWORD` - PostgreSQL Passwort
- `JWT_SECRET` - Generiert mit: `openssl rand -base64 64`

### 3. Deployen:
```bash
git push origin main
```

Fertig! GitHub Actions deployed automatisch auf Ihren VPS.

## Nützliche Befehle auf dem VPS:

```bash
# Application Status
sudo systemctl status storebackend

# Logs ansehen
sudo journalctl -u storebackend -f

# Application neu starten
sudo systemctl restart storebackend

# Health Check
curl http://localhost:8080/actuator/health

# Kompletter System-Status
/opt/storebackend/scripts/health-check.sh

# Datenbank Backup
/opt/storebackend/scripts/backup-database.sh
```

## API Endpunkte:

- **Health Check**: `GET /actuator/health`
- **API Docs**: `GET /swagger-ui.html` (wenn aktiviert)
- **Authentifizierung**: `POST /auth/register`, `POST /auth/login`

Siehe `API_TESTING.md` und `E_COMMERCE_API.md` für Details.

## Weitere Dokumentation:

- `DEPLOYMENT.md` - Vollständiger Deployment Guide
- `VPS_DEPLOYMENT_GUIDE.md` - Detaillierte VPS Anleitung
- `TESTING.md` - Testing Guide
- `API_TESTING.md` - API Testing

## Support:

Bei Problemen prüfen Sie:
1. GitHub Actions Logs
2. VPS Application Logs: `sudo journalctl -u storebackend -n 100`
3. Nginx Logs: `sudo tail -f /var/log/nginx/error.log`


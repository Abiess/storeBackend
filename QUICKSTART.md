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


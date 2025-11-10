# Store Backend - VPS Deployment Guide

## 🚀 CI/CD Setup mit GitHub Actions

Dieses Projekt verwendet GitHub Actions für automatisches Deployment auf Ihren VPS.

---

## 📋 Voraussetzungen auf Ihrem VPS

- **Ubuntu 20.04+** oder **Debian 11+**
- Root-Zugriff oder sudo-Rechte
- **Mindestens 2GB RAM**
- Offene Ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

---

## 🔧 VPS Einrichtung (Einmalig)

### 1. Verbinden Sie sich mit Ihrem VPS:
```bash
ssh root@IHR_VPS_IP
```

### 2. Laden Sie das Setup-Script hoch:
```bash
# Auf Ihrem lokalen Rechner:
scp scripts/setup-vps.sh root@IHR_VPS_IP:/root/

# Auf dem VPS:
chmod +x /root/setup-vps.sh
./root/setup-vps.sh
```

Das Script installiert automatisch:
- ✅ Java 17
- ✅ PostgreSQL
- ✅ Nginx (Reverse Proxy)
- ✅ Firewall-Regeln
- ✅ Verzeichnisse und Benutzer

---

## 🔐 GitHub Secrets einrichten

1. Gehen Sie zu: **GitHub Repository → Settings → Secrets and variables → Actions**

2. Klicken Sie auf **"New repository secret"**

3. Fügen Sie folgende Secrets hinzu:

| Secret Name | Beschreibung | Beispiel |
|------------|--------------|----------|
| `VPS_HOST` | IP-Adresse Ihres VPS | `203.0.113.42` |
| `VPS_USER` | SSH Benutzername | `root` |
| `VPS_SSH_KEY` | Privater SSH Key | Kopieren Sie Ihren kompletten SSH Private Key |
| `VPS_PORT` | SSH Port | `22` |
| `DB_PASSWORD` | PostgreSQL Passwort | `SecurePassword123!` |
| `JWT_SECRET` | JWT Secret Key | Generieren mit: `openssl rand -base64 64` |

---

## 🔑 SSH Key generieren (falls noch nicht vorhanden)

```bash
# Auf Ihrem lokalen Rechner:
ssh-keygen -t rsa -b 4096 -C "github-deploy" -f ~/.ssh/vps_deploy_key

# Public Key auf VPS kopieren:
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub root@IHR_VPS_IP

# Private Key anzeigen (für GitHub Secret):
cat ~/.ssh/vps_deploy_key
```

Kopieren Sie den **kompletten Output** (inkl. `-----BEGIN` und `-----END`) in das GitHub Secret `VPS_SSH_KEY`.

---

## 🌐 Domain & SSL einrichten (Optional)

### 1. Domain zu Ihrem VPS zeigen lassen:
Erstellen Sie einen **A-Record** bei Ihrem Domain-Anbieter:
```
Type: A
Name: @ (oder subdomain)
Value: IHR_VPS_IP
TTL: 300
```

### 2. Nginx Konfiguration anpassen:
```bash
# Auf dem VPS:
sudo nano /etc/nginx/sites-available/storebackend

# Ändern Sie diese Zeile:
server_name your-domain.com;
# zu:
server_name meine-domain.de;

# Nginx neu laden:
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Zertifikat mit Let's Encrypt:
```bash
sudo certbot --nginx -d meine-domain.de
```

Certbot richtet automatisch HTTPS ein! 🔒

---

## 🚀 Deployment starten

### Automatisches Deployment:
Jeder Push zum `main` oder `master` Branch startet automatisch das Deployment:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### Manuelles Deployment:
1. Gehen Sie zu: **GitHub → Actions**
2. Wählen Sie **"Deploy to VPS"**
3. Klicken Sie auf **"Run workflow"**

---

## 📊 Deployment überwachen

### GitHub Actions:
- Gehen Sie zu **GitHub → Actions**
- Sehen Sie den Status jedes Deployments
- Logs in Echtzeit

### Auf dem VPS:
```bash
# Application Logs ansehen:
sudo journalctl -u storebackend -f

# Application Status:
sudo systemctl status storebackend

# Nginx Logs:
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application neu starten:
sudo systemctl restart storebackend
```

---

## 🧪 Deployment testen

### Nach erfolgreichem Deployment:

```bash
# Health Check:
curl http://IHR_VPS_IP/actuator/health

# API testen:
curl -X POST http://IHR_VPS_IP/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 🔄 Rollback bei Problemen

```bash
# Auf dem VPS:
cd /opt/storebackend/backups

# Verfügbare Backups anzeigen:
ls -lh

# Backup wiederherstellen:
sudo systemctl stop storebackend
sudo cp app-YYYYMMDD-HHMMSS.jar /opt/storebackend/app.jar
sudo systemctl start storebackend
```

---

## 🛠️ Troubleshooting

### Problem: Deployment schlägt fehl
```bash
# SSH-Verbindung testen:
ssh -i ~/.ssh/vps_deploy_key root@IHR_VPS_IP

# Permissions prüfen:
ls -la /opt/storebackend
```

### Problem: Application startet nicht
```bash
# Logs ansehen:
sudo journalctl -u storebackend -n 100

# PostgreSQL prüfen:
sudo systemctl status postgresql
sudo -u postgres psql -l
```

### Problem: "Database does not exist"
```bash
# Datenbank manuell erstellen:
sudo -u postgres psql -c "CREATE DATABASE storedb;"
```

### Problem: Port 8080 schon belegt
```bash
# Prozess auf Port 8080 finden:
sudo lsof -i :8080

# Port in application.yml ändern:
server:
  port: 8081
```

---

## 📈 Performance Optimierung

### Java Memory Tuning:
```bash
# In storebackend.service ändern:
Environment="JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

sudo systemctl daemon-reload
sudo systemctl restart storebackend
```

### PostgreSQL Tuning:
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf

# Empfohlene Settings:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
```

---

## 🔒 Sicherheit Best Practices

1. **Firewall aktiviert** ✅
2. **SSH Key-Auth statt Passwort** ✅
3. **Regelmäßige Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
4. **Fail2Ban installieren:**
   ```bash
   sudo apt install fail2ban
   ```
5. **Database Backups:**
   ```bash
   # Cronjob für tägliche Backups:
   0 2 * * * /usr/bin/pg_dump storedb > /opt/backups/db-$(date +\%Y\%m\%d).sql
   ```

---

## 📞 Support

Bei Problemen:
1. Prüfen Sie die **GitHub Actions Logs**
2. Prüfen Sie die **Application Logs** auf dem VPS
3. Prüfen Sie die **Nginx Logs**

---

## 🎉 Fertig!

Ihr Backend ist jetzt:
- ✅ Automatisch deployed via GitHub Actions
- ✅ Hinter Nginx Reverse Proxy
- ✅ Mit SSL/HTTPS gesichert
- ✅ Mit PostgreSQL Datenbank
- ✅ Mit Health Checks
- ✅ Mit Rollback-Funktionalität

**Jeder Git Push deployed automatisch zu Ihrem VPS!** 🚀
#!/bin/bash

echo "🚀 Starting deployment..."

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Stoppe alte Instanz
echo "⏹️  Stopping old application..."
systemctl stop storebackend || true

# Backup alte Version
if [ -f /opt/storebackend/app.jar ]; then
    echo "💾 Backing up old version..."
    cp /opt/storebackend/app.jar /opt/storebackend/backups/app-$(date +%Y%m%d-%H%M%S).jar
fi

# PostgreSQL Datenbank erstellen (falls nicht existiert)
echo "🗄️  Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'storedb'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE storedb;"

echo "✅ Database ready"

# Environment Variables setzen
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD:-postgres}
export JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 64 | tr -d '\n')}

# Neue Version starten
echo "🚀 Starting new application..."
systemctl start storebackend

# Warte auf Start
echo "⏳ Waiting for application to start..."
sleep 10

# Health Check
for i in {1..30}; do
    if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is healthy!${NC}"
        echo "📊 Deployment completed successfully at $(date)"
        exit 0
    fi
    echo "Waiting for health check... ($i/30)"
    sleep 2
done

echo -e "${RED}❌ Application failed to start${NC}"
echo "📋 Last 50 lines of log:"
journalctl -u storebackend -n 50 --no-pager
exit 1


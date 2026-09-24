# 📦 Datenbank Backup & Restore System

## Übersicht

Ein umfassendes Backup-System für die StoreBackend PostgreSQL-Datenbank mit automatischen Backups, Rotation, Monitoring und Alerting.

## 🚀 Features

- ✅ **Automatische Backups** mit Cron
- ✅ **Intelligente Backup-Rotation** (täglich, wöchentlich, monatlich)
- ✅ **Backup-Verifizierung** und Integritätsprüfung
- ✅ **E-Mail & Webhook Benachrichtigungen**
- ✅ **Monitoring und Health Checks**
- ✅ **Sicheres Restore** mit automatischem Rollback
- ✅ **Remote Backups** (S3, rsync, FTP)
- ✅ **Detaillierte Logs** und Reports

## 📁 Dateien

```
scripts/
├── backup-database.sh          # Hauptbackup-Script
├── restore-database.sh         # Wiederherstellungs-Script
├── setup-backup-cron.sh        # Cron-Job Einrichtung
├── monitor-backups.sh          # Monitoring und Health Checks
├── manage-backups.sh           # Backup-Verwaltung (interaktiv)
└── backup.conf                 # Konfigurationsdatei
```

## 🔧 Installation & Einrichtung

### Schritt 1: Konfiguration

Bearbeite die Konfigurationsdatei:

```bash
sudo nano /opt/storebackend/scripts/backup.conf
```

Wichtige Einstellungen:
- `ALERT_EMAIL`: Deine E-Mail für Benachrichtigungen
- `WEBHOOK_URL`: Slack/Discord Webhook (optional)
- `DAILY_RETENTION`: Aufbewahrung täglicher Backups (Standard: 7 Tage)
- `WEEKLY_RETENTION`: Aufbewahrung wöchentlicher Backups (Standard: 28 Tage)
- `MONTHLY_RETENTION`: Aufbewahrung monatlicher Backups (Standard: 365 Tage)

### Schritt 2: Scripts ausführbar machen

```bash
cd /opt/storebackend/scripts
chmod +x backup-database.sh restore-database.sh setup-backup-cron.sh monitor-backups.sh manage-backups.sh
```

### Schritt 3: Verzeichnisse erstellen

```bash
sudo mkdir -p /opt/storebackend/backups/database/{daily,weekly,monthly}
sudo mkdir -p /var/log/storebackend
sudo chown -R postgres:postgres /opt/storebackend/backups
```

### Schritt 4: Automatische Backups einrichten

```bash
sudo ./setup-backup-cron.sh
```

Das Script wird dich durch die Einrichtung führen:
1. Backup-Zeitplan wählen (z.B. täglich um 2:00 Uhr)
2. E-Mail-Adresse für Benachrichtigungen eingeben
3. Optional: Test-Backup durchführen

## 📋 Verwendung

### Manuelles Backup erstellen

```bash
sudo ./backup-database.sh
```

Das Script:
- Erstellt ein vollständiges Datenbank-Backup
- Komprimiert das Backup mit gzip
- Verifiziert die Integrität
- Organisiert Backups in täglich/wöchentlich/monatlich
- Löscht alte Backups gemäß Retention Policy
- Sendet Benachrichtigungen bei Problemen

### Datenbank wiederherstellen

```bash
sudo ./restore-database.sh
```

Das interaktive Script:
1. Zeigt alle verfügbaren Backups
2. Lässt dich ein Backup auswählen
3. Verifiziert die Backup-Integrität
4. Erstellt ein Sicherheitsbackup der aktuellen DB
5. Stoppt die Anwendung
6. Stellt die Datenbank wieder her
7. Startet die Anwendung neu
8. Bei Fehler: Automatischer Rollback!

### Backup-Monitoring

```bash
sudo ./monitor-backups.sh
```

Prüft:
- ✅ Alter des letzten Backups
- ✅ Verfügbarer Speicherplatz
- ✅ Anzahl vorhandener Backups
- ✅ Backup-Integrität
- ✅ Fehler in Logs

**Als Cron-Job für tägliches Monitoring:**

```bash
# Täglich um 8:00 Uhr
0 8 * * * /opt/storebackend/scripts/monitor-backups.sh
```

### Backup-Verwaltung (Interaktiv)

```bash
sudo ./manage-backups.sh
```

Menü-Optionen:
1. **Liste alle Backups** - Übersicht aller Backups
2. **Zeige Statistiken** - Detaillierte Backup-Statistiken
3. **Verifiziere Backups** - Prüfe alle Backups auf Korruption
4. **Bereinige alte Backups** - Manuelle Bereinigung
5. **Exportiere Report** - Erstelle Backup-Report
6. **Suche korrupte Backups** - Finde und lösche defekte Backups
7. **Backup-Details** - Detaillierte Informationen zu einem Backup

## 🔄 Backup-Rotation

Das System verwendet eine 3-Ebenen-Rotation:

### Täglich (Daily)
- **Aufbewahrung**: 7 Tage
- **Häufigkeit**: Jeden Tag
- **Speicherort**: `/opt/storebackend/backups/database/daily/`

### Wöchentlich (Weekly)
- **Aufbewahrung**: 28 Tage (4 Wochen)
- **Häufigkeit**: Jeden Sonntag
- **Speicherort**: `/opt/storebackend/backups/database/weekly/`

### Monatlich (Monthly)
- **Aufbewahrung**: 365 Tage (1 Jahr)
- **Häufigkeit**: Am 1. jeden Monats
- **Speicherort**: `/opt/storebackend/backups/database/monthly/`

**Beispiel:**
- Nach 7 Tagen werden tägliche Backups gelöscht
- Wöchentliche Backups (Sonntag) bleiben 4 Wochen
- Monatliche Backups (1. des Monats) bleiben 1 Jahr

## 📧 Benachrichtigungen

### E-Mail-Benachrichtigungen

**Mailutils installieren:**

```bash
sudo apt-get install mailutils
```

**Konfigurieren:**

```bash
# In backup.conf
ALERT_EMAIL="admin@example.com"
```

**Benachrichtigt bei:**
- ❌ Backup-Fehler
- ⚠️ Niedriger Speicherplatz
- ⚠️ Backup zu alt
- ⚠️ Zu wenige Backups
- ✅ Erfolgreiche wöchentliche/monatliche Backups

### Webhook-Benachrichtigungen (Slack/Discord)

**Slack Webhook:**

```bash
# In backup.conf
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Discord Webhook:**

```bash
# In backup.conf
WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
```

## ☁️ Remote Backups

### AWS S3

```bash
# AWS CLI installieren
sudo apt-get install awscli

# In backup.conf konfigurieren
ENABLE_S3_BACKUP="true"
S3_BUCKET="my-backup-bucket"
S3_REGION="eu-central-1"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

### Rsync zu Remote-Server

```bash
# SSH-Key erstellen
ssh-keygen -t rsa -b 4096 -f /root/.ssh/backup_key

# In backup.conf konfigurieren
ENABLE_REMOTE_SYNC="true"
REMOTE_SERVER="backup@backup-server.com"
REMOTE_BACKUP_PATH="/backup/storedb"
REMOTE_SSH_KEY="/root/.ssh/backup_key"
```

## 📊 Monitoring & Alerting

### Systemd Service für Monitoring

Erstelle: `/etc/systemd/system/backup-monitor.service`

```ini
[Unit]
Description=Store Backend Backup Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/storebackend/scripts/monitor-backups.sh
User=root

[Install]
WantedBy=multi-user.target
```

Erstelle: `/etc/systemd/system/backup-monitor.timer`

```ini
[Unit]
Description=Run Backup Monitor Daily

[Timer]
OnCalendar=daily
OnBootSec=10min
Persistent=true

[Install]
WantedBy=timers.target
```

Aktivieren:

```bash
sudo systemctl enable backup-monitor.timer
sudo systemctl start backup-monitor.timer
```

### Grafana Dashboard Integration

Die Backup-Metriken können in Grafana visualisiert werden:

```bash
# Metriken exportieren
./monitor-backups.sh > /var/log/storebackend/backup-metrics.log
```

## 🔍 Troubleshooting

### Problem: Backup schlägt fehl

**Lösung:**

```bash
# Prüfe Logs
sudo tail -100 /var/log/storebackend/backup.log

# Prüfe Speicherplatz
df -h /opt/storebackend/backups

# Prüfe PostgreSQL-Status
sudo systemctl status postgresql

# Teste Verbindung
sudo -u postgres psql -d storedb -c "SELECT 1;"
```

### Problem: Restore schlägt fehl

**Lösung:**

```bash
# Prüfe Backup-Integrität
gzip -t /path/to/backup.sql.gz

# Prüfe Restore-Logs
sudo tail -100 /var/log/storebackend/restore.log

# Manuelles Restore
gunzip -c backup.sql.gz | sudo -u postgres psql storedb
```

### Problem: Keine Benachrichtigungen

**Lösung:**

```bash
# Teste E-Mail
echo "Test" | mail -s "Test" admin@example.com

# Teste Webhook
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"Test"}' \
  "$WEBHOOK_URL"
```

### Problem: Backups werden nicht gelöscht

**Lösung:**

```bash
# Manuelle Bereinigung
sudo ./manage-backups.sh
# Wähle Option 4: "Bereinige alte Backups"

# Prüfe Berechtigungen
ls -la /opt/storebackend/backups/database/
```

## 📈 Best Practices

### 1. Regelmäßige Tests

Teste Restore-Prozess monatlich:

```bash
# Erstelle Test-Restore
sudo ./restore-database.sh
```

### 2. Monitoring einrichten

Richte tägliches Monitoring ein:

```bash
echo "0 8 * * * /opt/storebackend/scripts/monitor-backups.sh | mail -s 'Backup Status' admin@example.com" | sudo crontab -
```

### 3. Offsite-Backups

Konfiguriere Remote-Backups (S3 oder rsync):

```bash
# In backup.conf
ENABLE_S3_BACKUP="true"
# oder
ENABLE_REMOTE_SYNC="true"
```

### 4. Backup-Verschlüsselung

Für sensible Daten:

```bash
# GPG-Key erstellen
gpg --gen-key

# In backup.conf
ENABLE_ENCRYPTION="true"
ENCRYPTION_RECIPIENT="your-email@example.com"
```

### 5. Dokumentation

Halte ein Runbook für Notfälle bereit:

- Zugangsdaten sicher aufbewahren
- Restore-Prozess dokumentieren
- Kontakte für Eskalation definieren

## 🔐 Sicherheit

### Berechtigungen

```bash
# Backup-Verzeichnis
sudo chmod 700 /opt/storebackend/backups
sudo chown -R postgres:postgres /opt/storebackend/backups

# Scripts
sudo chmod 750 /opt/storebackend/scripts/*.sh
sudo chown root:root /opt/storebackend/scripts/*.sh

# Konfiguration
sudo chmod 600 /opt/storebackend/scripts/backup.conf
```

### Sensible Daten

Speichere Credentials NICHT in Scripts:

```bash
# Nutze Umgebungsvariablen
export DB_PASSWORD="secret"

# Oder .pgpass File
echo "localhost:5432:storedb:postgres:password" > ~/.pgpass
chmod 600 ~/.pgpass
```

## 📞 Support & Wartung

### Logs prüfen

```bash
# Backup-Logs
sudo tail -f /var/log/storebackend/backup.log

# Restore-Logs
sudo tail -f /var/log/storebackend/restore.log

# Cron-Logs
sudo tail -f /var/log/storebackend/backup-cron.log

# System-Logs
sudo journalctl -u storebackend -f
```

### Backup-Status überprüfen

```bash
# Schnellcheck
sudo ./monitor-backups.sh

# Detaillierte Statistiken
sudo ./manage-backups.sh
# Wähle Option 2
```

### Hilfe

```bash
# Backup-Script Hilfe
sudo ./backup-database.sh --help

# Restore-Script Hilfe
sudo ./restore-database.sh --help
```

## 📝 Changelog

### Version 2.0 (2026-02-10)
- ✅ Enhanced backup script mit Verifizierung
- ✅ Automatische Backup-Rotation
- ✅ E-Mail & Webhook Benachrichtigungen
- ✅ Monitoring und Health Checks
- ✅ Interaktives Management-Tool
- ✅ Remote Backup Support
- ✅ Umfassende Dokumentation

### Version 1.0 (Original)
- ✅ Basis Backup-Script
- ✅ Basis Restore-Script

## 📄 Lizenz

Internes Projekt - Store Backend Team

---

**Erstellt von:** DevOps Team  
**Letzte Aktualisierung:** 2026-02-10  
**Version:** 2.0


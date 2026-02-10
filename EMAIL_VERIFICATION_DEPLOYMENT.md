# Email Verification Feature - Deployment Guide

## 🚀 Production Deployment

### 1. SMTP Configuration

Fügen Sie folgende Environment-Variablen zu `/etc/storebackend.env` hinzu:

```bash
# SMTP Configuration für Email-Verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
MAIL_FROM=noreply@yourdomain.com
MAIL_ENABLED=true

# Base URL für Verification-Links
APP_BASE_URL=https://yourdomain.com
```

### 2. SMTP Provider Setup

#### Gmail (Empfohlen für Testing)
1. Gehe zu Google Account Settings
2. Aktiviere 2-Factor Authentication
3. Erstelle ein "App-Specific Password"
4. Verwende dieses Passwort in `SMTP_PASS`

#### SendGrid (Empfohlen für Production)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### AWS SES
```bash
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
```

### 3. Database Migration

**Wichtig:** Dieses Projekt nutzt `hibernate.ddl-auto: update` in der Production-Config.

Die benötigten Tabellen werden **automatisch von Hibernate erstellt** beim ersten Start:
- Spalte `email_verified` wird zur `users` Tabelle hinzugefügt
- Tabelle `email_verifications` wird erstellt (id, user_id, token, expires_at, created_at)

**Keine manuellen SQL-Scripte notwendig!**

Das `schema.sql` wurde bereits aktualisiert und enthält die Tabellendefinitionen für lokale H2-Entwicklung.

### 4. Systemd Service Update

Das systemd Service lädt automatisch die ENV-Variablen aus `/etc/storebackend.env`.

Nach dem Hinzufügen der ENV-Variablen:

```bash
sudo systemctl daemon-reload
sudo systemctl restart storebackend
```

### 5. Verify Deployment

```bash
# Check logs
sudo journalctl -u storebackend -f

# Test verification endpoint
curl https://yourdomain.com/api/auth/verify?token=test-token
```

---

## 🧪 Local Development

### Email Verification deaktivieren (für Testing)

In `application.yml`:
```yaml
mail:
  enabled: false
```

Wenn deaktiviert, werden keine Emails gesendet, aber die User werden trotzdem erstellt.

### Email Verification testen (lokal)

1. Starte MailHog (lokaler SMTP Server):
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

2. Konfiguriere `application.yml`:
```yaml
spring:
  mail:
    host: localhost
    port: 1025

mail:
  enabled: true

app:
  base-url: http://localhost:4200
```

3. Öffne MailHog UI: http://localhost:8025
4. Registriere einen User
5. Sieh die Verification-Email in MailHog
6. Klicke auf den Link

---

## 🔧 Troubleshooting

### Problem: Emails werden nicht gesendet

**Lösung 1**: Check SMTP Credentials
```bash
# Test SMTP Connection
telnet smtp.gmail.com 587
```

**Lösung 2**: Check Application Logs
```bash
sudo journalctl -u storebackend | grep -i "email\|mail\|smtp"
```

**Lösung 3**: Verify Environment Variables
```bash
# Check if ENV vars are loaded
sudo systemctl show storebackend | grep SMTP
```

### Problem: Token ist abgelaufen

Tokens sind 24 Stunden gültig. User kann neue Email anfordern:
```bash
POST /api/auth/resend-verification
{
  "email": "user@example.com"
}
```

### Problem: User kann sich nicht einloggen

Überprüfe `email_verified` Status:
```sql
SELECT email, email_verified FROM users WHERE email = 'user@example.com';
```

Manuell verifizieren (nur für Testing/Support):
```sql
UPDATE users SET email_verified = true WHERE email = 'user@example.com';
DELETE FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

---

## 📊 Monitoring

### Cleanup abgelaufener Tokens (Optional Cron Job)

Erstelle einen Scheduled Task in Spring Boot oder einen Cron Job:

```bash
# /etc/cron.daily/cleanup-verification-tokens
#!/bin/bash
psql -U storeapp -d storedb -c "DELETE FROM email_verifications WHERE expires_at < NOW();"
```

### Database Queries für Monitoring

```sql
-- Anzahl nicht verifizierter User
SELECT COUNT(*) FROM users WHERE email_verified = false;

-- Anzahl aktiver Verification-Tokens
SELECT COUNT(*) FROM email_verifications WHERE expires_at > NOW();

-- Abgelaufene Tokens
SELECT COUNT(*) FROM email_verifications WHERE expires_at < NOW();
```

---

## 🔐 Security Best Practices

1. **Token Security**: UUID-basiert, 36 Zeichen, nicht vorhersagbar
2. **Token Expiration**: 24 Stunden (konfigurierbar in `EmailVerificationService`)
3. **Rate Limiting**: Implementiere Rate Limiting für `/api/auth/register` und `/api/auth/resend-verification`
4. **SMTP Encryption**: Verwende immer TLS (Port 587) oder SSL (Port 465)
5. **Environment Vars**: Niemals SMTP Credentials im Code oder Git committen

---

## 📈 Production Checklist

- [ ] SMTP Credentials konfiguriert in `/etc/storebackend.env`
- [ ] `APP_BASE_URL` auf Production-Domain gesetzt
- [ ] `MAIL_ENABLED=true` gesetzt
- [ ] Email-Template angepasst (Firmenname, Branding)
- [ ] SMTP Connection getestet
- [ ] Test-Registrierung durchgeführt
- [ ] Verification-Email empfangen und Link getestet
- [ ] Login mit unverified User blockiert getestet
- [ ] Login mit verified User erfolgreich getestet
- [ ] Monitoring für abgelaufene Tokens eingerichtet
- [ ] Backup vor Deployment erstellt

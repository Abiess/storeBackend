# 📚 Deployment Documentation Index

**Letztes Update**: 8. Dezember 2025  
**Status**: 🟢 Production-Ready

Your deployment has been fixed! Use this index to find the right documentation for your needs.

## 🎯 Start Here

**🏃 In a Hurry?** → Start with `QUICK_REFERENCE.md` (2 min read)

**📖 Want the Full Story?** → Start with `DEPLOYMENT_STATUS.md` (Aktueller Status)

**🗃️ Database Problems?** → Start with `DATABASE_SETUP.md` ⭐ NEU

**✅ Ready to Follow Steps?** → Start with `DEPLOYMENT_CHECKLIST.md` (follow along)

---

## 📂 Documentation Files

### ⭐ **DATABASE_SETUP.md** 🗃️ NEU!
*Best for: Datenbank-Setup und Troubleshooting*
- Problem: Berechtigungsfehler und fehlende Tabellen
- Lösung: SQL-basierte Schema-Initialisierung
- 16 Tabellen-Struktur erklärt
- Diagnose- und Reset-Scripts
- Häufige Probleme und Lösungen

**When to use:** Bei Datenbank-Problemen oder zum Verstehen des Schema-Setups

---

### ✅ **DEPLOYMENT_STATUS.md** 📊 AKTUALISIERT
*Best for: Aktueller Production-Status*
- 🟢 Live Status: https://api.markt.ma
- Erfolgreich erstellte Tabellen (16)
- Behobene Probleme im Detail
- Deployment-Prozess erklärt
- Verifizierung und Health Checks
- Nächste Schritte

**When to use:** Um den aktuellen Status zu prüfen oder Erfolg zu verifizieren

---

### 1. **QUICK_REFERENCE.md** ⚡
*Best for: Quick lookup and reminders*
- 5-minute quick start
- Common troubleshooting
- Security reminders
- File changes at a glance

**When to use:** When you just need the essentials or quick answers

---

### 2. **README.md** 📖 AKTUALISIERT
*Best for: Projekt-Übersicht*
- Production Status und URLs
- Feature-Liste und Roadmap
- API-Dokumentation
- Technologie-Stack
- Installation und Setup

**When to use:** Für einen Gesamtüberblick des Projekts

---

### 3. **AUTOMATED_DEPLOYMENT.md** 🚀
*Best for: Complete overview*
- What was fixed
- How deployment works
- Quick start (5 minutes)
- File modifications explained
- Monitoring your application
- Security best practices

**When to use:** First time reading or when you want the full picture

---

### 4. **DEPLOYMENT_CHECKLIST.md** ✅
*Best for: Following step-by-step*
- VPS preparation checklist
- Deployment user setup
- SSH authentication setup
- GitHub Secrets setup
- Test deployment
- Troubleshooting section

**When to use:** You're ready to set everything up now

---

### 5. **VPS_DEPLOYMENT_GUIDE.md** 🖥️
*Best for: Server-Setup*
- VPS Vorbereitung
- PostgreSQL Installation
- Nginx Konfiguration
- SSL/TLS Setup
- Domain-Konfiguration

**When to use:** Beim ersten Server-Setup

---

### 6. **GITHUB_SECRETS_SETUP.md** 🔐
*Best for: GitHub Secrets configuration*
- What each secret is
- How to generate values
- How to add to GitHub
- Example values
- Rotating secrets
- Troubleshooting auth issues

**When to use:** Setting up GitHub Secrets for the first time

---

### 7. **GITHUB_ACTIONS_SETUP.md** 🔧
*Best for: Detailed technical setup*
- Complete VPS prerequisites
- PostgreSQL setup
- Systemd service creation
- SSH key setup details
- GitHub repository secrets
- Manual rollback procedures
- Deep troubleshooting

**When to use:** You need detailed information or have specific issues

---

## 🧭 Navigation by Scenario

### "I want to deploy immediately"
1. Read: `QUICK_REFERENCE.md` (2 min)
2. Follow: `DEPLOYMENT_CHECKLIST.md`
3. Deploy: `git push origin main`

### "I want to understand everything"
1. Read: `DEPLOYMENT_STATUS.md` (Aktueller Status)
2. Read: `AUTOMATED_DEPLOYMENT.md` (5 min)
3. Read: `DATABASE_SETUP.md` (Datenbank-Details)

### "I have database problems"
1. Read: `DATABASE_SETUP.md` (Problem-Lösung)
2. Run: `./diagnose-database.sh` (Diagnose)
3. Check: `DEPLOYMENT_STATUS.md` (Erwartete Tabellen)

### "I need to troubleshoot"
1. Check: `DEPLOYMENT_STATUS.md` (Aktuelle Probleme?)
2. Read: `DATABASE_SETUP.md` (Datenbank-Troubleshooting)
3. Run: Health Check: `curl https://api.markt.ma/actuator/health`
4. Check Logs: `sudo journalctl -u storebackend -f`

### "I want to see the technical details"
1. Read: `DATABASE_SETUP.md` (Schema & SQL)
2. Review: `scripts/init-schema.sql` (Tabellendefinitionen)
3. Check: `application-production.yml` (Hibernate-Config)

---

## 📊 Quick Status Check

### Production URLs
- **API**: https://api.markt.ma
- **Swagger**: https://api.markt.ma/swagger-ui.html
- **Health**: https://api.markt.ma/actuator/health

### Database Status
```bash
# Auf dem Server
cd /opt/storebackend
./diagnose-database.sh
```

Erwartetes Ergebnis: ✅ 16 Tabellen gefunden

---

## 🛠️ Quick Commands Reference

### Deployment
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Check Status (auf Server)
```bash
# Service Status
sudo systemctl status storebackend

# Logs anzeigen
sudo journalctl -u storebackend -f

# Datenbank prüfen
cd /opt/storebackend
./diagnose-database.sh

# Health Check
curl http://localhost:8080/actuator/health
```

### Troubleshooting (auf Server)
```bash
# Service neu starten
sudo systemctl restart storebackend

# Schema neu initialisieren
cd /opt/storebackend
./init-schema.sh

# Datenbank zurücksetzen (WARNUNG: Löscht Daten!)
cd /opt/storebackend
./reset-database.sh
```

---

## 📚 Additional Resources

### API Documentation
- Swagger UI: https://api.markt.ma/swagger-ui.html
- OpenAPI JSON: https://api.markt.ma/v3/api-docs

### Logs & Monitoring
- Application Logs: `/var/log/storebackend/app.log`
- System Logs: `sudo journalctl -u storebackend`
- PostgreSQL Logs: `sudo journalctl -u postgresql`

### Scripts Location (Server)
- Deployment: `/opt/storebackend/deploy.sh`
- Schema Init: `/opt/storebackend/init-schema.sh`
- Diagnose: `/opt/storebackend/diagnose-database.sh`
- Reset: `/opt/storebackend/reset-database.sh`

---

## 🎯 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| DATABASE_SETUP.md | ✅ NEU | 8. Dez 2025 |
| DEPLOYMENT_STATUS.md | ✅ AKTUALISIERT | 8. Dez 2025 |
| README.md | ✅ AKTUALISIERT | 8. Dez 2025 |
| VPS_DEPLOYMENT_GUIDE.md | ✅ CURRENT | - |
| QUICK_REFERENCE.md | ✅ CURRENT | - |
| AUTOMATED_DEPLOYMENT.md | ✅ CURRENT | - |
| GITHUB_ACTIONS_SETUP.md | ✅ CURRENT | - |

---

## 💡 Tips

- **Bookmark this index** for quick navigation
- **Start with DEPLOYMENT_STATUS.md** to see current production status
- **Check DATABASE_SETUP.md** for any database-related issues
- **Use QUICK_REFERENCE.md** for quick commands and reminders
- **Keep GitHub Secrets secure** - never commit them to the repository

---

**Happy Deploying! 🚀**

For urgent issues, check `DEPLOYMENT_STATUS.md` first for the current status and known issues.

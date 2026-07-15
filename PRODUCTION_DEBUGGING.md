# Production Debugging Guide - markt.ma Security Events

## Problem: Security Events werden nicht in DB gespeichert

Dieses Dokument hilft bei der Diagnose, warum Security Events nicht in der Production-Datenbank ankommen.

---

## 🔍 Diagnose-Schritte

### 1. Build-Version identifizieren

**Beim Backend-Start wird automatisch geloggt:**

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    APPLICATION STARTUP - PRODUCTION INFO                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ 🏗️  BUILD INFORMATION                                                      ║
║ Build Version:        DEVELOPMENT / 0.0.1-SNAPSHOT                        ║
║ Build Time:           2026-07-15 18:20:00                                 ║
║ Active Profiles:      prod                                                ║
║ Server Port:          8080                                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ 💾 DATABASE CONFIGURATION                                                  ║
║ Database URL:         jdbc:postgresql://localhost:5432/storebackend      ║
║ Database User:        postgres                                            ║
║ DB Host:Port:         localhost:5432                                      ║
║ DB Name:              storebackend                                        ║
║ Connection Valid:     ✅ YES                                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ 🛡️  SECURITY FEATURES                                                      ║
║ Security Events:      ✅ ENABLED                                           ║
║ Rate Limiting:        ✅ ENABLED                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

**Prüfen:**
- Läuft der neue Build? (Check Build Time)
- Welche Datenbank wird verwendet? (DB Host:Port + DB Name)
- Sind Security Events aktiviert?

---

### 2. Mehrere Backend-Prozesse prüfen

```bash
# Alle Java-Prozesse anzeigen
ps aux | grep java

# Backend-Service-Status
systemctl status storebackend

# Welcher Prozess hört auf Port 8080?
ss -ltnp | grep 8080
# oder
lsof -i :8080

# Prozesse killen wenn mehrere laufen
kill -9 <PID>
```

**Problem:** Alte Backend-Instanz läuft parallel → neue Events gehen an alte DB.

---

### 3. Tatsächliche Production-Datenbank prüfen

#### **Via API (ohne Passwort):**

```bash
# System-Info abrufen
curl http://localhost:8080/api/admin/diagnostics/info

# Antwort enthält:
{
  "database": {
    "url": "jdbc:postgresql://localhost:5432/storebackend",
    "user": "postgres",
    "hostPort": "localhost:5432",
    "dbName": "storebackend",
    "connectionValid": "YES"
  }
}
```

#### **Mit Grafana vergleichen:**

1. Grafana öffnen → Data Sources → grafana-postgresql-datasource
2. Prüfen: Host, Port, Database Name
3. **Müssen identisch sein** mit Backend-DB!

**Problem:** Backend schreibt in `storebackend`, Grafana liest aus `storebackend_prod` → verschiedene DBs!

---

### 4. Request-Pfad prüfen

#### **Im Browser (DevTools → Network Tab):**

```
POST https://markt.ma/api/auth/register
Status: 201 Created
Request ID: abc123...
```

#### **In NGINX Access-Logs:**

```bash
tail -f /var/log/nginx/access.log | grep "/api/auth/register"

# Erwartete Ausgabe:
# 1.2.3.4 - - [15/Jul/2026:18:20:00 +0000] "POST /api/auth/register HTTP/1.1" 201 ...
```

#### **Im Backend-Log:**

```bash
tail -f /var/log/storebackend/application.log | grep "SECURITY_EVENT"

# Erwartete Ausgabe:
# SECURITY_EVENT_SAVE_ATTEMPT requestId=abc123 endpoint=/api/auth/register ...
# SECURITY_EVENT_SAVE_OK requestId=abc123 eventId=1234 saved=2026-07-15T18:20:00
```

**Problem:** Request kommt nicht am Backend an → NGINX leitet falsch weiter oder Backend läuft nicht.

---

### 5. Event-Speicherung prüfen

#### **Neu in SecurityEventService:**

Bei jedem `save()`-Aufruf wird geloggt:

```
INFO  SECURITY_EVENT_SAVE_ATTEMPT requestId=abc123 endpoint=/api/auth/register eventType=REGISTRATION_ATTEMPT blocked=false mailTriggered=true mailSent=true

INFO  SECURITY_EVENT_SAVE_OK requestId=abc123 endpoint=/api/auth/register eventId=1234 saved=2026-07-15T18:20:00
```

**Bei Fehler:**

```
ERROR SECURITY_EVENT_SAVE_FAILED requestId=abc123 endpoint=/api/auth/register errorClass=DataIntegrityViolationException errorMsg=NULL not allowed for column MAIL_TRIGGERED ...
```

#### **Mögliche Fehler:**

| Fehler | Bedeutung | Lösung |
|--------|-----------|--------|
| `ConstraintViolationException` | CHECK Constraint verletzt (z.B. `blocked=true AND mail_sent=true`) | Code-Logik prüfen |
| `DataIntegrityViolationException` | NOT NULL-Verletzung oder fehlende Spalte | DB-Migration prüfen |
| `IllegalArgumentException` | Ungültiger Enum-Wert | EventType/BlockReason prüfen |
| `TransactionSystemException` | Transaction rolled back | Async-Problem, Spring-Config prüfen |

---

### 6. DB-Connection-Test ausführen

#### **Via API:**

```bash
# DB-Test ausführen
curl -X POST http://localhost:8080/api/admin/diagnostics/test-db

# Antwort:
{
  "status": "SUCCESS",
  "eventsBefore": 42,
  "savedEventId": 123,
  "saveSuccess": true,
  "readSuccess": true,
  "eventsAfter": 43,
  "countIncreased": true,
  "latestEvents": 5,
  "message": "Database connection working correctly. Events can be saved and retrieved."
}
```

#### **Bei Fehler:**

```json
{
  "status": "FAILED",
  "error": "DataIntegrityViolationException",
  "message": "NULL not allowed for column MAIL_TRIGGERED"
}
```

→ **DB-Migration V27 fehlt!**

---

### 7. Events-Count prüfen

```bash
# Aktuelle Events zählen
curl http://localhost:8080/api/admin/diagnostics/events-count

# Antwort:
{
  "total": 42,
  "blocked": 10,
  "mailTriggered": 30,
  "mailSent": 25,
  "newestEventId": 123,
  "newestEventTime": "2026-07-15T17:26:21",
  "newestEventEndpoint": "/api/auth/register"
}
```

**Nach neuem Request:**
- `total` sollte sich erhöhen
- `newestEventTime` sollte aktueller sein

---

## 🐛 Häufigste Probleme & Lösungen

### Problem 1: Events werden nicht gespeichert

**Symptome:**
- `total = 2` bleibt konstant
- Kein `SECURITY_EVENT_SAVE_ATTEMPT` im Log

**Ursache:** Alter Build läuft

**Lösung:**
```bash
# Backend neu starten
systemctl restart storebackend

# Oder:
./mvnw clean package -DskipTests
java -jar target/storeBackend-0.0.1-SNAPSHOT.jar
```

---

### Problem 2: Grafana zeigt andere Daten als Backend

**Symptome:**
- Backend zeigt `total = 100`
- Grafana zeigt `total = 2`

**Ursache:** Verschiedene Datenbanken

**Lösung:**
1. Backend-DB identifizieren: `GET /api/admin/diagnostics/info`
2. Grafana-Datasource prüfen
3. Datasource auf Backend-DB umstellen

---

### Problem 3: Save fehlschlägt mit Constraint-Verletzung

**Symptome:**
```
ERROR SECURITY_EVENT_SAVE_FAILED ... ConstraintViolationException: 
  chk_mail_sent_not_when_blocked
```

**Ursache:** Code setzt `blocked=true AND mail_sent=true`

**Lösung:**
- Code prüfen: Bei `blocked=true` muss `mailSent(false)` sein
- Nie `mailSent(true)` bei blockierten Requests!

---

### Problem 4: NULL not allowed for MAIL_TRIGGERED

**Symptome:**
```
ERROR SECURITY_EVENT_SAVE_FAILED ... DataIntegrityViolationException: 
  NULL not allowed for column MAIL_TRIGGERED
```

**Ursache:** DB-Migration V27 nicht ausgeführt

**Lösung:**
```bash
psql -U postgres -d storebackend -f scripts/db/V27_mail_triggered_semantic_fix.sql
```

---

## ✅ Checkliste für Production-Deployment

```
[ ] 1. Backend neu gebaut (mvn clean package)
[ ] 2. Nur eine Backend-Instanz läuft (ps aux | grep java)
[ ] 3. Backend läuft auf Port 8080 (ss -ltnp | grep 8080)
[ ] 4. DB-Migrations V27 ausgeführt
[ ] 5. CHECK Constraint aktiv (SELECT conname FROM pg_constraint WHERE conname='chk_mail_sent_not_when_blocked')
[ ] 6. Backend-Log zeigt Startup-Info mit korrekter DB
[ ] 7. Backend-DB = Grafana-DB (Host, Port, Name vergleichen)
[ ] 8. DB-Connection-Test erfolgreich (POST /api/admin/diagnostics/test-db)
[ ] 9. Test-Request durchgeführt (POST /api/auth/register)
[ ] 10. SECURITY_EVENT_SAVE_OK im Log
[ ] 11. Events-Count erhöht sich (GET /api/admin/diagnostics/events-count)
[ ] 12. Grafana zeigt neues Event
```

---

## 🚀 Finale Validierung

Nach Deployment:

```bash
# 1. System-Info abrufen
curl http://localhost:8080/api/admin/diagnostics/info > system-info.json

# 2. DB-Test ausführen
curl -X POST http://localhost:8080/api/admin/diagnostics/test-db

# 3. Events vor Test zählen
curl http://localhost:8080/api/admin/diagnostics/events-count > before.json

# 4. Test-Request durchführen
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","captchaToken":"test"}'

# 5. Events nach Test zählen
curl http://localhost:8080/api/admin/diagnostics/events-count > after.json

# 6. Vergleichen
diff before.json after.json
# → total sollte sich erhöht haben

# 7. In Grafana prüfen
# → Dashboard öffnen → Latest Events → neuer Eintrag sichtbar?
```

**Erfolg:** ✅ Events werden gespeichert und in Grafana angezeigt

---

**Erstellt:** 2026-07-15  
**Version:** 1.0  
**markt.ma Security Team**

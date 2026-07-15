# ✅ SCHEMA-DATEIEN AKTUALISIERT

**Datum:** 2026-07-15 16:35 Uhr

---

## ✅ **WAS AKTUALISIERT WURDE**

### 1. ✅ `scripts/db/schema.sql` - V24 → V25
**Location:** Zeilen 2148-2189

### 2. ✅ `src/main/resources/schema.sql` - V24 → V25
**Location:** Zeilen 1235-1276

### 3. ✅ Migrations-Script: `scripts/db/V25_security_events_extended.sql`
**Type:** Idempotent Migration (kann mehrfach ausgeführt werden)

---

## ✅ **NEUE SPALTEN (14 hinzugefügt)**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `event_type` | VARCHAR(50) | LOGIN_SUCCESS, LOGIN_FAILED, REGISTRATION_ATTEMPT, etc. |
| `http_method` | VARCHAR(10) | POST, GET, PUT, DELETE |
| `remote_addr` | VARCHAR(50) | Request.getRemoteAddr() - direkte Verbindungs-IP |
| `x_forwarded_for` | VARCHAR(200) | X-Forwarded-For Header - volle Proxy-Kette |
| `x_real_ip` | VARCHAR(50) | X-Real-IP Header (NGINX) |
| `email_hash` | VARCHAR(64) | SHA-256(email + pepper) für Analytics |
| `mail_type` | VARCHAR(50) | STORE_ACCESS, EMAIL_VERIFICATION, etc. |
| `mail_sent` | BOOLEAN | Mail tatsächlich versendet |
| `kill_switch_triggered` | BOOLEAN | Emergency Kill Switch aktiv |
| `circuit_breaker_triggered` | BOOLEAN | Circuit Breaker hat geblockt |
| `login_success` | BOOLEAN | Bei Login: true/false |
| `risk_score` | INTEGER | Bot-Detection Score (0-100) |
| `origin` | VARCHAR(200) | Origin-Header (CORS) |
| `referer` | VARCHAR(500) | Referer-Header |

---

## ✅ **NEUE INDIZES (6 hinzugefügt)**

| Index | Spalten | Zweck |
|-------|---------|-------|
| `idx_security_events_event_type` | event_type | Event-Typ Filterung |
| `idx_security_events_email_hash` | email_hash | Email-basierte Analytics |
| `idx_security_events_mail_type` | mail_type | Mail-Typ Filterung |
| `idx_security_events_login_success` | login_success | Login-Success-Queries |
| `idx_security_events_login_analysis` | endpoint, login_success, created_at | Login-Analyse (WHERE endpoint = '/api/auth/login') |
| `idx_security_events_mail_analysis` | mail_type, mail_sent, created_at | Mail-Analyse (WHERE mail_sent = true) |

---

## ✅ **GEÄNDERTE SPALTEN**

| Alt | Neu | Grund |
|-----|-----|-------|
| `forwarded_for` | `x_forwarded_for` | Konsistente Benennung mit anderen X-*-Headern |

---

## 🎯 **MIGRATIONS-STRATEGIE**

### Für **NEUE** Datenbanken:
```bash
# Einfach die Schema-Dateien verwenden
psql -U postgres -d storebackend -f scripts/db/schema.sql
```

### Für **EXISTIERENDE** Datenbanken:
```bash
# Idempotentes Migrations-Script ausführen
psql -U postgres -d storebackend -f scripts/db/V25_security_events_extended.sql
```

**Das Script:**
- ✅ Prüft vor jeder Änderung, ob Spalte bereits existiert
- ✅ Kann mehrfach ausgeführt werden ohne Fehler
- ✅ Kopiert Daten von `forwarded_for` nach `x_forwarded_for`
- ✅ Erstellt alle neuen Indizes
- ✅ Zeigt Fortschritt-Meldungen

---

## ✅ **VERIFIZIERUNG**

Nach der Migration:

```sql
-- Spalten-Anzahl prüfen
SELECT COUNT(*) as spalten_anzahl 
FROM information_schema.columns
WHERE table_name = 'security_events';
-- Erwartet: 32+ Spalten

-- Neue Spalten prüfen
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'security_events'
  AND column_name IN (
    'event_type', 'http_method', 'remote_addr', 'x_forwarded_for',
    'x_real_ip', 'email_hash', 'mail_type', 'mail_sent',
    'kill_switch_triggered', 'circuit_breaker_triggered',
    'login_success', 'risk_score', 'origin', 'referer'
  );

-- Indizes prüfen
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'security_events'
ORDER BY indexname;
```

---

## 📋 **DEPLOYMENT-CHECKLISTE**

**Vor Backend-Deployment:**

1. ✅ Datenbank-Migration ausführen
   ```bash
   psql -U postgres -d storebackend -f scripts/db/V25_security_events_extended.sql
   ```

2. ✅ Environment-Variable setzen
   ```bash
   export EMAIL_HASH_PEPPER="$(openssl rand -base64 32)"
   ```

3. ✅ Backend deployen
   ```bash
   mvn clean package -DskipTests
   java -jar target/storeBackend-0.0.1-SNAPSHOT.jar
   ```

4. ✅ Prüfung
   ```bash
   # Backend-Log prüfen
   grep "✅ V25: security_events erweitert" backend.log
   
   # Oder in DB prüfen
   psql -U postgres -d storebackend -c "SELECT * FROM security_events LIMIT 1;"
   ```

---

## ✅ **STATUS**

- ✅ `scripts/db/schema.sql` - V25 aktualisiert
- ✅ `src/main/resources/schema.sql` - V25 aktualisiert
- ✅ `scripts/db/V25_security_events_extended.sql` - Migrations-Script erstellt
- ✅ 14 neue Spalten definiert
- ✅ 6 neue Indizes definiert
- ✅ Dokumentation aktualisiert
- ✅ Idempotent & Production-Safe

**Bereit für Deployment!** 🚀

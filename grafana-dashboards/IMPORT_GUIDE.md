# 🚀 GRAFANA DASHBOARD IMPORT - ANLEITUNG

**Datum:** 2026-07-15  
**Dashboards:** 2 vollständige JSON-Dateien

---

## 📋 DATEIEN

1. **`platform-overview.json`** (23 KB)
   - 11 Panels
   - Platform-Metriken (Stores, Users, Orders, GMV)
   - Refresh: 5 Minuten
   - Zeitraum: Letzte 24 Stunden

2. **`security-bot-protection.json`** (23 KB)
   - 14 Panels + 4 Dashboard-Variablen
   - Security Events Monitoring
   - Refresh: 30 Sekunden
   - Zeitraum: Letzte 6 Stunden

---

## 🔧 SCHRITT 1: DATASOURCE KONFIGURIEREN

### In Grafana UI:

1. **Connections → Data sources → Add data source**
2. **Wähle "PostgreSQL"**
3. **Konfiguration:**
   ```
   Name: PostgreSQL (oder beliebig)
   Host: localhost:5432  (oder deine Production DB)
   Database: storebackend
   User: grafana_readonly  (empfohlen: Read-Only User erstellen)
   Password: ***
   SSL Mode: require  (für Production empfohlen)
   Version: 12+
   ```
4. **Save & Test** - muss "Database Connection OK" zeigen

### Read-Only User erstellen (empfohlen):
```sql
-- PostgreSQL
CREATE USER grafana_readonly WITH PASSWORD 'secure_password_here';
GRANT CONNECT ON DATABASE storebackend TO grafana_readonly;
GRANT USAGE ON SCHEMA public TO grafana_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_readonly;
```

---

## 📊 SCHRITT 2: DASHBOARDS IMPORTIEREN

### Methode 1: Via Grafana UI (EMPFOHLEN)

1. **Grafana → Dashboards → New → Import**
2. **"Upload dashboard JSON file"** klicken
3. **Datei wählen:**
   - Zuerst: `platform-overview.json`
   - Dann: `security-bot-protection.json`
4. **Datasource auswählen:**
   - Bei "Select a PostgreSQL data source" → deine PostgreSQL Datasource wählen
5. **Import** klicken

**Wichtig:** Die JSON-Dateien verwenden `${DS_POSTGRES}` als Platzhalter. Beim Import wird Grafana automatisch nach der Datasource fragen.

### Methode 2: Via Grafana API

```bash
# Platform Overview Dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer YOUR_GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @platform-overview.json

# Security Dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer YOUR_GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @security-bot-protection.json
```

**API Key erstellen:**
1. Grafana → Configuration → API Keys
2. Add API Key → Name: "Dashboard Import" → Role: Admin
3. Key kopieren

---

## ✅ SCHRITT 3: VALIDIERUNG

### Test 1: Platform Overview Dashboard

1. **Dashboard öffnen**
2. **Prüfe Stats (oben):**
   - Aktive Stores: Sollte Zahl > 0 zeigen
   - Benutzer gesamt: Sollte Zahl > 0 zeigen
   - Bestellungen gesamt: Kann 0 sein wenn keine Orders
   - Verifizierte Domains: Kann 0 sein
3. **Prüfe Zeitreihen:**
   - "Neue Stores pro Tag" sollte Linien zeigen
   - "GMV pro Tag" sollte Werte zeigen (falls Orders vorhanden)
4. **Prüfe Tabelle:**
   - "Top 10 Stores nach GMV" sollte Stores listen (falls Orders vorhanden)

**Wenn Panels leer sind:**
```sql
-- Debugging: Daten vorhanden?
SELECT COUNT(*) FROM stores;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
```

### Test 2: Security Dashboard

1. **Dashboard öffnen**
2. **Prüfe Stats (oben):**
   - "Requests gesamt" sollte > 0 sein (nach Deployment)
   - Andere Stats füllen sich nach Bot-Aktivität
3. **Prüfe Timeline:**
   - "Security Events Timeline" sollte Linien zeigen
4. **Prüfe Tabellen:**
   - "Top 20 Angreifer-IPs" füllt sich bei Bot-Aktivität
   - "Letzte 200 Events" sollte neueste Events zeigen

**Wenn Security-Panels leer sind:**
```sql
-- Debugging: security_events Tabelle vorhanden?
SELECT COUNT(*) FROM security_events;

-- Wenn 0: Warte bis nach Deployment, dann sollten Events kommen
-- Test-Event manuell erstellen (optional):
INSERT INTO security_events (
  endpoint, client_ip, email_masked, email_domain, 
  captcha_present, captcha_valid, blocked, block_reason,
  mail_triggered, http_status, created_at
) VALUES (
  '/api/auth/forgot-password', '127.0.0.1', 'te***@example.com', 'example.com',
  true, false, true, 'CAPTCHA validation failed',
  false, 400, NOW()
);
```

---

## 🎨 SCHRITT 4: ANPASSUNG (OPTIONAL)

### Zeitbereiche ändern:
- Dashboard Settings (⚙️) → Time options
- Default time range ändern (z.B. "Last 7 days" statt "Last 24 hours")

### Refresh-Rate ändern:
- Dashboard Settings → Auto refresh
- Platform: 5m (Standard) oder 1m/10m
- Security: 30s (Standard) oder 10s/1m

### Panel umbenennen:
- Panel → Edit → Panel Title ändern

### Farben anpassen:
- Panel → Edit → Field → Color scheme

### Alerts hinzufügen (siehe QUICK_SETUP.md):
- Panel → Edit → Alert Tab → Create alert rule

---

## 🔍 TROUBLESHOOTING

### Problem: "No data" in allen Panels

**Lösung 1: Datasource prüfen**
```
Grafana → Connections → Data sources → PostgreSQL
→ Test → sollte "Database Connection OK" zeigen
```

**Lösung 2: Query testen**
```
Grafana → Explore → Datasource: PostgreSQL
Query: SELECT COUNT(*) FROM stores;
→ sollte Zahl zurückgeben
```

**Lösung 3: Berechtigungen prüfen**
```sql
-- Als Grafana User:
SELECT current_user;
SELECT * FROM stores LIMIT 1;
```

### Problem: "Table does not exist"

**security_events Tabelle fehlt:**
```sql
-- Prüfe ob Tabelle existiert:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'security_events';

-- Falls leer: Backend deployen (Tabelle wird automatisch erstellt via ddl-auto: update)
```

**orders/stores/users Tabelle fehlt:**
- Backend wurde noch nie gestartet
- Lösung: Backend starten (Flyway deaktiviert, ddl-auto: update erstellt Tabellen)

### Problem: "Time series not found"

**Zeitbereich zu klein:**
- Zeitbereich vergrößern (z.B. "Last 7 days")
- Daten könnten außerhalb des Zeitfensters liegen

### Problem: Dashboard-Variablen funktionieren nicht

**Datasource fehlt:**
- Dashboard Settings → Variables → endpoint
- Datasource: PostgreSQL auswählen
- Refresh drücken

---

## 📊 ERWARTETE METRIKEN

### Nach 1 Stunde Production:
- **Platform:** 
  - Stores: 1-10 aktiv
  - Users: 1-20
  - Orders: 0-5
  - GMV: 0-500 €

- **Security:** 
  - Requests: 50-200
  - Blockiert: 5-50 (bei Bot-Aktivität)
  - CAPTCHA-Fehler: 2-20
  - Honeypot: 0-5

### Nach 24 Stunden Production:
- **Platform:**
  - Neue Stores: 5-20/Tag
  - Neue Users: 10-50/Tag
  - Orders: 10-100/Tag
  - GMV: 500-5000 €/Tag

- **Security:**
  - Requests: 1000-5000/Tag
  - Blockiert: 10-30% Quote
  - Top Angreifer-IPs: 5-20 IPs
  - Versendete Mails: <50/Tag (Circuit Breaker aktiv)

---

## 🎯 NÄCHSTE SCHRITTE

1. ✅ Beide Dashboards importiert
2. ✅ Panels zeigen Daten
3. ⏳ 24h warten und Monitoring beobachten
4. ⏳ Alerts konfigurieren (siehe QUICK_SETUP.md)
5. ⏳ Optional: Contact Point für Alerts einrichten
6. ⏳ Optional: Email Logging implementieren (siehe README.md)
7. ⏳ Optional: Prometheus Metrics aktivieren (siehe README.md)

---

## 📞 SUPPORT

**Dokumentation:**
- `README.md` - Vollständige Dashboard-Dokumentation
- `QUICK_SETUP.md` - Alle SQL-Queries einzeln
- `FINAL_REPORT.md` - Abschlussbericht

**Grafana Docs:**
- https://grafana.com/docs/grafana/latest/dashboards/
- https://grafana.com/docs/grafana/latest/datasources/postgres/

**PostgreSQL Datasource:**
- https://grafana.com/docs/grafana/latest/datasources/postgres/

---

**Import-Datum:** 2026-07-15  
**Status:** ✅ READY TO IMPORT  
**Dashboards:** 2 JSON-Dateien (platform-overview.json + security-bot-protection.json)

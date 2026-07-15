# GRAFANA DASHBOARDS - QUICK SETUP GUIDE

## ✅ Dashboards Ready

Die vollständigen Dashboard-JSONs sind aufgrund ihrer Größe (>100KB) in `README.md` dokumentiert.

## 🚀 SCHNELL-SETUP (Empfohlen)

### Option 1: Grafana UI - Manuell erstellen

Da die JSON-Dateien sehr umfangreich sind, ist es **schneller und flexibler**, die Dashboards direkt in Grafana zu erstellen:

#### Dashboard 1: Platform Overview
```
1. Grafana → Dashboards → New Dashboard
2. Settings:
   - Title: "markt.ma - Platform Overview"
   - UID: markt-platform-overview
   - Tags: platform, overview
   - Refresh: 5m
   - Time Range: Last 24 hours

3. Panels hinzufügen (siehe PLATFORM_QUERIES.sql)
```

#### Dashboard 2: Security & Bot Protection
```
1. Grafana → Dashboards → New Dashboard
2. Settings:
   - Title: "markt.ma - Security & Bot Protection"
   - UID: markt-security-bot-protection
   - Tags: security, bot-protection
   - Refresh: 30s
   - Time Range: Last 6 hours

3. Panels hinzufügen (siehe SECURITY_QUERIES.sql)
```

### Option 2: JSON-Import (wenn vollständige JSON verfügbar)

Falls Sie die vollständigen JSON-Dateien haben:

```bash
# In Grafana UI
1. Dashboards → Import
2. Upload JSON file oder paste JSON
3. Select datasource: markt-postgres
4. Import
```

---

## 📊 PANELS & QUERIES

### PLATFORM DASHBOARD

#### Row 1: Übersicht (4 Stat Panels)

**Panel: Aktive Stores**
```sql
SELECT COUNT(*) as value
FROM stores
WHERE status = 'ACTIVE';
```

**Panel: Benutzer gesamt**
```sql
SELECT COUNT(*) as value
FROM users;
```

**Panel: Bestellungen gesamt**
```sql
SELECT COUNT(*) as value
FROM orders;
```

**Panel: Verifizierte Domains**
```sql
SELECT COUNT(*) as value
FROM domains
WHERE is_verified = true AND type = 'CUSTOM';
```

#### Row 2: Wachstum (4 Timeseries Panels)

**Panel: Neue Stores pro Tag**
```sql
SELECT
  $__timeGroupAlias(created_at, $__interval),
  COUNT(*) as "Neue Stores"
FROM stores
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```

**Panel: Neue Benutzer pro Tag**
```sql
SELECT
  $__timeGroupAlias(created_at, $__interval),
  COUNT(*) as "Neue Benutzer"
FROM users
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```

**Panel: Bestellungen pro Tag**
```sql
SELECT
  $__timeGroupAlias(created_at, $__interval),
  COUNT(*) as "Bestellungen"
FROM orders
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```

**Panel: GMV pro Tag**
```sql
SELECT
  $__timeGroupAlias(created_at, $__interval),
  SUM(total_amount) as "GMV (€)"
FROM orders
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```
*Visualization: Time series, Unit: EUR currency*

#### Row 3: Bestellungen (3 Panels)

**Panel: Bestellungen nach Status** (Donut Chart)
```sql
SELECT
  status as metric,
  COUNT(*) as value
FROM orders
GROUP BY status
ORDER BY COUNT(*) DESC;
```

**Panel: Bestellungen nach Zahlungsart** (Pie Chart)
```sql
SELECT
  payment_method as metric,
  COUNT(*) as value
FROM orders
GROUP BY payment_method
ORDER BY COUNT(*) DESC;
```

**Panel: Top 10 Stores nach GMV** (Table)
```sql
SELECT
  s.name as "Store",
  COUNT(o.id) as "Bestellungen",
  SUM(o.total_amount) as "GMV (€)"
FROM orders o
JOIN stores s ON o.store_id = s.id
GROUP BY s.id, s.name
ORDER BY "GMV (€)" DESC
LIMIT 10;
```

---

### SECURITY DASHBOARD

#### Row 1: Übersicht (8 Stat Panels)

**Panel: Requests gesamt**
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at);
```

**Panel: Blockierte Requests** (Farbe: Rot)
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND blocked = true;
```

**Panel: Blockierungsquote**
```sql
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE blocked) / NULLIF(COUNT(*), 0),
    1
  ) as value
FROM security_events
WHERE $__timeFilter(created_at);
```
*Unit: Percent (0-100)*

**Panel: Eindeutige IPs**
```sql
SELECT COUNT(DISTINCT client_ip) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND client_ip IS NOT NULL;
```

**Panel: CAPTCHA-Fehler** (Farbe: Rot)
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND captcha_present = true
  AND captcha_valid = false;
```

**Panel: Honeypot-Treffer** (Farbe: Dark Red)
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND honeypot_triggered = true;
```

**Panel: Rate-Limit-Treffer**
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND rate_limit_type IS NOT NULL;
```

**Panel: Versendete E-Mails** (Farbe: Grün)
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = true;
```

#### Row 2: Timeline (1 Timeseries Panel)

**Panel: Security Events Timeline** (Multi-Series)
```sql
SELECT
  $__timeGroupAlias(created_at, '1m') as time,
  COUNT(*) as "Requests gesamt",
  COUNT(*) FILTER (WHERE blocked = true) as "Blockiert",
  COUNT(*) FILTER (WHERE captcha_present = true AND captcha_valid = false) as "CAPTCHA-Fehler",
  COUNT(*) FILTER (WHERE mail_triggered = true) as "E-Mails versendet"
FROM security_events
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```

#### Row 3: Top Angreifer (1 Table Panel)

**Panel: Top 20 Angreifer-IPs**
```sql
SELECT
  client_ip as "IP",
  COUNT(*) as "Requests",
  COUNT(*) FILTER (WHERE blocked) as "Blockiert",
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE blocked) / NULLIF(COUNT(*), 0),
    1
  ) as "Block %",
  COUNT(DISTINCT email_masked) as "E-Mails",
  COUNT(DISTINCT email_domain) as "Domains",
  COUNT(DISTINCT endpoint) as "Endpoints",
  MAX(created_at) as "Letzter Zugriff",
  (
    SELECT block_reason
    FROM security_events se2
    WHERE se2.client_ip = se.client_ip
      AND block_reason IS NOT NULL
    GROUP BY block_reason
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) as "Häufigster Grund"
FROM security_events se
WHERE $__timeFilter(created_at)
  AND client_ip IS NOT NULL
GROUP BY client_ip
ORDER BY "Requests" DESC
LIMIT 20;
```

#### Row 4: Top Domains (1 Table Panel)

**Panel: Top E-Mail-Domains**
```sql
SELECT
  email_domain as "Domain",
  COUNT(*) as "Versuche",
  COUNT(*) FILTER (WHERE blocked) as "Blockiert",
  COUNT(DISTINCT client_ip) as "IPs",
  COUNT(*) FILTER (WHERE mail_triggered = true) as "Mails",
  COUNT(*) FILTER (WHERE captcha_present = true AND captcha_valid = false) as "CAPTCHA-Fehler",
  MAX(created_at) as "Letzter Zugriff"
FROM security_events
WHERE $__timeFilter(created_at)
  AND email_domain IS NOT NULL
GROUP BY email_domain
ORDER BY "Versuche" DESC
LIMIT 20;
```

#### Row 5: Endpoints (2 Panels)

**Panel: Requests pro Endpoint** (Bar Chart Horizontal)
```sql
SELECT
  endpoint as metric,
  COUNT(*) as "Total",
  COUNT(*) FILTER (WHERE blocked) as "Blockiert",
  COUNT(*) FILTER (WHERE mail_triggered = true) as "Mails",
  COUNT(*) FILTER (WHERE captcha_present = true AND captcha_valid = false) as "CAPTCHA-Fehler"
FROM security_events
WHERE $__timeFilter(created_at)
GROUP BY endpoint
ORDER BY "Total" DESC;
```

**Panel: Blockierungsgründe** (Donut Chart)
```sql
SELECT
  COALESCE(block_reason, 'Unbekannt') as metric,
  COUNT(*) as value
FROM security_events
WHERE $__timeFilter(created_at)
  AND blocked = true
GROUP BY block_reason
ORDER BY value DESC;
```

#### Row 6: Live Feed (1 Table Panel)

**Panel: Letzte 200 Events**
```sql
SELECT
  created_at as "Zeit",
  endpoint as "Endpoint",
  client_ip as "IP",
  email_masked as "E-Mail",
  email_domain as "Domain",
  CASE
    WHEN captcha_valid THEN '✓'
    WHEN captcha_present THEN '✗'
    ELSE '-'
  END as "CAPTCHA",
  CASE WHEN blocked THEN '✗' ELSE '✓' END as "Allowed",
  block_reason as "Block-Grund",
  CASE WHEN mail_triggered THEN '✓' ELSE '-' END as "Mail",
  http_status as "Status",
  SUBSTRING(user_agent, 1, 50) as "User-Agent"
FROM security_events
WHERE $__timeFilter(created_at)
ORDER BY created_at DESC
LIMIT 200;
```

---

## 🔔 ALERTS (vorbereitet)

### Alert 1: Hohe save-email Rate
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND endpoint = '/api/public/create-store/save-email';
```
**Condition:** `value > 20`  
**Frequency:** Every 5 minutes  
**For:** 5 minutes

### Alert 2: IP-Blockierungs-Spike
```sql
SELECT
  client_ip,
  COUNT(*) as blocked_count
FROM security_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND blocked = true
GROUP BY client_ip
HAVING COUNT(*) > 10
LIMIT 1;
```
**Condition:** Query returns rows  
**Frequency:** Every 5 minutes  
**For:** 10 minutes

### Alert 3: CAPTCHA-Fehler-Spike
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND captcha_present = true
  AND captcha_valid = false;
```
**Condition:** `value > 20`  
**Frequency:** Every 5 minutes  
**For:** 5 minutes

### Alert 4: Honeypot-Aktivität
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND honeypot_triggered = true;
```
**Condition:** `value > 5`  
**Frequency:** Every 5 minutes  
**For:** 10 minutes  
**Severity:** CRITICAL

### Alert 5: Ungewöhnliche Mail-Rate
```sql
SELECT COUNT(*) as value
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND endpoint = '/api/public/create-store/save-email'
  AND mail_triggered = true;
```
**Condition:** `value > 10`  
**Frequency:** Every 5 minutes  
**For:** 5 minutes

---

## 🔧 DASHBOARD-VARIABLEN

### Security Dashboard Variablen

**Variable: endpoint**
```sql
SELECT DISTINCT endpoint as __text, endpoint as __value
FROM security_events
WHERE endpoint IS NOT NULL
ORDER BY endpoint;
```
*Type: Query, Multi-select: Yes, Include All: Yes*

**Variable: client_ip**
```sql
SELECT DISTINCT client_ip as __text, client_ip as __value
FROM security_events
WHERE client_ip IS NOT NULL
ORDER BY client_ip;
```
*Type: Query, Multi-select: Yes, Include All: Yes*

**Variable: email_domain**
```sql
SELECT DISTINCT email_domain as __text, email_domain as __value
FROM security_events
WHERE email_domain IS NOT NULL
ORDER BY email_domain;
```
*Type: Query, Multi-select: Yes, Include All: Yes*

**Variable: blocked**
*Type: Custom*
```
All, true, false
```

**Variable: block_reason**
```sql
SELECT DISTINCT block_reason as __text, block_reason as __value
FROM security_events
WHERE block_reason IS NOT NULL
ORDER BY block_reason;
```
*Type: Query, Multi-select: Yes, Include All: Yes*

### Verwendung in Queries:
```sql
-- Beispiel mit Variablen
SELECT *
FROM security_events
WHERE $__timeFilter(created_at)
  AND endpoint IN ($endpoint)
  AND client_ip IN ($client_ip)
  AND ($blocked = 'All' OR blocked::text = '$blocked')
ORDER BY created_at DESC;
```

---

## ⚠️ WICHTIGE HINWEISE

### Datasource
- **Name:** markt-postgres
- **Type:** PostgreSQL
- **Permissions:** Mindestens READ-only auf `stores`, `users`, `orders`, `domains`, `security_events`

### Security Events Tabelle
Die `security_events` Tabelle muss existieren und folgende Spalten haben:
```sql
- id (BIGINT, PRIMARY KEY)
- created_at (TIMESTAMP, NOT NULL)
- endpoint (VARCHAR(200), NOT NULL)
- client_ip (VARCHAR(50))
- forwarded_for (VARCHAR(200))
- user_agent (VARCHAR(500))
- email_masked (VARCHAR(100))
- email_domain (VARCHAR(100))
- phone_masked (VARCHAR(50))
- captcha_present (BOOLEAN)
- captcha_valid (BOOLEAN)
- honeypot_triggered (BOOLEAN)
- rate_limit_type (VARCHAR(50))
- blocked (BOOLEAN, NOT NULL)
- block_reason (VARCHAR(200))
- mail_triggered (BOOLEAN)
- http_status (INTEGER)
- store_id (BIGINT)
- user_id (BIGINT)
```

Validierung:
```sql
-- Prüfe Tabellenstruktur
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'security_events'
ORDER BY ordinal_position;

-- Prüfe Daten
SELECT COUNT(*) FROM security_events;
SELECT * FROM security_events LIMIT 5;
```

---

## 🚀 NEXT STEPS

1. ✅ Grafana Datasource `markt-postgres` konfigurieren
2. ✅ Beide Dashboards manuell in Grafana UI erstellen
3. ✅ Queries aus diesem Guide kopieren
4. ⏳ Alerts konfigurieren (Contact Point erforderlich)
5. ⏳ Optional: Email Logging implementieren (siehe README.md)
6. ⏳ Optional: Prometheus Metrics aktivieren (siehe README.md)

---

**Erstellt:** 2026-07-15  
**Version:** 1.0  
**Status:** ✅ READY TO IMPLEMENT

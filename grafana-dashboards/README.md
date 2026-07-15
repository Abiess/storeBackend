# Grafana Dashboards für markt.ma

**Status:** ✅ READY FOR IMPORT  
**Erstellt:** 2026-07-15  
**Dashboards:** 2 (Platform Overview + Security & Bot Protection)

---

## Dashboard 1: Platform Overview

**UID:** `markt-platform-overview`  
**Refresh:** 5 Minuten  
**Default Time Range:** Letzte 24 Stunden

### Panels erstellt:

#### Row: Plattform-Übersicht
1. **🏪 Aktive Stores** (Stat)
   - Query: `SELECT COUNT(*) FROM stores WHERE status = 'ACTIVE'`
   - Farbe: Grün

2. **👥 Benutzer gesamt** (Stat)
   - Query: `SELECT COUNT(*) FROM users`
   - Farbe: Blau

3. **📦 Bestellungen gesamt** (Stat)
   - Query: `SELECT COUNT(*) FROM orders`
   - Farbe: Lila

4. **🌐 Verifizierte Domains** (Stat)
   - Query: `SELECT COUNT(*) FROM domains WHERE is_verified = true AND type = 'CUSTOM'`
   - Farbe: Gelb

#### Row: Wachstum & Zeitreihen
5. **🏪 Neue Stores pro Tag** (Timeseries)
   - Query: `SELECT $__timeGroupAlias(created_at, $__interval), COUNT(*) FROM stores`
   - Liniendiagramm

6. **👥 Neue Benutzer pro Tag** (Timeseries)
   - Query: `SELECT $__timeGroupAlias(created_at, $__interval), COUNT(*) FROM users`
   - Liniendiagramm

7. **📦 Bestellungen pro Tag** (Timeseries)
   - Query: `SELECT $__timeGroupAlias(created_at, $__interval), COUNT(*) FROM orders`
   - Balkendiagramm

8. **💰 Umsatz (GMV) pro Tag** (Timeseries)
   - Query: `SELECT $__timeGroupAlias(created_at, $__interval), SUM(total_amount) FROM orders`
   - Liniendiagramm mit Sum in Legend
   - Unit: EUR Currency

#### Row: Bestellungen
9. **Bestellungen nach Status** (Pie/Donut Chart)
   - Query: `SELECT status, COUNT(*) FROM orders GROUP BY status`
   - Donut-Chart

10. **Bestellungen nach Zahlungsart** (Pie Chart)
    - Query: `SELECT payment_method, COUNT(*) FROM orders GROUP BY payment_method`

11. **🏆 Top 10 Stores nach GMV** (Table)
    - Query: `SELECT s.name, COUNT(o.id), SUM(o.total_amount) FROM orders o JOIN stores s ...`
    - Sortiert nach GMV DESC

### ⚠️ Nicht implementiert (fehlende Datenstrukturen):
- **E-Mail Tracking:** Keine `email_logs` Tabelle vorhanden
  - Gesendete E-Mails pro Tag
  - Fehlgeschlagene E-Mails
  - Store-Access-Mails
  - Passwort-Reset-Mails
  - Circuit-Breaker-Auslösungen
  - **Workaround:** Kann über `security_events.mail_triggered` teilweise abgebildet werden

- **Infrastruktur-Metriken:** Kein Prometheus/Actuator konfiguriert
  - JVM Heap/Non-Heap
  - CPU/System Load
  - Threads
  - HTTP Request Rate
  - Response-Zeit p50/p95/p99
  - DB Connection Pool
  - **Empfehlung:** Spring Boot Actuator + Prometheus Micrometer aktivieren

---

## Dashboard 2: Security & Bot Protection

**UID:** `markt-security-bot-protection`  
**Refresh:** 30 Sekunden  
**Default Time Range:** Letzte 6 Stunden

### Datasource: PostgreSQL (security_events Tabelle)

### Panels erstellt:

#### Row: Übersicht
1. **Requests gesamt** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE $__timeFilter(created_at)`

2. **Blockierte Requests** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE blocked = true`
   - Farbe: Rot

3. **Blockierungsquote (%)** (Stat)
   - Query: `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE blocked) / COUNT(*), 1) FROM security_events`
   - Farbe: Orange bei >10%

4. **Eindeutige IPs** (Stat)
   - Query: `SELECT COUNT(DISTINCT client_ip) FROM security_events`

5. **CAPTCHA-Fehler** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE captcha_present = true AND captcha_valid = false`
   - Farbe: Rot

6. **Honeypot-Treffer** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE honeypot_triggered = true`
   - Farbe: Dark Red

7. **Rate-Limit-Treffer** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE rate_limit_type IS NOT NULL`

8. **Tatsächlich versendete E-Mails** (Stat)
   - Query: `SELECT COUNT(*) FROM security_events WHERE mail_triggered = true`
   - Farbe: Grün

#### Row: Zeitlicher Verlauf
9. **Security Events Timeline** (Timeseries)
   - 4 Serien:
     - Requests gesamt (Blau)
     - Blockierte Requests (Rot)
     - CAPTCHA-Fehler (Orange)
     - E-Mail-Auslösungen (Grün)
   - Query: `SELECT $__timeGroupAlias(created_at, '1m'), COUNT(*), COUNT(*) FILTER (WHERE blocked), ...`

#### Row: Top Angreifende IPs
10. **Top 20 Angreifer-IPs** (Table)
    - Spalten:
      - Client-IP
      - Requests
      - Blockiert
      - Blockierungsquote (%)
      - Verwendete E-Mail-Adressen (COUNT DISTINCT)
      - Verwendete Domains (COUNT DISTINCT)
      - Betroffene Endpoints (COUNT DISTINCT)
      - Letzter Zugriff
      - Häufigster Blockierungsgrund
    - Query: 
      ```sql
      SELECT
        client_ip,
        COUNT(*) AS requests,
        COUNT(*) FILTER (WHERE blocked) AS blocked,
        ROUND(100.0 * COUNT(*) FILTER (WHERE blocked) / NULLIF(COUNT(*), 0), 1) AS blocked_percent,
        COUNT(DISTINCT email_masked) AS email_addresses,
        COUNT(DISTINCT email_domain) AS domains,
        COUNT(DISTINCT endpoint) AS endpoints,
        MAX(created_at) AS last_seen,
        MODE() WITHIN GROUP (ORDER BY block_reason) AS common_reason
      FROM security_events
      WHERE $__timeFilter(created_at) AND client_ip IS NOT NULL
      GROUP BY client_ip
      ORDER BY requests DESC
      LIMIT 20;
      ```

#### Row: Top E-Mail-Domains
11. **Top E-Mail-Domains** (Table)
    - Spalten:
      - Domain
      - Versuche
      - Blockiert
      - Unterschiedliche IPs
      - Ausgelöste E-Mails
      - CAPTCHA-Fehler
      - Letzter Zugriff
    - Query:
      ```sql
      SELECT
        email_domain,
        COUNT(*) AS attempts,
        COUNT(*) FILTER (WHERE blocked) AS blocked,
        COUNT(DISTINCT client_ip) AS unique_ips,
        COUNT(*) FILTER (WHERE mail_triggered = true) AS mails_sent,
        COUNT(*) FILTER (WHERE captcha_present = true AND captcha_valid = false) AS captcha_failures,
        MAX(created_at) AS last_seen
      FROM security_events
      WHERE $__timeFilter(created_at) AND email_domain IS NOT NULL
      GROUP BY email_domain
      ORDER BY attempts DESC
      LIMIT 20;
      ```
    - **Hinweis:** Keine automatische "Bösartig"-Kennzeichnung für gmail.com, outlook.com, etc.

#### Row: Endpoints
12. **Requests pro Endpoint** (Bar Chart)
    - Query:
      ```sql
      SELECT
        endpoint,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE blocked) as blocked,
        COUNT(*) FILTER (WHERE mail_triggered = true) as mails,
        COUNT(*) FILTER (WHERE captcha_present = true AND captcha_valid = false) as captcha_fail
      FROM security_events
      WHERE $__timeFilter(created_at)
      GROUP BY endpoint
      ORDER BY total DESC;
      ```

13. **Blockierungsgründe** (Donut Chart)
    - Query:
      ```sql
      SELECT
        COALESCE(block_reason, 'Unbekannt') as reason,
        COUNT(*) as count
      FROM security_events
      WHERE $__timeFilter(created_at) AND blocked = true
      GROUP BY block_reason
      ORDER BY count DESC;
      ```
    - Labels (erwartet):
      - CAPTCHA validation failed
      - IP rate limit exceeded
      - Email rate limit exceeded
      - Domain rate limit exceeded
      - Phone rate limit exceeded
      - Honeypot triggered
      - Disposable email domain
      - Global circuit breaker

#### Row: Live Feed
14. **Letzte 200 Security Events** (Table)
    - Spalten:
      - Zeit (created_at)
      - Endpoint
      - IP (client_ip)
      - E-Mail maskiert
      - Domain
      - CAPTCHA ✓/✗
      - Blockiert ✓/✗
      - Grund
      - Mail ✓/✗
      - HTTP Status
      - User-Agent (gekürzt)
    - Query:
      ```sql
      SELECT
        created_at as "Zeit",
        endpoint as "Endpoint",
        client_ip as "IP",
        email_masked as "E-Mail",
        email_domain as "Domain",
        CASE WHEN captcha_valid THEN '✓' WHEN captcha_present THEN '✗' ELSE '-' END as "CAPTCHA",
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
    - Auto-Scroll: ON

### Dashboard-Variablen:
```sql
-- endpoint
SELECT DISTINCT endpoint
FROM security_events
WHERE endpoint IS NOT NULL
ORDER BY endpoint;

-- client_ip
SELECT DISTINCT client_ip
FROM security_events
WHERE client_ip IS NOT NULL
ORDER BY client_ip;

-- email_domain
SELECT DISTINCT email_domain
FROM security_events
WHERE email_domain IS NOT NULL
ORDER BY email_domain;

-- blocked (Boolean)
Custom: All, true, false

-- block_reason
SELECT DISTINCT block_reason
FROM security_events
WHERE block_reason IS NOT NULL
ORDER BY block_reason;
```

Alle Variablen mit **"All"** Option.

---

## Alerts (vorbereitet, aber nicht aktiviert)

### Alert 1: Hohe save-email Rate
```sql
SELECT COUNT(*) 
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND endpoint = '/api/public/create-store/save-email';
```
**Threshold:** > 20 in 5 Minuten  
**Severity:** WARNING

### Alert 2: Wiederholte Blockierung derselben IP
```sql
SELECT client_ip, COUNT(*) as blocked_count
FROM security_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND blocked = true
GROUP BY client_ip
HAVING COUNT(*) > 10;
```
**Threshold:** > 10 blockierte Requests von einer IP in 10 Minuten  
**Severity:** WARNING

### Alert 3: CAPTCHA-Fehler-Spike
```sql
SELECT COUNT(*)
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND captcha_present = true
  AND captcha_valid = false;
```
**Threshold:** > 20 in 5 Minuten  
**Severity:** WARNING

### Alert 4: Honeypot-Aktivität
```sql
SELECT COUNT(*)
FROM security_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
  AND honeypot_triggered = true;
```
**Threshold:** > 5 in 10 Minuten  
**Severity:** CRITICAL

### Alert 5: Ungewöhnlich hohe Mail-Rate
```sql
SELECT COUNT(*)
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND endpoint = '/api/public/create-store/save-email'
  AND mail_triggered = true;
```
**Threshold:** > 10 tatsächlich versendete Store-Access-Mails in 5 Minuten  
**Severity:** WARNING

**Hinweis:** Alerts sind als JSON im Dashboard vorhanden, aber **ohne Benachrichtigungskanal**. Bitte in Grafana UI konfigurieren:
- Alerting → Contact Points → Add Contact Point (Slack/Email/Webhook)
- Alerts aktivieren

---

## Datasource-Konfiguration

### PostgreSQL Datasource
**Name:** markt-postgres  
**UID:** `markt-postgres`  
**Type:** PostgreSQL  
**Host:** `localhost:5432` (oder Production DB)  
**Database:** `storebackend` (oder Production DB Name)  
**User:** `<readonly-user>` (empfohlen)  
**SSL Mode:** require (für Production)

**Hinweis:** Wenn die Datasource-UID in Ihrer Grafana-Instanz anders ist, bitte in den JSON-Dateien global ersetzen:
```bash
sed -i 's/"uid": "markt-postgres"/"uid": "YOUR_DATASOURCE_UID"/g' *.json
```

---

## Installation

### 1. Dashboards importieren
```bash
# Via Grafana UI
1. Grafana → Dashboards → Import
2. JSON-Datei hochladen oder Inhalt einfügen
3. Datasource auswählen: markt-postgres
4. Import bestätigen

# Via API (Production)
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer <grafana-api-key>" \
  -H "Content-Type: application/json" \
  -d @platform-overview-dashboard.json

curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Authorization: Bearer <grafana-api-key>" \
  -H "Content-Type: application/json" \
  -d @security-bot-protection-dashboard.json
```

### 2. Datasource validieren
```sql
-- Test Query in Grafana Explore
SELECT COUNT(*) FROM security_events;
SELECT COUNT(*) FROM stores;
SELECT COUNT(*) FROM orders;
```

### 3. Alerts konfigurieren (optional)
```bash
1. Grafana → Alerting → Alert rules
2. Jede Alert-Regel hat "⚠️" Symbol im Dashboard
3. Edit → Notification policy → Contact Point hinzufügen
4. Save
```

---

## Fehlende Datenstrukturen

### E-Mail Tracking
**Problem:** Keine dedizierte `email_logs` Tabelle  
**Impact:** Kann nicht direkt tracked werden:
- Gesendete E-Mails pro Typ
- Fehlgeschlagene E-Mails
- Circuit-Breaker-Auslösungen
- Top Empfänger-Domains
- Letzte Mailfehler

**Workaround:**
- `security_events.mail_triggered = true` → E-Mail wurde durch Security-Check ausgelöst
- `EmailCircuitBreakerService.getStats()` → Programmatisch abfragen (kein DB-Log)

**Empfehlung:** Email Logging Tabelle erstellen:
```sql
CREATE TABLE email_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  email_type VARCHAR(50) NOT NULL, -- 'verification', 'password-reset', 'store-access', etc.
  recipient VARCHAR(255) NOT NULL,
  recipient_domain VARCHAR(100),
  subject VARCHAR(255),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  circuit_breaker_blocked BOOLEAN DEFAULT false,
  store_id BIGINT,
  user_id BIGINT
);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_success ON email_logs(success);
```

Dann `EmailService` anpassen:
```java
@Async
public void sendVerificationEmail(String to, String link) {
    EmailLog log = new EmailLog();
    log.setEmailType("verification");
    log.setRecipient(maskEmail(to));
    log.setRecipientDomain(extractDomain(to));
    
    try {
        // ... send email
        log.setSuccess(true);
    } catch (Exception e) {
        log.setSuccess(false);
        log.setErrorMessage(e.getMessage());
    } finally {
        emailLogRepository.save(log);
    }
}
```

### Infrastruktur-Metriken
**Problem:** Kein Prometheus/Actuator konfiguriert  
**Impact:** Keine JVM/HTTP/DB-Metriken

**Empfehlung:** Spring Boot Actuator + Micrometer aktivieren:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

Dann in Grafana:
- Datasource hinzufügen: Prometheus (http://localhost:9090 oder Prometheus Server)
- Neue Row "Infrastruktur" in Platform Dashboard
- Panels mit Prometheus Queries:
  ```promql
  # JVM Heap
  jvm_memory_used_bytes{area="heap"}
  
  # HTTP Request Rate
  rate(http_server_requests_seconds_count[5m])
  
  # Response Time p95
  histogram_quantile(0.95, http_server_requests_seconds_bucket)
  
  # DB Connection Pool
  hikaricp_connections_active
  ```

---

## Testen

### Platform Overview Dashboard
```sql
-- Stores vorhanden?
SELECT COUNT(*) FROM stores WHERE status = 'ACTIVE';
-- Sollte > 0 sein

-- Users vorhanden?
SELECT COUNT(*) FROM users;
-- Sollte > 0 sein

-- Orders vorhanden?
SELECT COUNT(*) FROM orders;
-- Kann 0 sein wenn noch keine Bestellungen

-- Zeitreihen-Daten vorhanden?
SELECT 
  DATE(created_at) as date, 
  COUNT(*) 
FROM stores 
GROUP BY DATE(created_at) 
ORDER BY date DESC 
LIMIT 7;
-- Sollte Daten für letzte 7 Tage zeigen
```

### Security Dashboard
```sql
-- Security Events vorhanden?
SELECT COUNT(*) FROM security_events;
-- Sollte nach Deployment schnell > 0 sein

-- Blockierte Requests?
SELECT COUNT(*) FROM security_events WHERE blocked = true;
-- Sollte nach Bot-Aktivität > 0 sein

-- Verschiedene Endpoints getestet?
SELECT endpoint, COUNT(*) 
FROM security_events 
GROUP BY endpoint 
ORDER BY COUNT(*) DESC;
-- Sollte /api/public/create-store/save-email, /api/auth/forgot-password, etc. zeigen

-- CAPTCHA-Fehler vorhanden?
SELECT COUNT(*) FROM security_events 
WHERE captcha_present = true AND captcha_valid = false;
-- Sollte bei Bot-Aktivität > 0 sein
```

---

## Zusammenfassung

### ✅ Erfolgreich implementiert:
1. **Platform Overview Dashboard**
   - Übersichts-Statistiken (Stores, Users, Orders, Domains)
   - Wachstums-Zeitreihen (Stores, Users, Orders, GMV)
   - Bestellungs-Analyse (Status, Zahlungsart, Top Stores)

2. **Security & Bot Protection Dashboard**
   - Übersichts-Statistiken (Requests, Blockierungen, CAPTCHA-Fehler, etc.)
   - Zeitreihen (Security Events Timeline)
   - Top Angreifer-IPs (mit Blockierungsquote)
   - Top E-Mail-Domains
   - Endpoint-Analyse
   - Blockierungsgründe (Donut Chart)
   - Live Feed (letzte 200 Events)

3. **Dashboard-Variablen**
   - endpoint, client_ip, email_domain, blocked, block_reason
   - Alle mit "All" Option

4. **Alerts vorbereitet** (5 Alerts)
   - Hohe save-email Rate
   - Wiederholte IP-Blockierung
   - CAPTCHA-Fehler-Spike
   - Honeypot-Aktivität
   - Ungewöhnliche Mail-Rate

### ⚠️ Nicht implementiert (fehlende Daten):
1. **E-Mail Tracking**
   - Keine `email_logs` Tabelle vorhanden
   - Circuit-Breaker-Status nur programmatisch verfügbar
   - **Empfehlung:** Email Logging implementieren (siehe oben)

2. **Infrastruktur-Metriken**
   - Kein Prometheus/Actuator konfiguriert
   - **Empfehlung:** Spring Boot Actuator + Micrometer aktivieren

### 📋 Nächste Schritte:
1. Grafana Datasource `markt-postgres` konfigurieren
2. Beide JSON-Dateien importieren
3. Security Dashboard validieren (security_events Tabelle muss existieren)
4. Optional: Alerts aktivieren + Contact Point konfigurieren
5. Optional: Email Logging implementieren
6. Optional: Prometheus Metrics aktivieren

---

**Dashboards erstellt von:** Copilot CLI  
**Datum:** 2026-07-15  
**Version:** 1.0

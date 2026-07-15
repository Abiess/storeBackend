# Mail Security Tracking - Grafana Dashboard Panels

Dieses Dokument enthält die SQL-Queries für ein dediziertes **Mail Security Tracking Dashboard** mit vollständiger Trennung zwischen `mail_triggered`, `mail_blocked` und `mail_sent`.

---

## Dashboard-Struktur

```
┌─────────────────────────────────────────────────────────────────────┐
│ ROW 1: Mail KPIs (Stat Panels)                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Mail Requests │ Mail Blocked │ Mail Sent │ Success Rate │ Block Rate │
│     1000      │     980      │    20     │    1.67%     │   98.0%   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ROW 2: Timeline (Time Series)                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Mail Triggered vs Blocked vs Sent Over Time                        │
│                                                                     │
│  mail_triggered  ──────────────────────────────────────────        │
│  mail_blocked    ██████████████████████████████████████████        │
│  mail_sent       ██                                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ROW 3: Block Reasons (Bar Chart + Table)                           │
├─────────────────────────────────────────────────────────────────────┤
│ Block Reasons Distribution │ Top Blocked IPs                        │
│                            │                                        │
│ CAPTCHA_INVALID    ████████│ IP            Blocked  Reason          │
│ IP_RATE_LIMIT      ██████  │ 1.2.3.4          450   CAPTCHA_INVALID│
│ EMAIL_RATE_LIMIT   ████    │ 5.6.7.8          320   IP_RATE_LIMIT  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ROW 4: Mail Types & Endpoints                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Mail Types Distribution    │ Endpoints Hit                          │
│                            │                                        │
│ STORE_ACCESS       ████████│ /save-email        ████████            │
│ EMAIL_VERIFICATION ██████  │ /register          ██████              │
│ PASSWORD_RESET     ████    │ /forgot-password   ████                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Panel 1: Mail Requests (Total)

**Panel Type:** Stat  
**Description:** Alle Requests, die eine E-Mail versenden wollten

```sql
SELECT 
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE;
```

**Panel Options:**
- Unit: `short`
- Thresholds: `0` (green)
- Color mode: Background
- Text mode: Value and name

---

## Panel 2: Mail Blocked

**Panel Type:** Stat  
**Description:** Anzahl blockierter Mail-Versuche (CAPTCHA, Rate Limit, Honeypot, etc.)

```sql
SELECT 
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
  AND blocked = TRUE;
```

**Panel Options:**
- Unit: `short`
- Thresholds: `0` (green), `100` (yellow), `500` (red)
- Color mode: Background

---

## Panel 3: Mail Successfully Sent

**Panel Type:** Stat  
**Description:** Anzahl tatsächlich versendeter E-Mails (nur wenn !blocked)

```sql
SELECT 
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_sent = TRUE;
```

**Panel Options:**
- Unit: `short`
- Thresholds: `0` (gray), `1` (green)
- Color mode: Background

---

## Panel 4: Mail Success Rate (%)

**Panel Type:** Stat  
**Description:** Erfolgreich versendete Mails geteilt durch Mail-Anforderungen

```sql
SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE mail_triggered = TRUE) > 0 
        THEN ROUND(
            100.0 * COUNT(*) FILTER (WHERE mail_sent = TRUE)
            / COUNT(*) FILTER (WHERE mail_triggered = TRUE),
            2
        )
        ELSE 0
    END::double precision AS "Success Rate %"
FROM security_events
WHERE $__timeFilter(created_at);
```

**Panel Options:**
- Unit: `percent (0.0-1.0)` → dann `/ 100` weglassen, ODER
- Unit: `short` mit Suffix `%`
- Thresholds: `0` (red), `50` (yellow), `90` (green)
- Color mode: Value

---

## Panel 5: Block Rate (%)

**Panel Type:** Stat  
**Description:** Prozentsatz blockierter Mail-Versuche

```sql
SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE mail_triggered = TRUE) > 0 
        THEN ROUND(
            100.0 * COUNT(*) FILTER (WHERE mail_triggered = TRUE AND blocked = TRUE)
            / COUNT(*) FILTER (WHERE mail_triggered = TRUE),
            2
        )
        ELSE 0
    END::double precision AS "Block Rate %"
FROM security_events
WHERE $__timeFilter(created_at);
```

**Panel Options:**
- Unit: `short` mit Suffix `%`
- Thresholds: `0` (green), `50` (yellow), `90` (orange), `98` (red)
- Color mode: Value
- Description: "Hohe Block-Rate = gute Abwehr. Sehr niedrige Rate könnte auf umgangene Schutzmechanismen hindeuten."

---

## Panel 6: Mail Timeline (Time Series)

**Panel Type:** Time series  
**Description:** Zeitlicher Verlauf von Mail-Anforderungen, blockierten und erfolgreich versendeten Mails

```sql
SELECT 
    $__timeGroupAlias(created_at, $__interval),
    COUNT(*) FILTER (WHERE mail_triggered = TRUE)::double precision AS "Mail Triggered",
    COUNT(*) FILTER (WHERE mail_triggered = TRUE AND blocked = TRUE)::double precision AS "Mail Blocked",
    COUNT(*) FILTER (WHERE mail_sent = TRUE)::double precision AS "Mail Sent"
FROM security_events
WHERE $__timeFilter(created_at)
GROUP BY 1
ORDER BY 1;
```

**Panel Options:**
- Legend: Right side
- Tooltip mode: All
- Line width: 2
- Fill opacity: 10
- Point size: 5
- Colors:
  - Mail Triggered: Blue
  - Mail Blocked: Red
  - Mail Sent: Green

---

## Panel 7: Block Reasons Distribution (Bar Chart)

**Panel Type:** Bar chart (horizontal)  
**Description:** Verteilung der Blockierungsgründe für Mail-Versuche

```sql
SELECT 
    COALESCE(block_reason::text, 'NOT_BLOCKED') AS metric,
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
  AND blocked = TRUE
GROUP BY block_reason
ORDER BY value DESC
LIMIT 20;
```

**Panel Options:**
- Orientation: Horizontal
- Show values: On bars
- X-axis: Value
- Y-axis: Metric

---

## Panel 8: Top Blocked IPs (Mail Context)

**Panel Type:** Table  
**Description:** Top IPs mit blockierten Mail-Versuchen

```sql
SELECT 
    client_ip AS "IP",
    COUNT(*) FILTER (WHERE mail_triggered = TRUE) AS "Mail Requests",
    COUNT(*) FILTER (WHERE blocked = TRUE) AS "Blocked",
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE blocked = TRUE)
        / NULLIF(COUNT(*) FILTER (WHERE mail_triggered = TRUE), 0),
        1
    ) AS "Block %",
    STRING_AGG(DISTINCT block_reason::text, ', ') AS "Block Reasons",
    COUNT(DISTINCT email_domain) AS "Domains",
    MAX(created_at) AS "Last Attempt"
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
  AND client_ip IS NOT NULL
GROUP BY client_ip
HAVING COUNT(*) FILTER (WHERE blocked = TRUE) > 0
ORDER BY "Blocked" DESC
LIMIT 100;
```

**Panel Options:**
- Table
- Cell display mode: Color background (for "Block %")
- Thresholds: `0` (green), `50` (yellow), `90` (red)

---

## Panel 9: Mail Types Distribution

**Panel Type:** Pie chart  
**Description:** Verteilung der verschiedenen Mail-Typen (STORE_ACCESS, EMAIL_VERIFICATION, etc.)

```sql
SELECT 
    COALESCE(mail_type::text, 'UNKNOWN') AS metric,
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
GROUP BY mail_type
ORDER BY value DESC;
```

**Panel Options:**
- Display labels: Name and value
- Legend: Bottom
- Pie chart type: Pie

---

## Panel 10: Mail Success by Endpoint

**Panel Type:** Bar chart  
**Description:** Erfolgsrate pro Endpoint

```sql
SELECT 
    endpoint AS metric,
    COUNT(*) FILTER (WHERE mail_triggered = TRUE)::double precision AS "Triggered",
    COUNT(*) FILTER (WHERE blocked = TRUE)::double precision AS "Blocked",
    COUNT(*) FILTER (WHERE mail_sent = TRUE)::double precision AS "Sent"
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
GROUP BY endpoint
ORDER BY "Triggered" DESC
LIMIT 20;
```

**Panel Options:**
- Bar chart
- Stack: Normal
- Show legend

---

## Panel 11: Mail Conversion Funnel

**Panel Type:** Table  
**Description:** Conversion-Funnel für Mail-Versand

```sql
WITH funnel AS (
    SELECT 
        COUNT(*) FILTER (WHERE mail_triggered = TRUE) AS triggered,
        COUNT(*) FILTER (WHERE mail_triggered = TRUE AND blocked = TRUE) AS blocked,
        COUNT(*) FILTER (WHERE mail_sent = TRUE) AS sent
    FROM security_events
    WHERE $__timeFilter(created_at)
)
SELECT 
    'Mail Triggered' AS "Stage",
    triggered AS "Count",
    100.0 AS "Conversion %"
FROM funnel

UNION ALL

SELECT 
    'Mail Blocked',
    blocked,
    ROUND(100.0 * blocked / NULLIF(triggered, 0), 2)
FROM funnel

UNION ALL

SELECT 
    'Mail Sent',
    sent,
    ROUND(100.0 * sent / NULLIF(triggered, 0), 2)
FROM funnel

ORDER BY "Conversion %" DESC;
```

**Panel Options:**
- Table
- Cell display mode: Color background (for "Conversion %")

---

## Panel 12: Mail Block Reasons Timeline

**Panel Type:** Time series (stacked)  
**Description:** Zeitlicher Verlauf der Blockierungsgründe

```sql
SELECT 
    $__timeGroupAlias(created_at, $__interval),
    block_reason::text AS metric,
    COUNT(*)::double precision AS value
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
  AND blocked = TRUE
  AND block_reason IS NOT NULL
GROUP BY 1, block_reason
ORDER BY 1;
```

**Panel Options:**
- Time series
- Stack: Normal
- Fill opacity: 50
- Legend: Right side

---

## Panel 13: Mail Activity by Mail Type (Detailed)

**Panel Type:** Table  
**Description:** Detaillierte Aufschlüsselung nach Mail-Typ

```sql
SELECT 
    COALESCE(mail_type::text, 'UNKNOWN') AS "Mail Type",
    COUNT(*) FILTER (WHERE mail_triggered = TRUE) AS "Triggered",
    COUNT(*) FILTER (WHERE blocked = TRUE) AS "Blocked",
    COUNT(*) FILTER (WHERE mail_sent = TRUE) AS "Sent",
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE mail_sent = TRUE)
        / NULLIF(COUNT(*) FILTER (WHERE mail_triggered = TRUE), 0),
        2
    ) AS "Success %",
    COUNT(DISTINCT client_ip) AS "Unique IPs",
    COUNT(DISTINCT email_domain) AS "Domains"
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
GROUP BY mail_type
ORDER BY "Triggered" DESC;
```

---

## Panel 14: Recent Mail Events (Live Feed)

**Panel Type:** Table  
**Description:** Letzte 100 Mail-Events (5s refresh)

```sql
SELECT 
    created_at AS "Time",
    endpoint AS "Endpoint",
    client_ip AS "IP",
    email_masked AS "Email",
    mail_type::text AS "Type",
    CASE 
        WHEN mail_sent = TRUE THEN '✅ Sent'
        WHEN blocked = TRUE THEN '🚫 Blocked'
        ELSE '⏳ Pending'
    END AS "Status",
    block_reason::text AS "Block Reason",
    http_status AS "HTTP"
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
ORDER BY created_at DESC
LIMIT 100;
```

**Panel Options:**
- Auto-refresh: 5s
- Table
- Time format: `YYYY-MM-DD HH:mm:ss`

---

## Panel 15: Mail Block Rate by Hour (Heatmap)

**Panel Type:** Heatmap  
**Description:** Blockierungsrate nach Uhrzeit (Pattern-Erkennung)

```sql
SELECT 
    $__timeGroupAlias(created_at, 1h),
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE blocked = TRUE)
        / NULLIF(COUNT(*) FILTER (WHERE mail_triggered = TRUE), 0),
        1
    )::double precision AS "Block Rate %"
FROM security_events
WHERE $__timeFilter(created_at)
  AND mail_triggered = TRUE
GROUP BY 1
ORDER BY 1;
```

---

## Dashboard Variables

Empfohlene Dashboard-Variablen für Filterung:

### Variable: `$mail_type`
```sql
SELECT DISTINCT mail_type::text
FROM security_events
WHERE mail_type IS NOT NULL
ORDER BY mail_type;
```

### Variable: `$endpoint`
```sql
SELECT DISTINCT endpoint
FROM security_events
WHERE mail_triggered = TRUE
ORDER BY endpoint;
```

### Variable: `$block_reason`
```sql
SELECT DISTINCT block_reason::text
FROM security_events
WHERE blocked = TRUE AND block_reason IS NOT NULL
ORDER BY block_reason;
```

---

## Alert-Regeln

### Alert 1: Hohe Mail-Blockierungsrate
```
Condition: Mail Block Rate > 95% for 10 minutes
Severity: Warning
Description: "Ungewöhnlich hohe Block-Rate könnte auf Angriff oder zu strenge Regeln hindeuten"
```

### Alert 2: Unerwartete Mail-Spitze
```
Condition: Mail Triggered > 100 in 5 minutes
Severity: Critical
Description: "Spam-Angriff oder Bot-Aktivität erkannt"
```

### Alert 3: Niedrige Success-Rate
```
Condition: Mail Success Rate < 5% for 15 minutes
Severity: Warning
Description: "Sehr niedrige Success-Rate - prüfen ob Schutzmechanismen zu aggressiv"
```

---

## Verwendung

1. **Import in Grafana**: Erstelle ein neues Dashboard und füge Panels mit den obigen SQL-Queries hinzu
2. **Datasource**: `grafana-postgresql-datasource`
3. **Time Range**: Standard auf "Last 24 hours" setzen
4. **Auto-Refresh**: 30s für Analytics, 5s für Live-Feed

---

## Wartung

- **Retention**: Detaillierte Events für 30-90 Tage behalten
- **Aggregation**: Für historische Daten (>90 Tage) nur aggregierte Statistiken speichern
- **Index-Pflege**: Regelmäßig `REINDEX` auf `idx_security_events_mail_triggered` und `idx_security_events_mail_sent`

---

**Erstellt:** 2026-07-15  
**Version:** 1.0  
**markt.ma Security Team**

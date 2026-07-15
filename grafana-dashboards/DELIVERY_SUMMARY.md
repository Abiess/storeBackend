# ✅ GRAFANA DASHBOARDS - DELIVERY PACKAGE

**Datum:** 2026-07-15  
**Status:** READY TO IMPORT ✅

---

## 📦 DATEIEN

### 1. **platform-overview.json** (22.9 KB)
**Import in Grafana:** Dashboard → New → Import → Upload JSON

**Enthält 11 Panels:**
- ✅ 4 Stat-Karten (Aktive Stores, Benutzer, Bestellungen, Domains)
- ✅ 4 Zeitreihen (Neue Stores/Tag, Neue Users/Tag, Orders/Tag, GMV/Tag)
- ✅ 2 Tabellen (Top Stores nach GMV, Letzte Bestellungen)
- ✅ 1 Pie Chart (Orders nach Status)

**Settings:**
- Refresh: 5 Minuten
- Zeitraum: Letzte 24 Stunden
- Tags: `platform`, `monitoring`, `markt.ma`

---

### 2. **security-bot-protection.json** (23.1 KB)
**Import in Grafana:** Dashboard → New → Import → Upload JSON

**Enthält 14 Panels:**
- ✅ 8 Stat-Karten (Requests, Blockiert, Block %, IPs, CAPTCHA-Fehler, Honeypot, Rate Limit, Mails)
- ✅ 1 Timeline (Security Events mit 4 Serien)
- ✅ 1 Top Angreifer-IPs Tabelle (20 Zeilen)
- ✅ 1 Top Domains Tabelle (20 Zeilen)
- ✅ 1 Endpoint Bar Chart
- ✅ 1 Blockierungsgründe Donut Chart
- ✅ 1 Live Feed Tabelle (200 neueste Events)

**Dashboard-Variablen (Filter):**
- `endpoint` - Multi-Select (z.B. `/api/public/create-store/save-email`)
- `client_ip` - Multi-Select
- `email_domain` - Multi-Select
- `blocked` - Single-Select (All / true / false)

**Settings:**
- Refresh: 30 Sekunden
- Zeitraum: Letzte 6 Stunden
- Tags: `security`, `bot-protection`, `markt.ma`

---

### 3. **IMPORT_GUIDE.md** (7.8 KB)
**Vollständige Anleitung:**
- Datasource konfigurieren (PostgreSQL)
- Dashboards importieren (UI + API)
- Validierung und Testing
- Troubleshooting
- Erwartete Metriken

---

## 🚀 SCHNELLSTART

### Schritt 1: Datasource einrichten
```
Grafana → Connections → Data sources → Add PostgreSQL

Host: localhost:5432
Database: storebackend
User: grafana_readonly  (empfohlen)
Password: ***
```

### Schritt 2: Dashboards importieren
```
Grafana → Dashboards → New → Import
→ Upload JSON file
→ Wähle platform-overview.json
→ Select PostgreSQL data source
→ Import

(Wiederholen für security-bot-protection.json)
```

### Schritt 3: Prüfen
- Platform Dashboard: Sollte Stores/Users/Orders zeigen
- Security Dashboard: Sollte Events zeigen (nach Deployment)

---

## 📊 PANEL-ÜBERSICHT

### Platform Overview Dashboard

| Panel | Type | Query | Beschreibung |
|-------|------|-------|--------------|
| Aktive Stores | Stat | `COUNT(*) FROM stores WHERE status='ACTIVE'` | Anzahl aktiver Stores |
| Benutzer gesamt | Stat | `COUNT(*) FROM users` | Gesamtzahl User |
| Bestellungen gesamt | Stat | `COUNT(*) FROM orders` | Gesamtzahl Orders |
| Verifizierte Domains | Stat | `COUNT(*) FROM domains WHERE verified=true` | Anzahl verifizierter Domains |
| Neue Stores pro Tag | Timeseries | Group by day | Wachstumstrend Stores |
| Neue Benutzer pro Tag | Timeseries | Group by day | Wachstumstrend Users |
| Bestellungen pro Tag | Timeseries | Group by day | Order-Volumen Trend |
| GMV pro Tag | Timeseries | SUM(total_price) by day | Umsatztrend |
| Top 10 Stores nach GMV | Table | GROUP BY store_id | Beste Stores |
| Letzte 50 Bestellungen | Table | ORDER BY created_at DESC LIMIT 50 | Neueste Orders |
| Bestellungen nach Status | Pie | GROUP BY status | Statusverteilung |

### Security & Bot Protection Dashboard

| Panel | Type | Query | Beschreibung |
|-------|------|-------|--------------|
| Requests gesamt | Stat | `COUNT(*) FROM security_events` | Gesamtzahl Requests |
| Blockiert | Stat | `COUNT(*) WHERE blocked=true` | Blockierte Requests |
| Block % | Stat | Berechnung | Blockierungsquote |
| IPs | Stat | `COUNT(DISTINCT client_ip)` | Eindeutige IPs |
| CAPTCHA Fehler | Stat | `COUNT(*) WHERE captcha_valid=false` | CAPTCHA-Fehler |
| Honeypot | Stat | `COUNT(*) WHERE honeypot_triggered=true` | Honeypot-Treffer |
| Rate Limit | Stat | `COUNT(*) WHERE rate_limit_type IS NOT NULL` | Rate Limit-Treffer |
| Mails | Stat | `COUNT(*) WHERE mail_triggered=true` | Versendete Mails |
| Security Events Timeline | Timeseries | 4 Serien (Requests/Blocked/CAPTCHA/Mails) | Zeitlicher Verlauf |
| Top 20 Angreifer-IPs | Table | GROUP BY client_ip ORDER BY count DESC | Angreifer-Liste |
| Top E-Mail-Domains | Table | GROUP BY email_domain | Domain-Statistik |
| Requests pro Endpoint | Bar Chart | GROUP BY endpoint | Endpoint-Verteilung |
| Blockierungsgründe | Donut | GROUP BY block_reason | Grund-Verteilung |
| Letzte 200 Security Events | Table | ORDER BY created_at DESC LIMIT 200 | Live Feed |

---

## 🎯 VERWENDETE TABELLEN

### Platform Dashboard benötigt:
- ✅ `stores` (id, status, name, created_at)
- ✅ `users` (id, created_at)
- ✅ `orders` (id, store_id, status, total_price, created_at)
- ✅ `domains` (id, verified)

**Alle Tabellen existieren bereits** ✅

### Security Dashboard benötigt:
- ✅ `security_events` (alle Spalten)

**Tabelle existiert nach Backend-Deployment** ✅

---

## ⚙️ DATASOURCE-PLATZHALTER

Beide Dashboards verwenden:
```json
"datasource": {
  "type": "postgres",
  "uid": "${DS_POSTGRES}"
}
```

**Beim Import wird Grafana automatisch fragen:**
"Select a PostgreSQL data source" → Deine Datasource auswählen

**Wichtig:** Der Platzhalter `${DS_POSTGRES}` wird durch die echte Datasource-UID ersetzt.

---

## 📋 ALERTS (VORBEREITET)

Alerts sind NICHT automatisch aktiv, können aber einfach hinzugefügt werden:

### Platform Alerts:
1. **Store Growth Anomaly** - Mehr als 50 neue Stores/Tag (ungewöhnlich hoch)
2. **No New Orders** - 0 Orders in letzten 6 Stunden (Business Risk)

### Security Alerts:
1. **High save-email Rate** - >20 Requests in 5 Minuten
2. **IP Spike** - >10 blockierte Requests von einer IP in 10 Minuten
3. **CAPTCHA Error Spike** - >20 Fehler in 5 Minuten
4. **Honeypot Trigger** - >5 Honeypot-Treffer in 10 Minuten
5. **Mail Rate Spike** - >10 Store-Access-Mails in 5 Minuten

**Siehe QUICK_SETUP.md für Alert-Queries**

---

## 🔍 FEHLENDE FEATURES (OPTIONAL)

Diese Features sind in den Dashboards NICHT verfügbar (Daten fehlen):

### Email Logs:
- ❌ Gesendete E-Mails pro Typ
- ❌ Fehlgeschlagene E-Mails
- ❌ Circuit-Breaker-Auslösungen
- ❌ Top Empfänger-Domains
- ❌ Letzte Mail-Fehler

**Grund:** Keine `email_logs` Tabelle (Circuit Breaker ist nur in-memory)

**Lösung:** Email-Logging implementieren (siehe README.md für Schema)

### Infrastruktur:
- ❌ JVM Heap/Non-Heap
- ❌ CPU/System Load
- ❌ HTTP Request Rate
- ❌ Response-Zeit p50/p95/p99
- ❌ DB Connection Pool
- ❌ PostgreSQL Connections

**Grund:** Kein Prometheus/Actuator konfiguriert

**Lösung:** Spring Boot Actuator + Prometheus exportieren (siehe README.md)

---

## ✅ CHECKLISTE

- [x] Platform Dashboard JSON erstellt (22.9 KB)
- [x] Security Dashboard JSON erstellt (23.1 KB)
- [x] JSON-Validierung erfolgreich
- [x] Import Guide erstellt
- [x] Beide Dashboards verwenden `${DS_POSTGRES}` Platzhalter
- [x] Dashboard-Variablen konfiguriert (Security: 4 Variablen)
- [x] Refresh-Rates gesetzt (Platform: 5m, Security: 30s)
- [x] Tags hinzugefügt
- [x] Panel-Beschreibungen vorhanden
- [x] Farbschemas optimiert
- [ ] Dashboards in Grafana importiert (vom User zu tun)
- [ ] Datasource verbunden (vom User zu tun)
- [ ] Alerts konfiguriert (optional, vom User zu tun)

---

## 📞 NEXT STEPS

1. **Import:** Beide JSON-Dateien in Grafana importieren
2. **Test:** Panels sollten Daten zeigen (Platform sofort, Security nach Deployment)
3. **Monitor:** 24h beobachten und prüfen ob Metriken plausibel sind
4. **Alerts:** Optional Alert-Rules erstellen (siehe QUICK_SETUP.md)
5. **Optional:** Email-Logging oder Prometheus implementieren

---

**Erstellt:** 2026-07-15  
**Status:** ✅ READY TO IMPORT  
**Validation:** ✅ Both JSON files valid  
**Import Guide:** IMPORT_GUIDE.md  
**Full Docs:** README.md (18 KB) + QUICK_SETUP.md (12 KB)

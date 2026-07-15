# 🛡️ SECURITY OPERATIONS CENTER (SOC) DASHBOARD - KONZEPT

**Datum:** 2026-07-15 16:35 Uhr  
**Ziel:** Professionelles SOC für markt.ma mit 30-Sekunden-Response-Time

---

## 🎯 **ANFORDERUNGEN**

### **Bei einem Angriff innerhalb von 30 Sekunden sehen:**

1. ✅ **Woher?** → GeoIP: Land, ASN, Provider
2. ✅ **Wer?** → IP-Detailansicht mit kompletter Historie
3. ✅ **Welcher Endpoint?** → Endpoint-Ranking nach Angriffen
4. ✅ **Welche Domains?** → Top Email-Domains
5. ✅ **Aktivste IPs?** → Top Angreifer mit Risiko-Score
6. ✅ **Blockiert/Durchgekommen?** → Live Feed + Block-Status
7. ✅ **Firewall-Regel nötig?** → Automatische Empfehlung

---

## 📊 **DASHBOARD-STRUKTUR (35+ Panels)**

### **Row 1: Command Center (4 Panels)**
1. **🌍 Threat Map** - Geografische Angriffs-Verteilung (World Map)
2. **🚨 Active Threats** - Aktive Angriffe letzte 5 Minuten (Stat)
3. **🎯 Attack Intensity** - Requests/min Timeline (Graph)
4. **⚠️ Risk Level** - Gesamtrisiko-Score (Gauge 0-100)

### **Row 2: IP Intelligence (6 Panels)**
5. **🔴 Top Attacking IPs** - Top 20 IPs mit Risiko-Score (Table)
6. **🌐 Top ASN** - Top Autonomous Systems (Table)
7. **🏢 Top ISP/Provider** - Top Internet Service Provider (Table)
8. **🌍 Top Countries** - Top Länder (Pie Chart)
9. **📊 IP Risk Distribution** - Risiko-Score Verteilung (Histogram)
10. **🔍 IP Drill-Down** - Klickbare IP-Details (Dynamic Panel)

### **Row 3: Attack Analysis (5 Panels)**
11. **🎯 Endpoint Attack Ranking** - Meistangegriffene Endpoints (Bar Chart)
12. **📧 Email Domain Analysis** - Top Domains + Verdächtige (Table)
13. **🤖 Top User Agents** - Browser/Bot Analyse (Table)
14. **🔗 Top Referers** - Externe Quellen (Table)
15. **🌐 Top Origins** - CORS Origins (Table)

### **Row 4: Security Mechanisms (6 Panels)**
16. **🛡️ Protection Timeline** - CAPTCHA/Honeypot/Rate Limit Timeline (Multi-Series)
17. **🚫 Block Reasons Distribution** - Blockierungsgründe (Pie Chart)
18. **🔐 CAPTCHA Analysis** - Success vs Failed (Stacked Bar)
19. **🚨 Kill Switch Events** - Emergency Shutdowns (Timeline)
20. **⚡ Circuit Breaker Events** - Overload Protection (Timeline)
21. **📉 Rate Limit Hits** - Rate Limiting pro Typ (Stacked Area)

### **Row 5: Login & Auth (4 Panels)**
22. **🔑 Login Attack Heatmap** - Failed Logins nach Stunde (Heatmap)
23. **👤 Compromised Accounts** - Accounts mit mehreren IPs (Table)
24. **🌍 Login GeoIP** - Login-Versuche nach Land (World Map)
25. **📊 Login Success Rate** - Success vs Failed Timeline (Graph)

### **Row 6: Mail Security (4 Panels)**
26. **📧 Mail Volume** - Versendete Mails nach Typ (Stacked Bar)
27. **🚫 Blocked Mails** - Verhinderte Mail-Versendungen (Timeline)
28. **🎯 Mail Targets** - Meistgenutzte Email-Domains (Table)
29. **⚠️ Mail Abuse Score** - Risiko pro Domain (Table)

### **Row 7: Live Operations (6+ Panels)**
30. **🔴 LIVE: Active Attacks** - Letzte 5 Minuten (Auto-Refresh 5s, Table)
31. **📊 LIVE: Request Rate** - Echtzeit Requests/s (Graph, 5s-Refresh)
32. **🌐 LIVE: New IPs** - Heute erstmals gesehen (Table)
33. **🚨 LIVE: Security Feed** - SIEM-ähnlicher Event-Stream (Table, 200 Events)
34. **📈 LIVE: Attack Intensity Gauge** - Aktuelle Bedrohungslage (Gauge)
35. **🎯 LIVE: Critical Events** - Kill Switch, Circuit Breaker, High Risk (Table)

---

## 🎯 **RISIKO-SCORE BERECHNUNG**

### **Formel (0-100):**

```sql
CASE
    -- Critical (80-100): Massiver Angriff
    WHEN blocked_count > 50 THEN 100
    WHEN blocked_count > 20 THEN 90
    
    -- High (60-79): Verdächtig
    WHEN blocked_count > 10 AND captcha_failures > 5 THEN 75
    WHEN honeypot_triggers > 0 THEN 70
    WHEN distinct_endpoints > 5 AND blocked_count > 5 THEN 65
    
    -- Medium (40-59): Auffällig
    WHEN blocked_count > 5 THEN 50
    WHEN captcha_failures > 3 THEN 45
    WHEN distinct_domains > 3 THEN 40
    
    -- Low (20-39): Beobachten
    WHEN blocked_count > 2 THEN 30
    WHEN captcha_failures > 1 THEN 25
    
    -- Minimal (0-19): Normal
    ELSE 10
END AS risk_score
```

### **Faktoren:**
- ✅ Anzahl blockierter Requests
- ✅ CAPTCHA-Fehler
- ✅ Honeypot-Trigger
- ✅ Verschiedene Endpoints
- ✅ Verschiedene Email-Domains
- ✅ Login-Fehlversuche
- ✅ Rate-Limit-Verstöße
- ✅ Kill-Switch-Trigger

---

## 🌍 **GEOIP-INTEGRATION**

### **Benötigte Felder (bereits vorbereitet in SecurityEvent.java):**

```java
// UNCOMMENT in SecurityEvent.java:
private String countryCode;    // DE, US, CN, etc.
private String countryName;    // Germany, United States, China
private String city;           // Berlin, New York, Beijing
private Double latitude;       // 52.5200
private Double longitude;      // 13.4050
private Long asn;             // 3320 (Deutsche Telekom)
private String asnOrg;        // Deutsche Telekom AG
private String isp;           // Telekom Deutschland GmbH
```

### **Implementation-Optionen:**

#### **Option 1: MaxMind GeoLite2 (Empfohlen, Kostenlos)**

**Dependency:**
```xml
<dependency>
    <groupId>com.maxmind.geoip2</groupId>
    <artifactId>geoip2</artifactId>
    <version>4.2.0</version>
</dependency>
```

**Service:**
```java
@Service
public class GeoIpService {
    private DatabaseReader reader;
    
    @PostConstruct
    public void init() throws Exception {
        File database = new File("GeoLite2-City.mmdb");
        reader = new DatabaseReader.Builder(database).build();
    }
    
    public GeoIpData lookup(String ipAddress) {
        try {
            CityResponse response = reader.city(InetAddress.getByName(ipAddress));
            return GeoIpData.builder()
                .countryCode(response.getCountry().getIsoCode())
                .countryName(response.getCountry().getName())
                .city(response.getCity().getName())
                .latitude(response.getLocation().getLatitude())
                .longitude(response.getLocation().getLongitude())
                .build();
        } catch (Exception e) {
            return null; // IP nicht gefunden oder privat
        }
    }
}
```

#### **Option 2: IP-API.com (API, 45 req/min gratis)**

```java
@Service
public class IpApiService {
    private RestTemplate restTemplate;
    
    public GeoIpData lookup(String ipAddress) {
        String url = "http://ip-api.com/json/" + ipAddress;
        IpApiResponse response = restTemplate.getForObject(url, IpApiResponse.class);
        return mapToGeoIpData(response);
    }
}
```

#### **Option 3: Batch-Update via Cron (Production)**

```java
@Scheduled(fixedDelay = 300000) // alle 5 Minuten
public void enrichSecurityEvents() {
    List<SecurityEvent> events = repo.findByCountryCodeIsNull();
    for (SecurityEvent event : events) {
        GeoIpData geo = geoIpService.lookup(event.getClientIp());
        if (geo != null) {
            event.setCountryCode(geo.getCountryCode());
            event.setAsn(geo.getAsn());
            // ... weitere Felder
            repo.save(event);
        }
    }
}
```

**Download GeoLite2:**
```bash
wget https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&suffix=tar.gz
tar -xzf GeoLite2-City.tar.gz
cp GeoLite2-City_*/GeoLite2-City.mmdb /opt/markt-ma/geoip/
```

---

## 🔍 **IP DRILL-DOWN KONZEPT**

### **Panel-Setup:**

**Master-Panel: Top Attacking IPs**
- Variable: `$selected_ip`
- On-Click: Setzt Variable + scrollt zu Drill-Down-Row

**Drill-Down-Row (nur sichtbar wenn `$selected_ip` gesetzt):**

**Panel 1: IP-Übersicht (Stat-Cards)**
```sql
SELECT 
    client_ip,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE blocked = true) as blocked,
    COUNT(DISTINCT email_domain) as domains_used,
    COUNT(DISTINCT endpoint) as endpoints_hit,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen,
    -- GeoIP
    country_name,
    city,
    asn_org,
    isp
FROM security_events
WHERE client_ip = '$selected_ip'
  AND $__timeFilter(created_at)
GROUP BY client_ip, country_name, city, asn_org, isp;
```

**Panel 2: Request Timeline für diese IP**
```sql
SELECT 
    $__timeGroup(created_at, '1m') as time,
    COUNT(*) as requests,
    COUNT(*) FILTER (WHERE blocked = true) as blocked
FROM security_events
WHERE client_ip = '$selected_ip'
  AND $__timeFilter(created_at)
GROUP BY time
ORDER BY time;
```

**Panel 3: Alle Events von dieser IP**
```sql
SELECT 
    created_at,
    endpoint,
    http_method,
    http_status,
    event_type,
    email_masked,
    blocked,
    block_reason,
    user_agent
FROM security_events
WHERE client_ip = '$selected_ip'
  AND $__timeFilter(created_at)
ORDER BY created_at DESC
LIMIT 500;
```

---

## 📊 **SQL-QUERIES FÜR NEUE PANELS**

### **1. Threat Map (World Map)**
```sql
SELECT 
    country_code as metric,
    COUNT(*) as value,
    country_name as "Country",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(DISTINCT client_ip) as "Unique IPs"
FROM security_events
WHERE country_code IS NOT NULL
  AND $__timeFilter(created_at)
GROUP BY country_code, country_name
ORDER BY value DESC;
```

### **2. Top ASN**
```sql
SELECT 
    asn,
    asn_org as "Provider",
    COUNT(*) as "Requests",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(DISTINCT client_ip) as "Unique IPs",
    ROUND(100.0 * COUNT(*) FILTER (WHERE blocked = true) / NULLIF(COUNT(*), 0), 1) as "Block Rate %"
FROM security_events
WHERE asn IS NOT NULL
  AND $__timeFilter(created_at)
GROUP BY asn, asn_org
ORDER BY "Requests" DESC
LIMIT 20;
```

### **3. Top Attacking IPs mit Risiko-Score**
```sql
SELECT 
    client_ip as "IP",
    country_code as "Country",
    COUNT(*) as "Requests",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(*) FILTER (WHERE captcha_valid = false) as "CAPTCHA Fails",
    COUNT(*) FILTER (WHERE honeypot_triggered = true) as "Honeypot",
    COUNT(DISTINCT endpoint) as "Endpoints",
    COUNT(DISTINCT email_domain) as "Domains",
    COUNT(*) FILTER (WHERE login_success = false) as "Failed Logins",
    -- Risiko-Score
    CASE
        WHEN COUNT(*) FILTER (WHERE blocked = true) > 50 THEN 100
        WHEN COUNT(*) FILTER (WHERE blocked = true) > 20 THEN 90
        WHEN COUNT(*) FILTER (WHERE blocked = true) > 10 
             AND COUNT(*) FILTER (WHERE captcha_valid = false) > 5 THEN 75
        WHEN COUNT(*) FILTER (WHERE honeypot_triggered = true) > 0 THEN 70
        WHEN COUNT(DISTINCT endpoint) > 5 
             AND COUNT(*) FILTER (WHERE blocked = true) > 5 THEN 65
        WHEN COUNT(*) FILTER (WHERE blocked = true) > 5 THEN 50
        WHEN COUNT(*) FILTER (WHERE captcha_valid = false) > 3 THEN 45
        WHEN COUNT(DISTINCT email_domain) > 3 THEN 40
        WHEN COUNT(*) FILTER (WHERE blocked = true) > 2 THEN 30
        ELSE 10
    END as "Risk Score",
    MAX(created_at) as "Last Seen"
FROM security_events
WHERE $__timeFilter(created_at)
  AND client_ip IS NOT NULL
GROUP BY client_ip, country_code
HAVING COUNT(*) > 5  -- Mindestens 5 Requests
ORDER BY "Risk Score" DESC, "Requests" DESC
LIMIT 50;
```

### **4. Endpoint Attack Ranking**
```sql
SELECT 
    endpoint as "Endpoint",
    COUNT(*) as "Total Requests",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(*) FILTER (WHERE blocked = false) as "Allowed",
    ROUND(100.0 * COUNT(*) FILTER (WHERE blocked = true) / NULLIF(COUNT(*), 0), 1) as "Block Rate %",
    COUNT(DISTINCT client_ip) as "Unique IPs",
    COUNT(DISTINCT email_domain) as "Email Domains",
    MAX(created_at) as "Last Attack"
FROM security_events
WHERE $__timeFilter(created_at)
GROUP BY endpoint
ORDER BY "Blocked" DESC
LIMIT 20;
```

### **5. Top User Agents (Bot Detection)**
```sql
SELECT 
    CASE 
        WHEN user_agent LIKE '%bot%' OR user_agent LIKE '%Bot%' THEN '🤖 Bot'
        WHEN user_agent LIKE '%curl%' THEN '⚙️ curl'
        WHEN user_agent LIKE '%python%' THEN '🐍 Python'
        WHEN user_agent LIKE '%Chrome%' THEN '🌐 Chrome'
        WHEN user_agent LIKE '%Firefox%' THEN '🦊 Firefox'
        WHEN user_agent LIKE '%Safari%' THEN '🧭 Safari'
        ELSE '❓ Other'
    END as "Type",
    LEFT(user_agent, 80) as "User Agent",
    COUNT(*) as "Requests",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(DISTINCT client_ip) as "Unique IPs",
    MAX(created_at) as "Last Seen"
FROM security_events
WHERE user_agent IS NOT NULL
  AND $__timeFilter(created_at)
GROUP BY user_agent
ORDER BY "Requests" DESC
LIMIT 30;
```

### **6. Top Referers**
```sql
SELECT 
    referer as "Referer",
    COUNT(*) as "Requests",
    COUNT(*) FILTER (WHERE blocked = true) as "Blocked",
    COUNT(DISTINCT client_ip) as "Unique IPs",
    COUNT(DISTINCT endpoint) as "Endpoints Hit"
FROM security_events
WHERE referer IS NOT NULL
  AND referer != ''
  AND $__timeFilter(created_at)
GROUP BY referer
ORDER BY "Requests" DESC
LIMIT 20;
```

### **7. LIVE: Active Attacks (letzte 5 Minuten)**
```sql
SELECT 
    created_at as "Time",
    client_ip as "IP",
    country_code as "🌍",
    endpoint as "Endpoint",
    http_status as "Status",
    CASE 
        WHEN blocked = true THEN '🚫 BLOCKED'
        ELSE '✅ ALLOWED'
    END as "Result",
    block_reason as "Reason",
    email_masked as "Email",
    LEFT(user_agent, 50) as "User Agent"
FROM security_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND (blocked = true OR captcha_valid = false OR honeypot_triggered = true)
ORDER BY created_at DESC
LIMIT 100;
```

### **8. Login Attack Heatmap**
```sql
SELECT 
    date_trunc('hour', created_at) as time,
    EXTRACT(DOW FROM created_at) as day_of_week,
    COUNT(*) FILTER (WHERE login_success = false) as failed_logins
FROM security_events
WHERE endpoint = '/api/auth/login'
  AND $__timeFilter(created_at)
GROUP BY time, day_of_week
ORDER BY time;
```

---

## ⚡ **AUTOMATISCHE FIREWALL-EMPFEHLUNGEN**

### **Panel: "🔥 Recommended Firewall Rules"**

```sql
SELECT 
    client_ip as "IP to Block",
    country_code as "Country",
    COUNT(*) as "Attack Count",
    COUNT(*) FILTER (WHERE blocked = true) as "Already Blocked",
    ARRAY_AGG(DISTINCT endpoint) as "Target Endpoints",
    '🔥 HIGH PRIORITY' as "Action",
    CONCAT('iptables -A INPUT -s ', client_ip, ' -j DROP') as "Command"
FROM security_events
WHERE $__timeFilter(created_at)
  AND blocked = true
GROUP BY client_ip, country_code
HAVING COUNT(*) > 100  -- Mehr als 100 blockierte Requests
   OR COUNT(*) FILTER (WHERE honeypot_triggered = true) > 0
ORDER BY "Attack Count" DESC
LIMIT 10;
```

---

## 🎨 **DASHBOARD-VARIABLEN**

```json
{
  "templating": {
    "list": [
      {
        "name": "selected_ip",
        "type": "textbox",
        "label": "Selected IP (Drill-Down)",
        "query": ""
      },
      {
        "name": "country",
        "type": "query",
        "label": "Country Filter",
        "query": "SELECT DISTINCT country_code FROM security_events ORDER BY country_code",
        "includeAll": true
      },
      {
        "name": "risk_level",
        "type": "custom",
        "label": "Risk Level",
        "options": ["All", "Critical (80+)", "High (60-79)", "Medium (40-59)", "Low (0-39)"]
      }
    ]
  }
}
```

---

## 📋 **DEPLOYMENT-CHECKLISTE**

### **Phase 1: Ohne GeoIP (Sofort verfügbar)**
- ✅ Alle Panels außer Geo-basierte funktionieren
- ✅ IP-Analyse ohne Länder-Info
- ✅ Risk-Score basierend auf Verhalten

### **Phase 2: Mit GeoIP (+ Backend-Änderung)**
1. ✅ SecurityEvent.java - GeoIP-Felder auskommentieren
2. ✅ GeoIpService erstellen
3. ✅ MaxMind GeoLite2 DB herunterladen
4. ✅ SecurityEventService.Builder - GeoIP-Aufruf hinzufügen
5. ✅ Batch-Enrichment-Job für bestehende Events
6. ✅ Database Migration für neue Spalten
7. ✅ Grafana Dashboard reimportieren

---

## 🎯 **ERGEBNIS**

Ein **professionelles Security Operations Center** das:

✅ **Angriffe in 30 Sekunden** identifiziert  
✅ **Geografische Herkunft** zeigt  
✅ **Risiko-Scores** automatisch berechnet  
✅ **IP-Drill-Down** für Deep-Dive-Analyse  
✅ **LIVE-Feed** wie ein SIEM  
✅ **Firewall-Empfehlungen** automatisch generiert  
✅ **Bot-Detection** via User-Agent-Analyse  
✅ **Attack-Timeline** für Muster-Erkennung  
✅ **Mail-Abuse-Tracking**  
✅ **Login-Attack-Heatmaps**  

**Professional, Production-Ready, Enterprise-Grade** 🛡️

---

**Nächster Schritt:** SOC-Dashboard JSON generieren mit allen 35+ Panels

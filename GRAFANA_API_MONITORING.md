# 📊 Grafana API Monitoring Setup

## Was wurde eingerichtet?

Dein Spring Boot Backend sendet jetzt automatisch alle API-Fehler und Metriken an Grafana.

## 🎯 Features

### Automatisches Tracking:
- ✅ **Alle API-Calls** werden erfasst (Erfolg/Fehler)
- ✅ **Response-Zeiten** pro Endpoint
- ✅ **HTTP Status Codes** (400, 401, 403, 404, 500, etc.)
- ✅ **Authentication-Fehler** separat tracked
- ✅ **Database-Fehler** werden erfasst
- ✅ **Fehlertypen** kategorisiert

## 📦 Änderungen

### 1. Dependencies (`pom.xml`)
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### 2. Configuration (`application.properties`)
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.metrics.export.prometheus.enabled=true
```

### 3. Neue Services
- `MetricsService.java` - Erfasst API-Fehler und Metriken
- `GlobalExceptionHandler.java` - Fängt alle Exceptions ab
- `MetricsInterceptor.java` - Trackt jeden API-Call automatisch

## 🚀 Deployment

### Schritt 1: Code deployen
```bash
git add .
git commit -m "Add Grafana metrics integration"
git push origin main
```

### Schritt 2: VPS - Prometheus Endpoint freigeben

SSH auf deinen VPS und prüfe:
```bash
ssh root@<VPS-IP>

# Nach Deployment prüfen
curl http://localhost:8080/actuator/prometheus
```

Du solltest Metriken sehen wie:
```
# HELP api_errors_total Total number of API errors
# TYPE api_errors_total counter
api_errors_total{type="error"} 0.0

# HELP api_success_total Total number of successful API calls
# TYPE api_success_total counter
api_success_total{type="success"} 42.0
```

### Schritt 3: Prometheus auf VPS installieren

Erweitere den Grafana-Workflow um Prometheus:

```yaml
# .github/workflows/setup-monitoring.yml
name: Setup Monitoring Stack

on:
  workflow_dispatch:

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      - name: Install Prometheus
        run: |
          ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no root@${{ secrets.VPS_HOST }} << 'EOF'
          # Prometheus herunterladen
          wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
          tar xvfz prometheus-2.48.0.linux-amd64.tar.gz
          mv prometheus-2.48.0.linux-amd64 /opt/prometheus
          
          # Prometheus Config
          cat > /opt/prometheus/prometheus.yml << 'PROM_EOF'
          global:
            scrape_interval: 15s
          
          scrape_configs:
            - job_name: 'spring-boot'
              metrics_path: '/actuator/prometheus'
              static_configs:
                - targets: ['localhost:8080']
          PROM_EOF
          
          # Systemd Service
          cat > /etc/systemd/system/prometheus.service << 'SERVICE_EOF'
          [Unit]
          Description=Prometheus
          After=network.target
          
          [Service]
          Type=simple
          ExecStart=/opt/prometheus/prometheus --config.file=/opt/prometheus/prometheus.yml --storage.tsdb.path=/opt/prometheus/data
          Restart=always
          
          [Install]
          WantedBy=multi-user.target
          SERVICE_EOF
          
          systemctl daemon-reload
          systemctl enable --now prometheus
          systemctl status prometheus --no-pager
          EOF

      - name: Configure Grafana Datasource
        run: |
          ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no root@${{ secrets.VPS_HOST }} << 'EOF'
          # Warte bis Grafana läuft
          sleep 5
          
          # Prometheus Datasource via API hinzufügen
          curl -X POST http://admin:${{ secrets.GRAFANA_ADMIN_PASSWORD }}@localhost:3000/api/datasources \
            -H "Content-Type: application/json" \
            -d '{
              "name": "Prometheus",
              "type": "prometheus",
              "url": "http://localhost:9090",
              "access": "proxy",
              "isDefault": true
            }'
          
          echo "✅ Prometheus Datasource hinzugefügt"
          EOF
```

### Schritt 4: Dashboard in Grafana importieren

1. Öffne `https://infra.markt.ma`
2. Login mit `admin` / dein Passwort
3. **Dashboards → Import → Upload JSON file**
4. Wähle `grafana/dashboards/api-monitoring.json`

## 📊 Verfügbare Metriken

### API Metriken (Prometheus Format)

```promql
# Fehlerrate pro Endpoint
rate(api_errors_detailed_total[5m])

# 95. Perzentil Response-Zeit
histogram_quantile(0.95, sum(rate(api_response_time_bucket[5m])) by (le, endpoint))

# Fehlerrate gesamt
sum(api_errors_total) / (sum(api_errors_total) + sum(api_success_total)) * 100

# Auth-Fehler nach Grund
sum by (reason) (auth_errors_total)

# Top 10 langsamste Endpoints
topk(10, avg by (endpoint) (api_response_time_sum / api_response_time_count))
```

### PostgreSQL Integration (bereits vorhanden)

In Grafana unter **Data Sources → PostgreSQL**:

```sql
-- API-Fehler aus Logs
SELECT 
  DATE_TRUNC('hour', created_at) as time,
  COUNT(*) as errors
FROM api_error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY time;

-- Top Fehler-Endpoints
SELECT 
  endpoint,
  error_type,
  COUNT(*) as count
FROM api_error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, error_type
ORDER BY count DESC
LIMIT 10;
```

## 🚨 Alert Rules

In Grafana: **Alerting → Alert rules → New alert rule**

### Alert 1: Hohe Fehlerrate
```promql
Query: rate(api_errors_total[5m]) > 0.1
Threshold: > 0.1 errors/sec
Action: Email an admin@markt.ma
```

### Alert 2: Langsame Response-Zeit
```promql
Query: histogram_quantile(0.95, sum(rate(api_response_time_bucket[5m])) by (le))
Threshold: > 2000 (2 Sekunden)
Action: Slack Webhook
```

### Alert 3: Viele Auth-Fehler
```promql
Query: rate(auth_errors_total[5m])
Threshold: > 0.5
Action: SMS + Email
```

## 🧪 Testen

### Lokal testen
```bash
# Backend starten
mvn spring-boot:run

# Metriken abrufen
curl http://localhost:8080/actuator/prometheus

# API-Fehler provozieren
curl http://localhost:8080/api/stores/99999
```

### Auf VPS testen
```bash
ssh root@<VPS-IP>

# Prometheus läuft?
systemctl status prometheus

# Grafana läuft?
systemctl status grafana-server

# Metriken werden gesammelt?
curl http://localhost:9090/api/v1/query?query=api_errors_total
```

## 📈 Dashboard-Ansicht

```
┌─────────────────────────────────────────────────────┐
│ markt.ma - API Monitoring                           │
├───────────────────────┬─────────────────────────────┤
│ API Fehler (24h)      │ Fehler nach Endpoint        │
│ ▂▃▅▇█▇▅▃▂            │ /api/stores/1    → 404 (23)│
│                       │ /api/auth/login  → 401 (15)│
├───────────────────────┼─────────────────────────────┤
│ Response-Zeit (p95)   │ HTTP Status Codes           │
│ 250ms avg             │ ████ 200 (85%)              │
│ ▂▂▃▃▄▄▅▅▆▆           │ ██   404 (10%)              │
│                       │ █    403 (5%)               │
├───────────────────────┴─────────────────────────────┤
│ Auth Fehler: 15 | DB Fehler: 2 | Erfolg: 1,234     │
│ Fehlerrate: 1.2% ⬇️ (-0.3% vs gestern)             │
└─────────────────────────────────────────────────────┘
```

## 🔧 Troubleshooting

### Keine Metriken in Grafana?
```bash
# Prüfe Prometheus Targets
curl http://localhost:9090/targets

# Sollte zeigen:
# spring-boot (localhost:8080) - UP
```

### Prometheus kann Spring Boot nicht erreichen?
```bash
# Firewall-Regel prüfen
sudo ufw status

# Falls nötig: Port 8080 intern erlauben
sudo ufw allow from 127.0.0.1 to any port 8080
```

## 🎯 Nächste Schritte

1. **Workflow ausführen**: GitHub Actions → "Setup Monitoring Stack" → Run workflow
2. **Dashboard importieren**: `grafana/dashboards/api-monitoring.json`
3. **Alerts konfigurieren**: Für kritische Fehler
4. **Mobile App**: Grafana Mobile für Push-Benachrichtigungen

## 📞 Support

Bei Fragen zu einzelnen Metriken, prüfe:
- `MetricsService.java` - Welche Metriken werden erfasst
- `GlobalExceptionHandler.java` - Welche Exceptions werden getrackt
- `MetricsInterceptor.java` - Wie API-Calls gemessen werden

---

**Fertig!** Nach dem nächsten Deployment siehst du alle API-Fehler live in Grafana 🚀


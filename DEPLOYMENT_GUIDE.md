# 🚀 DEPLOYMENT GUIDE - Zero-Downtime CAPTCHA Rollout

**Datum:** 2026-07-15  
**Priorität:** CRITICAL  
**Ziel:** Spam-Angriff stoppen ohne bestehende User zu blockieren

---

## ⚡ EMERGENCY: SOFORTMASSNAHMEN (VOR DEPLOYMENT)

### Option A: Backend Circuit Breaker manuell öffnen
```bash
# SSH zum Backend-Server
ssh user@api.markt.ma

# Circuit Breaker für betroffene Mail-Typen öffnen
curl -X POST http://localhost:8080/api/admin/circuit-breaker/open \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"emailType":"store-access"}'

# Optional: Auch password-reset vorübergehend sperren
curl -X POST http://localhost:8080/api/admin/circuit-breaker/open \
  -d '{"emailType":"password-reset"}'
```

### Option B: NGINX Rate Limiting (falls Backend-Admin nicht verfügbar)
```nginx
# /etc/nginx/sites-available/api.markt.ma
location /api/public/create-store/save-email {
    limit_req zone=save_email_limit burst=3 nodelay;
    limit_req_status 429;
    # ... rest of config
}

location /api/auth/forgot-password {
    limit_req zone=forgot_pw_limit burst=5 nodelay;
    limit_req_status 429;
    # ... rest of config
}

# In http block:
limit_req_zone $binary_remote_addr zone=save_email_limit:10m rate=3r/m;
limit_req_zone $binary_remote_addr zone=forgot_pw_limit:10m rate=5r/m;

# Reload nginx
sudo nginx -t && sudo nginx -s reload
```

---

## 🔧 DEPLOYMENT PHASE 1: hCaptcha Setup

### 1. hCaptcha Account erstellen
1. Gehe zu: https://www.hcaptcha.com/
2. Register / Login
3. Dashboard → Sites → "Add new site"

### 2. Site konfigurieren
```
Site Name: markt.ma Production
Domains: 
  - markt.ma
  - www.markt.ma
  - *.markt.ma (für Store-Subdomains)

Difficulty: Easy (für bessere UX)
```

### 3. Keys kopieren
```
✅ SITE KEY (öffentlich):     abc123... (für Frontend)
✅ SECRET KEY (geheim):        xyz789... (für Backend ENV)
```

**WICHTIG:** Secret Key NIEMALS committen!

---

## 🎯 DEPLOYMENT PHASE 2: Backend Konfiguration

### 1. Environment Variables setzen

**Production Server:**
```bash
# /etc/environment oder via Docker/K8s Secrets
export CAPTCHA_ENABLED=true
export CAPTCHA_SECRET="<SECRET KEY von hCaptcha>"
export CAPTCHA_SITE_KEY="<SITE KEY von hCaptcha>"
export CAPTCHA_PROVIDER=hcaptcha
export SPRING_PROFILES_ACTIVE=production
```

### 2. application.properties validieren
```properties
# Backend: src/main/resources/application.properties
captcha.enabled=${CAPTCHA_ENABLED:true}
captcha.secret=${CAPTCHA_SECRET:}
captcha.site-key=${CAPTCHA_SITE_KEY:}
captcha.provider=${CAPTCHA_PROVIDER:hcaptcha}
captcha.min-score=0.5
```

### 3. Backend Build & Test
```bash
cd storeBackend
mvn clean package -DskipTests

# Test ob CAPTCHA Secret geladen wird (ohne Secret zu loggen!)
java -jar target/storeBackend-*.jar --spring.profiles.active=production

# In Logs prüfen:
# ✅ "CAPTCHA enabled: true"
# ❌ "CAPTCHA secret missing" → STOP, Secret fehlt!
```

---

## 🌐 DEPLOYMENT PHASE 3: Frontend Konfiguration

### 1. Environment Production anpassen

**Datei:** `storeFrontend/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.markt.ma/api',
  publicApiUrl: 'https://api.markt.ma/api/public',
  
  captcha: {
    enabled: true,
    provider: 'hcaptcha' as 'hcaptcha' | 'recaptcha',
    siteKey: '<SITE KEY von hCaptcha>' // ✅ Hier eintragen!
  }
};
```

**ODER** via CI/CD (empfohlen):
```yaml
# .github/workflows/deploy.yml
- name: Replace CAPTCHA Site Key
  run: |
    sed -i "s/__HCAPTCHA_SITE_KEY__/${{ secrets.HCAPTCHA_SITE_KEY }}/g" \
      src/environments/environment.prod.ts
```

### 2. Frontend Build
```bash
cd storeFrontend
npm run build --configuration=production

# Check ob Site Key korrekt ersetzt wurde
grep "siteKey" dist/storeFrontend/browser/main-*.js
# Should NOT contain __HCAPTCHA_SITE_KEY__
```

---

## 🚀 DEPLOYMENT PHASE 4: Rollout (Zero-Downtime)

### Strategie: Backend-First (sicherer)

#### Schritt 1: Backend mit "tolerant mode" deployen (optional)
```bash
# Alte Backend-Instanz läuft noch
# Neue Instanz mit CAPTCHA deployen

# Option A: Blue-Green Deployment
docker-compose up -d backend-new
# Test: curl https://api-new.markt.ma/actuator/health

# Option B: Rolling Update (Kubernetes)
kubectl set image deployment/backend backend=markt-ma/backend:v2.0-captcha
kubectl rollout status deployment/backend
```

#### Schritt 2: Frontend deployen
```bash
# Frontend mit CAPTCHA Widget deployen
npm run build --configuration=production
rsync -avz dist/storeFrontend/ user@cdn.markt.ma:/var/www/markt-ma/

# ODER via Docker
docker build -t markt-ma/frontend:v2.0-captcha .
docker-compose up -d frontend

# ODER via Static Hosting (Netlify/Vercel)
# → Git push → Auto-Deploy
```

#### Schritt 3: Health Checks
```bash
# 1. Frontend CAPTCHA Widget lädt?
curl -I https://markt.ma/forgot-password
# → prüfe ob hcaptcha.com Script geladen wird

# 2. Backend akzeptiert CAPTCHA?
curl -X POST https://api.markt.ma/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","captchaToken":"test"}'
# → Erwartung: 400 "CAPTCHA validation failed" (gut!)

# 3. Backend lehnt Requests OHNE CAPTCHA ab?
curl -X POST https://api.markt.ma/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# → Erwartung: 403 Forbidden (gut!)
```

#### Schritt 4: Monitoring
```bash
# Security Events prüfen (neue Tabelle)
psql -h db.markt.ma -U marktma -d marktma_prod

SELECT endpoint, blocked, block_reason, COUNT(*) as count
FROM security_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, blocked, block_reason
ORDER BY count DESC;

# Erwartung:
# /api/public/create-store/save-email | true | "CAPTCHA missing" | 1000+
# /api/auth/forgot-password | true | "CAPTCHA missing" | 500+
# → Spam-Bots werden blockiert! ✅
```

#### Schritt 5: Alte Instanzen abschalten
```bash
# Nur wenn alles funktioniert!
docker-compose stop backend-old
# ODER
kubectl delete deployment backend-old
```

---

## ✅ POST-DEPLOYMENT TESTS

### 1. Forgot-Password (mit echtem User)
1. Öffne: https://markt.ma/forgot-password
2. E-Mail eingeben
3. **hCAPTCHA Widget sollte erscheinen** ✅
4. CAPTCHA lösen
5. Button "Code senden" sollte **aktiviert** sein ✅
6. Submit → "E-Mail versendet" ✅

### 2. Save-Email (mit echtem User)
1. Quick-Start Flow durchlaufen (Phone Auth)
2. Store erstellen
3. E-Mail-Eingabe-Schritt
4. **hCAPTCHA Widget + Honeypot-Feld** sollten da sein ✅
5. CAPTCHA lösen
6. E-Mail eingeben
7. Submit → Store-Access-Mail empfangen ✅

### 3. Bot-Simulation (sollte blockiert werden)
```bash
# Test 1: Ohne CAPTCHA → 403
curl -X POST https://api.markt.ma/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"bot@fake.com"}'
# Expected: 403 Forbidden

# Test 2: Mit Honeypot → 400
curl -X POST https://api.markt.ma/api/public/create-store/save-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"bot@fake.com","storeId":1,"website":"bot","captchaToken":"fake"}'
# Expected: 400 "Invalid request"

# Test 3: Wegwerf-Mail → 400
curl -X POST https://api.markt.ma/api/public/create-store/save-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"spam@mailinator.com","storeId":1,"captchaToken":"valid"}'
# Expected: 400 "Disposable email addresses are not allowed"

# Test 4: Rate Limit → 429
for i in {1..5}; do
  curl -X POST https://api.markt.ma/api/public/create-store/save-email \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"email":"test'$i'@example.com","storeId":1,"captchaToken":"valid"}'
done
# Expected: Erste 3 OK, dann 429 Too Many Requests
```

---

## 📊 MONITORING (erste 24h)

### Metriken überwachen:

**1. Security Events Dashboard**
```sql
-- Blockierte Requests pro Stunde
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as blocked_count,
  COUNT(DISTINCT client_ip) as unique_ips
FROM security_events
WHERE blocked = true 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Top blockierte IPs
SELECT 
  client_ip,
  COUNT(*) as attempts,
  MAX(block_reason) as reason
FROM security_events
WHERE blocked = true
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY client_ip
ORDER BY attempts DESC
LIMIT 20;

-- Honeypot-Trigger
SELECT COUNT(*) FROM security_events
WHERE honeypot_triggered = true
  AND created_at > NOW() - INTERVAL '24 hours';
```

**2. Circuit Breaker Status**
```bash
# Über Admin API (TODO: implementieren)
curl https://api.markt.ma/api/admin/circuit-status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Response:
# {
#   "store-access": { "open": false, "currentMinute": 5, "limitMinute": 20 },
#   "password-reset": { "open": false, "currentMinute": 2, "limitMinute": 15 }
# }
```

**3. Mail-Versand Rate**
```bash
# Logs durchsuchen
tail -f /var/log/marktma/backend.log | grep "email sent"

# Erwartung: Drastischer Rückgang!
# Vorher: 100+ Store-Access-Mails/Minute
# Nachher: <5/Minute (nur echte User)
```

---

## 🔥 ROLLBACK PLAN

### Falls etwas schief geht:

**Problem:** Frontend zeigt CAPTCHA nicht an
```bash
# Schnellfix: CAPTCHA im Backend temporär deaktivieren
export CAPTCHA_ENABLED=false
systemctl restart marktma-backend

# ODER: Alte Frontend-Version wiederherstellen
rsync -avz backup/dist-v1/ user@cdn.markt.ma:/var/www/markt-ma/
```

**Problem:** Backend lehnt alle Requests ab
```bash
# Prüfen: Ist CAPTCHA Secret gesetzt?
docker logs marktma-backend | grep "CAPTCHA"

# Falls Secret fehlt:
export CAPTCHA_SECRET="<SECRET>"
docker-compose restart backend
```

**Problem:** Zu viele False Positives (echte User blockiert)
```bash
# Circuit Breaker Limits erhöhen (temporär)
# → Code-Änderung in EmailCircuitBreakerService.java
# → Limits verdoppeln
# → Neu deployen
```

---

## 📞 SUPPORT BEREITSCHAFT

### Erste 24h nach Deployment:
- Backend-Logs live monitoring
- Security Events Dashboard beobachten
- User-Support: Falls echte User CAPTCHA-Probleme melden

### Alarm-Schwellenwerte:
- > 50 CAPTCHA-Fehler/Minute → Prüfen ob hCaptcha.com erreichbar
- Circuit Breaker öffnet → Prüfen ob Angriff noch läuft
- > 100 Honeypot-Trigger/Stunde → Bot-Netzwerk aktiv

---

## ✅ SUCCESS CRITERIA

**Nach 24h sollte gelten:**
- ✅ < 10 Store-Access-Mails/Stunde (statt 1000+)
- ✅ > 95% der Spam-Requests blockiert
- ✅ Bounce-Mails drastisch reduziert
- ✅ Security Events Tabelle füllt sich mit Blockierungen
- ✅ Keine Beschwerden von echten Usern

---

**Deployed by:** Development Team  
**Emergency Contact:** security@markt.ma  
**Status:** ✅ READY FOR DEPLOYMENT

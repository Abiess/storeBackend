# DEPLOYMENT-INTEGRATION: CAPTCHA BOT-SCHUTZ

**Datum:** 2026-07-12  
**Status:** ✅ Vollständig integriert in bestehende Deployment-Pipeline

---

## 📋 INTEGRIERTE DEPLOYMENT-MECHANISMEN

Die CAPTCHA-Konfiguration wurde nahtlos in die **bestehende Deployment-Pipeline** integriert:

### 1. **Backend Deployment** (`/etc/storebackend.env`)

Die CAPTCHA-Variablen werden automatisch vom `scripts/deploy.sh` in `/etc/storebackend.env` geschrieben.

**Datei:** `scripts/deploy.sh` (Zeile 176-186)
```bash
# CAPTCHA Configuration (Bot-Schutz für Registrierung, Login, Password-Reset)
# Provider: hcaptcha (empfohlen, DSGVO-konform) oder recaptcha
# hCaptcha: https://www.hcaptcha.com/ → Sites → New Site → Secret Key
# reCAPTCHA: https://www.google.com/recaptcha/admin → v3 → Secret Key
CAPTCHA_ENABLED=${CAPTCHA_ENABLED:-true}
CAPTCHA_PROVIDER=${CAPTCHA_PROVIDER:-hcaptcha}
CAPTCHA_SECRET=${CAPTCHA_SECRET:-}
CAPTCHA_MIN_SCORE=${CAPTCHA_MIN_SCORE:-0.5}
EMAIL_VERIFICATION_SKIP=${EMAIL_VERIFICATION_SKIP:-false}
```

### 2. **GitHub Actions** (`.github/workflows/deploy.yml`)

Die GitHub Secrets werden als Environment Variables exportiert und an `deploy.sh` übergeben.

**Datei:** `.github/workflows/deploy.yml` (Zeile 273-279)
```yaml
export CAPTCHA_ENABLED="${{ secrets.CAPTCHA_ENABLED }}"
export CAPTCHA_PROVIDER="${{ secrets.CAPTCHA_PROVIDER }}"
export CAPTCHA_SECRET="${{ secrets.CAPTCHA_SECRET }}"
export CAPTCHA_MIN_SCORE="${{ secrets.CAPTCHA_MIN_SCORE }}"
export EMAIL_VERIFICATION_SKIP="${{ secrets.EMAIL_VERIFICATION_SKIP }}"
```

### 3. **Frontend Build-Integration** (`.github/workflows/deploy.yml`)

Der hCaptcha **Site Key** wird vor dem Angular-Build via `sed` in `environment.prod.ts` injiziert.

**Datei:** `.github/workflows/deploy.yml` (Zeile 45-60)
```yaml
# ── hCaptcha Site Key injizieren ────────────────────────────────
# Ersetzt den Platzhalter __HCAPTCHA_SITE_KEY__ in environment.prod.ts
# mit dem echten Site Key aus dem GitHub Secret HCAPTCHA_SITE_KEY.
# WICHTIG: Site Key ist PUBLIC (Frontend), Secret Key ist PRIVATE (Backend)!
- name: Inject HCAPTCHA_SITE_KEY into environment.prod.ts
  run: |
    HCAPTCHA_VAL="${{ secrets.HCAPTCHA_SITE_KEY }}"
    if [ -n "$HCAPTCHA_VAL" ]; then
      sed -i "s/__HCAPTCHA_SITE_KEY__/${HCAPTCHA_VAL}/g" storeFrontend/src/environments/environment.prod.ts
      echo "✅ hCaptcha Site Key injected: ${HCAPTCHA_VAL}"
      grep siteKey storeFrontend/src/environments/environment.prod.ts
    else
      echo "⚠️  HCAPTCHA_SITE_KEY Secret nicht gesetzt - CAPTCHA wird deaktiviert"
      sed -i "s/__HCAPTCHA_SITE_KEY__//g" storeFrontend/src/environments/environment.prod.ts
    fi
```

### 4. **Production Configuration** (`application-production.yml`)

Die CAPTCHA-Konfiguration ist in der Production-YAML definiert und nutzt Environment-Variablen aus `/etc/storebackend.env`.

**Datei:** `src/main/resources/application-production.yml` (Zeile 258-272)
```yaml
# Email Verification Configuration
email:
  verification:
    skip-for-login: ${EMAIL_VERIFICATION_SKIP:false}

# CAPTCHA Configuration (Bot-Schutz für Registrierung, Login, Password-Reset)
# Provider: hcaptcha (empfohlen, DSGVO-konform) oder recaptcha
# hCaptcha Setup: https://www.hcaptcha.com/ (kostenlos, DSGVO-konform)
# reCAPTCHA Setup: https://www.google.com/recaptcha/admin (Google, v3)
# WICHTIG: CAPTCHA_SECRET ist der SECRET KEY (serverseitig, NIEMALS im Frontend!)
captcha:
  enabled: ${CAPTCHA_ENABLED:true}
  provider: ${CAPTCHA_PROVIDER:hcaptcha}
  secret: ${CAPTCHA_SECRET:}
  min-score: ${CAPTCHA_MIN_SCORE:0.5}
```

---

## 🔐 GITHUB SECRETS SETUP

### Backend Secrets (PRIVATE - niemals im Frontend!)

```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

| Secret Name | Beschreibung | Beispiel-Wert | Pflicht? |
|-------------|--------------|---------------|----------|
| `CAPTCHA_ENABLED` | CAPTCHA aktivieren (true/false) | `true` | ✅ Ja |
| `CAPTCHA_PROVIDER` | Provider (hcaptcha/recaptcha) | `hcaptcha` | ✅ Ja |
| `CAPTCHA_SECRET` | **SECRET KEY** (Server-Side) | `0x1234567890abcdef...` | ✅ Ja |
| `CAPTCHA_MIN_SCORE` | reCAPTCHA v3 Score (0.0-1.0) | `0.5` | ⚠️ Optional |
| `EMAIL_VERIFICATION_SKIP` | E-Mail-Verifizierung überspringen | `false` | ⚠️ Optional |

### Frontend Secrets (PUBLIC - wird im Build eingebettet!)

| Secret Name | Beschreibung | Beispiel-Wert | Pflicht? |
|-------------|--------------|---------------|----------|
| `HCAPTCHA_SITE_KEY` | **SITE KEY** (Public, Frontend) | `12345678-abcd-1234-...` | ✅ Ja |

---

## 🚀 DEPLOYMENT WORKFLOW (Schritt-für-Schritt)

### Phase 1: GitHub Secrets setzen

1. **hCaptcha Account erstellen:**
   ```
   https://www.hcaptcha.com/ → Register
   Dashboard → Sites → New Site
   Domain: markt.ma + *.markt.ma
   ```

2. **Secret Key & Site Key kopieren:**
   - **Secret Key**: Für Backend (geheim!)
   - **Site Key**: Für Frontend (öffentlich)

3. **GitHub Secrets hinzufügen:**
   ```
   Repository: Abiess/storeBackend
   Settings → Secrets → Actions → New repository secret
   
   Name: CAPTCHA_ENABLED        Value: true
   Name: CAPTCHA_PROVIDER       Value: hcaptcha
   Name: CAPTCHA_SECRET         Value: 0x1234567890abcdef1234567890abcdef12345678
   Name: HCAPTCHA_SITE_KEY      Value: 12345678-abcd-1234-abcd-1234567890ab
   ```

### Phase 2: Code pushen → Automatisches Deployment

```bash
git add .
git commit -m "feat: CAPTCHA Bot-Schutz integriert"
git push origin main
```

**Was passiert automatisch?**

1. ✅ GitHub Actions startet (`deploy.yml`)
2. ✅ `HCAPTCHA_SITE_KEY` wird in `environment.prod.ts` injiziert
3. ✅ Angular Frontend wird gebaut (mit CAPTCHA Site Key)
4. ✅ Spring Boot JAR wird gebaut
5. ✅ JAR wird auf VPS hochgeladen (`/tmp/app.jar`)
6. ✅ Deployment-Scripts werden hochgeladen (`/opt/storebackend/scripts/`)
7. ✅ Frontend wird deployed (`/var/www/markt.ma/`)
8. ✅ `deploy.sh` wird ausgeführt:
   - Stoppt alte App
   - Backup erstellt
   - Neue JAR installiert
   - **Environment-File geschrieben** (`/etc/storebackend.env`)
   - systemd Service neu gestartet
9. ✅ Health Check prüft ob App läuft

### Phase 3: Verifizierung

```bash
# SSH auf VPS
ssh user@vps-host

# 1. Environment-File prüfen
sudo cat /etc/storebackend.env | grep CAPTCHA
# Erwartete Ausgabe:
# CAPTCHA_ENABLED=true
# CAPTCHA_PROVIDER=hcaptcha
# CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
# CAPTCHA_MIN_SCORE=0.5

# 2. Backend-Logs prüfen
sudo journalctl -u storebackend -f | grep -i captcha
# Erwartete Ausgabe (beim Start):
# [INFO] CaptchaService: CAPTCHA enabled with provider: hcaptcha

# 3. Frontend prüfen
curl https://markt.ma/register
# CAPTCHA Widget muss sichtbar sein (hCaptcha Checkbox)

# 4. Testregistrierung
# Browser: https://markt.ma/register
# → CAPTCHA lösen → Registrierung funktioniert

# 5. Rate Limiting testen
# 11x schnell registrieren → HTTP 429 "Too many requests"
```

---

## 📁 GEÄNDERTE DATEIEN (Deployment-Integration)

### Backend Deployment:
- ✅ `scripts/deploy.sh` (Zeile 176-186: CAPTCHA ENV-Variablen)
- ✅ `src/main/resources/application-production.yml` (Zeile 258-272: CAPTCHA Config)

### GitHub Actions:
- ✅ `.github/workflows/deploy.yml` (Zeile 45-60: Frontend CAPTCHA Site Key Injection)
- ✅ `.github/workflows/deploy.yml` (Zeile 273-279: Backend CAPTCHA Secrets Export)

### Frontend:
- ✅ `storeFrontend/src/environments/environment.prod.ts` (Platzhalter `__HCAPTCHA_SITE_KEY__`)

---

## 🔄 DEPLOYMENT-FLOW DIAGRAMM

```
GitHub Push
    ↓
GitHub Actions (deploy.yml)
    ↓
┌─────────────────────────────────────┐
│  1. Inject HCAPTCHA_SITE_KEY        │
│     (sed in environment.prod.ts)    │
├─────────────────────────────────────┤
│  2. Build Angular Frontend          │
│     (npm ci && npm run build:prod)  │
├─────────────────────────────────────┤
│  3. Build Spring Boot JAR           │
│     (mvn clean package)             │
├─────────────────────────────────────┤
│  4. Upload JAR to VPS (/tmp)        │
├─────────────────────────────────────┤
│  5. Upload Scripts (/opt/...)       │
├─────────────────────────────────────┤
│  6. Deploy Frontend (/var/www/...)  │
├─────────────────────────────────────┤
│  7. Execute deploy.sh               │
│     • Export GitHub Secrets         │
│     • CAPTCHA_ENABLED=...           │
│     • CAPTCHA_SECRET=...            │
│     • Write /etc/storebackend.env   │
│     • Restart systemd Service       │
└─────────────────────────────────────┘
    ↓
systemd lädt /etc/storebackend.env
    ↓
Spring Boot liest application-production.yml
    ↓
captcha.enabled=${CAPTCHA_ENABLED:true}
captcha.secret=${CAPTCHA_SECRET:}
    ↓
CaptchaService initialisiert
    ↓
✅ CAPTCHA aktiv (hCaptcha/reCAPTCHA)
```

---

## 🧪 LOKALER TEST VOR DEPLOYMENT

### Development (CAPTCHA deaktiviert)

```bash
# Backend
cd storeBackend
mvn clean compile
mvn spring-boot:run

# Frontend
cd storeFrontend
npm start
```

**environment.ts:**
```typescript
captcha: {
  enabled: false,  // Development: CAPTCHA deaktiviert
  provider: 'hcaptcha',
  siteKey: ''
}
```

### Staging (CAPTCHA aktiviert)

```bash
# Backend: CAPTCHA aktivieren
export CAPTCHA_ENABLED=true
export CAPTCHA_PROVIDER=hcaptcha
export CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
mvn spring-boot:run -Dspring.profiles.active=production

# Frontend: Site Key setzen
# environment.prod.ts manuell bearbeiten:
captcha: {
  enabled: true,
  provider: 'hcaptcha',
  siteKey: '12345678-abcd-1234-abcd-1234567890ab'
}

npm run build:prod
# dist/markt-ma-frontend/ → lokal testen mit nginx/http-server
```

---

## 📝 TROUBLESHOOTING

### Problem: "CAPTCHA Secret nicht konfiguriert"

**Fehler im Backend-Log:**
```
[ERROR] CAPTCHA secret is not configured! Set captcha.secret in application.yml
```

**Lösung:**
```bash
# GitHub Secret prüfen
Repository → Settings → Secrets → CAPTCHA_SECRET

# /etc/storebackend.env prüfen (auf VPS)
sudo cat /etc/storebackend.env | grep CAPTCHA_SECRET

# Sollte nicht leer sein:
CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
```

### Problem: "hCaptcha Widget nicht sichtbar"

**Browser-Console:**
```
Uncaught ReferenceError: hcaptcha is not defined
```

**Lösung:**
```bash
# 1. GitHub Secret HCAPTCHA_SITE_KEY gesetzt?
Repository → Settings → Secrets → HCAPTCHA_SITE_KEY

# 2. environment.prod.ts prüfen (nach Build)
cat dist/markt-ma-frontend/main.*.js | grep -o 'siteKey:"[^"]*"'
# Sollte Site Key enthalten, NICHT "__HCAPTCHA_SITE_KEY__"

# 3. Platzhalter im deployed Frontend?
ssh user@vps
grep -r "__HCAPTCHA_SITE_KEY__" /var/www/markt.ma/
# Sollte NICHTS finden
```

### Problem: "Rate Limit funktioniert nicht"

**Backend neu gestartet → Rate Limits zurückgesetzt:**
```
Rate Limits sind In-Memory (Caffeine Cache)
→ Backend-Restart = Alle Limits zurückgesetzt
```

**Lösung für Production:**
- Redis-basiertes Rate Limiting implementieren
- Oder: Rate Limits in PostgreSQL speichern

---

## ✅ DEPLOYMENT-CHECKLISTE

### Vor dem Deployment:

- [ ] hCaptcha Account erstellt
- [ ] Site Key & Secret Key kopiert
- [ ] GitHub Secrets hinzugefügt:
  - [ ] `CAPTCHA_ENABLED=true`
  - [ ] `CAPTCHA_PROVIDER=hcaptcha`
  - [ ] `CAPTCHA_SECRET=0x...`
  - [ ] `HCAPTCHA_SITE_KEY=12345678-...`
- [ ] Code lokal getestet
- [ ] Backend kompiliert (`mvn clean compile`)
- [ ] Frontend baut (`npm run build:prod`)

### Nach dem Deployment:

- [ ] GitHub Actions erfolgreich? (✅ grüner Haken)
- [ ] `/etc/storebackend.env` enthält CAPTCHA-Variablen?
- [ ] Backend-Logs zeigen "CAPTCHA enabled"?
- [ ] Frontend zeigt CAPTCHA Widget?
- [ ] Testregistrierung funktioniert?
- [ ] Rate Limiting funktioniert? (11. Request → HTTP 429)
- [ ] Account Lockout funktioniert? (6. Login → HTTP 403)

---

## 🎯 ZUSAMMENFASSUNG

✅ **CAPTCHA-Integration ist vollständig in die bestehende Deployment-Pipeline integriert**

- **Backend:** Environment-Variablen via `/etc/storebackend.env`
- **Frontend:** Site Key via `sed` vor dem Build
- **Deployment:** Automatisch via GitHub Actions
- **Konfiguration:** Zentral über GitHub Secrets

**Kein manueller Eingriff nötig** → Git Push → Automatisches Deployment mit CAPTCHA!

🎉 **Ready for Production!**

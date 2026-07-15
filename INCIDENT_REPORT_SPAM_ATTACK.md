# 🚨 INCIDENT REPORT: Bot/Spam-Angriff auf markt.ma

**Datum:** 2026-07-15  
**Severity:** CRITICAL  
**Status:** AKTIV - Sofortmaßnahmen erforderlich

---

## 📊 ZUSAMMENFASSUNG

**Problem:** Massenhafter Bot-Angriff mit automatisierten Formular-Submissions, die unbegrenzt E-Mails an ungültige Adressen auslösen.  
**Symptom:** Tausende Bounce-Mails mit `550 5.1.1 Account not found`  
**Root Cause:** Fehlende/inkomplete Bot-Schutz-Maßnahmen auf öffentlichen Endpoints

---

## ⚠️ BETROFFENE ENDPOINTS (PUBLIC - KEIN AUTH)

### ✅ **BEREITS GESCHÜTZT** (Rate Limiting + CAPTCHA aktiv):

1. **`POST /api/auth/register`** ✅
   - ✅ IP Rate Limit: 10/min
   - ✅ Email Rate Limit: 3/Stunde  
   - ✅ CAPTCHA Validierung
   - ✅ E-Mail Verification (sendet Mail)

2. **`POST /api/auth/login`** ✅
   - ✅ IP Rate Limit: 10/min
   - ✅ Account Lockout: 5 Versuche
   - ✅ CAPTCHA (ab 3. Versuch)

3. **`POST /api/auth/resend-verification`** ✅
   - ✅ IP Rate Limit: 10/min
   - ✅ Email Rate Limit: 3/Stunde
   - ✅ Cooldown: 2 Minuten zwischen Resends

4. **`POST /api/auth/forgot-password`** ✅
   - ✅ IP Rate Limit: 10/min
   - ✅ Email Rate Limit: 3/Stunde
   - ⚠️ CAPTCHA: FEHLT (nur Rate Limiting)
   - ✅ Security: Gibt nie Info, ob E-Mail existiert

### 🔴 **NICHT GESCHÜTZT** (AKUTE ANGRIFFSVEKTOREN):

5. **`POST /api/auth/phone/request-code`** ❌ **CRITICAL**
   - ❌ KEIN Rate Limiting
   - ❌ KEIN CAPTCHA
   - ❌ Sendet WhatsApp/SMS-Codes
   - 🎯 **WAHRSCHEINLICHSTER ANGRIFFSVEKTOR**

6. **`POST /api/public/create-store`** ❌ **HIGH RISK**
   - ❌ KEIN Rate Limiting
   - ❌ KEIN CAPTCHA
   - ❌ Erstellt User + Store + Subdomain
   - ❌ Sendet KEINE E-Mail (aber belastet DB/Resources)

7. **`POST /api/public/create-store/save-email`** ❌ **HIGH RISK**
   - ❌ KEIN Rate Limiting
   - ❌ KEIN CAPTCHA
   - ✅ Sendet Store-Access-E-Mail
   - 🎯 **WAHRSCHEINLICHER SPAM-VEKTOR**

---

## 🔍 VERDACHT: HAUPTANGRIFFSVEKTOR

### Phone Auth (`/api/auth/phone/request-code`)
- **KEIN** Rate Limiting (weder IP noch Telefonnummer)
- **KEIN** CAPTCHA
- Sendet SMS/WhatsApp-Code bei jedem Request
- Bot kann beliebig viele Nummern probieren
- **Kosten:** SMS-Versand-Kosten pro Request!

### Store Creation + Email Save
- Bots könnten Stores mit Fake-Daten erstellen
- Danach via `/save-email` Spam-E-Mails auslösen
- **KEIN** Schutz auf beiden Endpoints

---

## 💥 SCHWACHSTELLEN-ANALYSE

### 1. CAPTCHA-Konfiguration
```properties
# application.properties
captcha.enabled=true         # ✅ Aktiviert
captcha.secret=               # ⚠️ LEER = CAPTCHA überspringt Validierung!
captcha.site-key=             # ⚠️ LEER
```

**Problem:** 
- Wenn `captcha.secret` LEER → Service gibt `true` zurück (Zeile 73-76 CaptchaService)
- Frontend zeigt möglicherweise CAPTCHA, aber Backend validiert NICHT!
- Bots können beliebige Dummy-Tokens senden

### 2. CAPTCHA nur auf 3 Endpoints
- Register ✅
- Login (ab 3. Versuch) ✅
- Forgot-Password ❌
- Phone-Auth ❌
- Store-Creation ❌

### 3. Rate Limiting nicht überall
- Auth-Endpoints ✅
- Phone-Auth ❌
- Store-Creation ❌

### 4. E-Mail-Validierung
- Syntaxprüfung: JA
- Domain-Blacklist: NEIN
- MX-Record-Check: NEIN (gut - wäre unzuverlässig)
- Wegwerf-Mail-Check: NEIN

---

## 🚀 SOFORTMASSNAHMEN (PRIORITÄT)

### 1. **PHONE AUTH SOFORT ABSICHERN** (CRITICAL)
```java
// PhoneAuthController.java - POST /request-code
- [ ] Rate Limiting nach IP (3/15min)
- [ ] Rate Limiting nach Telefonnummer (3/Stunde)
- [ ] CAPTCHA Validierung (Pflicht)
- [ ] Honeypot-Feld
- [ ] Min-Time-Check (2 Sekunden)
```

### 2. **STORE CREATION ABSICHERN** (HIGH)
```java
// PublicStoreCreationController.java - POST /api/public/create-store
- [ ] Rate Limiting nach IP (3/Stunde)
- [ ] CAPTCHA Validierung (Pflicht)
- [ ] Honeypot-Feld
- [ ] Min-Time-Check (5 Sekunden)
```

### 3. **STORE EMAIL SAVE ABSICHERN** (HIGH)
```java
// PublicStoreCreationController.java - POST /api/public/create-store/save-email
- [ ] Rate Limiting nach IP (3/15min)
- [ ] CAPTCHA Validierung (Pflicht)
- [ ] E-Mail Domain Blacklist (temporäre Mails)
```

### 4. **FORGOT PASSWORD CAPTCHA** (MEDIUM)
```java
// AuthController.java - POST /forgot-password
- [ ] CAPTCHA Validierung hinzufügen (aktuell nur Rate Limiting)
```

### 5. **CAPTCHA SECRET SETZEN** (CRITICAL)
```bash
# Environment Variables
CAPTCHA_ENABLED=true
CAPTCHA_SECRET=<hCaptcha Secret Key>
CAPTCHA_SITE_KEY=<hCaptcha Site Key>
CAPTCHA_PROVIDER=hcaptcha
```

---

## 📋 WEITERE MASSNAHMEN (MITTELFRISTIG)

### 1. Honeypot-Implementierung
- Unsichtbares Feld in allen öffentlichen Formularen
- Bei Ausfüllung → Silent Reject (200 OK, aber kein Versand)

### 2. Timing-Check
- Timestamp bei Formular-Render im Frontend
- Backend prüft Zeitdifferenz
- < 2 Sekunden → Reject

### 3. E-Mail Domain Blacklist
- Bekannte Wegwerf-Mail-Domains blockieren
- Liste: mailinator.com, tempmail.*, guerrillamail.com, etc.
- **NICHT:** SMTP-Validation (unzuverlässig + Privacy-Problem)

### 4. Globales E-Mail Sending Limit
```java
// Neuer Service: EmailRateLimitService
- Max 100 E-Mails/Minute (global)
- Max 1000 E-Mails/Stunde
- Bei Überschreitung: Alarm + Auto-Pause
```

### 5. Logging & Monitoring
```java
// Kritische Events loggen:
- IP-Adresse (anonymisiert)
- Endpoint
- Timestamp
- User-Agent
- CAPTCHA-Status
- Rate-Limit-Status
```

### 6. Phone Number Rate Limiting
```java
// Neue Cache-Instanz in RateLimitService
- 3 Codes pro Telefonnummer pro Stunde
- 5 verschiedene Nummern pro IP pro Stunde
```

---

## 🔒 SECURITY BEST PRACTICES (BEREITS IMPLEMENTIERT)

✅ JWT-basierte Auth  
✅ Password Hashing (BCrypt)  
✅ CSRF Protection disabled (Stateless API)  
✅ CORS konfiguriert  
✅ Token Expiration (24h Verification, 1h Password Reset)  
✅ User Enumeration Prevention (Forgot Password gibt keine Info)  
✅ Account Lockout (5 fehlgeschlagene Login-Versuche)  
✅ Email Verification Cooldown (2 Minuten)  

---

## 📊 METRIKEN (NACH IMPLEMENTATION)

### Zu überwachen:
- Rate Limit Rejections pro Endpoint
- CAPTCHA Failures
- Honeypot Triggers
- E-Mail Bounces
- SMS/WhatsApp-Kosten
- Store Creation Rate
- Failed Login Attempts

### Alarm-Schwellenwerte:
- > 50 Rate Limit Rejections/Minute → Alarm
- > 100 CAPTCHA Failures/Minute → Alarm
- > 20 Honeypot Triggers/Minute → Alarm
- > 100 E-Mails/Minute → Auto-Pause

---

## ✅ UMSETZUNGS-CHECKLISTE

### Phase 1: SOFORT (Heute)
- [ ] CAPTCHA Secret konfigurieren
- [ ] Phone Auth Rate Limiting
- [ ] Phone Auth CAPTCHA
- [ ] Store Creation Rate Limiting
- [ ] Store Creation CAPTCHA
- [ ] Store Email Save Rate Limiting
- [ ] Forgot Password CAPTCHA

### Phase 2: DIESE WOCHE
- [ ] Honeypot-Fields
- [ ] Timing-Check
- [ ] Globales E-Mail Rate Limiting
- [ ] Phone Number Rate Limiting
- [ ] Logging & Monitoring

### Phase 3: NÄCHSTE WOCHE
- [ ] E-Mail Domain Blacklist
- [ ] Alert-System
- [ ] Dashboard für Security-Metriken

---

## 📞 ANSPRECHPARTNER

- **Backend Security:** Development Team
- **DevOps:** für CAPTCHA Secret Deployment
- **Monitoring:** für Alarm-Setup

---

## 🔗 RELEVANTE FILES

- `src/main/java/storebackend/controller/AuthController.java` ✅
- `src/main/java/storebackend/controller/PhoneAuthController.java` ❌
- `src/main/java/storebackend/controller/PublicStoreCreationController.java` ❌
- `src/main/java/storebackend/service/RateLimitService.java` (erweitern)
- `src/main/java/storebackend/service/CaptchaService.java` ✅
- `src/main/resources/application.properties` (CAPTCHA konfigurieren)

---

**NEXT STEPS:** Implementation der Sofortmaßnahmen starten!

# BOT-SCHUTZ TESTS

## TEST 1: Erfolgreiche Registrierung (Development, CAPTCHA deaktiviert)

### Backend
```bash
cd storeBackend
mvn clean compile
mvn spring-boot:run
```

### Frontend
```bash
cd storeFrontend
npm start
```

### Durchführung
1. http://localhost:4200/register
2. E-Mail: `test1@example.com`
3. Passwort: `test123`
4. Submit → **✅ Erfolg**
5. Backend-Log prüfen: Verification-Link anzeigen

**Erwartetes Ergebnis:**
- HTTP 201 Created
- `successMessage`: "Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mails..."
- Backend-Log: `[INFO] Verification token created for user: test1@example.com`

---

## TEST 2: IP Rate Limit (10 Requests/Min)

### Postman/curl
```bash
# 11x innerhalb 1 Minute
for i in {1..11}; do
  curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"test123"}' \
    -w "\nStatus: %{http_code}\n"
done
```

**Erwartetes Ergebnis:**
- Request 1-10: HTTP 201 Created
- Request 11: **❌ HTTP 429 Too Many Requests**
- Body: `{"message":"Too many requests. Please try again later."}`

---

## TEST 3: E-Mail Rate Limit (3 Registrierungen/Stunde)

### Postman/curl
```bash
# 4x mit derselben E-Mail
for i in {1..4}; do
  curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"ratelimit@example.com","password":"test123"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 2
done
```

**Erwartetes Ergebnis:**
- Request 1: HTTP 201 Created
- Request 2-3: HTTP 400 Bad Request ("Email already registered")
- Request 4: **❌ HTTP 429 Too Many Requests**
- Body: `{"message":"Too many registration attempts for this email."}`

---

## TEST 4: Account Lockout (5 fehlgeschlagene Login-Versuche)

### Durchführung
```bash
# 6x falsches Passwort
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test1@example.com","password":"wrongpass"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

**Erwartetes Ergebnis:**
- Request 1-5: HTTP 401 Unauthorized ("Invalid email or password")
- Request 6: **❌ HTTP 403 Forbidden**
- Body: `{"message":"Account temporarily locked due to too many failed login attempts."}`

---

## TEST 5: Resend-Cooldown (2 Minuten)

### Durchführung
1. Registrieren: `cooldown@example.com`
2. Sofort "Resend Verification" klicken → ✅ Erfolg
3. Nochmal "Resend" klicken (innerhalb 2 Min) → **❌ Fehler**

**Erwartetes Ergebnis:**
- 1. Resend: HTTP 200 OK ("Verification email sent successfully!")
- 2. Resend (< 2 Min): **❌ HTTP 429 Too Many Requests**
- Body: `{"message":"Please wait X seconds before requesting another verification email"}`

---

## TEST 6: CAPTCHA Validation (Production)

### Setup
1. hCaptcha Site Key & Secret Key generieren
2. Backend: `CAPTCHA_ENABLED=true`, `CAPTCHA_SECRET=...`
3. Frontend: `captcha.enabled: true`, `captcha.siteKey: ...`

### Durchführung
1. https://markt.ma/register
2. CAPTCHA Widget wird angezeigt
3. CAPTCHA lösen → Registrierung möglich
4. Request ohne CAPTCHA Token (Postman):

```bash
curl -X POST https://api.markt.ma/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nocaptcha@example.com","password":"test123"}'
```

**Erwartetes Ergebnis:**
- Mit CAPTCHA: HTTP 201 Created
- Ohne CAPTCHA: **❌ HTTP 400 Bad Request**
- Body: `{"message":"CAPTCHA validation failed. Please try again."}`

---

## TEST 7: E-Mail-Verifizierung

### Durchführung
1. Registrieren: `verify@example.com`
2. Backend-Log: Verification-Link kopieren
3. Link im Browser öffnen: `http://localhost:8080/api/auth/verify?token=...`
4. Login mit unverifizierter E-Mail versuchen

**Erwartetes Ergebnis:**
- Nach Registrierung: `email_verified = false` in DB
- Nach Verify: `email_verified = true` in DB
- Login vor Verify: **❌ HTTP 401 Unauthorized**
- Body: `{"message":"Please verify your email address before logging in."}`

---

## TEST 8: Cross-Store Rate Limiting

### Durchführung
1. Registrieren auf `store1.localhost:4200` → ✅
2. Registrieren auf `store2.localhost:4200` (gleiche E-Mail) → ❌

**Erwartetes Ergebnis:**
- E-Mail Rate Limit gilt **plattformweit** (nicht pro Store)
- 2. Registrierung: HTTP 409 Conflict ("Email already registered")

---

## TEST 9: Forgot Password Rate Limit

### Durchführung
```bash
# 11x Forgot-Password-Request innerhalb 1 Minute
for i in {1..11}; do
  curl -X POST http://localhost:8080/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"reset@example.com"}' \
    -w "\nStatus: %{http_code}\n"
done
```

**Erwartetes Ergebnis:**
- Request 1-10: HTTP 200 OK ("If this email exists, a password reset link has been sent.")
- Request 11: **❌ HTTP 429 Too Many Requests**

---

## TEST 10: Production CAPTCHA (hCaptcha)

### Setup
1. https://www.hcaptcha.com/ → Register
2. Dashboard → Sites → New Site
3. Domain: `markt.ma` + `*.markt.ma`
4. Kopiere **Site Key** (Frontend) + **Secret Key** (Backend)

### Backend
```bash
# /etc/storebackend.env
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
```

### Frontend
```typescript
// environment.prod.ts
captcha: {
  enabled: true,
  provider: 'hcaptcha',
  siteKey: '12345678-abcd-1234-abcd-1234567890ab'
}
```

### Durchführung
1. https://markt.ma/register
2. CAPTCHA Widget erscheint
3. CAPTCHA lösen → ✅ Registrierung möglich
4. DevTools → Network → Request prüfen:
   - `captchaToken` Feld vorhanden?
   - Backend-Response: HTTP 201 Created

---

## ✅ TEST-CHECKLISTE

- [ ] TEST 1: Erfolgreiche Registrierung (Development)
- [ ] TEST 2: IP Rate Limit (10/Min)
- [ ] TEST 3: E-Mail Rate Limit (3/Stunde)
- [ ] TEST 4: Account Lockout (5 Versuche)
- [ ] TEST 5: Resend-Cooldown (2 Min)
- [ ] TEST 6: CAPTCHA Validation (Production)
- [ ] TEST 7: E-Mail-Verifizierung
- [ ] TEST 8: Cross-Store Rate Limiting
- [ ] TEST 9: Forgot Password Rate Limit
- [ ] TEST 10: Production CAPTCHA (hCaptcha)

---

## 🐛 TROUBLESHOOTING

### Problem: "CAPTCHA Secret nicht konfiguriert"
**Fehler:**
```
[ERROR] CAPTCHA secret is not configured! Set captcha.secret in application.yml
```

**Lösung:**
```bash
# Backend: .env oder Environment Variable
CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
```

### Problem: "hCaptcha Widget wird nicht geladen"
**Fehler:**
- CAPTCHA Component bleibt leer
- Browser-Console: `hcaptcha is not defined`

**Lösung:**
1. Frontend: `captcha.enabled: true` in `environment.prod.ts`
2. Site Key korrekt? (nicht Secret Key!)
3. Domain in hCaptcha Dashboard eingetragen? (`markt.ma`)

### Problem: "Rate Limit wird nicht zurückgesetzt"
**Fehler:**
- Auch nach 1 Stunde noch Rate Limit

**Lösung:**
- Backend neu starten (Caffeine Cache ist In-Memory)
- Oder warten bis Cache expired (5 Min für IP, 1 Stunde für E-Mail)

### Problem: "Account Lockout nach 1 Versuch"
**Fehler:**
- Account wird sofort gesperrt

**Lösung:**
```java
// RateLimitService.java prüfen
private static final int MAX_LOGIN_ATTEMPTS = 5; // Korrekt?
```

---

## 📝 LOGS PRÜFEN

### Backend
```bash
# Alle Logs
journalctl -u storebackend -f

# Nur Rate Limiting
journalctl -u storebackend -f | grep "Rate Limit"

# Nur CAPTCHA
journalctl -u storebackend -f | grep "CAPTCHA"

# Nur Account Lockout
journalctl -u storebackend -f | grep "Account lockout"
```

### Frontend (Browser DevTools)
```javascript
// Console
// CAPTCHA Token prüfen
console.log('CAPTCHA Token:', captchaToken);

// Network Tab
// Request Body prüfen
{
  "email": "test@example.com",
  "password": "test123",
  "captchaToken": "P1_eyJ0eXAiOiJKV1QiLCJhbGc..." // ← Muss vorhanden sein
}
```

---

Viel Erfolg beim Testen! 🎉

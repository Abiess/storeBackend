# 🎯 ATTACK VECTOR ANALYSIS - E-Mail Bounce Attack

## E-MAIL VERSENDENDE ENDPOINTS (PUBLIC)

### 1. **POST /api/auth/register** 
**Funktion:** `EmailVerificationService.sendVerificationEmail()`  
**Betreff:** "Verify your email address - Markt.ma"  
**Schutz:**
- ✅ IP Rate Limit: 10/min
- ✅ Email Rate Limit: 3/Stunde
- ✅ CAPTCHA Validierung
- ✅ User wird erst NACH erfolgreicher CAPTCHA-Prüfung angelegt
**Risiko:** NIEDRIG (gut geschützt)

---

### 2. **POST /api/auth/resend-verification**
**Funktion:** `EmailVerificationService.sendVerificationEmail()`  
**Betreff:** "Verify your email address - Markt.ma"  
**Schutz:**
- ✅ IP Rate Limit: 10/min
- ✅ Email Rate Limit: 3/Stunde
- ✅ Cooldown: 2 Minuten zwischen Resends
- ❌ KEIN CAPTCHA!
**Risiko:** MITTEL (Rate Limiting vorhanden, aber kein CAPTCHA)

---

### 3. **POST /api/auth/forgot-password** ⚠️
**Funktion:** `PasswordResetService.sendPasswordResetEmail()`  
**Betreff:** "Reset your password - Markt.ma"  
**Schutz:**
- ✅ IP Rate Limit: 10/min
- ✅ Email Rate Limit: 3/Stunde
- ❌ **KEIN CAPTCHA!**
- ⚠️ Sendet E-Mail auch wenn Adresse nicht existiert (Security by Obscurity)
**Risiko:** **HOCH** ← **WAHRSCHEINLICHSTER VEKTOR**

**Warum?**
- Rate Limiting: 3 E-Mails/Stunde pro E-Mail-Adresse
- ABER: Bot kann 1000 verschiedene E-Mails verwenden
- 1000 E-Mails × 3 = **3000 E-Mails pro Stunde** möglich!
- IP-Limit: 10/min = 600/Stunde pro IP → mit 5 IPs = 3000 E-Mails/Stunde

---

### 4. **POST /api/public/create-store/save-email** 🔴
**Funktion:** `EmailService.sendStoreAccessEmail()`  
**Betreff:** "Your store \"{{storeName}}\" is live 🚀 – markt.ma"  
**Schutz:**
- ❌ **KEIN Rate Limiting**
- ❌ **KEIN CAPTCHA**
- ❌ **KEIN Honeypot**
- ❌ **KEINE Validierung**
**Risiko:** **KRITISCH** ← **WAHRSCHEINLICHSTER VEKTOR**

**Warum?**
- KOMPLETT UNGESCHÜTZT
- Bot kann beliebig viele E-Mails versenden
- Benötigt nur gültiges JWT (aus vorheriger Store-Creation)
- Store-Creation ist AUCH ungeschützt!

**Attack Flow:**
1. Bot: `POST /api/public/create-store` → JWT + storeId
2. Bot: `POST /api/public/create-store/save-email` mit Fake-Email
3. Backend sendet Store-Access-Mail an ungültige Adresse
4. Bounce-Mail: `550 5.1.1 Account not found`

---

## 🎯 WAHRSCHEINLICHSTER ANGRIFFSVEKTOR

### **VERMUTUNG: `/api/auth/forgot-password` ODER `/save-email`**

**Indizien:**
1. **Bounce-Mails** = E-Mail-Versand an ungültige Adressen
2. **Massenhaft** = Kein effektives Rate Limiting
3. **Zufällige E-Mails** = Bot generiert Fake-Adressen

**forgot-password:**
- Hat Rate Limiting, aber KEIN CAPTCHA
- 1000 verschiedene E-Mails = 3000 Mails/Stunde möglich
- Mit 10 IPs = 30.000 Mails/Stunde

**save-email:**
- HAT ÜBERHAUPT KEINEN SCHUTZ
- Unbegrenzte E-Mails möglich
- Benötigt nur JWT (aus ungeschützter Store-Creation)

---

## ✅ VERIFICATION NEEDED

### Logs prüfen:
```bash
# Letzte 1000 E-Mail-Versand-Logs
grep "sent to:" logs/application.log | tail -1000

# Nach Endpoint filtern
grep "forgot-password" logs/application.log | wc -l
grep "Store access email sent" logs/application.log | wc -l
grep "Password reset email" logs/application.log | wc -l
grep "Verification email" logs/application.log | wc -l

# IP-Adressen zählen
grep "Rate limit exceeded" logs/application.log | grep -oP 'IP: \K[^\s]+' | sort | uniq -c | sort -rn
```

### Mail-Server-Logs prüfen:
```bash
# Bounce-Mails analysieren
# Betreffzeile extrahieren → zeigt welcher Endpoint
# "Reset your password" → forgot-password
# "Your store ... is live" → save-email
# "Verify your email" → register/resend
```

---

## 🚨 SOFORTMASSNAHMEN (PRIORISIERT)

### 1. **CAPTCHA "fail closed"** (CRITICAL)
```java
// CaptchaService.java - Zeile 66-76
if (!captchaEnabled) {
    // NEU: In Production IMMER ablehnen wenn disabled
    String profile = System.getenv("SPRING_PROFILES_ACTIVE");
    if (!"dev".equals(profile) && !"local".equals(profile)) {
        log.error("CAPTCHA disabled in production - rejecting request");
        return false;
    }
    log.debug("CAPTCHA validation skipped (dev mode)");
    return true;
}
```

### 2. **save-email absichern** (CRITICAL)
```java
// PublicStoreCreationController.java - POST /save-email
@PostMapping("/save-email")
public ResponseEntity<?> saveEmail(
        @RequestHeader("Authorization") String authHeader,
        @Valid @RequestBody SaveEmailRequest req,
        HttpServletRequest httpRequest) {  // NEU
    
    String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);
    
    // NEU: Rate Limiting
    if (!rateLimitService.checkIpRateLimit(ipAddress)) {
        return ResponseEntity.status(429)
            .body(Map.of("message", "Too many requests"));
    }
    
    // NEU: CAPTCHA
    if (!captchaService.validateCaptcha(req.captchaToken(), ipAddress)) {
        return ResponseEntity.badRequest()
            .body(Map.of("message", "CAPTCHA validation failed"));
    }
    
    // ... rest of method
}
```

### 3. **forgot-password CAPTCHA** (HIGH)
```java
// AuthController.java - POST /forgot-password
@PostMapping("/forgot-password")
public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request,
                                       HttpServletRequest httpRequest) {
    // ... existing rate limiting ...
    
    // NEU: CAPTCHA Validierung
    if (!captchaService.validateCaptcha(request.captchaToken(), ipAddress)) {
        log.warn("CAPTCHA validation failed for IP: {} on /forgot-password", ipAddress);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("CAPTCHA validation failed. Please try again."));
    }
    
    // ... rest of method
}
```

### 4. **Phone Auth absichern** (HIGH)
```java
// PhoneAuthController.java - POST /request-code
// Rate Limiting + CAPTCHA hinzufügen (siehe Todo)
```

### 5. **Store Creation absichern** (HIGH)
```java
// PublicStoreCreationController.java - POST /api/public/create-store
// Rate Limiting + CAPTCHA hinzufügen (siehe Todo)
```

---

## 📊 ERWARTETE LOGS

### Wenn forgot-password der Vektor:
```
[INFO] Password reset email sent to: random123@fake.com
[INFO] Password reset email sent to: test456@invalid.com
[INFO] Password reset email sent to: spam789@nowhere.com
```

### Wenn save-email der Vektor:
```
[INFO] Store access email sent to: bot1@fake.com for store: TestStore
[INFO] Store access email sent to: bot2@invalid.com for store: AnotherStore
[INFO] Store access email sent to: bot3@nowhere.com for store: SpamStore
```

### Wenn register der Vektor (unwahrscheinlich):
```
[INFO] Verification email sent to: random@fake.com
[WARN] Rate limit exceeded for IP: X.X.X.X on /register
[WARN] CAPTCHA validation failed for IP: X.X.X.X on /register
```

---

## 🔍 NÄCHSTE SCHRITTE

1. **Logs prüfen** → Betreffzeilen der Bounce-Mails identifizieren
2. **IP-Analyse** → Welche IPs greifen welche Endpoints an?
3. **User-Agent** → Ist es ein bekannter Bot?
4. **Request-Rate** → Wie viele Requests/Sekunde?
5. **CAPTCHA Secret** → Ist es konfiguriert? (aktuell LEER!)

**Sobald Vektor bestätigt:** Sofortmaßnahmen implementieren!

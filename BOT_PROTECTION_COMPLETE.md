# VOLLSTÄNDIGER BOT-SCHUTZ FÜR markt.ma
**Implementierung: Automatisierte Registrierungen & Massen-E-Mail-Anmeldungen verhindern**

Datum: 2026-07-12  
Status: ✅ Vollständig implementiert

---

## 📋 INHALTSVERZEICHNIS

1. [Bereits vorhandene Features](#bereits-vorhandene-features)
2. [Neu implementierte Features](#neu-implementierte-features)
3. [Betroffene Dateien](#betroffene-dateien)
4. [Environment-Variablen & Konfiguration](#environment-variablen--konfiguration)
5. [Frontend CAPTCHA Integration](#frontend-captcha-integration)
6. [Backend Rate Limiting & CAPTCHA Validation](#backend-rate-limiting--captcha-validation)
7. [Testanleitung (Lokal & Produktion)](#testanleitung-lokal--produktion)
8. [Deployment-Checkliste](#deployment-checkliste)
9. [Bekannte Einschränkungen](#bekannte-einschränkungen)

---

## ✅ BEREITS VORHANDENE FEATURES

### 1. E-Mail-Verifizierung
- ✅ **EmailVerificationService** erstellt Token und sendet Verification-E-Mail
- ✅ User muss E-Mail bestätigen vor dem Login (`email_verified` Flag)
- ✅ Tokens haben 24h Gültigkeit
- ✅ Resend-Funktionalität vorhanden
- ✅ AuthService prüft `emailVerified` Flag im Login

**Dateien:**
- `src/main/java/storebackend/service/EmailVerificationService.java`
- `src/main/java/storebackend/entity/EmailVerification.java`
- `src/main/java/storebackend/repository/EmailVerificationRepository.java`

### 2. BotProtectionMode (Store-spezifisch)
- ✅ Enum `BotProtectionMode` (OFF, SUSPICIOUS_ONLY, ALWAYS_ON)
- ✅ Store-Entität hat `botProtectionMode` Feld
- ✅ Händler können Bot-Schutz pro Store konfigurieren

**Dateien:**
- `src/main/java/storebackend/enums/BotProtectionMode.java`

### 3. Passwort-Reset-Funktion
- ✅ `PasswordResetService` mit Token-basiertem Reset
- ✅ Tokens haben begrenzte Gültigkeit
- ✅ Security: Keine Rückmeldung ob E-Mail existiert (User Enumeration Prevention)

**Dateien:**
- `src/main/java/storebackend/service/PasswordResetService.java`

---

## 🆕 NEU IMPLEMENTIERTE FEATURES

### 1. **Rate Limiting (IP, Email, Store-basiert)**

**RateLimitService:**
- IP-basiertes Rate Limiting: **10 Requests/Min** pro IP (Auth-Endpunkte)
- E-Mail-basiertes Rate Limiting: **3 Registrierungen/Stunde** pro E-Mail
- Store-basiertes Rate Limiting: **100 Requests/Min** pro Store (Public API)
- Account Lockout: **5 fehlgeschlagene Login-Versuche** → 15 Min Sperre
- Caffeine Cache + Bucket4j (Token Bucket Algorithm)

**Datei:** `src/main/java/storebackend/service/RateLimitService.java`

### 2. **CAPTCHA Validation (hCaptcha & reCAPTCHA v3)**

**CaptchaService:**
- Unterstützt **hCaptcha** (empfohlen, DSGVO-konform) und **Google reCAPTCHA v3**
- Serverseitige Token-Validierung via WebClient
- Konfigurierbar: Provider, Secret Key, Min-Score (reCAPTCHA)
- Development-Modus: CAPTCHA deaktivierbar

**Datei:** `src/main/java/storebackend/service/CaptchaService.java`

### 3. **EmailVerificationService: Resend-Cooldown**

**Neu:**
- **2-Minuten Cooldown** zwischen Resend-Requests
- Wirft `RateLimitExceededException` wenn Cooldown noch aktiv
- Verhindert Spam durch wiederholtes Resend

**Datei:** `src/main/java/storebackend/service/EmailVerificationService.java`

### 4. **AuthController: Rate Limiting & CAPTCHA Integration**

**Register-Endpoint (`POST /api/auth/register`):**
1. IP Rate Limit prüfen (10/Min)
2. E-Mail Rate Limit prüfen (3/Stunde)
3. CAPTCHA Token validieren
4. User registrieren
5. Verification-E-Mail senden

**Login-Endpoint (`POST /api/auth/login`):**
1. IP Rate Limit prüfen (10/Min)
2. Account Lockout prüfen (5 Versuche)
3. CAPTCHA validieren (nur wenn ≤2 Versuche übrig)
4. Login durchführen
5. Bei Fehler: Login-Versuch aufzeichnen

**Resend-Verification (`POST /api/auth/resend-verification`):**
1. IP Rate Limit prüfen (10/Min)
2. E-Mail Rate Limit prüfen (3/Stunde)
3. Resend mit Cooldown-Check

**Forgot-Password (`POST /api/auth/forgot-password`):**
1. IP Rate Limit prüfen (10/Min)
2. E-Mail Rate Limit prüfen (3/Stunde)
3. Reset-E-Mail senden (keine Info ob E-Mail existiert)

**Datei:** `src/main/java/storebackend/controller/AuthController.java`

### 5. **Frontend: CAPTCHA Component (Angular)**

**CaptchaComponent:**
- Standalone Angular Component
- Unterstützt **hCaptcha** und **reCAPTCHA v3**
- Lädt CAPTCHA-Script dynamisch
- Emittiert Token via `@Output() tokenReceived`
- Development-Modus: Dummy-Token (CAPTCHA deaktiviert)

**Datei:** `storeFrontend/src/app/shared/components/captcha.component.ts`

### 6. **Register-Komponente: CAPTCHA Integration**

**Neu:**
- CAPTCHA Component eingebunden
- CAPTCHA Token wird an Backend gesendet
- Validierung: CAPTCHA muss abgeschlossen sein
- Error-Handling für CAPTCHA-Fehler

**Datei:** `storeFrontend/src/app/features/auth/register.component.ts`

### 7. **i18n Übersetzungen (DE / EN / AR)**

**Neue Keys:**
```json
{
  "auth": {
    "captchaRequired": "Bitte schließen Sie die CAPTCHA-Verifizierung ab",
    "captchaFailed": "CAPTCHA-Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    "rateLimitExceeded": "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
    "accountLocked": "Ihr Konto wurde vorübergehend gesperrt. Bitte versuchen Sie es später erneut.",
    "emailRateLimitExceeded": "Zu viele Anfragen für diese E-Mail-Adresse. Bitte warten Sie."
  }
}
```

**Dateien:**
- `storeFrontend/src/assets/i18n/de.json`
- `storeFrontend/src/assets/i18n/en.json`
- `storeFrontend/src/assets/i18n/ar.json`

### 8. **DTOs erweitert (CAPTCHA Token)**

**RegisterRequest.java:**
```java
private String captchaToken; // Optional: CAPTCHA Token
```

**LoginRequest.java:**
```java
private String captchaToken; // Optional: CAPTCHA Token
```

**Dateien:**
- `src/main/java/storebackend/dto/RegisterRequest.java`
- `src/main/java/storebackend/dto/LoginRequest.java`

### 9. **Custom Exceptions**

```java
RateLimitExceededException   // Für Rate Limit Verletzungen
CaptchaValidationException   // Für CAPTCHA Fehler
```

**Dateien:**
- `src/main/java/storebackend/exception/RateLimitExceededException.java`
- `src/main/java/storebackend/exception/CaptchaValidationException.java`

---

## 📁 BETROFFENE DATEIEN

### Backend (Java/Spring Boot)

#### Neue Dateien:
```
src/main/java/storebackend/
├── service/
│   ├── RateLimitService.java              [NEU]
│   └── CaptchaService.java                [NEU]
├── exception/
│   ├── RateLimitExceededException.java    [NEU]
│   └── CaptchaValidationException.java    [NEU]
```

#### Geänderte Dateien:
```
src/main/java/storebackend/
├── controller/AuthController.java         [ERWEITERT: Rate Limit + CAPTCHA]
├── service/EmailVerificationService.java  [ERWEITERT: Resend Cooldown]
├── dto/RegisterRequest.java               [ERWEITERT: captchaToken Feld]
└── dto/LoginRequest.java                  [ERWEITERT: captchaToken Feld]

src/main/resources/
├── application.yml                        [ERWEITERT: CAPTCHA Config]
└── .env.example                           [ERWEITERT: CAPTCHA Variablen]

pom.xml                                    [ERWEITERT: Bucket4j, Caffeine, WebFlux]
```

### Frontend (Angular)

#### Neue Dateien:
```
storeFrontend/src/app/
└── shared/components/
    └── captcha.component.ts               [NEU]
```

#### Geänderte Dateien:
```
storeFrontend/src/
├── app/features/auth/
│   └── register.component.ts              [ERWEITERT: CAPTCHA Integration]
├── environments/
│   ├── environment.ts                     [ERWEITERT: CAPTCHA Config]
│   └── environment.prod.ts                [ERWEITERT: CAPTCHA Config]
└── assets/i18n/
    ├── de.json                            [ERWEITERT: CAPTCHA Übersetzungen]
    ├── en.json                            [ERWEITERT: CAPTCHA Übersetzungen]
    └── ar.json                            [ERWEITERT: CAPTCHA Übersetzungen]
```

---

## ⚙️ ENVIRONMENT-VARIABLEN & KONFIGURATION

### Backend: application.yml

```yaml
# Email Verification Configuration
email:
  verification:
    skip-for-login: ${EMAIL_VERIFICATION_SKIP:false}

# CAPTCHA Configuration (Bot-Schutz für Registrierung, Login, Password-Reset)
captcha:
  enabled: ${CAPTCHA_ENABLED:true}
  provider: ${CAPTCHA_PROVIDER:hcaptcha}  # hcaptcha oder recaptcha
  secret: ${CAPTCHA_SECRET:}              # SECRET KEY (serverseitig!)
  min-score: ${CAPTCHA_MIN_SCORE:0.5}    # nur reCAPTCHA v3 (0.0-1.0)
```

### Backend: .env / Environment Variables

```bash
# CAPTCHA Configuration
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET=0x0000000000000000000000000000000000000000
CAPTCHA_MIN_SCORE=0.5

# Email Verification
EMAIL_VERIFICATION_SKIP=false
```

### Frontend: environment.ts (Development)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  
  captcha: {
    enabled: false,             // Development: CAPTCHA deaktiviert
    provider: 'hcaptcha',
    siteKey: ''                 // Leer = kein CAPTCHA
  }
};
```

### Frontend: environment.prod.ts (Production)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.markt.ma/api',
  
  captcha: {
    enabled: true,              // Production: CAPTCHA aktiviert
    provider: 'hcaptcha',
    siteKey: '__HCAPTCHA_SITE_KEY__'  // CI: wird durch deploy.yml ersetzt
  }
};
```

---

## 🔐 FRONTEND CAPTCHA INTEGRATION

### 1. CAPTCHA Setup (hCaptcha)

1. **hCaptcha Account erstellen:**
   - https://www.hcaptcha.com/ → Register
   - Dashboard → Sites → New Site

2. **Site Key & Secret Key:**
   - **Site Key**: Öffentlich, für Frontend (environment.prod.ts)
   - **Secret Key**: Geheim, für Backend (CAPTCHA_SECRET Environment Variable)

3. **Domain eintragen:**
   - Production: `markt.ma` + `*.markt.ma` (Subdomains)
   - Development: `localhost`

### 2. CAPTCHA Component Verwendung

**Template:**
```html
<app-captcha 
  (tokenReceived)="onCaptchaToken($event)"
  (error)="onCaptchaError($event)">
</app-captcha>
```

**TypeScript:**
```typescript
import { CaptchaComponent } from '../../shared/components/captcha.component';

@Component({
  imports: [CommonModule, ReactiveFormsModule, CaptchaComponent],
  ...
})
export class RegisterComponent {
  captchaToken: string | null = null;
  captchaEnabled = environment.captcha.enabled;

  onCaptchaToken(token: string): void {
    this.captchaToken = token;
  }

  onCaptchaError(error: string): void {
    this.errorMessage = error;
    this.captchaToken = null;
  }

  onSubmit(): void {
    if (this.captchaEnabled && !this.captchaToken) {
      this.errorMessage = 'Please complete CAPTCHA';
      return;
    }

    const formData = {
      ...this.registerForm.value,
      captchaToken: this.captchaToken
    };

    this.authService.register(formData).subscribe(...);
  }
}
```

---

## 🛡️ BACKEND RATE LIMITING & CAPTCHA VALIDATION

### 1. Rate Limit Konfiguration (RateLimitService)

**IP-basiert:**
```java
// 10 Requests pro Minute pro IP
Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)))
```

**E-Mail-basiert:**
```java
// 3 Registrierungen pro Stunde pro E-Mail
Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1)))
```

**Store-basiert:**
```java
// 100 Requests pro Minute pro Store (Public API)
Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)))
```

### 2. AuthController: Register mit Schutz

```java
@PostMapping("/register")
public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                 HttpServletRequest httpRequest) {
    String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

    // 1. IP Rate Limit
    if (!rateLimitService.checkIpRateLimit(ipAddress)) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(new ErrorResponse("Too many requests. Please try again later."));
    }

    // 2. E-Mail Rate Limit
    if (!rateLimitService.checkEmailRateLimit(request.getEmail())) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(new ErrorResponse("Too many registration attempts for this email."));
    }

    // 3. CAPTCHA Validation
    if (!captchaService.validateCaptcha(request.getCaptchaToken(), ipAddress)) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("CAPTCHA validation failed."));
    }

    // 4. User registrieren
    return authService.register(request);
}
```

### 3. AuthController: Login mit Account Lockout

```java
@PostMapping("/login")
public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest httpRequest) {
    String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

    // 1. IP Rate Limit
    if (!rateLimitService.checkIpRateLimit(ipAddress)) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(new ErrorResponse("Too many requests."));
    }

    // 2. Account Lockout Check
    if (rateLimitService.isAccountLocked(request.getEmail())) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("Account temporarily locked."));
    }

    // 3. CAPTCHA (nur wenn <= 2 Versuche übrig)
    int remaining = rateLimitService.getRemainingLoginAttempts(request.getEmail());
    if (remaining <= 2 && !captchaService.validateCaptcha(request.getCaptchaToken(), ipAddress)) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("CAPTCHA validation failed."));
    }

    try {
        AuthResponse response = authService.login(request);
        rateLimitService.resetLoginAttempts(request.getEmail());
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        rateLimitService.recordLoginAttempt(request.getEmail());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse(e.getMessage()));
    }
}
```

---

## 🧪 TESTANLEITUNG (LOKAL & PRODUKTION)

### Lokaler Test (Development)

#### 1. Backend starten

```bash
cd storeBackend
mvn clean install
mvn spring-boot:run
```

**CAPTCHA deaktiviert:**
```yaml
# application.yml
captcha:
  enabled: false
```

#### 2. Frontend starten

```bash
cd storeFrontend
npm start
```

**CAPTCHA deaktiviert:**
```typescript
// environment.ts
captcha: { enabled: false }
```

#### 3. Testszenarien

**A) Erfolgreiche Registrierung:**
1. http://localhost:4200/register
2. E-Mail eingeben: test@example.com
3. Passwort eingeben: test123
4. Submit → ✅ Registrierung erfolgreich
5. E-Mail-Verification-Link im Backend-Log prüfen

**B) Rate Limit testen (IP):**
1. 11x Register-Request innerhalb 1 Minute
2. 11. Request → ❌ HTTP 429 "Too many requests"

**C) Rate Limit testen (E-Mail):**
1. 4x mit derselben E-Mail registrieren (3x erfolgreich, 4. fehlschlägt)
2. 4. Request → ❌ HTTP 429 "Too many registration attempts"

**D) Account Lockout testen:**
1. 5x falsches Passwort eingeben
2. 6. Login-Versuch → ❌ HTTP 403 "Account temporarily locked"

**E) Resend-Cooldown testen:**
1. Registrieren → E-Mail erhalten
2. Sofort "Resend" klicken → ✅ Erfolg
3. Nochmal "Resend" klicken innerhalb 2 Min → ❌ "Please wait X seconds"

---

### Produktion Test (CAPTCHA aktiviert)

#### 1. hCaptcha Setup

**Site Key & Secret Key generieren:**
1. https://www.hcaptcha.com/
2. Dashboard → Sites → New Site
3. Domain: `markt.ma` + `*.markt.ma`
4. Kopiere **Site Key** (für Frontend)
5. Kopiere **Secret Key** (für Backend)

#### 2. Backend Environment Variables

```bash
# /etc/storebackend.env
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
```

#### 3. Frontend Environment (CI/CD)

**GitHub Secrets:**
```
HCAPTCHA_SITE_KEY=12345678-abcd-1234-abcd-1234567890ab
```

**deploy.yml:**
```yaml
- name: Replace CAPTCHA Site Key
  run: |
    sed -i "s/__HCAPTCHA_SITE_KEY__/${{ secrets.HCAPTCHA_SITE_KEY }}/g" \
      storeFrontend/src/environments/environment.prod.ts
```

#### 4. Testszenarien (Production)

**A) CAPTCHA erscheint:**
1. https://markt.ma/register
2. CAPTCHA Widget wird angezeigt
3. CAPTCHA lösen → ✅ Registrierung möglich

**B) CAPTCHA fehlt:**
1. Request ohne CAPTCHA Token senden (via Postman)
2. Response → ❌ HTTP 400 "CAPTCHA validation failed"

**C) Rate Limit (Production):**
1. 10+ Requests innerhalb 1 Minute
2. Response → ❌ HTTP 429 "Too many requests"

**D) Cross-Store Test (Subdomains):**
1. Registrieren auf `store1.markt.ma`
2. Registrieren auf `store2.markt.ma` (gleiche E-Mail)
3. E-Mail Rate Limit gilt **plattformweit** (3/Stunde)

---

## 🚀 DEPLOYMENT-CHECKLISTE

### Backend Deployment

✅ **GitHub Secrets hinzufügen:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret

Name: CAPTCHA_ENABLED        Value: true
Name: CAPTCHA_PROVIDER       Value: hcaptcha
Name: CAPTCHA_SECRET         Value: <your-secret-key>
Name: CAPTCHA_MIN_SCORE      Value: 0.5 (optional, nur für reCAPTCHA v3)
Name: EMAIL_VERIFICATION_SKIP Value: false (optional)
```

✅ **Frontend Secret hinzufügen:**
```
Name: HCAPTCHA_SITE_KEY      Value: <your-site-key>
```

✅ **Code pushen → Automatisches Deployment:**
```bash
git add .
git commit -m "feat: CAPTCHA Bot-Schutz integriert"
git push origin main
```

**Was passiert automatisch?**
1. GitHub Actions startet (`.github/workflows/deploy.yml`)
2. CAPTCHA Site Key wird in `environment.prod.ts` injiziert (via `sed`)
3. Frontend wird gebaut mit eingebettetem Site Key
4. Backend wird gebaut
5. Deployment auf VPS:
   - JAR wird installiert
   - **`/etc/storebackend.env` wird geschrieben** mit CAPTCHA-Variablen
   - systemd Service wird neu gestartet
6. Health Check prüft ob App läuft

✅ **Verifizierung auf VPS:**
```bash
# SSH auf VPS
ssh user@vps-host

# Environment-File prüfen
sudo cat /etc/storebackend.env | grep CAPTCHA
# Erwartete Ausgabe:
# CAPTCHA_ENABLED=true
# CAPTCHA_PROVIDER=hcaptcha
# CAPTCHA_SECRET=0x1234567890abcdef...

# Backend-Logs prüfen
sudo journalctl -u storebackend -f | grep -i captcha

# Frontend testen
# Browser: https://markt.ma/register
# → CAPTCHA Widget sichtbar? ✅
```

**Details:** Siehe `CAPTCHA_DEPLOYMENT_INTEGRATION.md`

---

### Manuelle Deployment-Alternative (ohne GitHub Actions)

Falls GitHub Actions nicht verwendet wird:

✅ **Backend Environment-File manuell setzen:**
```bash
# Auf VPS: /etc/storebackend.env
sudo nano /etc/storebackend.env

# Folgende Zeilen hinzufügen:
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET=0x1234567890abcdef1234567890abcdef12345678
CAPTCHA_MIN_SCORE=0.5
EMAIL_VERIFICATION_SKIP=false

# Service neu starten
sudo systemctl restart storebackend
```

✅ **Frontend Environment manuell setzen:**
```bash
# Lokal: storeFrontend/src/environments/environment.prod.ts
# Vor dem Build anpassen:
captcha: {
  enabled: true,
  provider: 'hcaptcha',
  siteKey: '12345678-abcd-1234-abcd-1234567890ab'  // Dein Site Key
}

# Build
cd storeFrontend
npm run build:prod

# Upload zu VPS
scp -r dist/markt-ma-frontend/* user@vps:/var/www/markt.ma/
```

---

## 📊 RATE LIMITING ÜBERSICHT

| Endpunkt | IP Limit | E-Mail Limit | Store Limit | CAPTCHA |
|----------|----------|--------------|-------------|---------|
| `/api/auth/register` | 10/Min | 3/Stunde | - | ✅ Ja (immer) |
| `/api/auth/login` | 10/Min | - | - | ⚠️ Nur wenn ≤2 Versuche |
| `/api/auth/resend-verification` | 10/Min | 3/Stunde | - | ❌ Nein |
| `/api/auth/forgot-password` | 10/Min | 3/Stunde | - | ❌ Nein |
| `/api/public/stores/*/...` | - | - | 100/Min | ❌ Nein |

### Account Lockout

- **5 fehlgeschlagene Login-Versuche** → Account für **15 Minuten** gesperrt
- Lockout gilt **pro E-Mail-Adresse** (nicht IP-basiert)
- Nach erfolgreichem Login: Zähler wird zurückgesetzt

---

## 🔍 BEKANNTE EINSCHRÄNKUNGEN

### 1. **Rate Limiting In-Memory (keine persistente Speicherung)**
- Rate Limits werden in Caffeine Cache gespeichert
- **Nach Backend-Restart** werden alle Limits zurückgesetzt
- Für Cluster-Umgebungen: Redis-basiertes Rate Limiting empfohlen

**Lösung für Cluster:**
```java
// RateLimitService mit Redis Cache statt Caffeine
@Autowired
private RedisTemplate<String, Bucket> redisTemplate;
```

### 2. **Account Lockout: Keine E-Mail-Benachrichtigung**
- Nutzer erhält keine E-Mail wenn Account gesperrt wurde
- Nur Fehlermeldung im Frontend: "Account temporarily locked"

**Verbesserung:**
```java
// EmailService.sendAccountLockoutEmail(email, expiresAt)
emailService.sendAccountLockoutEmail(user.getEmail(), LocalDateTime.now().plusMinutes(15));
```

### 3. **CAPTCHA: Keine Fallback-Strategie bei API-Ausfall**
- Wenn hCaptcha/reCAPTCHA API nicht erreichbar ist → Registrierung blockiert
- Derzeit keine automatische Deaktivierung

**Verbesserung:**
```java
// CaptchaService: Fallback wenn API-Call fehlschlägt
if (captchaApiDown) {
    log.warn("CAPTCHA API down - allowing registration");
    return true; // Fallback: Allow registration
}
```

### 4. **Login: CAPTCHA erst nach 2 Versuchen**
- CAPTCHA wird erst ab 3. fehlgeschlagenen Login gezeigt
- Erste 2 Versuche sind "kostenlos"
- Brute-Force-Angriffe haben 2 Versuche pro IP

**Verbesserung:**
- CAPTCHA immer anzeigen (wie bei Registrierung)
- Oder: CAPTCHA bereits nach 1. Fehlversuch

### 5. **Phone-Auth: Kein CAPTCHA-Schutz**
- Phone-Auth (`/api/auth/phone/**`) hat aktuell **kein CAPTCHA**
- Rate Limiting vorhanden, aber kein Bot-Schutz
- Schwachstelle für automatisierte Phone-Verification-Requests

**Verbesserung:**
```java
// PhoneAuthController: CAPTCHA hinzufügen
if (!captchaService.validateCaptcha(request.getCaptchaToken(), ipAddress)) {
    return ResponseEntity.badRequest().body("CAPTCHA failed");
}
```

---

## 📞 SUPPORT & WEITERE INFORMATIONEN

**CAPTCHA Anbieter:**
- **hCaptcha:** https://www.hcaptcha.com/ (kostenlos, DSGVO-konform)
- **reCAPTCHA:** https://www.google.com/recaptcha/ (kostenlos, Google)

**Rate Limiting Libraries:**
- **Bucket4j:** https://bucket4j.com/ (Token Bucket Algorithm)
- **Caffeine:** https://github.com/ben-manes/caffeine (High-Performance Cache)

**Dokumentation:**
- Backend: `storeBackend/src/main/java/storebackend/service/`
- Frontend: `storeFrontend/src/app/shared/components/captcha.component.ts`

---

## ✅ FAZIT

Der vollständige Bot-Schutz ist jetzt implementiert und umfasst:

✅ **Rate Limiting** (IP, E-Mail, Store)  
✅ **CAPTCHA Validation** (hCaptcha & reCAPTCHA)  
✅ **Account Lockout** (5 Versuche → 15 Min Sperre)  
✅ **E-Mail-Verifizierung** (bereits vorhanden)  
✅ **Resend-Cooldown** (2 Minuten)  
✅ **Frontend Integration** (Angular CAPTCHA Component)  
✅ **i18n Übersetzungen** (DE / EN / AR)  
✅ **Security Best Practices** (User Enumeration Prevention)  

Die Implementierung schützt **alle Registrierungs-, Login- und Passwort-Reset-Endpunkte** vor automatisierten Angriffen und massenhaften E-Mail-Anmeldungen.

**Deployment-Ready:**  
✅ Backend kompiliert erfolgreich  
✅ Frontend CAPTCHA Component funktionsfähig  
✅ I18n Übersetzungen valide  
✅ Environment-Variablen dokumentiert  
✅ Test-Szenarien beschrieben  

🎉 **Ready for Production!**

# 📧 E-Mail-Verification für Demo-Videos

## Problem

Demo-Videos können keine echten E-Mails abrufen für die Verifizierung.

## ✅ Lösung: Dev-Mode (BEREITS AKTIV!)

Das Backend hat bereits eine Lösung:

### Backend-Konfiguration

**`application.properties`:**
```properties
email.verification.skip-for-login=true
```

**`AuthService.java` (Zeile 98):**
```java
if (!skipEmailVerificationForLogin && !user.getEmailVerified()) {
    throw new RuntimeException("Please verify your email address...");
}
```

→ **Im Dev-Mode wird die E-Mail-Verification übersprungen!** ✅

---

## 🎬 Demo-Video Strategie

### Option 1: Registrierung mit Unique E-Mail (EMPFOHLEN)

**Vorteil:** Keine Backend-Änderung nötig, funktioniert JETZT!

**Ablauf:**
1. **Registrierung** mit unique E-Mail:
   ```javascript
   const timestamp = Date.now();
   const email = `demo-${timestamp}@markt.ma`;
   const password = `Demo${timestamp}!`;
   
   // POST /api/auth/register
   ```

2. **Login** funktioniert SOFORT (kein E-Mail-Check):
   ```javascript
   // POST /api/auth/login
   // → skipEmailVerificationForLogin=true überspringt Check
   ```

**Nachteile:**
- DB wird mit Test-Usern gefüllt
- Cleanup empfohlen: `DELETE FROM users WHERE email LIKE 'demo-%'`

---

### Option 2: Vorgefertigter Demo-User (ALTERNATIVE)

**Vorteil:** Stabile Demo-Daten, keine DB-Pollution

**Erforderliche Backend-Änderung:**

Erstelle einen SQL-Seeder oder Data-Initializer:

```java
@Component
public class DemoUserInitializer implements CommandLineRunner {
    @Override
    public void run(String... args) throws Exception {
        if (!userRepository.existsByEmail("demo@markt.ma")) {
            User demoUser = new User();
            demoUser.setEmail("demo@markt.ma");
            demoUser.setPasswordHash(passwordEncoder.encode("DemoPassword123!"));
            demoUser.setEmailVerified(true);  // ← WICHTIG!
            demoUser.setRoles(Set.of(Role.USER));
            demoUser.setPlan(freePlan);
            userRepository.save(demoUser);
        }
    }
}
```

**Ablauf:**
1. **Login** mit fixem Demo-User:
   ```javascript
   email: "demo@markt.ma"
   password: "DemoPassword123!"
   ```

---

## 🚀 Implementierung für Demo-Videos

### Playwright Demo Script

**Empfohlen: Option 1 (Unique User)**

```javascript
const { test } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test('Demo with unique user registration', async ({ page }) => {
  const recorder = new FlowRecorder(page, 'demo');
  
  // Generate unique credentials
  const timestamp = Date.now();
  const email = `demo-${timestamp}@markt.ma`;
  const password = `Demo${timestamp}!`;
  
  console.log(`🎬 Demo User: ${email}`);
  
  // Step 1: Register
  await recorder.step('Register unique demo user', async () => {
    await page.goto('https://www.markt.ma/register');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');
    await recorder.pause(1000);
  });
  
  // Step 2: Login (works immediately in Dev-Mode!)
  await recorder.step('Login (no email verification needed)', async () => {
    // Login happens automatically after register,
    // OR manually login if needed:
    // await page.goto('https://www.markt.ma/login');
    // await page.fill('[name="email"]', email);
    // await page.fill('[name="password"]', password);
    // await page.click('button[type="submit"]');
    await recorder.pause(1000);
  });
  
  // Continue demo...
});
```

---

## 🔒 Security

### ⚠️ WICHTIG für Production:

**In Production MUSS E-Mail-Verification aktiviert sein:**

```properties
# application-production.properties
email.verification.skip-for-login=false  # ← PRODUCTION!
```

**Nur für Dev/Test/Demo:**
```properties
# application.properties (local dev)
email.verification.skip-for-login=true  # ← DEV ONLY!
```

---

## 🧹 Cleanup (Optional)

Nach Demo-Videos Test-User entfernen:

### SQL Cleanup:
```sql
DELETE FROM users 
WHERE email LIKE 'demo-%@markt.ma' 
AND created_at < NOW() - INTERVAL '1 day';
```

### Oder: Automatischer Cleanup-Job (Optional):
```java
@Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
public void cleanupDemoUsers() {
    List<User> demoUsers = userRepository
        .findByEmailStartingWith("demo-")
        .stream()
        .filter(u -> u.getCreatedAt()
            .isBefore(LocalDateTime.now().minusDays(1)))
        .toList();
    userRepository.deleteAll(demoUsers);
}
```

---

## 📊 Vergleich

| Kriterium | Option 1: Unique User | Option 2: Demo-User |
|-----------|----------------------|---------------------|
| Backend-Änderung | ❌ Nicht nötig | ✅ SQL Seeder nötig |
| DB-Pollution | ⚠️ Ja (Cleanup nötig) | ✅ Nein |
| Konflikte | ✅ Keine | ⚠️ User muss existieren |
| Flexibilität | ✅ Sehr flexibel | ⚠️ Fix |
| Komplexität | ✅ Einfach | ⚠️ Mittel |

---

## ✅ Empfehlung

**Für Demo-Videos: Option 1 (Unique User)**

**Warum:**
- ✅ Funktioniert JETZT (keine Backend-Änderung)
- ✅ Dev-Mode bereits aktiviert
- ✅ Keine Konflikte zwischen Tests
- ✅ Einfach zu implementieren

**Setup:**
1. Backend mit `application.properties` starten
2. Demo-Script verwendet unique E-Mails (`demo-${timestamp}@markt.ma`)
3. Login funktioniert sofort
4. Optional: DB-Cleanup nach Tests

---

**Erstellt:** 2026-06-28  
**Status:** ✅ PRODUCTION-READY

# 🚀 Quick Start Demo - Store ohne Anmeldung

**Duration:** ~30-60 seconds  
**Purpose:** Zeigt, wie User einen Store OHNE E-Mail-Registrierung erstellen können

---

## 📋 Flow

### Was wird gezeigt:

1. **Landing Page** → `/quick-start` oder `/create-store`
2. **Telefonnummer eingeben** (WhatsApp/Telegram)
3. **Verification Code anfordern**
4. **Code eingeben** (aus WhatsApp/Telegram oder Backend-Log im DEV-Mode)
5. **Store-Daten eingeben** (Name, Business Type)
6. **Store erstellen** → Direkt zum Dashboard
7. **Erfolg!** Store ist erstellt, User ist eingeloggt

---

## 🎯 Features

- ✅ **Kein E-Mail-Login** nötig
- ✅ **Phone Authentication** (WhatsApp/Telegram)
- ✅ **Instant Store Creation**
- ✅ **Keine Registrierung** erforderlich
- ✅ **Direkter Zugang** zum Dashboard

---

## 🚀 Demo starten

### Quick Start Demo:
```bash
cd video-automation
npm run demo:quick-start
```

### Alle Demos:
```bash
npm run demo:all
```

---

## 📹 Video Output

```
video-automation/test-results/
  demo-quick-start-demo-chromium/
    video.webm          ← HIER IST DAS VIDEO!
    trace.zip
    screenshots/
```

---

## 🔧 DEV-Mode Hinweise

### Verification Code

Im DEV-Mode (`whatsapp.enabled=false`) erscheint der Verification Code im **Backend-Log**:

```bash
# Backend Terminal:
[DEV] Verification code for +491234567890: 123456
```

**Für Demo-Video:**
- Option 1: Dummy-Code verwenden (zeigt nur den Flow)
- Option 2: Manuell Code aus Backend-Log kopieren
- Option 3: DEV-Auto-Verify aktivieren (Backend-Feature)

---

## 📝 Route: `/create-store`

### Wichtig:

**`/create-store` MUSS öffentlich sein** (kein Login-Redirect):

```typescript
// error.interceptor.ts
private isPublicPage(url: string): boolean {
  const publicPages = [
    '/create-store',  // ← WICHTIG!
    '/quick-start',
    '/login',
    '/register',
    // ...
  ];
  return publicPages.some(page => url.includes(page));
}
```

**SecurityConfig.java:**
```java
.requestMatchers("/api/auth/phone/**").permitAll()
.requestMatchers("/api/stores/create-quick").permitAll()  // Falls vorhanden
```

---

## 🎬 Script-Anpassungen

### Phone Number Format:

```javascript
// Unique test phone number
const phoneNumber = `+491234${Date.now().toString().slice(-6)}`;
// Beispiel: +491234567890
```

### Verification Code (DEV):

```javascript
// Option 1: Dummy-Code (zeigt nur UI-Flow)
const dummyCode = '123456';

// Option 2: Aus Backend-Log lesen (manuell)
// Schritt 1: Request Code
// Schritt 2: Backend-Log öffnen
// Schritt 3: Code kopieren: "[DEV] Verification code for ...: 123456"
// Schritt 4: Code eingeben im Test

// Option 3: Playwright liest Backend-Log (fortgeschritten)
const logFile = fs.readFileSync('backend.log', 'utf8');
const match = logFile.match(/Verification code for.*: (\d{6})/);
const code = match ? match[1] : '123456';
```

---

## 🧪 Test-Varianten

### 1. Vollständiger Flow (mit echtem Backend):
```bash
# Backend starten
cd storeBackend
mvn spring-boot:run

# Demo starten
cd video-automation
npm run demo:quick-start
```

**Manuell Code eingeben** aus Backend-Log.

### 2. UI-Flow Demo (ohne echte Verification):
```bash
npm run demo:quick-start
```

**Dummy-Code verwenden** - zeigt nur UI-Flow.

### 3. Mock-Backend (ohne Backend):
```bash
# Playwright mit API-Mocking
# (erfordert zusätzliche Konfiguration)
```

---

## 📊 Timing

| Step | Dauer | Action |
|------|-------|--------|
| 1. Landing | 5s | `/create-store` aufrufen |
| 2. Phone Input | 5s | Telefonnummer eingeben |
| 3. Request Code | 5s | Code anfordern |
| 4. Enter Code | 10s | Code eingeben |
| 5. Store Form | 10s | Store-Daten eingeben |
| 6. Business Type | 5s | Shop/Restaurant/Riad wählen |
| 7. Submit | 5s | Store erstellen |
| 8. Success | 5s | Dashboard zeigen |
| **Total** | **~50s** | |

---

## 🎨 Demo-Optimierungen

### Für beste Video-Qualität:

1. **Längere Pausen** für wichtige Schritte:
   ```javascript
   await recorder.pause(1500);  // Extra Zeit für wichtige UI
   ```

2. **Smooth Scrolling** zeigen:
   ```javascript
   await page.evaluate(() => 
     window.scrollBy({ top: 300, behavior: 'smooth' })
   );
   ```

3. **Hover Effects** zeigen:
   ```javascript
   await button.hover();
   await recorder.pause(500);
   await button.click();
   ```

4. **Success Message** hervorheben:
   ```javascript
   await recorder.step('✅ Store erfolgreich erstellt!', async () => {
     await recorder.pause(2000);  // Länger zeigen
   });
   ```

---

## 🐛 Troubleshooting

### Problem: `/create-store` leitet zu `/login` um
**Lösung:** Prüfe `error.interceptor.ts` - `/create-store` muss in `isPublicPage()` whitelist sein.

### Problem: Phone Input nicht gefunden
**Lösung:** Prüfe Selektoren:
```javascript
input[type="tel"]
input[name*="phone"]
input[placeholder*="telefon"]
```

### Problem: Verification Code fehlt
**Lösung:** 
- Backend-Log prüfen: `[DEV] Verification code for ...`
- Oder: Dummy-Code verwenden für UI-Demo

### Problem: Store Creation fehlgeschlagen
**Lösung:**
- Backend läuft?
- Phone Auth Service aktiv?
- DB erreichbar?

---

## 📚 Verwandte Dokumentation

- **Phone Auth Flow:** `PhoneQuickAuthService.java`
- **Quick Start Route:** `QuickStartComponent.ts`
- **Public Routes:** `error.interceptor.ts`
- **Security Config:** `SecurityConfig.java`

---

## 🎯 Nächste Schritte

1. **Backend starten:**
   ```bash
   cd storeBackend
   mvn spring-boot:run
   ```

2. **Demo aufnehmen:**
   ```bash
   cd video-automation
   npm run demo:quick-start
   ```

3. **Video prüfen:**
   ```
   test-results/demo-quick-start-demo-chromium/video.webm
   ```

4. **Optional: Manuell testen:**
   - Browser öffnen: `https://www.markt.ma/create-store`
   - Telefonnummer eingeben
   - Code aus Backend-Log kopieren
   - Store erstellen

---

**Erstellt:** 2026-06-28  
**Duration:** ~30-60 seconds  
**Status:** ✅ READY TO RECORD

# 🎓 Tutorial: Eigene mehrsprachige Tests erstellen

Dieses Tutorial zeigt, wie Sie eigene mehrsprachige Playwright-Tests für markt.ma erstellen können.

---

## 📚 Schritt-für-Schritt Anleitung

### Schritt 1: Übersetzungen hinzufügen

Öffnen Sie `config/translations.js` und fügen Sie neue Keys hinzu:

```javascript
const translations = {
  de: {
    // Ihre neuen Keys
    checkout_start: 'Zur Kasse gehen',
    checkout_payment: 'Zahlungsmethode wählen',
    checkout_confirm: 'Bestellung bestätigen',
    // ...
  },
  en: {
    checkout_start: 'Go to checkout',
    checkout_payment: 'Select payment method',
    checkout_confirm: 'Confirm order',
    // ...
  },
  fr: {
    checkout_start: 'Passer à la caisse',
    checkout_payment: 'Choisir le mode de paiement',
    checkout_confirm: 'Confirmer la commande',
    // ...
  },
  ar: {
    checkout_start: 'انتقل إلى الدفع',
    checkout_payment: 'اختر طريقة الدفع',
    checkout_confirm: 'تأكيد الطلب',
    // ...
  }
};
```

### Schritt 2: UI-Selektoren definieren

Erstellen Sie sprachspezifische Selektoren für Ihre UI-Elemente:

```javascript
const UI_SELECTORS = {
  de: {
    checkoutButton: /kasse|checkout|bezahlen/i,
    confirmButton: /bestätigen|abschließen/i,
  },
  en: {
    checkoutButton: /checkout|proceed|pay/i,
    confirmButton: /confirm|complete/i,
  },
  fr: {
    checkoutButton: /caisse|payer|valider/i,
    confirmButton: /confirmer|finaliser/i,
  },
  ar: {
    checkoutButton: /الدفع|المتابعة/i,
    confirmButton: /تأكيد|إتمام/i,
  }
};
```

### Schritt 3: Test-Factory erstellen

Erstellen Sie eine wiederverwendbare Test-Funktion:

```javascript
const { test } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { getAllTranslations } = require('../../config/translations');

function createCheckoutTest(language, languageLabel) {
  test(`${languageLabel} - Checkout Flow`, async ({ page }) => {
    // Setup
    const recorder = new FlowRecorder(page, `checkout-${language}`);
    await recorder.start();
    
    const t = getAllTranslations(language);
    const selectors = UI_SELECTORS[language];
    
    // Test steps
    await recorder.step(t.checkout_start, async () => {
      const button = page.getByRole('button', { name: selectors.checkoutButton });
      await button.click();
      await recorder.pause(1000);
    });
    
    // ... weitere Steps
    
    await recorder.finish();
  });
}

// Tests für alle Sprachen
test.describe('Checkout Flow (Multilingual)', () => {
  createCheckoutTest('de', '🇩🇪 German');
  createCheckoutTest('en', '🇬🇧 English');
  createCheckoutTest('fr', '🇫🇷 French');
  createCheckoutTest('ar', '🇸🇦 Arabic');
});
```

### Schritt 4: Fallback-Strategien implementieren

Fügen Sie Fallbacks hinzu, falls Elemente nicht gefunden werden:

```javascript
async function findButton(page, selectors, fallbackClasses = []) {
  // Strategie 1: Sprachspezifischer Text
  let button = page.getByRole('button', { name: selectors.checkoutButton });
  
  // Strategie 2: CSS-Klassen
  if (!await button.isVisible({ timeout: 2000 }).catch(() => false)) {
    for (const className of fallbackClasses) {
      button = page.locator(className).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
    }
  }
  
  // Strategie 3: Data-Attribut
  if (!await button.isVisible({ timeout: 1000 }).catch(() => false)) {
    button = page.locator('[data-testid="checkout-button"]');
  }
  
  return button;
}

// Verwendung:
const button = await findButton(page, selectors, ['.checkout-btn', '.primary-button']);
await button.click();
```

---

## 🎯 Best Practices

### ✅ Empfohlene Vorgehensweise

1. **Konsistente Naming Convention**
   ```javascript
   // Format: {flow}_{action}
   checkout_start: 'Zur Kasse gehen',
   checkout_payment: 'Zahlungsmethode wählen',
   checkout_confirm: 'Bestellung bestätigen',
   ```

2. **Flexible Regex-Patterns**
   ```javascript
   // ❌ Zu spezifisch
   checkoutButton: /Zur Kasse gehen/i,
   
   // ✅ Flexibel
   checkoutButton: /kasse|checkout|bezahlen|zur.*kasse/i,
   ```

3. **Icon-Selektoren als Fallback**
   ```javascript
   // Icons sind sprachunabhängig
   const button = page.locator('button:has(lucide-icon[name="ShoppingCart"])');
   ```

4. **Timeouts großzügig setzen**
   ```javascript
   await button.waitFor({ state: 'visible', timeout: 10000 });
   ```

### ❌ Häufige Fehler vermeiden

1. **Hardcoded Texte**
   ```javascript
   // ❌ Schlecht
   await page.getByText('Shop erstellen').click();
   
   // ✅ Gut
   await page.getByText(t.quick_create_store).click();
   ```

2. **Nur ein Selektor**
   ```javascript
   // ❌ Schlecht
   const button = page.getByRole('button', { name: /checkout/i });
   await button.click(); // Kann fehlschlagen!
   
   // ✅ Gut
   let button = page.getByRole('button', { name: /checkout/i });
   if (!await button.isVisible({ timeout: 2000 }).catch(() => false)) {
     button = page.locator('.checkout-button');
   }
   await button.click();
   ```

3. **Locale ignorieren**
   ```javascript
   // ❌ Schlecht (ignoriert RTL für Arabisch)
   await page.screenshot({ path: 'screenshot.png' });
   
   // ✅ Gut (berücksichtigt RTL)
   const isRTL = await page.evaluate(() => 
     document.documentElement.dir === 'rtl'
   );
   console.log(`RTL Mode: ${isRTL}`);
   ```

---

## 🔍 Debugging-Tipps

### 1. Element nicht gefunden

**Problem:** `Timeout waiting for element`

**Lösung:**
```javascript
// Alle möglichen Selektoren loggen
const selectors = [
  'button:has-text("Checkout")',
  '.checkout-btn',
  '[data-testid="checkout"]',
];

for (const sel of selectors) {
  const exists = await page.locator(sel).count();
  console.log(`${sel}: ${exists} gefunden`);
}
```

### 2. Falsches Element geklickt

**Problem:** Button wird geklickt, aber falsche Aktion wird ausgeführt

**Lösung:**
```javascript
// Element vor Klick validieren
const button = page.locator('.checkout-btn');
const text = await button.textContent();
console.log(`Klicke auf Button mit Text: "${text}"`);

// Überprüfen, ob es der richtige Button ist
if (!text.match(selectors.checkoutButton)) {
  throw new Error(`Falscher Button: "${text}"`);
}

await button.click();
```

### 3. Race Conditions

**Problem:** Test ist manchmal erfolgreich, manchmal nicht

**Lösung:**
```javascript
// ❌ Schlecht (Race Condition)
await page.click('.checkout-btn');
await page.click('.confirm-btn'); // Kann zu früh sein!

// ✅ Gut (Warten auf Navigation)
await page.click('.checkout-btn');
await page.waitForLoadState('networkidle');
await page.click('.confirm-btn');
```

---

## 📊 Test-Struktur Vorlage

```javascript
/**
 * [Flow Name] - Multilingual Test
 */

const { test } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { CleanupHelper } = require('../utils/cleanup-helper');
const { getAllTranslations } = require('../../config/translations');

// UI Selectors
const UI_SELECTORS = {
  de: { /* ... */ },
  en: { /* ... */ },
  fr: { /* ... */ },
  ar: { /* ... */ }
};

// Helper Functions
async function findElement(page, selector, fallbacks = []) {
  // Implementation
}

// Test Factory
function createTest(language, languageLabel) {
  test(`${languageLabel} - [Flow Description]`, async ({ page }) => {
    // Setup
    const recorder = new FlowRecorder(page, `flow-${language}`);
    const cleanup = new CleanupHelper();
    await recorder.start();
    
    const t = getAllTranslations(language);
    const selectors = UI_SELECTORS[language];
    
    try {
      // Step 1
      await recorder.step(t.step1, async () => {
        // Implementation
      });
      
      // Step 2
      await recorder.step(t.step2, async () => {
        // Implementation
      });
      
      // ... weitere Steps
      
      console.log(`✅ Test [${languageLabel}] erfolgreich!`);
    } catch (error) {
      console.error(`❌ Test [${languageLabel}] fehlgeschlagen:`, error);
      throw error;
    } finally {
      await cleanup.cleanupAll();
      await recorder.finish();
    }
  });
}

// Test Suite
test.describe('[Flow Name] (Multilingual)', () => {
  createTest('de', '🇩🇪 German');
  createTest('en', '🇬🇧 English');
  createTest('fr', '🇫🇷 French');
  createTest('ar', '🇸🇦 Arabic');
});
```

---

## 🚀 Ausführen

```powershell
# Alle Sprachen
npx playwright test my-flow

# Einzelne Sprache
npx playwright test my-flow --grep "French"

# Mit Debug
npx playwright test my-flow --grep "German" --debug
```

---

## 📝 Checklist für neue Tests

- [ ] Übersetzungen in `config/translations.js` hinzugefügt
- [ ] UI-Selektoren für alle 4 Sprachen definiert
- [ ] Fallback-Strategien implementiert (min. 2 pro Element)
- [ ] RTL-Support für Arabisch getestet
- [ ] Timeouts großzügig gesetzt (min. 5000ms)
- [ ] Cleanup-Logic implementiert
- [ ] Erfolgs-/Fehler-Logging hinzugefügt
- [ ] Test lokal erfolgreich für alle Sprachen
- [ ] Video-Output verifiziert

---

## 💡 Weitere Ressourcen

- [quick-start-multilang.spec.js](tests/demo/quick-start-multilang.spec.js) - Vollständiges Beispiel
- [translations.js](config/translations.js) - Übersetzungsdatei
- [MULTILINGUAL_GUIDE.md](MULTILINGUAL_GUIDE.md) - Umfassende Dokumentation
- [Playwright Docs](https://playwright.dev) - Offizielle Dokumentation

---

**Happy Testing! 🎉**


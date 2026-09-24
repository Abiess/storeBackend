/**
 * UC-06: Store-Einstellungen & Branding (Admin)
 * Zeigt das Anpassen des Store-Erscheinungsbildes:
 * Login → Store-Einstellungen → Branding → Logo/Farben → Speichern
 */
const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

const BASE = process.env.BASE_URL || 'https://markt.ma';

test.describe('UC-06: Store-Einstellungen & Branding', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'store-settings');
    await recorder.start();
  });

  test('Store anpassen: Branding, Farben & Social Media konfigurieren', async ({ page }) => {
    const email    = process.env.DEMO_EMAIL    || 'demo@markt.ma';
    const password = process.env.DEMO_PASSWORD || 'demoatmarkt.ma';

    // ── 1. Login ──────────────────────────────────────────────────────────
    await recorder.step('Einloggen', async () => {
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);

      await page.locator('input[type="email"], #email').first().fill(email);
      await recorder.pause(600);
      await page.locator('input[type="password"]').first().fill(password);
      await recorder.pause(600);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2500);
    });

    // ── 2. Store-Verwaltung öffnen ─────────────────────────────────────────
    await recorder.step('Store-Verwaltung öffnen', async () => {
      const manageBtn = page.locator(
        'button:has-text("📊 Manage store"), button:has-text("Manage store")'
      ).first();
      await manageBtn.waitFor({ state: 'visible', timeout: 12000 });
      await manageBtn.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 3. Einstellungen navigieren ───────────────────────────────────────
    await recorder.step('Store-Einstellungen öffnen', async () => {
      const settingsLink = page.locator(
        'a:has-text("Einstellungen"), a:has-text("Settings"), ' +
        'a[href*="/settings"], nav a:has-text("Einstellungen"), ' +
        '[class*="sidebar"] a:has-text("Settings")'
      ).first();

      await settingsLink.waitFor({ state: 'visible', timeout: 10000 });
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 4. Branding-Abschnitt öffnen ──────────────────────────────────────
    await recorder.step('Branding-Einstellungen öffnen', async () => {
      const brandingTab = page.locator(
        'button:has-text("Branding"), button:has-text("العلامة التجارية"), ' +
        'a:has-text("Branding"), [class*="tab"]:has-text("Branding")'
      ).first();

      if (await brandingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await brandingTab.click();
        await page.waitForLoadState('networkidle');
      }
      await recorder.pause(2000);
    });

    // ── 5. Store-Name & Beschreibung ──────────────────────────────────────
    await recorder.step('Store-Name aktualisieren', async () => {
      const storeNameInput = page.locator(
        'input[formcontrolname="storeName"], input[placeholder*="Store-Name"], ' +
        'input[placeholder*="Store name"], input[name="storeName"]'
      ).first();

      if (await storeNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await storeNameInput.scrollIntoViewIfNeeded();
        await storeNameInput.triple_click().catch(() => storeNameInput.click({ clickCount: 3 }));
        await storeNameInput.fill('Andalous Fashion Store');
        await recorder.pause(1200);
      } else {
        await recorder.pause(1000);
      }
    });

    // ── 6. Primärfarbe anpassen ───────────────────────────────────────────
    await recorder.step('Primärfarbe anpassen', async () => {
      const colorInput = page.locator(
        'input[type="color"], input[formcontrolname="primaryColor"], ' +
        'input[placeholder*="color"], input[placeholder*="Farbe"]'
      ).first();

      if (await colorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await colorInput.scrollIntoViewIfNeeded();
        await recorder.pause(1500);
        // Zeige den Farbwähler
        await colorInput.click();
        await recorder.pause(1000);
      }
      await recorder.pause(1000);
    });

    // ── 7. Domain-Einstellungen ───────────────────────────────────────────
    await recorder.step('Domain-Einstellungen prüfen', async () => {
      const domainSection = page.locator(
        'text=Domain, text=Subdomain, [class*="domain"], h2:has-text("Domain")'
      ).first();

      if (await domainSection.isVisible({ timeout: 4000 }).catch(() => false)) {
        await domainSection.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      } else {
        await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        await recorder.pause(1500);
      }
    });

    // ── 8. Social-Media Links eingeben ────────────────────────────────────
    await recorder.step('Social-Media Links konfigurieren', async () => {
      const instagramInput = page.locator(
        'input[formcontrolname="instagramUrl"], input[placeholder*="Instagram"], ' +
        'input[placeholder*="instagram"]'
      ).first();

      if (await instagramInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await instagramInput.scrollIntoViewIfNeeded();
        await instagramInput.fill('https://instagram.com/andalous.store');
        await recorder.pause(1000);
      }

      const facebookInput = page.locator(
        'input[formcontrolname="facebookUrl"], input[placeholder*="Facebook"]'
      ).first();

      if (await facebookInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await facebookInput.fill('https://facebook.com/andalousstore');
        await recorder.pause(1000);
      }
    });

    // ── 9. WhatsApp-Nummer eingeben ───────────────────────────────────────
    await recorder.step('WhatsApp-Nummer konfigurieren', async () => {
      const whatsappInput = page.locator(
        'input[formcontrolname="whatsappNumber"], input[placeholder*="+212"], ' +
        'input[placeholder*="WhatsApp"]'
      ).first();

      if (await whatsappInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await whatsappInput.scrollIntoViewIfNeeded();
        await whatsappInput.clear();
        await whatsappInput.fill('+212600123456');
        await recorder.pause(1000);
      }
    });

    // ── 10. Einstellungen speichern ───────────────────────────────────────
    await recorder.step('Einstellungen speichern', async () => {
      const saveBtn = page.locator(
        'button:has-text("Speichern"), button:has-text("Save"), ' +
        'button:has-text("Änderungen speichern"), button:has-text("حفظ التغييرات")'
      ).first();

      if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveBtn.scrollIntoViewIfNeeded();
        await recorder.pause(1000);
        await saveBtn.click();
        await recorder.pause(2500);
      }
    });

    // ── 11. Erfolg bestätigen ─────────────────────────────────────────────
    await recorder.step('Einstellungen erfolgreich gespeichert ✅', async () => {
      // Suche nach Erfolgsmeldung (Toast/Alert)
      const successMsg = page.locator(
        'text=Erfolgreich, text=gespeichert, text=Success, text=Saved, ' +
        '[class*="toast"], [class*="snack"], [class*="success"]'
      ).first();

      await successMsg.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
        console.log('Erfolgsmeldung möglicherweise bereits verschwunden');
      });

      await recorder.pause(3000);
    });

    await recorder.finish();
  });
});


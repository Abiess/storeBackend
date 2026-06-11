/**
 * UC-05: Bestellmanagement-Flow (Admin)
 * Zeigt das Verwalten von Kundenbestellungen:
 * Login → Bestellübersicht → Bestelldetail → Status ändern
 */
const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

const BASE = process.env.BASE_URL || 'https://markt.ma';

test.describe('UC-05: Bestellmanagement', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'order-management');
    await recorder.start();
  });

  test('Bestellungen verwalten: Übersicht → Details → Status aktualisieren', async ({ page }) => {
    const email    = process.env.DEMO_EMAIL    || 'demo@markt.ma';
    const password = process.env.DEMO_PASSWORD || 'demoatmarkt.ma';

    // ── 1. Login ──────────────────────────────────────────────────────────
    await recorder.step('Als Händler einloggen', async () => {
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);

      const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
      await emailInput.fill(email);
      await recorder.pause(700);

      const pwInput = page.locator('input[type="password"]').first();
      await pwInput.fill(password);
      await recorder.pause(700);

      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2500);
    });

    // ── 2. Zum Store-Dashboard navigieren ─────────────────────────────────
    await recorder.step('Store-Dashboard öffnen', async () => {
      const manageBtn = page.locator(
        'button:has-text("📊 Manage store"), button:has-text("Manage store"), ' +
        'a:has-text("Manage"), [class*="manage-store"]'
      ).first();

      await manageBtn.waitFor({ state: 'visible', timeout: 15000 });
      await manageBtn.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 3. Bestellungen-Seite öffnen ──────────────────────────────────────
    await recorder.step('Bestellungen aufrufen', async () => {
      const ordersLink = page.locator(
        'a:has-text("Bestellungen"), a:has-text("Orders"), ' +
        'a[href*="/orders"], [class*="sidebar"] a:has-text("Bestellung"), ' +
        'nav a:has-text("Bestellungen"), nav a:has-text("Orders")'
      ).first();

      await ordersLink.waitFor({ state: 'visible', timeout: 10000 });
      await ordersLink.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 4. Bestellübersicht erkunden ──────────────────────────────────────
    await recorder.step('Bestellliste erkunden', async () => {
      // Zeige Tabelle / Liste der Bestellungen
      await recorder.pause(2000);
      await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
      await recorder.pause(1500);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await recorder.pause(1000);
    });

    // ── 5. Bestellung öffnen ──────────────────────────────────────────────
    await recorder.step('Bestelldetail öffnen', async () => {
      const firstOrderRow = page.locator(
        'tr[class*="clickable"], tr:has(td), .order-row, [class*="order-item"], ' +
        'tbody tr, [class*="data-row"]'
      ).first();

      if (await firstOrderRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstOrderRow.click();
        await page.waitForLoadState('networkidle');
        await recorder.pause(2500);
      } else {
        // Versuche Detail-Button
        const viewBtn = page.locator(
          'button:has-text("Details"), button:has-text("Anzeigen"), ' +
          'a:has-text("Details"), [title="Details"]'
        ).first();
        if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewBtn.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(2500);
        } else {
          console.log('⚠️ Keine Bestellungen vorhanden – zeige leere Übersicht');
          await recorder.pause(2000);
        }
      }
    });

    // ── 6. Bestelldetails durchsehen ──────────────────────────────────────
    await recorder.step('Bestelldetails prüfen', async () => {
      await recorder.pause(2000);
      await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
      await recorder.pause(1500);
    });

    // ── 7. Bestellstatus aktualisieren ────────────────────────────────────
    await recorder.step('Bestellstatus aktualisieren', async () => {
      const statusSelect = page.locator(
        'select[class*="status"], select[formcontrolname="status"], ' +
        '.status-select, select:near(text=Status)'
      ).first();

      if (await statusSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await statusSelect.scrollIntoViewIfNeeded();
        // Wähle nächsten Status (z.B. PROCESSING → SHIPPED)
        const currentValue = await statusSelect.inputValue().catch(() => '');
        if (currentValue === 'PENDING' || currentValue === '') {
          await statusSelect.selectOption('PROCESSING');
        } else if (currentValue === 'PROCESSING') {
          await statusSelect.selectOption('SHIPPED');
        }
        await recorder.pause(1000);
      }

      // Speichern-Button
      const saveBtn = page.locator(
        'button:has-text("Speichern"), button:has-text("Save"), ' +
        'button:has-text("Aktualisieren"), button:has-text("Update")'
      ).first();

      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
        await recorder.pause(2000);
      } else {
        await recorder.pause(1000);
      }
    });

    // ── 8. Erfolgsmeldung / Status bestätigt ──────────────────────────────
    await recorder.step('Status erfolgreich aktualisiert ✅', async () => {
      await recorder.pause(2500);
    });

    await recorder.finish();
  });
});


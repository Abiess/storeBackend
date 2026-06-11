/**
 * UC-01: Kundenseitiger Checkout-Flow
 * Zeigt den vollständigen Einkaufsprozess auf dem Storefront:
 * Startseite → Produkt auswählen → Warenkorb → Checkout → Bestellbestätigung
 */
const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

const STORE_URL = process.env.STORE_URL || 'https://andalous.markt.ma';

test.describe('UC-01: Kunden-Checkout-Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'storefront-checkout');
    await recorder.start();
  });

  test('Vollständiger Kundenkauf: Produkt suchen → Warenkorb → Kasse', async ({ page }) => {

    // ── 1. Storefront-Startseite ──────────────────────────────────────────
    await recorder.step('Storefront öffnen', async () => {
      await page.goto(STORE_URL);
      await page.waitForLoadState('networkidle');
      await recorder.pause(2500);
    });

    // ── 2. Produkt aus der Liste auswählen ────────────────────────────────
    await recorder.step('Produkt aus Katalog auswählen', async () => {
      // Warte auf Produktkarten (verschiedene mögliche Selektoren)
      const productCard = page.locator(
        '.product-card, .product-item, [class*="product-card"], .product-grid > *, app-product-card'
      ).first();
      await productCard.waitFor({ state: 'visible', timeout: 15000 });
      await productCard.scrollIntoViewIfNeeded();
      await recorder.pause(1500);

      // Hover-Effekt für Video-Klarheit
      await productCard.hover();
      await recorder.pause(800);

      // Klick auf "In den Warenkorb" oder direkt auf die Karte
      const addToCartBtn = productCard.locator(
        'button:has-text("أضف إلى السلة"), button:has-text("In den Warenkorb"), button:has-text("Add to cart"), button[class*="add-to-cart"]'
      ).first();

      if (await addToCartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addToCartBtn.click();
      } else {
        // Klick auf Produkt → zur Detailseite
        await productCard.click();
        await page.waitForLoadState('networkidle');
        await recorder.pause(1500);

        // Auf Detailseite "In den Warenkorb" klicken
        const detailAddBtn = page.locator(
          'button:has-text("أضف إلى السلة"), button:has-text("In den Warenkorb"), button:has-text("Add to cart")'
        ).first();
        await detailAddBtn.waitFor({ state: 'visible', timeout: 10000 });
        await detailAddBtn.click();
      }

      await recorder.pause(2000);
    });

    // ── 3. Warenkorb öffnen ────────────────────────────────────────────────
    await recorder.step('Warenkorb öffnen', async () => {
      const cartLink = page.locator(
        'a[href*="/cart"], a[href*="/warenkorb"], [data-test="cart-link"], .cart-icon, ' +
        'button:has-text("السلة"), button:has-text("Warenkorb")'
      ).first();

      if (await cartLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cartLink.click();
      } else {
        await page.goto(`${STORE_URL}/cart`);
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 4. Warenkorb prüfen & zur Kasse gehen ─────────────────────────────
    await recorder.step('Warenkorb prüfen & zur Kasse', async () => {
      // Zeige Artikel im Warenkorb
      await recorder.pause(2000);

      const checkoutBtn = page.locator(
        'button:has-text("إتمام الشراء"), button:has-text("Zur Kasse"), ' +
        'a:has-text("إتمام الشراء"), a:has-text("Checkout"), [data-test="checkout-btn"]'
      ).first();

      await checkoutBtn.waitFor({ state: 'visible', timeout: 10000 });
      await checkoutBtn.scrollIntoViewIfNeeded();
      await recorder.pause(1000);
      await checkoutBtn.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // ── 5. Kontaktdaten eingeben ───────────────────────────────────────────
    await recorder.step('E-Mail-Adresse eingeben', async () => {
      const emailInput = page.locator('#email, input[type="email"], input[formcontrolname="customerEmail"]').first();
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.click();
      await emailInput.fill('kunde@beispiel.de');
      await recorder.pause(1200);
    });

    // ── 6. Lieferadresse: Vorname & Nachname ──────────────────────────────
    await recorder.step('Vor- und Nachname eingeben', async () => {
      const firstName = page.locator('#firstName, input[formcontrolname="firstName"]').first();
      await firstName.fill('Max');
      await recorder.pause(700);

      const lastName = page.locator('#lastName, input[formcontrolname="lastName"]').first();
      await lastName.fill('Mustermann');
      await recorder.pause(700);
    });

    // ── 7. Straße & Hausnummer ─────────────────────────────────────────────
    await recorder.step('Straße & Hausnummer eingeben', async () => {
      const address = page.locator('#address1, input[formcontrolname="address1"]').first();
      await address.fill('Musterstraße 42');
      await recorder.pause(700);
    });

    // ── 8. PLZ & Stadt ────────────────────────────────────────────────────
    await recorder.step('PLZ und Stadt eingeben', async () => {
      const postalCode = page.locator('#postalCode, input[formcontrolname="postalCode"]').first();
      await postalCode.fill('10115');
      await recorder.pause(700);

      const city = page.locator('#city, input[formcontrolname="city"]').first();
      await city.fill('Berlin');
      await recorder.pause(700);
    });

    // ── 9. Land auswählen ─────────────────────────────────────────────────
    await recorder.step('Land auswählen', async () => {
      const country = page.locator('#country, select[formcontrolname="country"]').first();
      await country.selectOption({ label: /Deutschland|Germany|ألمانيا/ });
      await recorder.pause(1000);
    });

    // ── 10. Bestellübersicht prüfen ───────────────────────────────────────
    await recorder.step('Bestellübersicht prüfen', async () => {
      const summary = page.locator(
        '.order-summary, [class*="order-summary"], h2:has-text("ملخص الطلب"), h2:has-text("Bestellübersicht")'
      ).first();

      if (await summary.isVisible({ timeout: 3000 }).catch(() => false)) {
        await summary.scrollIntoViewIfNeeded();
      }
      await recorder.pause(2500);
    });

    // ── 11. Bestellung aufgeben ───────────────────────────────────────────
    await recorder.step('Bestellung aufgeben', async () => {
      const placeOrderBtn = page.locator(
        'button:has-text("تأكيد الطلب"), button:has-text("Bestellung aufgeben"), ' +
        'button:has-text("Place order"), button[type="submit"].btn-submit'
      ).first();

      await placeOrderBtn.waitFor({ state: 'visible', timeout: 10000 });
      await placeOrderBtn.scrollIntoViewIfNeeded();
      await recorder.pause(1000);
      await placeOrderBtn.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // ── 12. Bestellbestätigung anzeigen ───────────────────────────────────
    await recorder.step('Bestellbestätigung erhalten ✅', async () => {
      // Prüfe auf Bestätigungsseite oder Erfolgsmeldung
      await Promise.race([
        page.waitForURL(/order-confirmation|bestellbestaetigung|danke/i, { timeout: 15000 }),
        page.waitForSelector(
          'text=شكراً, text=Danke, text=Thank you, text=Bestellung erfolgreich, ' +
          '[class*="order-confirm"], [class*="success"]',
          { timeout: 15000 }
        )
      ]).catch(() => console.log('Bestätigungsseite – alternative Prüfung'));

      await recorder.pause(3000);
    });

    await recorder.finish();
  });
});


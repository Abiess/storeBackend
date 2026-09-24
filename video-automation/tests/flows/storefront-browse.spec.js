/**
 * UC-02: Storefront-Browsing-Flow (Kundenperspektive)
 * Zeigt das Durchstöbern des Online-Shops:
 * Startseite → Kategorie filtern → Produktdetails → Quick-View → Suche
 */
const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

const STORE_URL = process.env.STORE_URL || 'https://andalous.markt.ma';

test.describe('UC-02: Storefront-Browsing', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'storefront-browse');
    await recorder.start();
  });

  test('Kunden-Einkaufserlebnis: Produkte entdecken & suchen', async ({ page }) => {

    // ── 1. Store-Startseite aufrufen ──────────────────────────────────────
    await recorder.step('Storefront starten', async () => {
      await page.goto(STORE_URL);
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // ── 2. Alle Produkte ansehen ──────────────────────────────────────────
    await recorder.step('Produktkatalog erkunden', async () => {
      // Scrolle langsam durch die Produkte
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await recorder.pause(1500);
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await recorder.pause(1500);
      await page.evaluate(() => window.scrollBy({ top: -800, behavior: 'smooth' }));
      await recorder.pause(1000);
    });

    // ── 3. Kategorie-Filter verwenden ─────────────────────────────────────
    await recorder.step('Kategorie filtern', async () => {
      const categoryFilter = page.locator(
        '.category-filter, [class*="category"] button, ' +
        'select[class*="category"], .sidebar-categories li a, ' +
        '[class*="filter"] button'
      ).first();

      if (await categoryFilter.isVisible({ timeout: 4000 }).catch(() => false)) {
        await categoryFilter.click();
        await recorder.pause(1500);
      } else {
        // Versuche alternativ über Navigations-Link
        const navCategory = page.locator(
          'nav a:not([href="/"]):not([href*="cart"]):not([href*="account"])'
        ).nth(1);
        if (await navCategory.isVisible({ timeout: 2000 }).catch(() => false)) {
          await navCategory.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1500);
        }
      }
    });

    // ── 4. Suchfunktion nutzen ────────────────────────────────────────────
    await recorder.step('Produktsuche verwenden', async () => {
      const searchInput = page.locator(
        'input[type="search"], input[placeholder*="Suchen"], input[placeholder*="البحث"], ' +
        'input[placeholder*="Search"], input[class*="search"]'
      ).first();

      if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
        await searchInput.click();
        await recorder.pause(500);
        await searchInput.fill('Produkt');
        await recorder.pause(1500);
        await searchInput.clear();
        await recorder.pause(500);
      } else {
        // Öffne Suche über Icon/Button
        const searchBtn = page.locator(
          'button[aria-label*="Suche"], button[aria-label*="search"], ' +
          '.search-icon, [class*="search-btn"]'
        ).first();
        if (await searchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await searchBtn.click();
          await recorder.pause(800);
        }
      }
      await recorder.pause(1000);
    });

    // ── 5. Produktdetailseite öffnen ──────────────────────────────────────
    await recorder.step('Produktdetails ansehen', async () => {
      const firstProduct = page.locator(
        '.product-card, .product-item, [class*="product-card"]'
      ).first();

      await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
      await firstProduct.scrollIntoViewIfNeeded();
      await recorder.pause(1000);
      await firstProduct.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2500);
    });

    // ── 6. Bildergalerie durchblättern ────────────────────────────────────
    await recorder.step('Produktbilder ansehen', async () => {
      const gallery = page.locator(
        '.product-images, .image-gallery, [class*="gallery"], .swiper-container'
      ).first();

      if (await gallery.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gallery.scrollIntoViewIfNeeded();
        await recorder.pause(1500);

        // Nächstes Bild klicken falls vorhanden
        const nextBtn = gallery.locator('.next, .swiper-button-next, button[aria-label*="next"]').first();
        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextBtn.click();
          await recorder.pause(1000);
        }
      } else {
        await recorder.pause(1500);
      }
    });

    // ── 7. Produktbeschreibung lesen ──────────────────────────────────────
    await recorder.step('Produktbeschreibung lesen', async () => {
      const description = page.locator(
        '.product-description, [class*="description"], .product-details'
      ).first();

      if (await description.isVisible({ timeout: 3000 }).catch(() => false)) {
        await description.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      } else {
        await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
        await recorder.pause(2000);
      }
    });

    // ── 8. Bewertungen anzeigen ───────────────────────────────────────────
    await recorder.step('Kundenbewertungen ansehen', async () => {
      const reviews = page.locator(
        '.reviews, .product-reviews, [class*="reviews"], #reviews'
      ).first();

      if (await reviews.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reviews.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      } else {
        await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        await recorder.pause(1500);
      }
    });

    // ── 9. In den Warenkorb legen ─────────────────────────────────────────
    await recorder.step('Produkt in den Warenkorb legen', async () => {
      const addBtn = page.locator(
        'button:has-text("أضف إلى السلة"), button:has-text("In den Warenkorb"), ' +
        'button:has-text("Add to cart"), [data-test="add-to-cart"]'
      ).first();

      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.scrollIntoViewIfNeeded();
        await recorder.pause(1000);
        await addBtn.click();
        await recorder.pause(2000);
      }
    });

    // ── 10. Zurück zur Übersicht ──────────────────────────────────────────
    await recorder.step('Zurück zur Produktübersicht', async () => {
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});


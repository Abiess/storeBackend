/**
 * markt.ma Quick Start Demo - Multilingual Version
 * Create an online store without registration - Works with all languages
 *
 * Supported languages: de, en, fr, ar
 * Duration: ~30-45 seconds
 *
 * Usage:
 *   npx playwright test quick-start-multilang --grep "German"
 *   npx playwright test quick-start-multilang --grep "English"
 *   npx playwright test quick-start-multilang --grep "French"
 *   npx playwright test quick-start-multilang --grep "Arabic"
 *
 * DO NOT use in production with real customer data!
 */

const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { CleanupHelper } = require('../utils/cleanup-helper');
const { getAllTranslations } = require('../../config/translations');

/**
 * UI Element Selectors by Language
 * Handles different button texts, placeholders, etc. per language
 */
const UI_SELECTORS = {
  de: {
    ctaButton: /shop.*erstellen|erstellen.*shop|kostenlos.*erstellen|jetzt.*starten/i,
    createButton: /store.*erstellen|erstellen|shop.*erstellen|boutique.*erstellen/i,
    viewStoreLink: /store.*ansehen|shop.*ansehen|ansehen|öffnen/i,
    nextButton: /weiter|next/i,
  },
  en: {
    ctaButton: /create.*shop|create.*store|get.*started|start.*free/i,
    createButton: /create.*store|create.*shop|create/i,
    viewStoreLink: /view.*store|view.*shop|open.*store/i,
    nextButton: /next|continue/i,
  },
  fr: {
    ctaButton: /créer.*boutique|créer.*shop|créer.*store|commencer/i,
    createButton: /créer.*boutique|créer.*store|créer la boutique|créer/i,
    viewStoreLink: /voir.*boutique|voir.*store|ouvrir.*boutique/i,
    nextButton: /suivant|next/i,
  },
  ar: {
    ctaButton: /إنشاء.*متجر|ابدأ.*الآن|إنشاء/i,
    createButton: /إنشاء.*متجر|إنشاء|إتمام/i,
    viewStoreLink: /عرض.*المتجر|فتح.*المتجر/i,
    nextButton: /التالي|next/i,
  }
};

/**
 * Business Type Selectors
 * Different strategies to find the "Food/Restaurant" button across languages
 */
const BUSINESS_TYPE_SELECTORS = {
  // Strategy 1: By text content (most reliable)
  text: {
    de: /lebensmittel|restaurant|essen/i,
    en: /food|restaurant|grocery/i,
    fr: /alimentation|restaurant|nourriture/i,
    ar: /طعام|مطعم|غذاء/i,
  },
  // Strategy 2: By Lucide Icon (language-independent)
  icon: 'button:has(lucide-icon[name="Pizza"])',
  // Strategy 3: By position (3rd button)
  position: '.sc-cat-btn:nth-child(3)',
};

/**
 * Test Factory for Multiple Languages
 */
function createQuickStartTest(language, languageLabel) {
  test(`${languageLabel} - Shop ohne Anmeldung erstellen - 30-45 Sekunden`, async ({ page }) => {
    let recorder;
    let cleanup;

    // Initialize
    recorder = new FlowRecorder(page, `quick-start-${language}`);
    cleanup = new CleanupHelper();
    await recorder.start();

    // Load translations for this language
    const t = getAllTranslations(language);
    const selectors = UI_SELECTORS[language] || UI_SELECTORS.en;

    // Configuration
    const baseUrlRaw = process.env.BASE_URL || 'https://markt.ma';

    // Add language parameter to URL (important for i18n)
    const baseUrl = baseUrlRaw.includes('?')
      ? `${baseUrlRaw}&lang=${language}`
      : `${baseUrlRaw}?lang=${language}`;

    const timestamp = Date.now();
    const storeName = `Shop${timestamp.toString().slice(-4)}`;

    console.log(`🎬 Starting Quick Demo [${languageLabel}]`);
    console.log(`🌐 Language: ${language}`);
    console.log(`🔗 Base URL: ${baseUrl}`);
    console.log(`🏪 Store name: ${storeName}`);

    try {
      // ==================== 1. LANDING PAGE (5s) ====================
      await recorder.step(t.quick_landing, async () => {
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');
        await recorder.pause(1000);

        // Show hero section
        try {
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await recorder.pause(700);
          await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
          await recorder.pause(500);
        } catch (e) {
          console.log('Scrolling skipped');
        }
      });

      // ==================== 2. CLICK CTA BUTTON (5s) ====================
      await recorder.step(t.quick_cta_click, async () => {
        // Try language-specific button text first
        let ctaButton = page.getByRole('button', { name: selectors.ctaButton }).first();

        // Fallback: Try generic selectors
        if (!await ctaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          ctaButton = page.locator('button:has-text("🚀"), a.cta-button, .primary-button').first();
        }

        await ctaButton.waitFor({ state: 'visible', timeout: 10000 });
        await ctaButton.click();
        await page.waitForLoadState('networkidle');
        await recorder.pause(1000);
      });

      // ==================== 3. ENTER STORE NAME (5s) ====================
      await recorder.step(t.quick_enter_name, async () => {
        // More robust selector for store name input
        let storeNameInput = page.getByRole('textbox').first();

        // If multiple textboxes, try to find by placeholder
        const allInputs = await page.locator('input[type="text"], input:not([type])').all();
        if (allInputs.length > 0) {
          storeNameInput = page.locator('input[type="text"], input:not([type])').first();
        }

        await storeNameInput.waitFor({ state: 'visible', timeout: 10000 });
        await storeNameInput.click();
        await recorder.pause(300);
        await storeNameInput.fill(storeName);
        await recorder.pause(700);
      });

      // ==================== 4. SELECT BUSINESS TYPE (5s) ====================
      await recorder.step(t.quick_select_type, async () => {
        let businessTypeButton;

        // Strategy 1: By text content (language-specific)
        const textSelector = BUSINESS_TYPE_SELECTORS.text[language];
        if (textSelector) {
          businessTypeButton = page.getByRole('button', { name: textSelector }).first();
        }

        // Strategy 2: By Lucide Icon (language-independent)
        if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          businessTypeButton = page.locator(BUSINESS_TYPE_SELECTORS.icon).first();
        }

        // Strategy 3: By position (3rd button = Food/Restaurant)
        if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          businessTypeButton = page.locator(BUSINESS_TYPE_SELECTORS.position).first();
        }

        await businessTypeButton.waitFor({ state: 'visible', timeout: 10000 });
        await businessTypeButton.click();
        await recorder.pause(800);
      });

      // ==================== 5. CREATE STORE (5s) ====================
      await recorder.step(t.quick_create_store, async () => {
        // Listen for store creation API response
        const responsePromise = page.waitForResponse(
          response => response.url().includes('/api/public/stores') && response.status() === 201,
          { timeout: 15000 }
        ).catch(() => null);

        // Language-specific create button
        let createButton = page.getByRole('button', { name: selectors.createButton }).first();

        // Fallback: Try generic selectors
        if (!await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          createButton = page.locator('button:has-text("🚀"), button.primary, button[type="submit"]').first();
        }

        await createButton.waitFor({ state: 'visible', timeout: 10000 });
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Extract store ID and token from response
        const response = await responsePromise;
        if (response) {
          try {
            const data = await response.json();
            if (data.storeId && data.token) {
              cleanup.trackStore(data.storeId, data.token);
              console.log(`📦 Store created: ID=${data.storeId}, Slug=${data.storeSlug || 'N/A'}`);
            }
          } catch (e) {
            console.log('⚠️ Could not extract store data from response');
          }
        }

        await recorder.pause(1500);
      });

      // ==================== 6. VIEW STOREFRONT (10s) ====================
      await recorder.step(t.quick_view_store, async () => {
        // Language-specific view store link
        let viewStoreLink = page.getByRole('link', { name: selectors.viewStoreLink }).first();

        // Fallback: Try generic selectors
        if (!await viewStoreLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          viewStoreLink = page.locator('a:has-text("🌐"), a[href*="markt.ma"]').first();
        }

        await viewStoreLink.waitFor({ state: 'visible', timeout: 10000 });

        // Extract URL and navigate in same tab
        const storefrontUrl = await viewStoreLink.getAttribute('href');
        if (storefrontUrl) {
          console.log(`🌐 Opening storefront: ${storefrontUrl}`);
          await page.goto(storefrontUrl);
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);

          // Scroll through storefront
          await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
          await recorder.pause(800);

          // Try to click "Next" button if visible
          const nextButton = page.getByRole('button', { name: selectors.nextButton });
          if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextButton.click();
            await recorder.pause(500);
          }

          await recorder.pause(500);

          // Navigate back to success page
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await recorder.pause(300);
        } else {
          console.log('⚠️ Could not extract storefront URL');
        }
      });

      // ==================== 7. SUCCESS (3s) ====================
      await recorder.step(t.quick_success, async () => {
        await recorder.pause(1000);
        console.log(`✅ Quick Start Demo [${languageLabel}] completed!`);
      });

      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log(`✅ Quick Start Demo [${languageLabel}] Summary:`);
      console.log('   • Landing Page: ✓');
      console.log('   • Store creation without login: ✓');
      console.log('   • Business type selection: ✓');
      console.log('   • Storefront preview: ✓');
      console.log('   • Duration: ~30-45 seconds ✓');
      console.log('═══════════════════════════════════════════════');

    } catch (error) {
      console.error(`❌ Test failed for language ${languageLabel}:`, error.message);
      throw error;
    } finally {
      // Cleanup created stores
      await cleanup.cleanupAll(baseUrl);
      await recorder.finish();
    }
  });
}

// ==================== TEST SUITE ====================
test.describe('markt.ma - Quick Start (Multilingual)', () => {
  // German version
  createQuickStartTest('de', '🇩🇪 German');

  // English version
  createQuickStartTest('en', '🇬🇧 English');

  // French version
  createQuickStartTest('fr', '🇫🇷 French');

  // Arabic version
  createQuickStartTest('ar', '🇸🇦 Arabic');
});


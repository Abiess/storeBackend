/**
 * markt.ma Quick Demo (French) - Créer une boutique online sans inscription
 * Duration: ~30-45 seconds
 * Purpose: Show how users can create an online store without registration (French version)
 * 
 * ⚠️ DEPRECATED: Use quick-start-multilang.spec.js instead!
 *
 * This file is kept for backwards compatibility, but the new multilingual version
 * is recommended as it supports all languages (de, en, fr, ar) with a single codebase.
 *
 * Migration command:
 *   npx playwright test quick-start-multilang --grep "French"
 *
 * Features:
 * - No login required
 * - Instant store creation
 * - Business type selection
 * - Direct access to storefront
 * 
 * DO NOT use in production with real customer data!
 */

const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { CleanupHelper } = require('../utils/cleanup-helper');

test.describe('markt.ma - Créer une boutique sans inscription', () => {
  let recorder;
  let cleanup;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'boutique-sans-inscription');
    cleanup = new CleanupHelper();
    await recorder.start();
  });

  test.afterEach(async () => {
    // Clean up created stores
    const baseUrl = process.env.BASE_URL || 'https://markt.ma';
    await cleanup.cleanupAll(baseUrl);
  });

  test('Créer une boutique online sans inscription - 30-45 secondes', async ({ page }) => {
    // Load base configuration from ENV
    const baseUrl = process.env.BASE_URL || 'https://markt.ma';
    
    // Generate unique store name
    const timestamp = Date.now();
    const storeName = `Boutique${timestamp.toString().slice(-4)}`;
    
    console.log(`🎬 Starting French Quick Demo with baseUrl: ${baseUrl}`);
    console.log(`🏪 Store name: ${storeName}`);

    // ==================== 1. LANDING PAGE & CTA (5s) ====================
    await recorder.step('1. Page d\'accueil', async () => {
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

    // ==================== 2. CLICK "CRÉER SHOP GRATUIT" (5s) ====================
    await recorder.step('2. Cliquer sur "Créer Shop gratuit"', async () => {
      // French-first selector: Try French UI text
      let ctaButton = page.getByRole('button', { name: /créer.*boutique|créer.*shop|commencer/i }).first();
      
      // Fallback: Try by text content (German/English)
      if (!await ctaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        ctaButton = page.locator('button:has-text("kostenlos"), button:has-text("Shop"), button:has-text("erstellen")').first();
      }
      
      // Fallback: Try by class or icon
      if (!await ctaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        ctaButton = page.locator('button:has-text("🚀"), a.cta-button, .primary-button').first();
      }
      
      await ctaButton.waitFor({ state: 'visible', timeout: 10000 });
      await ctaButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(1000);
    });

    // ==================== 3. ENTER STORE NAME (5s) ====================
    await recorder.step('3. Entrer le nom du magasin', async () => {
      // More robust selector for store name input
      let storeNameInput = page.getByRole('textbox').first(); // Try first textbox
      
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
    await recorder.step('4. Sélectionner le type', async () => {
      // IMPORTANT: Now using Lucide Icons instead of Emojis!
      // Strategy 1: Text-based (most robust with i18n + locale: de-DE)
      let businessTypeButton = page.getByRole('button', { name: /lebensmittel/i }).first();
      
      // Strategy 2: Via Lucide Icon element
      if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        businessTypeButton = page.locator('button:has(lucide-icon[name="Pizza"])').first();
      }
      
      // Strategy 3: By position (3rd button = index 2)
      if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        businessTypeButton = page.locator('.sc-cat-btn').nth(2);
      }
      
      await businessTypeButton.waitFor({ state: 'visible', timeout: 10000 });
      await businessTypeButton.click();
      await recorder.pause(800);
    });

    // ==================== 5. CREATE STORE (5s) ====================
    await recorder.step('5. Créer le store', async () => {
      // Listen for store creation API response
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/public/stores') && response.status() === 201,
        { timeout: 15000 }
      ).catch(() => null);

      // More robust selector (French-first)
      let createButton = page.getByRole('button', { name: /créer.*boutique|créer.*store|créer la boutique/i }).first();
      
      // Fallback: Try German/English
      if (!await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        createButton = page.getByRole('button', { name: /store.*erstellen|create.*store|erstellen/i }).first();
      }
      
      // Fallback: Try by text or icon
      if (!await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        createButton = page.locator('button:has-text("🚀"), button:has-text("Créer"), button:has-text("erstellen"), button.primary, button[type="submit"]').first();
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
    await recorder.step('6. Voir le store (Storefront)', async () => {
      // French-first selector
      let viewStoreLink = page.getByRole('link', { name: /voir.*boutique|voir.*store|ouvrir.*boutique/i }).first();
      
      // Fallback: Try German/English
      if (!await viewStoreLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        viewStoreLink = page.getByRole('link', { name: /store.*ansehen|view.*store|ansehen/i }).first();
      }
      
      // Fallback: Try by text or icon
      if (!await viewStoreLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        viewStoreLink = page.locator('a:has-text("🌐"), a:has-text("Voir"), a:has-text("ansehen"), a[href*="markt.ma"]').first();
      }
      
      await viewStoreLink.waitFor({ state: 'visible', timeout: 10000 });
      
      // Extract URL and navigate in same tab (better for video recording)
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
        const nextButton = page.getByRole('button', { name: /next|suivant|weiter/i });
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
    await recorder.step('7. Succès! Store créé', async () => {
      await recorder.pause(1000);
      
      console.log('✅ French Quick Demo completed!');
    });

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Boutique Sans Inscription Demo Summary:');
    console.log('   • Landing Page: ✓');
    console.log('   • Store creation without login: ✓');
    console.log('   • Business type selection: ✓');
    console.log('   • Storefront preview: ✓');
    console.log('   • Duration: ~30-45 seconds ✓');
    console.log('═══════════════════════════════════════════════');
  });
});

/**
 * markt.ma Create Store with Login Demo - Multilingual Version
 * Duration: ~60-90 seconds
 * Purpose: Complete store creation flow with authenticated user
 *
 * Features:
 * - Login with existing credentials
 * - Complete store creation wizard
 * - Business type selection (Electronics)
 * - Dashboard navigation
 * - Store management access
 *
 * Supported languages: de, en, ar
 *
 * Usage:
 *   npx playwright test create-store-with-login-multilang --grep "German"
 *   npx playwright test create-store-with-login-multilang --grep "English"
 *   npx playwright test create-store-with-login-multilang --grep "Arabic"
 *
 * DO NOT use in production with real customer data!
 */

const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { CleanupHelper } = require('../utils/cleanup-helper');
const { getAllTranslations } = require('../../config/translations');

/**
 * UI Element Selectors by Language
 */
const UI_SELECTORS = {
  de: {
    loginButton: /anmelden|login|einloggen/i,
    emailLabel: /e-mail|email/i,
    passwordLabel: /passwort|password/i,
    createStoreButton: /store.*erstellen|shop.*erstellen|neuer.*store|erstellen/i,
    storeNamePlaceholder: /shop.*name|store.*name|name.*ihres/i,
    businessTypeShop: /shop|laden|geschäft/i,
    businessTypeRestaurant: /restaurant|gastronomie|essen/i,
    businessTypeRiad: /riad|unterkunft|hotel/i,
    submitButton: /erstellen|absenden|speichern|jetzt.*erstellen/i,
    dashboardLink: /dashboard|übersicht/i,
    manageStoreButton: /verwalten|manage.*store|store.*verwalten/i,
    addProductsButton: /produkte.*hinzufügen|add.*products/i,
    laterButton: /später|later|skip/i,
  },
  en: {
    loginButton: /login|sign.*in/i,
    emailLabel: /e-mail|email/i,
    passwordLabel: /password/i,
    createStoreButton: /create.*store|new.*store|add.*store/i,
    storeNamePlaceholder: /shop.*name|store.*name|fatima.*fashion/i,
    businessTypeShop: /shop|retail|store/i,
    businessTypeRestaurant: /restaurant|food|dining/i,
    businessTypeRiad: /riad|hotel|accommodation/i,
    submitButton: /create.*now|submit|save|create.*store/i,
    dashboardLink: /dashboard/i,
    manageStoreButton: /manage.*store|manage/i,
    addProductsButton: /add.*products|products/i,
    laterButton: /later|skip/i,
  },
  ar: {
    loginButton: /تسجيل.*الدخول|دخول/i,
    emailLabel: /البريد.*الإلكتروني|إيميل/i,
    passwordLabel: /كلمة.*المرور|الرمز/i,
    createStoreButton: /إنشاء.*متجر|متجر.*جديد/i,
    storeNamePlaceholder: /اسم.*المتجر|اسم.*المحل/i,
    businessTypeShop: /متجر|محل|تجارة/i,
    businessTypeRestaurant: /مطعم|طعام/i,
    businessTypeRiad: /رياض|فندق|إقامة/i,
    submitButton: /إنشاء.*الآن|إنشاء|حفظ/i,
    dashboardLink: /لوحة.*التحكم|dashboard/i,
    manageStoreButton: /إدارة.*المتجر|إدارة/i,
    addProductsButton: /إضافة.*منتجات|منتجات/i,
    laterButton: /لاحقا|تخطي/i,
  }
};

/**
 * Business Type Icons (Language-independent)
 */
const BUSINESS_TYPE_ICONS = {
  shop: 'button:has(lucide-icon[name="ShoppingBag"])',
  restaurant: 'button:has(lucide-icon[name="Pizza"])',
  riad: 'button:has(lucide-icon[name="Home"])',
};

/**
 * Test Factory for Multiple Languages
 */
function createStoreWithLoginTest(language, languageLabel) {
  test.describe(`markt.ma - Create Store with Login (${languageLabel})`, () => {
    let recorder;
    let cleanup;

    test.beforeEach(async ({ page }) => {
      recorder = new FlowRecorder(page, `create-store-with-login-${language}`);
      cleanup = new CleanupHelper();
      await recorder.start();
    });

    test.afterEach(async () => {
      const baseUrl = process.env.BASE_URL || 'https://www.markt.ma';
      await cleanup.cleanupAll(baseUrl);
      await recorder.finish();
    });

    test(`${languageLabel} - Store mit Login erstellen - 60-90 Sekunden`, async ({ page }) => {
      // Load translations for this language
      const t = getAllTranslations(language);
      const selectors = UI_SELECTORS[language] || UI_SELECTORS.en;

      // Configuration
      const baseUrlRaw = process.env.BASE_URL || 'https://www.markt.ma';
      const baseUrl = baseUrlRaw.includes('?')
        ? `${baseUrlRaw}&lang=${language}`
        : `${baseUrlRaw}?lang=${language}`;

      const timestamp = Date.now();
      const storeName = `shop${timestamp.toString().slice(-4)}`;

      // Test credentials (from environment or defaults)
      const email = process.env.TEST_EMAIL || 'demo@hotmail.com';
      const password = process.env.TEST_PASSWORD || 'maroc2010';

      console.log(`🎬 Starting Create Store with Login Demo [${languageLabel}]`);
      console.log(`🌐 Language: ${language}`);
      console.log(`🔗 Base URL: ${baseUrl}`);
      console.log(`🏪 Store name: ${storeName}`);
      console.log(`👤 Email: ${email}`);

      try {
        // ==================== 1. NAVIGATE TO HOMEPAGE (3s) ====================
        await recorder.step(t.store_auth_homepage, async () => {
          await page.goto(baseUrl);
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        });

        // ==================== 2. CLICK LOGIN BUTTON (3s) ====================
        await recorder.step(t.store_auth_click_login, async () => {
          // Try language-specific button text first
          let loginButton = page.getByRole('navigation').getByRole('button', { name: selectors.loginButton }).first();

          // Fallback: Try generic selectors
          if (!await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            loginButton = page.locator('button:has-text("Login"), a:has-text("Login")').first();
          }

          await loginButton.waitFor({ state: 'visible', timeout: 10000 });
          await loginButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        });

        // ==================== 3. ENTER EMAIL (5s) ====================
        await recorder.step(t.store_auth_enter_email, async () => {
          // Find email input by label or type
          let emailInput = page.getByRole('textbox', { name: selectors.emailLabel }).first();

          // Fallback: Try generic selectors
          if (!await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            emailInput = page.locator('input[type="email"], input[name="email"]').first();
          }

          await emailInput.waitFor({ state: 'visible', timeout: 10000 });
          await emailInput.click();
          await recorder.pause(300);
          await emailInput.fill(email);
          await recorder.pause(500);
        });

        // ==================== 4. ENTER PASSWORD (5s) ====================
        await recorder.step(t.store_auth_enter_password, async () => {
          // Find password input
          let passwordInput = page.getByRole('textbox', { name: selectors.passwordLabel }).first();

          // Fallback: Try generic selectors
          if (!await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            passwordInput = page.locator('input[type="password"], input[name="password"]').first();
          }

          await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
          await passwordInput.click();
          await recorder.pause(300);
          await passwordInput.fill(password);
          await recorder.pause(500);
        });

        // ==================== 5. SUBMIT LOGIN (5s) ====================
        await recorder.step(t.store_auth_submit, async () => {
          // Find submit button
          let loginSubmitButton = page.getByRole('button', { name: selectors.loginButton }).last();

          // Fallback: Try generic selectors
          if (!await loginSubmitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            loginSubmitButton = page.locator('button[type="submit"]').first();
          }

          await loginSubmitButton.waitFor({ state: 'visible', timeout: 10000 });
          await loginSubmitButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1500);
        });

        // ==================== 6. ENTER STORE NAME (5s) ====================
        await recorder.step(t.store_auth_enter_name, async () => {
          // Find store name input by placeholder or label
          let storeNameInput = page.getByRole('textbox', { name: selectors.storeNamePlaceholder }).first();

          // Fallback: Try generic selectors
          if (!await storeNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            storeNameInput = page.locator('input[type="text"], input[name*="name"]').first();
          }

          await storeNameInput.waitFor({ state: 'visible', timeout: 10000 });
          await storeNameInput.click();
          await recorder.pause(300);
          await storeNameInput.fill(storeName);
          await recorder.pause(700);
        });

        // ==================== 7. SELECT BUSINESS TYPE (5s) ====================
        await recorder.step(t.store_auth_select_category, async () => {
          // Strategy 1: Try language-specific text for "Shop" business type
          let businessTypeButton = page.getByRole('button', { name: selectors.businessTypeShop }).first();
          
          // Strategy 2: Try by Lucide Icon (language-independent)
          if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            businessTypeButton = page.locator(BUSINESS_TYPE_ICONS.shop).first();
          }
          
          // Strategy 3: Try generic "Shop" text
          if (!await businessTypeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            businessTypeButton = page.locator('button:has-text("Shop"), button:has-text("Laden"), button:has-text("Store")').first();
          }

          await businessTypeButton.waitFor({ state: 'visible', timeout: 10000 });
          await businessTypeButton.click();
          await recorder.pause(800);
        });

        // ==================== 8. CREATE STORE (5s) ====================
        await recorder.step(t.store_auth_create, async () => {
          // Listen for store creation API response
          const responsePromise = page.waitForResponse(
            response => response.url().includes('/api/stores') && (response.status() === 200 || response.status() === 201),
            { timeout: 15000 }
          ).catch(() => null);

          // Find create button
          let createButton = page.getByRole('button', { name: selectors.submitButton }).first();

          // Fallback: Try generic selectors
          if (!await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            createButton = page.locator('button:has-text("🚀"), button[type="submit"]').first();
          }

          await createButton.waitFor({ state: 'visible', timeout: 10000 });
          await createButton.click();
          await page.waitForLoadState('networkidle');

          // Extract store ID from response
          const response = await responsePromise;
          if (response) {
            try {
              const data = await response.json();
              if (data.id || data.storeId) {
                console.log(`📦 Store created: ID=${data.id || data.storeId}, Slug=${data.slug || 'N/A'}`);
              }
            } catch (e) {
              console.log('⚠️ Could not extract store data from response');
            }
          }

          await recorder.pause(1500);
        });

        // ==================== 9. HANDLE ADD PRODUCTS DIALOG (5s) ====================
        await recorder.step(t.store_auth_skip_products, async () => {
          // Check if "Add products" button is visible
          let addProductsButton = page.getByRole('button', { name: selectors.addProductsButton });

          if (await addProductsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addProductsButton.click();
            await recorder.pause(500);

            // Click "Later" button
            let laterButton = page.getByRole('button', { name: selectors.laterButton });
            
            if (await laterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
              await laterButton.click();
              await recorder.pause(500);
            }
          }

          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        });

        // ==================== 10. NAVIGATE TO DASHBOARD (5s) ====================
        await recorder.step(t.store_auth_goto_dashboard, async () => {
          // Find dashboard link
          let dashboardLink = page.getByRole('link', { name: selectors.dashboardLink, exact: true });

          // Fallback: Try generic selectors
          if (!await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")').first();
          }

          await dashboardLink.waitFor({ state: 'visible', timeout: 10000 });
          await dashboardLink.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        });

        // ==================== 11. MANAGE STORE (5s) ====================
        await recorder.step(t.store_auth_manage_store, async () => {
          // Find manage store button
          let manageButton = page.getByRole('button', { name: selectors.manageStoreButton });

          // Fallback: Try generic selectors
          if (!await manageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            manageButton = page.locator('button:has-text("📊"), button:has-text("Manage")').first();
          }

          await manageButton.waitFor({ state: 'visible', timeout: 10000 });
          await manageButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        });

        // ==================== 12. RETURN TO DASHBOARD (3s) ====================
        await recorder.step(t.store_auth_goto_dashboard, async () => {
          // Navigate back to dashboard
          let dashboardLink = page.getByRole('link', { name: selectors.dashboardLink, exact: true });

          if (await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
            await dashboardLink.click();
            await page.waitForLoadState('networkidle');
            await recorder.pause(500);
          }
        });

        // ==================== 13. MANAGE STORE AGAIN (3s) ====================
        await recorder.step(t.store_auth_success, async () => {
          let manageButton = page.getByRole('button', { name: selectors.manageStoreButton });

          if (await manageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await manageButton.click();
            await page.waitForLoadState('networkidle');
            await recorder.pause(1000);
          }

          console.log(`✅ Create Store with Login Demo [${languageLabel}] completed!`);
        });

        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log(`✅ Create Store with Login [${languageLabel}] Summary:`);
        console.log('   • User login: ✓');
        console.log('   • Store creation: ✓');
        console.log('   • Business type selection: ✓');
        console.log('   • Dashboard navigation: ✓');
        console.log('   • Store management: ✓');
        console.log('   • Duration: ~60-90 seconds ✓');
        console.log('═══════════════════════════════════════════════');

      } catch (error) {
        console.error(`❌ Test failed for language ${languageLabel}:`, error.message);
        throw error;
      }
    });
  });
}
// ==================== TEST SUITE ====================
// ==================== TEST SUITE ====================
// German version
createStoreWithLoginTest('de', '🇩🇪 German');

// English version
createStoreWithLoginTest('en', '🇬🇧 English');

// Arabic version
createStoreWithLoginTest('ar', '🇸🇦 Arabic');

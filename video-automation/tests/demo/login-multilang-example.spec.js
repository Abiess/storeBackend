/**
 * markt.ma Login Flow - Multilingual Example
 *
 * This is an EXAMPLE template showing how to create additional multilingual flows.
 * Use this as a starting point for other flows like:
 * - Product browsing
 * - Checkout process
 * - Store management
 *
 * Duration: ~15-20 seconds
 * Supported languages: de, en, fr, ar
 */

const { test } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
const { getAllTranslations } = require('../../config/translations');

// UI Selectors for Login Flow
const UI_SELECTORS = {
  de: {
    loginButton: /anmelden|login|einloggen/i,
    emailField: /e-?mail|benutzername/i,
    passwordField: /passwort|kennwort/i,
    submitButton: /anmelden|einloggen|bestätigen/i,
  },
  en: {
    loginButton: /login|sign in|log in/i,
    emailField: /e-?mail|username/i,
    passwordField: /password|pass/i,
    submitButton: /login|sign in|submit/i,
  },
  fr: {
    loginButton: /connexion|se connecter/i,
    emailField: /e-?mail|identifiant/i,
    passwordField: /mot de passe|mdp/i,
    submitButton: /connexion|se connecter|valider/i,
  },
  ar: {
    loginButton: /تسجيل الدخول|دخول/i,
    emailField: /البريد الإلكتروني|اسم المستخدم/i,
    passwordField: /كلمة المرور|كلمة السر/i,
    submitButton: /تسجيل الدخول|دخول|تأكيد/i,
  }
};

/**
 * Test Factory for Login Flow
 */
function createLoginTest(language, languageLabel) {
  test(`${languageLabel} - Login Flow - 15-20 Sekunden`, async ({ page }) => {
    const recorder = new FlowRecorder(page, `login-${language}`);
    await recorder.start();

    const t = getAllTranslations(language);
    const selectors = UI_SELECTORS[language] || UI_SELECTORS.en;

    const baseUrlRaw = process.env.BASE_URL || 'https://markt.ma';

    // Add language parameter to URL (important for i18n)
    const baseUrl = baseUrlRaw.includes('?')
      ? `${baseUrlRaw}&lang=${language}`
      : `${baseUrlRaw}?lang=${language}`;

    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!';

    console.log(`🎬 Starting Login Demo [${languageLabel}]`);

    try {
      // ==================== 1. VISIT HOMEPAGE (3s) ====================
      await recorder.step(t.login_visit_homepage, async () => {
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');
        await recorder.pause(1000);
      });

      // ==================== 2. CLICK LOGIN BUTTON (3s) ====================
      await recorder.step(t.login_click_button, async () => {
        let loginButton = page.getByRole('button', { name: selectors.loginButton }).first();

        // Fallback: Try link instead of button
        if (!await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          loginButton = page.getByRole('link', { name: selectors.loginButton }).first();
        }

        // Fallback: Try by class
        if (!await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          loginButton = page.locator('.login-button, .auth-button').first();
        }

        await loginButton.waitFor({ state: 'visible', timeout: 10000 });
        await loginButton.click();
        await page.waitForLoadState('networkidle');
        await recorder.pause(1000);
      });

      // ==================== 3. ENTER CREDENTIALS (5s) ====================
      await recorder.step(t.login_enter_credentials, async () => {
        // Email field
        let emailInput = page.getByRole('textbox', { name: selectors.emailField }).first();
        if (!await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          emailInput = page.locator('input[type="email"], input[name="email"]').first();
        }

        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.click();
        await recorder.pause(300);
        await emailInput.fill(testEmail);
        await recorder.pause(500);

        // Password field
        let passwordInput = page.getByRole('textbox', { name: selectors.passwordField }).first();
        if (!await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        }

        await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
        await passwordInput.click();
        await recorder.pause(300);
        await passwordInput.fill(testPassword);
        await recorder.pause(700);
      });

      // ==================== 4. SUBMIT LOGIN (3s) ====================
      await recorder.step(t.login_submit, async () => {
        let submitButton = page.getByRole('button', { name: selectors.submitButton }).first();

        // Fallback: Try by type
        if (!await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          submitButton = page.locator('button[type="submit"]').first();
        }

        await submitButton.waitFor({ state: 'visible', timeout: 10000 });
        await submitButton.click();
        await page.waitForLoadState('networkidle');
        await recorder.pause(1500);
      });

      // ==================== 5. SUCCESS (3s) ====================
      await recorder.step(t.login_success, async () => {
        await recorder.pause(1000);
        console.log(`✅ Login Demo [${languageLabel}] completed!`);
      });

      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log(`✅ Login Flow [${languageLabel}] Summary:`);
      console.log('   • Homepage visited: ✓');
      console.log('   • Login button clicked: ✓');
      console.log('   • Credentials entered: ✓');
      console.log('   • Login submitted: ✓');
      console.log('   • Duration: ~15-20 seconds ✓');
      console.log('═══════════════════════════════════════════════');

    } catch (error) {
      console.error(`❌ Test failed for language ${languageLabel}:`, error.message);
      throw error;
    } finally {
      await recorder.finish();
    }
  });
}

// ==================== TEST SUITE ====================
test.describe('markt.ma - Login Flow (Multilingual - EXAMPLE)', () => {
  // NOTE: These tests are EXAMPLES and may need adjustment based on your actual UI

  createLoginTest('de', '🇩🇪 German');
  createLoginTest('en', '🇬🇧 English');
  createLoginTest('fr', '🇫🇷 French');
  createLoginTest('ar', '🇸🇦 Arabic');
});

/**
 * USAGE:
 *
 * # All languages
 * npx playwright test login-multilang-example
 *
 * # Single language
 * npx playwright test login-multilang-example --grep "French"
 *
 * # With environment variables
 * $env:TEST_EMAIL="your-email@test.com"; $env:TEST_PASSWORD="YourPassword123"; npx playwright test login-multilang-example --grep "German"
 *
 * IMPORTANT:
 * - This is an EXAMPLE template - adjust selectors to match your actual UI
 * - Set TEST_EMAIL and TEST_PASSWORD environment variables for real testing
 * - Consider using test accounts, not production user data
 * - Add proper cleanup logic if creating test data
 */


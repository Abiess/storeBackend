/**
 * markt.ma Platform Demo - Desktop Version
 * Duration: ~2-3 minutes
 * Purpose: Marketing video for landing page, ads, social media
 * 
 * DO NOT use in production with real customer data!
 * Only use with demo credentials from ENV variables.
 */

const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('markt.ma Platform Demo (Desktop)', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'marktma-platform-demo');
    await recorder.start();
  });

  test('Complete platform demonstration - 2-3 minutes', async ({ page }) => {
    // Load base configuration from ENV
    const baseUrl = process.env.BASE_URL || 'https://www.markt.ma';
    const demoStoreSlug = process.env.DEMO_STORE_SLUG || 'demoshop';

    // Generate unique credentials for this demo run (avoids conflicts)
    // Dev-Mode skips email verification, so registration + login works immediately
    const timestamp = Date.now();
    const email = `demo-${timestamp}@markt.ma`;
    const password = `Demo${timestamp}!`;

    console.log(`🎬 Starting Platform Demo with baseUrl: ${baseUrl}`);
    console.log(`👤 Demo user: ${email} (unique per run)`);

    // ==================== 1. LANDING PAGE (15s) ====================
    await recorder.step('1. Landing Page - Hero & Features', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      await recorder.pause(1200);

      // Scroll down to show features (if available)
      try {
        await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        await recorder.pause(800);
        await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
        await recorder.pause(700);
      } catch (e) {
        console.log('Scrolling skipped');
      }
    });

    // ==================== 2. REGISTRATION (15s) ====================
    await recorder.step('2. Registrierung (Auto-Login)', async () => {
      try {
        // Find register/signup button
        const registerButton = page.getByRole('button', { name: /register|sign.*up|registrieren/i }).first();
        if (await registerButton.isVisible({ timeout: 2000 })) {
          await registerButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(500);

          // Fill registration form
          const emailInput = page.getByRole('textbox', { name: /email/i }).first();
          await emailInput.click();
          await emailInput.fill(email);
          await recorder.pause(300);

          const passwordInput = page.locator('input[type="password"]').first();
          await passwordInput.click();
          await passwordInput.fill(password);
          await recorder.pause(300);

          // Submit registration
          const submitButton = page.getByRole('button', { name: /register|sign.*up|registrieren|erstellen/i }).first();
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
          
          console.log('✅ Registration successful');
          // Dev-Mode: Email verification is skipped, user is logged in automatically
        } else {
          console.log('⚠️ Register button not found, trying login instead');
          // Fallback: Try login if registration not found
          const loginButton = page.getByRole('button', { name: /login/i }).first();
          await loginButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(500);

          const emailInput2 = page.getByRole('textbox', { name: /email/i }).first();
          await emailInput2.fill(email);
          await recorder.pause(300);

          const passwordInput2 = page.locator('input[type="password"]').first();
          await passwordInput2.fill(password);
          await recorder.pause(300);

          const submitButton2 = page.getByRole('button', { name: /login/i }).first();
          await submitButton2.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(1000);
        }
      } catch (e) {
        console.log('Registration/Login error:', e.message);
      }
    });

    // ==================== 3. DASHBOARD (5s) ====================
    await recorder.step('3. Dashboard Übersicht', async () => {
      // Should be on dashboard now
      try {
        await page.waitForURL(/dashboard|stores/i, { timeout: 5000 });
      } catch (e) {
        console.log('Dashboard URL not detected, continuing...');
      }
      await recorder.pause(800);
    });

    // ==================== 4. DEMO STORE ÖFFNEN (10s) ====================
    await recorder.step('4. Store auswählen & öffnen', async () => {
      // Try to find existing demo store or navigate to it
      try {
        // Option 1: Try to find store card by name/slug
        const storeCard = page.locator(`text=/demo|${demoStoreSlug}/i`).first();
        if (await storeCard.isVisible({ timeout: 3000 })) {
          await storeCard.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);
        } else {
          // Option 2: Direct navigation to store
          await page.goto(`${baseUrl}/stores/${demoStoreSlug}/dashboard`);
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);
        }
      } catch (e) {
        console.log('Store navigation fallback used');
        // Fallback: just show whatever is on screen
        await recorder.pause(800);
      }
    });

    // ==================== 5. PRODUKTE/KATEGORIEN ZEIGEN (10s) ====================
    await recorder.step('5. Produkte verwalten', async () => {
      try {
        // Try to find Products navigation
        const productsLink = page.locator('text=/produkte|products/i').first();
        if (await productsLink.isVisible({ timeout: 3000 })) {
          await productsLink.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(300);

          // Scroll to show product list
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await recorder.pause(700);
          await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
          await recorder.pause(300);
        }
      } catch (e) {
        console.log('Products section skipped');
      }
    });

    // ==================== 6. STORE SETTINGS ZEIGEN (15s) ====================
    await recorder.step('6. Store Einstellungen', async () => {
      try {
        // Navigate to Store Settings
        const settingsLink = page.locator('text=/einstellungen|settings/i').first();
        if (await settingsLink.isVisible({ timeout: 3000 })) {
          await settingsLink.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);

          // Scroll down to show different settings sections
          await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
          await recorder.pause(800);
          await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
          await recorder.pause(800);

          // Scroll back up
          await page.evaluate(() => window.scrollBy({ top: -800, behavior: 'smooth' }));
          await recorder.pause(700);
        }
      } catch (e) {
        console.log('Settings section skipped');
      }
    });

    // ==================== 7. BOT PROTECTION (only if visible) (5s) ====================
    await recorder.step('7. Bot-Schutz (falls verfügbar)', async () => {
      try {
        // Check if Bot Protection section exists
        const botProtectionSection = page.locator('text=/bot.*protection|schutz/i').first();
        if (await botProtectionSection.isVisible({ timeout: 2000 })) {
          // Scroll to it
          await botProtectionSection.scrollIntoViewIfNeeded();
          await recorder.pause(300);
          console.log('✅ Bot Protection feature demonstrated');
        } else {
          console.log('⚠️ Bot Protection not visible, skipping');
        }
      } catch (e) {
        console.log('Bot Protection section not found (feature may not be deployed yet)');
      }
    });

    // ==================== 8. PUBLIC STOREFRONT ÖFFNEN (15s) ====================
    await recorder.step('8. Öffentliche Storefront', async () => {
      try {
        // Try to find "View Store" or "Preview" button
        const viewStoreButton = page.locator('text=/view.*store|vorschau|preview/i').first();
        if (await viewStoreButton.isVisible({ timeout: 3000 })) {
          // Open in new tab
          const [newPage] = await Promise.all([
            page.context().waitForEvent('page'),
            viewStoreButton.click()
          ]);
          await newPage.waitForLoadState('networkidle');
          
          // Switch to new tab and continue demo there
          await newPage.bringToFront();
          await recorder.pause(800);

          // Scroll storefront
          await newPage.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
          await recorder.pause(800);
          await newPage.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
          await recorder.pause(800);

          // Close storefront tab and return to main page
          await newPage.close();
          await page.bringToFront();
          await recorder.pause(300);
        } else {
          // Fallback: direct navigation
          await page.goto(`${baseUrl}/${demoStoreSlug}`);
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);

          // Scroll storefront
          await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
          await recorder.pause(800);
        }
      } catch (e) {
        console.log('Storefront view skipped');
      }
    });

    // ==================== 9. PRODUKT DETAIL ÖFFNEN (10s) ====================
    await recorder.step('9. Produktdetail zeigen', async () => {
      try {
        // Try to find first product card
        const productCard = page.locator('[class*="product"]').first();
        if (await productCard.isVisible({ timeout: 3000 })) {
          await productCard.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(300);

          // Scroll product detail
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await recorder.pause(800);
          await page.evaluate(() => window.scrollBy({ top: -300, behavior: 'smooth' }));
          await recorder.pause(300);
        }
      } catch (e) {
        console.log('Product detail skipped');
      }
    });

    // ==================== 10. WHATSAPP BUTTON ZEIGEN (NICHT KLICKEN!) (5s) ====================
    await recorder.step('10. WhatsApp-Bestellung', async () => {
      try {
        // Find WhatsApp button but DON'T click it (no real messages!)
        const whatsappButton = page.locator('text=/whatsapp|bestellen|order/i').first();
        if (await whatsappButton.isVisible({ timeout: 3000 })) {
          // Just hover to show it exists
          await whatsappButton.scrollIntoViewIfNeeded();
          await whatsappButton.hover();
          await recorder.pause(300);
          console.log('✅ WhatsApp button demonstrated (not clicked)');
        } else {
          console.log('⚠️ WhatsApp button not found');
        }
      } catch (e) {
        console.log('WhatsApp demo skipped');
      }
    });

    // ==================== 11. RESTAURANT/RIAD BEISPIEL (optional, 10s) ====================
    await recorder.step('11. Restaurant-Features (optional)', async () => {
      try {
        // Try to find opening hours, special features, etc.
        const specialFeatures = page.locator('text=/öffnungszeiten|opening|hours|booking/i').first();
        if (await specialFeatures.isVisible({ timeout: 2000 })) {
          await specialFeatures.scrollIntoViewIfNeeded();
          await recorder.pause(300);
          console.log('✅ Special business type features demonstrated');
        } else {
          console.log('⚠️ Special features not visible, skipping');
        }
      } catch (e) {
        console.log('Special features skipped');
      }
    });

    // ==================== 12. ABSCHLUSS MIT CTA (5s) ====================
    await recorder.step('12. Zurück zur Landing Page', async () => {
      // Navigate back to landing page
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      await recorder.pause(800);

      // Scroll to CTA section
      try {
        await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
        await recorder.pause(700);
      } catch (e) {
        console.log('CTA scroll skipped');
      }

      await recorder.pause(300);
    });

    console.log('✅ Platform Demo completed!');
  });
});

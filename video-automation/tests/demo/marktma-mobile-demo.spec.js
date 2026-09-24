/**
 * markt.ma Mobile Demo - Mobile Chrome Version
 * Duration: ~60-90 seconds
 * Purpose: Mobile experience showcase for social media, ads
 * 
 * DO NOT use in production with real customer data!
 * Only use with demo credentials from ENV variables.
 */

const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('markt.ma Mobile Demo', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'marktma-mobile-demo');
    await recorder.start();
  });

  test('Mobile experience demonstration - 60-90 seconds', async ({ page }) => {
    // Load base configuration from ENV
    const baseUrl = process.env.BASE_URL || 'https://www.markt.ma';
    const demoStoreSlug = process.env.DEMO_STORE_SLUG || 'demoshop';

    // Generate unique credentials for this demo run (avoids conflicts)
    // Dev-Mode skips email verification, so registration + login works immediately
    const timestamp = Date.now();
    const email = `demo-${timestamp}@markt.ma`;
    const password = `Demo${timestamp}!`;

    console.log(`📱 Starting Mobile Demo with baseUrl: ${baseUrl}`);
    console.log(`👤 Demo user: ${email} (unique per run)`);

    // ==================== 1. MOBILE LANDING PAGE (10s) ====================
    await recorder.step('1. Landing (Mobile)', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      await recorder.pause(400);

      // Scroll down to show mobile layout
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
      await recorder.pause(800);
      await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
      await recorder.pause(400);
    });

    // ==================== 2. MOBILE REGISTRATION & LOGIN (10s) ====================
    await recorder.step('2. Registrierung & Login (Mobile)', async () => {
      try {
        // Open mobile menu if needed
        const menuButton = page.locator('[class*="menu-button"], [class*="hamburger"], button[aria-label*="menu"]').first();
        if (await menuButton.isVisible({ timeout: 2000 })) {
          await menuButton.click();
          await recorder.pause(200);
        }

        // Find register/signup button
        const registerButton = page.getByRole('button', { name: /register|sign.*up|registrieren/i }).first();
        if (await registerButton.isVisible({ timeout: 2000 })) {
          await registerButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(400);

          // Fill registration form (mobile keyboard simulation)
          const emailInput = page.getByRole('textbox', { name: /email/i }).first();
          await emailInput.click();
          await recorder.pause(200);
          await emailInput.fill(email);
          await recorder.pause(300);

          const passwordInput = page.locator('input[type="password"]').first();
          await passwordInput.click();
          await recorder.pause(200);
          await passwordInput.fill(password);
          await recorder.pause(300);

          // Submit registration
          const submitButton = page.getByRole('button', { name: /register|sign.*up|registrieren|erstellen/i }).first();
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);
          
          console.log('✅ Mobile registration successful');
          // Dev-Mode: Email verification is skipped, user is logged in automatically
        } else {
          console.log('⚠️ Register button not found, trying login instead');
          // Fallback: Try login if registration not found
          const loginButton = page.getByRole('button', { name: /login/i }).first();
          await loginButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(400);

          const emailInput2 = page.getByRole('textbox', { name: /email/i }).first();
          await emailInput2.fill(email);
          await recorder.pause(200);

          const passwordInput2 = page.locator('input[type="password"]').first();
          await passwordInput2.fill(password);
          await recorder.pause(200);

          const submitButton2 = page.getByRole('button', { name: /login/i }).first();
          await submitButton2.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(600);
        }
      } catch (e) {
        console.log('Mobile registration/login error:', e.message);
      }
    });

    // ==================== 3. MOBILE DASHBOARD (5s) ====================
    await recorder.step('3. Dashboard (Mobile)', async () => {
      await recorder.pause(800);
      
      // Try to scroll if possible
      try {
        await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
        await recorder.pause(400);
        await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'smooth' }));
        await recorder.pause(400);
      } catch (e) {
        console.log('Scrolling skipped');
      }
    });

    // ==================== 4. MOBILE PUBLIC STOREFRONT (20s) ====================
    await recorder.step('4. Storefront (Mobile)', async () => {
      try {
        // Navigate to public storefront
        await page.goto(`${baseUrl}/${demoStoreSlug}`);
        await page.waitForLoadState('networkidle');
        await recorder.pause(800);

        // Scroll through product grid (mobile)
        await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        await recorder.pause(600);
        await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        await recorder.pause(600);
        await page.evaluate(() => window.scrollBy({ top: -800, behavior: 'smooth' }));
        await recorder.pause(400);
      } catch (e) {
        console.log('Storefront navigation skipped');
      }
    });

    // ==================== 5. MOBILE PRODUKTDETAIL (15s) ====================
    await recorder.step('5. Produktdetail (Mobile)', async () => {
      try {
        // Find and click first product
        const productCard = page.locator('[class*="product"]').first();
        if (await productCard.isVisible({ timeout: 3000 })) {
          await productCard.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(800);

          // Scroll product detail (mobile)
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await recorder.pause(600);
          await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
          await recorder.pause(600);
          await page.evaluate(() => window.scrollBy({ top: -600, behavior: 'smooth' }));
          await recorder.pause(400);
        }
      } catch (e) {
        console.log('Product detail skipped');
      }
    });

    // ==================== 6. MOBILE WHATSAPP BUTTON (10s) ====================
    await recorder.step('6. WhatsApp-Button (Mobile)', async () => {
      try {
        // Find WhatsApp button (but don't click!)
        const whatsappButton = page.locator('text=/whatsapp|bestellen|order/i').first();
        if (await whatsappButton.isVisible({ timeout: 3000 })) {
          await whatsappButton.scrollIntoViewIfNeeded();
          await recorder.pause(400);
          console.log('✅ Mobile WhatsApp button demonstrated (not clicked)');
        } else {
          console.log('⚠️ WhatsApp button not found');
        }
      } catch (e) {
        console.log('WhatsApp demo skipped');
      }
    });

    // ==================== 7. MOBILE RESTAURANT MENÜ (optional, 10s) ====================
    await recorder.step('7. Restaurant-Features (optional)', async () => {
      try {
        // Try to show restaurant-specific features
        const restaurantFeatures = page.locator('text=/menü|menu|speisekarte/i').first();
        if (await restaurantFeatures.isVisible({ timeout: 2000 })) {
          await restaurantFeatures.scrollIntoViewIfNeeded();
          await recorder.pause(800);
          console.log('✅ Mobile restaurant features demonstrated');
        } else {
          console.log('⚠️ Restaurant features not visible, skipping');
        }
      } catch (e) {
        console.log('Restaurant demo skipped');
      }
    });

    // ==================== 8. ZURÜCK ZUR LANDING PAGE (5s) ====================
    await recorder.step('8. Zurück zur Landing Page', async () => {
      await page.goto(baseUrl);
      await page.waitForLoadState('networkidle');
      await recorder.pause(600);

      // Scroll to CTA
      try {
        await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' }));
        await recorder.pause(400);
      } catch (e) {
        console.log('CTA scroll skipped');
      }

      await recorder.pause(400);
    });

    console.log('✅ Mobile Demo completed!');
  });
});

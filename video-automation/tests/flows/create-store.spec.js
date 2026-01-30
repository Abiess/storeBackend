const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Create New Store Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'create-store');
    await recorder.start();
  });

  test('Complete store creation flow demonstration', async ({ page }) => {
    // Step 1: Navigate to homepage
    await recorder.step('Homepage besuchen', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Login (quick login for existing user)
    await recorder.step('Anmelden', async () => {
      // Try to find login button
      const loginSelectors = [
        'a:has-text("Anmelden")',
        'a:has-text("Login")',
        'button:has-text("Anmelden")',
        '[data-test="login-button"]',
        '[href*="/login"]',
        '[href*="/auth/login"]',
        'a[routerLink*="login"]'
      ];

      let clicked = false;
      for (const selector of loginSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            clicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // If no button found, try direct navigation
      if (!clicked) {
        await page.goto('/login').catch(() =>
          page.goto('/auth/login')
        );
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);
    });

    // Step 3: Fill login credentials
    await recorder.step('Login-Daten eingeben', async () => {
      // Wait for login form
      await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10000 });
      await recorder.pause(1000);

      // Email
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="Email"], #email').first();
      await emailInput.fill(process.env.DEMO_EMAIL || 'demo@example.com');
      await recorder.pause(800);

      // Password
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
      await passwordInput.fill(process.env.DEMO_PASSWORD || 'DemoPass123!');
      await recorder.pause(800);
    });

    // Step 4: Submit login
    await recorder.step('Anmeldung abschicken', async () => {
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Anmelden")',
        'button:has-text("Login")',
        'button:has-text("Einloggen")',
        'input[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 5: Navigate to create store page
    await recorder.step('Store erstellen aufrufen', async () => {
      // Try multiple strategies to find "create store" button/link
      const createStoreSelectors = [
        'a:has-text("Store erstellen")',
        'a:has-text("Neuer Store")',
        'a:has-text("Shop erstellen")',
        'button:has-text("Store erstellen")',
        'button:has-text("Neuer Store")',
        '[data-test="create-store"]',
        '[href*="/store/create"]',
        '[href*="/stores/new"]',
        '[href*="/create-store"]',
        'a[routerLink*="create"]',
        '.create-store-button',
        '.new-store-button'
      ];

      let clicked = false;
      for (const selector of createStoreSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.scrollIntoViewIfNeeded();
            await element.click();
            clicked = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // If no button found, try direct navigation
      if (!clicked) {
        console.log('No create store button found, trying direct navigation...');
        await page.goto('/store/create').catch(() =>
          page.goto('/stores/new').catch(() =>
            page.goto('/create-store').catch(() =>
              page.goto('/dashboard/stores/new')
            )
          )
        );
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 6: Fill store details
    await recorder.step('Store-Informationen eingeben', async () => {
      // Wait for form
      await page.waitForSelector('form, input[name*="name"], input[name*="store"]', { timeout: 10000 });
      await recorder.pause(1500);

      // Store Name
      const storeNameInput = page.locator('input[name="storeName"], input[name="name"], input[name="shopName"], input[placeholder*="Store"], input[placeholder*="Shop"], #storeName, #name').first();
      if (await storeNameInput.isVisible().catch(() => false)) {
        await storeNameInput.fill('Demo Store ' + Date.now());
        await recorder.pause(1000);
      }

      // Store Description (if exists)
      const descriptionInput = page.locator('textarea[name="description"], textarea[name="storeDescription"], input[name="description"], #description').first();
      if (await descriptionInput.isVisible().catch(() => false)) {
        await descriptionInput.fill('Dies ist ein Demo-Store für Video-Demonstrationszwecke');
        await recorder.pause(1000);
      }

      // Store URL/Subdomain (if exists)
      const urlInput = page.locator('input[name="subdomain"], input[name="url"], input[name="storeUrl"], input[placeholder*="subdomain"], input[placeholder*="URL"], #subdomain').first();
      if (await urlInput.isVisible().catch(() => false)) {
        await urlInput.fill('demo-store-' + Date.now());
        await recorder.pause(1000);
      }

      // Category/Type (if exists)
      const categorySelect = page.locator('select[name="category"], select[name="type"], #category').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption({ index: 1 });
        await recorder.pause(800);
      }

      // Address/Location fields (if exists)
      const addressInput = page.locator('input[name="address"], input[name="street"], input[placeholder*="Adresse"], #address').first();
      if (await addressInput.isVisible().catch(() => false)) {
        await addressInput.fill('Musterstraße 123');
        await recorder.pause(500);
      }

      const cityInput = page.locator('input[name="city"], input[name="stadt"], input[placeholder*="Stadt"], #city').first();
      if (await cityInput.isVisible().catch(() => false)) {
        await cityInput.fill('Berlin');
        await recorder.pause(500);
      }

      const postalCodeInput = page.locator('input[name="postalCode"], input[name="zipCode"], input[name="plz"], input[placeholder*="PLZ"], #postalCode').first();
      if (await postalCodeInput.isVisible().catch(() => false)) {
        await postalCodeInput.fill('10115');
        await recorder.pause(500);
      }

      // Phone (if exists)
      const phoneInput = page.locator('input[name="phone"], input[name="telefon"], input[type="tel"], input[placeholder*="Telefon"], #phone').first();
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('+49 30 12345678');
        await recorder.pause(500);
      }

      await recorder.pause(1500);
    });

    // Step 7: Submit store creation
    await recorder.step('Store erstellen abschließen', async () => {
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Store erstellen")',
        'button:has-text("Erstellen")',
        'button:has-text("Speichern")',
        'button:has-text("Create")',
        'button:has-text("Save")',
        'input[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.scrollIntoViewIfNeeded();
            await button.click();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // Step 8: Verify successful store creation
    await recorder.step('Store erfolgreich erstellt', async () => {
      // Wait for success indicators
      const successSelectors = [
        'text=Erfolgreich',
        'text=Success',
        'text=Store erstellt',
        'text=Shop erstellt',
        'text=Erstellt',
        'text=Created',
        '.success-message',
        '.alert-success',
        '[data-test="success"]',
        '.store-dashboard',
        '[href*="/store/"]',
        'button:has-text("Store bearbeiten")',
        'button:has-text("Store verwalten")'
      ];

      let found = false;
      for (const selector of successSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          found = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!found) {
        console.log('Success indicator not clearly visible, but continuing...');
      }

      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});


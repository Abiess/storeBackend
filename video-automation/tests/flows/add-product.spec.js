const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Add Product Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'add-product');
    await recorder.start();
  });

  test('Complete login and add product flow demonstration', async ({ page }) => {
    const email = process.env.DEMO_EMAIL || 'demo@example.com';
    const password = process.env.DEMO_PASSWORD || 'DemoPass123!';

    // Step 1: Navigate to homepage
    await recorder.step('Homepage aufrufen', async () => {
      await page.goto('https://markt.ma/');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Navigate to login
    await recorder.step('Zum Login navigieren', async () => {
      const loginSelectors = [
        'a:has-text("Anmelden")',
        'a:has-text("Login")',
        'a:has-text("Sign in")',
        'button:has-text("Anmelden")',
        '[data-test="login-button"]',
        '[href*="/login"]',
        '[href*="/signin"]',
        '[href*="/auth/login"]',
        'a[routerLink*="login"]',
        '.login-link',
        '.signin-link'
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

      // If no login button found, try direct navigation
      if (!clicked) {
        console.log('No login button found, trying direct navigation...');
        await page.goto('https://markt.ma/login').catch(() =>
          page.goto('https://markt.ma/signin').catch(() =>
            page.goto('https://markt.ma/auth/login')
          )
        );
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);
    });

    // Step 3: Fill login credentials
    await recorder.step('Login-Daten eingeben', async () => {
      await page.waitForSelector('input[type="email"], input[name="email"], input[name="username"]', { timeout: 10000 });
      await recorder.pause(1000);

      // Email
      const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="Email"], input[placeholder*="E-Mail"], #email, #username').first();
      await emailInput.fill(email);
      await recorder.pause(1000);

      // Password
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(password);
      await recorder.pause(1000);
    });

    // Step 4: Submit login
    await recorder.step('Einloggen', async () => {
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Anmelden")',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
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
      await recorder.pause(3000);
    });

    // Step 5: Open store management
    await recorder.step('Store-Verwaltung öffnen', async () => {
      const manageStoreButton = page.getByRole('button', { name: '📊 Manage store' }).first();
      await manageStoreButton.waitFor({ state: 'visible', timeout: 10000 });
      await manageStoreButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 6: Click Add Product button
    await recorder.step('Produkt hinzufügen starten', async () => {
      const addProductButton = page.getByRole('button', { name: '➕ Add product' });
      await addProductButton.waitFor({ state: 'visible', timeout: 10000 });
      await addProductButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 7: Fill product name
    await recorder.step('Produktname eingeben', async () => {
      const productNameInput = page.getByRole('textbox', { name: 'Product name *' });
      await productNameInput.waitFor({ state: 'visible', timeout: 10000 });
      await productNameInput.click();
      await recorder.pause(500);
      await productNameInput.fill('product1');
      await recorder.pause(1500);
    });

    // Step 8: Fill SKU
    await recorder.step('SKU eingeben', async () => {
      const skuInput = page.getByRole('textbox', { name: 'SKU: {{sku}}' });
      await skuInput.click();
      await recorder.pause(500);
      await skuInput.fill('14');
      await recorder.pause(1500);
    });

    // Step 9: Fill description
    await recorder.step('Produktbeschreibung eingeben', async () => {
      const descriptionInput = page.getByRole('textbox', { name: 'Description *' });
      await descriptionInput.click();
      await recorder.pause(500);
      await descriptionInput.fill('first product for testing');
      await recorder.pause(1500);
    });

    // Step 10: Fill price
    await recorder.step('Preis eingeben', async () => {
      const priceInput = page.getByRole('spinbutton', { name: 'Price (€) *' });
      await priceInput.click();
      await recorder.pause(500);
      await priceInput.fill('11');
      await recorder.pause(1500);
    });

    // Step 11: Select status
    await recorder.step('Status auswählen', async () => {
      const statusSelect = page.getByLabel('Status');
      await statusSelect.click();
      await recorder.pause(500);
      await statusSelect.selectOption('ACTIVE');
      await recorder.pause(1500);
    });

    // Step 12: Select category
    await recorder.step('Kategorie auswählen', async () => {
      const categorySelect = page.getByLabel('Category *');
      await categorySelect.click();
      await recorder.pause(500);
      await categorySelect.selectOption('1: 5');
      await recorder.pause(1500);
    });

    // Step 13: Submit product creation
    await recorder.step('Produkt erstellen', async () => {
      const createButton = page.getByRole('button', { name: 'product.create' });
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
      await createButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // Step 14: Verify success
    await recorder.step('Erfolgreich erstellt', async () => {
      // Wait for success indicators
      const successSelectors = [
        'text=/.*erfolgreich.*/i',
        'text=/.*success.*/i',
        'text=/.*created.*/i',
        'text=/.*erstellt.*/i',
        '.success-message',
        '.alert-success',
        '[role="alert"]:has-text("success")',
        '.mat-snack-bar-container'
      ];

      let found = false;
      for (const selector of successSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          found = true;
          console.log('✅ Success indicator found');
          break;
        } catch (e) {
          continue;
        }
      }

      if (!found) {
        console.log('⚠️  Success indicator not clearly visible, checking if product appears in list...');
        // Alternative: Check if we're back at product list
        try {
          await page.waitForSelector('text=product1', { timeout: 5000 });
          console.log('✅ Product appears in list');
          found = true;
        } catch (e) {
          console.log('⚠️  Product verification unclear, but continuing...');
        }
      }

      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});


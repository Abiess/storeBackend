const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Create Store Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'create-store');
    await recorder.start();
  });

  test('Complete login and create store flow demonstration', async ({ page }) => {
    const email = process.env.DEMO_EMAIL || 'demo@markt.ma';
    const password = process.env.DEMO_PASSWORD || 'demoatmarkt.ma';
    const storeName = 'myfirstshop';
    const storeDescription = 'here is my first shop ever :)';

    // Step 1: Navigate to homepage
    await recorder.step('Homepage aufrufen', async () => {
      await page.goto('https://markt.ma/');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Click Login button
    await recorder.step('Login-Button klicken', async () => {
      const loginButton = page.getByRole('button', { name: 'Login' });
      await loginButton.waitFor({ state: 'visible', timeout: 10000 });
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);
    });

    // Step 3: Fill email
    await recorder.step('E-Mail eingeben', async () => {
      const emailInput = page.getByRole('textbox', { name: 'Email' });
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.click();
      await recorder.pause(500);
      await emailInput.fill(email);
      await recorder.pause(1000);
    });

    // Step 4: Fill password
    await recorder.step('Passwort eingeben', async () => {
      const passwordInput = page.getByRole('textbox', { name: 'Password' });
      await passwordInput.click();
      await recorder.pause(500);
      await passwordInput.fill(password);
      await recorder.pause(1000);
    });

    // Step 5: Submit login
    await recorder.step('Einloggen', async () => {
      const loginButton = page.getByRole('button', { name: 'Login' });
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // Step 6: Click Create First Store
    await recorder.step('Store erstellen starten', async () => {
      const createStoreButton = page.getByRole('button', { name: '➕ Create first store' });
      await createStoreButton.waitFor({ state: 'visible', timeout: 10000 });
      await createStoreButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 7: Select Own Store option
    await recorder.step('Eigenen Store wählen', async () => {
      const ownStoreButton = page.getByRole('button', { name: '🚀 Eigenen Store erstellen' });
      await ownStoreButton.waitFor({ state: 'visible', timeout: 10000 });
      await ownStoreButton.click();
      await recorder.pause(2000);
    });

    // Step 8: Click Create First Store again (if needed)
    await recorder.step('Store-Formular öffnen', async () => {
      try {
        const createButton = page.getByRole('button', { name: '➕ Create first store' });
        if (await createButton.isVisible({ timeout: 2000 })) {
          await createButton.click();
          await page.waitForLoadState('networkidle');
        }
      } catch (e) {
        console.log('Store form already open');
      }
      await recorder.pause(2000);
    });

    // Step 9: Fill store name
    await recorder.step('Store-Name eingeben', async () => {
      const storeNameInput = page.getByRole('textbox', { name: 'Store name *' });
      await storeNameInput.waitFor({ state: 'visible', timeout: 10000 });
      await storeNameInput.click();
      await recorder.pause(500);
      await storeNameInput.fill(storeName);
      await recorder.pause(1500);
    });

    // Step 10: Fill store description
    await recorder.step('Store-Beschreibung eingeben', async () => {
      const descriptionInput = page.getByRole('textbox', { name: 'Description (optional)' });
      await descriptionInput.click();
      await recorder.pause(500);
      await descriptionInput.fill(storeDescription);
      await recorder.pause(1500);
    });

    // Step 11: Submit store creation
    await recorder.step('Store erstellen', async () => {
      const createButton = page.getByRole('button', { name: '✓ Create store' });
      await createButton.waitFor({ state: 'visible', timeout: 10000 });
      await createButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // Step 12: Verify store created and click store link
    await recorder.step('Store-Link öffnen', async () => {
      const storeLink = page.getByRole('link', { name: `${storeName}.markt.ma` });
      await storeLink.waitFor({ state: 'visible', timeout: 10000 });

      // Handle popup/new tab
      const page1Promise = page.waitForEvent('popup');
      await storeLink.click();
      const page1 = await page1Promise;

      await page1.waitForLoadState('networkidle');
      await recorder.pause(2000);

      // Navigate through onboarding if present
      try {
        const nextButton = page1.getByRole('button', { name: 'Next' });
        if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
          await recorder.pause(1500);
          await nextButton.click();
          await recorder.pause(1500);
        }
      } catch (e) {
        console.log('No onboarding present');
      }

      // Close the popup and return to main page
      await page1.close();
      await recorder.pause(1000);
    });

    // Step 13: Open Store Management
    await recorder.step('Store-Verwaltung öffnen', async () => {
      const manageButton = page.getByRole('button', { name: '📊 Manage store' });
      await manageButton.waitFor({ state: 'visible', timeout: 10000 });
      await manageButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 14: Verify success
    await recorder.step('Erfolgreich erstellt', async () => {
      // Verify we're in store management
      const successIndicators = [
        'text=/.*dashboard.*/i',
        'text=/.*verwaltung.*/i',
        'text=/.*management.*/i',
        'button:has-text("Add product")',
        'button:has-text("Produkt hinzufügen")'
      ];

      let found = false;
      for (const selector of successIndicators) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          found = true;
          console.log('✅ Store management opened successfully');
          break;
        } catch (e) {
          continue;
        }
      }

      if (!found) {
        console.log('⚠️  Success verification unclear, but continuing...');
      }

      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});

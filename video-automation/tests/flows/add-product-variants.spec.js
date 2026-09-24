const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');
test.describe('Add Product with Variants Flow', () => {
  let recorder;
  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'add-product-variants');
    await recorder.start();
  });
  test('Complete login and add product with variants demonstration', async ({ page }) => {
    const email = process.env.DEMO_EMAIL || 'demo@markt.ma';
    const password = process.env.DEMO_PASSWORD || 'demoatmarkt.ma';
    // Step 1: Navigate to homepage and login
    await recorder.step('Homepage aufrufen und einloggen', async () => {
      await page.goto('https://markt.ma/');
      await page.waitForLoadState('networkidle');
      // Login
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(1500);
      await page.getByRole('textbox', { name: 'Email' }).fill(email);
      await recorder.pause(800);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await recorder.pause(800);
      await page.getByRole('button', { name: 'Login' }).click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });
    // Step 2: Open store management
    await recorder.step('Store-Verwaltung öffnen', async () => {
      const manageButton = page.getByRole('button', { name: '📊 Manage store' }).first();
      await manageButton.waitFor({ state: 'visible', timeout: 10000 });
      await manageButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });
    // Step 3: Click Add Product
    await recorder.step('Neues Produkt erstellen', async () => {
      const addProductButton = page.getByRole('button', { name: '➕ Add product' });
      await addProductButton.waitFor({ state: 'visible', timeout: 10000 });
      await addProductButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });
    // Step 4: Fill basic product info
    await recorder.step('Basis-Produktinformationen eingeben', async () => {
      // Product name
      await page.getByRole('textbox', { name: 'Product name *' }).fill('Demo T-Shirt');
      await recorder.pause(1000);
      // SKU
      await page.getByRole('textbox', { name: /SKU/ }).fill('TSHIRT-001');
      await recorder.pause(800);
      // Description
      await page.getByRole('textbox', { name: 'Description *' }).fill('Hochwertiges Baumwoll-T-Shirt in verschiedenen Farben und Größen');
      await recorder.pause(1000);
      // Base Price
      await page.getByRole('spinbutton', { name: /Price.*€/ }).fill('19.99');
      await recorder.pause(800);
      // Category
      try {
        await page.getByLabel('Category *').selectOption({ index: 1 });
        await recorder.pause(800);
      } catch (e) {
        console.log('Category field not found or already selected');
      }
      // Status
      try {
        await page.getByLabel('Status').selectOption('ACTIVE');
        await recorder.pause(800);
      } catch (e) {
        console.log('Status field not found or already selected');
      }
    });
    // Step 5: Switch to Variants tab
    await recorder.step('Zum Varianten-Tab wechseln', async () => {
      const variantsTabSelectors = [
        'text=Varianten',
        'text=Variants',
        '[title*="Varianten"]',
        '[title*="Variants"]',
        '.tab-item:has-text("Varianten")',
        '.tab-item:has-text("🎨")'
      ];
      for (const selector of variantsTabSelectors) {
        try {
          const tab = page.locator(selector).first();
          if (await tab.isVisible({ timeout: 2000 })) {
            await tab.click();
            await page.waitForLoadState('networkidle');
            break;
          }
        } catch (e) {
          continue;
        }
      }
      await recorder.pause(2000);
    });
    // Step 6: Add first option (Farbe)
    await recorder.step('Option "Farbe" hinzufügen', async () => {
      // Click Add Option button
      const addOptionButton = page.locator('button:has-text("Option hinzufügen"), button:has-text("Add Option")').first();
      await addOptionButton.click();
      await recorder.pause(1000);
      // Fill option name
      const optionNameInput = page.locator('input[placeholder*="Option"], .option-name-input').first();
      await optionNameInput.fill('Farbe');
      await recorder.pause(1000);
      // Add color values
      const firstValueInput = page.locator('.value-input').first();
      await firstValueInput.fill('Schwarz');
      await recorder.pause(800);
      // Add more values
      const addValueButton = page.locator('button:has-text("Wert hinzufügen"), button:has-text("Add Value")').first();
      await addValueButton.click();
      await recorder.pause(500);
      const secondValueInput = page.locator('.value-input').nth(1);
      await secondValueInput.fill('Weiß');
      await recorder.pause(800);
      await addValueButton.click();
      await recorder.pause(500);
      const thirdValueInput = page.locator('.value-input').nth(2);
      await thirdValueInput.fill('Blau');
      await recorder.pause(800);
    });
    // Step 7: Add second option (Größe)
    await recorder.step('Option "Größe" hinzufügen', async () => {
      const addOptionButton = page.locator('button:has-text("Option hinzufügen"), button:has-text("Add Option")').first();
      await addOptionButton.click();
      await recorder.pause(1000);
      // Fill second option name
      const optionNameInput = page.locator('.option-name-input').nth(1);
      await optionNameInput.fill('Größe');
      await recorder.pause(1000);
      // Option 2 has one default value field, fill it
      const valueInputs = page.locator('.option-card').nth(1).locator('.value-input');
      await valueInputs.first().fill('S');
      await recorder.pause(800);
      // Add more sizes
      const addValueButton = page.locator('.option-card').nth(1).locator('button:has-text("Wert hinzufügen"), button:has-text("Add Value")');
      await addValueButton.click();
      await recorder.pause(500);
      await valueInputs.nth(1).fill('M');
      await recorder.pause(800);
      await addValueButton.click();
      await recorder.pause(500);
      await valueInputs.nth(2).fill('L');
      await recorder.pause(800);
    });
    // Step 8: Set base price and stock
    await recorder.step('Basispreis und Lagerbestand festlegen', async () => {
      const basePriceInput = page.locator('input.price-input, input[placeholder*="0.00"]').first();
      await basePriceInput.fill('19.99');
      await recorder.pause(1000);
      const baseStockInput = page.locator('input.stock-input, input[placeholder*="0"]').first();
      await baseStockInput.fill('10');
      await recorder.pause(1000);
    });
    // Step 9: Generate variants
    await recorder.step('Varianten generieren', async () => {
      const generateButton = page.locator('button:has-text("Varianten generieren"), button:has-text("Generate Variants"), .btn-generate').first();
      await generateButton.waitFor({ state: 'visible', timeout: 5000 });
      await generateButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });
    // Step 10: Edit first variant (Schwarz, S)
    await recorder.step('Erste Variante bearbeiten (Schwarz, S)', async () => {
      // Find first variant card
      const firstVariant = page.locator('.variant-card-expanded, .variant-card').first();
      // Adjust price for black
      const priceInput = firstVariant.locator('input[type="number"]').first();
      await priceInput.fill('22.99');
      await recorder.pause(1000);
      // Adjust stock
      const stockInput = firstVariant.locator('input[type="number"]').nth(1);
      await stockInput.fill('15');
      await recorder.pause(1000);
      // Upload image (if available)
      try {
        const fileInput = firstVariant.locator('input[type="file"]');
        if (await fileInput.isVisible({ timeout: 1000 })) {
          // Would upload tshirt-black.svg here
          console.log('📸 Image upload field found for variant');
        }
      } catch (e) {
        console.log('No file input found');
      }
      await recorder.pause(1500);
    });
    // Step 11: Save all variants
    await recorder.step('Alle Varianten speichern', async () => {
      const saveButton = page.locator('button:has-text("Alle Varianten speichern"), button:has-text("Save All Variants"), .btn-save-variants').first();
      await saveButton.waitFor({ state: 'visible', timeout: 5000 });
      await saveButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });
    // Step 12: Save the product
    await recorder.step('Produkt speichern', async () => {
      const saveProductButton = page.locator('button[type="submit"], button:has-text("Speichern"), button:has-text("Save")').first();
      try {
        if (await saveProductButton.isVisible({ timeout: 2000 })) {
          await saveProductButton.click();
          await page.waitForLoadState('networkidle');
          await recorder.pause(3000);
        }
      } catch (e) {
        console.log('Save button not found or already saved');
      }
    });
    // Step 13: Verify success
    await recorder.step('Produkt mit Varianten erfolgreich erstellt', async () => {
      const successSelectors = [
        'text=/.*erfolgreich.*/i',
        'text=/.*success.*/i',
        'text=/.*created.*/i',
        '.success-message',
        '.alert-success'
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
        console.log('⚠️ Success indicator not clearly visible, but continuing...');
      }
      await recorder.pause(2000);
    });
    await recorder.finish();
  });
});

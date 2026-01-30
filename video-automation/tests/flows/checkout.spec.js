const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Checkout Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'checkout');
    await recorder.start();
  });

  test('Complete checkout flow demonstration', async ({ page }) => {
    // Step 1: Navigate to products
    await recorder.step('Zur Produktübersicht', async () => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Select a product
    await recorder.step('Produkt auswählen', async () => {
      const firstProduct = page.locator('.product-card, [data-test="product-item"]').first();
      await firstProduct.scrollIntoViewIfNeeded();
      await recorder.pause(1000);
      await firstProduct.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 3: Add to cart
    await recorder.step('In den Warenkorb legen', async () => {
      const addToCartButton = page.locator('button:has-text("In den Warenkorb"), [data-test="add-to-cart"]').first();
      await addToCartButton.scrollIntoViewIfNeeded();
      await addToCartButton.click();
      await recorder.pause(2000);
    });

    // Step 4: Go to cart
    await recorder.step('Zum Warenkorb', async () => {
      const cartButton = page.locator('[data-test="cart-button"], .cart-icon, button:has-text("Warenkorb")').first();
      await cartButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 5: Proceed to checkout
    await recorder.step('Zur Kasse gehen', async () => {
      const checkoutButton = page.locator('button:has-text("Zur Kasse"), [data-test="checkout-button"]').first();
      await checkoutButton.scrollIntoViewIfNeeded();
      await checkoutButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 6: Fill shipping information
    await recorder.step('Versandinformationen eingeben', async () => {
      await page.fill('input[name="firstName"], #firstName', 'Max');
      await recorder.pause(500);
      await page.fill('input[name="lastName"], #lastName', 'Mustermann');
      await recorder.pause(500);
      await page.fill('input[name="address"], #address', 'Musterstraße 123');
      await recorder.pause(500);
      await page.fill('input[name="city"], #city', 'Berlin');
      await recorder.pause(500);
      await page.fill('input[name="postalCode"], #postalCode', '10115');
      await recorder.pause(1500);
    });

    // Step 7: Select payment method
    await recorder.step('Zahlungsmethode wählen', async () => {
      const paymentOption = page.locator('input[type="radio"][value="cod"], label:has-text("Nachnahme")').first();
      await paymentOption.scrollIntoViewIfNeeded();
      await paymentOption.click();
      await recorder.pause(2000);
    });

    // Step 8: Complete order
    await recorder.step('Bestellung abschließen', async () => {
      const placeOrderButton = page.locator('button:has-text("Bestellung abschließen"), [data-test="place-order"]').first();
      await placeOrderButton.scrollIntoViewIfNeeded();
      await placeOrderButton.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(3000);
    });

    // Step 9: Verify success
    await recorder.step('Bestellung erfolgreich', async () => {
      await page.waitForSelector('text=Vielen Dank, text=Bestellung erfolgreich, [data-test="order-success"]', { timeout: 10000 });
      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});


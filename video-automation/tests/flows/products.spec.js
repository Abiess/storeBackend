const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Products Browse Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'products');
    await recorder.start();
  });

  test('Complete product browsing demonstration', async ({ page }) => {
    // Step 1: Navigate to products
    await recorder.step('Zur Produktübersicht', async () => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Browse categories
    await recorder.step('Kategorie auswählen', async () => {
      const categoryFilter = page.locator('.category-filter, [data-test="category-filter"]').first();
      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
        await recorder.pause(1500);
      }
    });

    // Step 3: View product details
    await recorder.step('Produktdetails ansehen', async () => {
      const product = page.locator('.product-card, [data-test="product-item"]').first();
      await product.scrollIntoViewIfNeeded();
      await recorder.pause(1000);
      await product.click();
      await page.waitForLoadState('networkidle');
      await recorder.pause(2500);
    });

    // Step 4: Check product images
    await recorder.step('Produktbilder durchsehen', async () => {
      const imageGallery = page.locator('.product-images, [data-test="product-gallery"]');
      if (await imageGallery.isVisible()) {
        await imageGallery.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      }
    });

    // Step 5: Read description
    await recorder.step('Produktbeschreibung lesen', async () => {
      const description = page.locator('.product-description, [data-test="product-description"]');
      if (await description.isVisible()) {
        await description.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      }
    });

    // Step 6: Check related products
    await recorder.step('Ähnliche Produkte ansehen', async () => {
      const relatedSection = page.locator('.related-products, [data-test="related-products"]');
      if (await relatedSection.isVisible()) {
        await relatedSection.scrollIntoViewIfNeeded();
        await recorder.pause(2000);
      }
    });

    await recorder.finish();
  });
});


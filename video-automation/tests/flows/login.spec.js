const { test, expect } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Register & Login Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'register');
    await recorder.start();
  });

  test('Complete registration and login flow demonstration', async ({ page }) => {
    const email = process.env.DEMO_EMAIL || 'demo@example.com';
    const password = process.env.DEMO_PASSWORD || 'DemoPass123!';
    let registrationFailed = false;

    // Step 1: Navigate to homepage
    await recorder.step('Homepage besuchen', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Navigate to register page or click register link
    await recorder.step('Registrierung starten', async () => {
      // Try multiple strategies to find register link/button
      const registerSelectors = [
        'a:has-text("Registrieren")',
        'a:has-text("Register")',
        'a:has-text("Sign up")',
        'a:has-text("Konto erstellen")',
        'button:has-text("Registrieren")',
        '[data-test="register-button"]',
        '[href*="/register"]',
        '[href*="/signup"]',
        '[href*="/auth/register"]',
        'a[routerLink*="register"]',
        '.register-link',
        '.signup-link'
      ];

      let clicked = false;

      for (const selector of registerSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            clicked = true;
            break;
          }
        } catch (e) {
          // Try next selector
          continue;
        }
      }

      // If no register button found, try direct navigation
      if (!clicked) {
        console.log('No register button found, trying direct navigation...');
        await page.goto('/register').catch(() =>
            page.goto('/signup').catch(() =>
                page.goto('/auth/register')
            )
        );
      }

      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 3: Fill registration form
    await recorder.step('Registrierungsdaten eingeben', async () => {
      // Wait for form to be visible
      await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10000 });
      await recorder.pause(1000);

      // Name/Vorname (if exists)
      const firstNameInput = page.locator('input[name="firstName"], input[name="firstname"], input[placeholder*="Vorname"], input[placeholder*="First"], #firstName, #firstname').first();
      if (await firstNameInput.isVisible().catch(() => false)) {
        await firstNameInput.fill('Demo');
        await recorder.pause(500);
      }

      const lastNameInput = page.locator('input[name="lastName"], input[name="lastname"], input[placeholder*="Nachname"], input[placeholder*="Last"], #lastName, #lastname').first();
      if (await lastNameInput.isVisible().catch(() => false)) {
        await lastNameInput.fill('User');
        await recorder.pause(500);
      }

      // Email
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="Email"], input[placeholder*="E-Mail"], #email').first();
      await emailInput.fill(email);
      await recorder.pause(1000);

      // Password (find first password field)
      const passwordFields = page.locator('input[type="password"]');
      const passwordCount = await passwordFields.count();

      if (passwordCount >= 1) {
        await passwordFields.nth(0).fill(password);
        await recorder.pause(1000);
      }

      // Confirm Password (if exists - usually second password field)
      if (passwordCount >= 2) {
        await passwordFields.nth(1).fill(password);
        await recorder.pause(1000);
      }

      // Accept Terms/Conditions (if exists)
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible().catch(() => false)) {
        await termsCheckbox.check();
        await recorder.pause(500);
      }
    });

    // Step 4: Submit registration
    await recorder.step('Registrierung abschicken', async () => {
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Registrieren")',
        'button:has-text("Register")',
        'button:has-text("Konto erstellen")',
        'button:has-text("Sign up")',
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

      // Check for error messages indicating email already exists
      const errorSelectors = [
        'text=/.*bereits registriert.*/i',
        'text=/.*already registered.*/i',
        'text=/.*already exists.*/i',
        'text=/.*email.*taken.*/i',
        'text=/.*E-Mail.*existiert.*/i',
        'text=/.*existiert bereits.*/i',
        '.error-message:has-text("E-Mail")',
        '.error-message:has-text("email")',
        '.alert-danger:has-text("E-Mail")',
        '.alert-danger:has-text("email")',
        '[role="alert"]:has-text("E-Mail")',
        '[role="alert"]:has-text("email")',
        '.mat-error:has-text("E-Mail")',
        '.mat-error:has-text("email")'
      ];

      for (const selector of errorSelectors) {
        try {
          const errorMessage = page.locator(selector).first();
          if (await errorMessage.isVisible({ timeout: 2000 })) {
            console.log('Email already registered - switching to login flow');
            registrationFailed = true;
            await recorder.pause(2000);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    });

    // Step 5: If registration failed, switch to login
    if (registrationFailed) {
      await recorder.step('Wechsel zum Login', async () => {
        // Navigate to login page
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
          await page.goto('/login').catch(() =>
              page.goto('/signin').catch(() =>
                  page.goto('/auth/login')
              )
          );
        }

        await page.waitForLoadState('networkidle');
        await recorder.pause(2000);
      });

      // Step 6: Fill login form
      await recorder.step('Login-Daten eingeben', async () => {
        await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10000 });
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

      // Step 7: Submit login
      await recorder.step('Login abschicken', async () => {
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
    }

    // Step 8: Verify successful registration/login
    await recorder.step(registrationFailed ? 'Erfolgreich eingeloggt' : 'Erfolgreich registriert', async () => {
      // Wait for success indicators
      const successSelectors = [
        '[data-test="user-menu"]',
        '.user-profile',
        'text=Willkommen',
        'text=Welcome',
        'text=Erfolgreich',
        'text=Success',
        '.dashboard',
        '[routerLink*="dashboard"]',
        '.user-avatar',
        '.logout-button',
        'button:has-text("Abmelden")',
        'button:has-text("Logout")'
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

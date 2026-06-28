const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: {
      mode: 'on',
      size: {
        width: parseInt(process.env.VIDEO_WIDTH) || 1920,
        height: parseInt(process.env.VIDEO_HEIGHT) || 1080
      }
    },
    viewport: {
      width: parseInt(process.env.VIDEO_WIDTH) || 1920,
      height: parseInt(process.env.VIDEO_HEIGHT) || 1080
    },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Slow down actions for better visibility (optimized for demo videos)
    launchOptions: {
      slowMo: 300  // Reduced from 500 to 300 for faster demos
    }
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: parseInt(process.env.VIDEO_WIDTH) || 1920,
          height: parseInt(process.env.VIDEO_HEIGHT) || 1080
        },
        // Set German locale for demos
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin'
      }
    },
    {
      name: 'chromium-fr',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: parseInt(process.env.VIDEO_WIDTH) || 1920,
          height: parseInt(process.env.VIDEO_HEIGHT) || 1080
        },
        // Set French locale for French demos
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris'
      }
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: {
          width: 393,
          height: 851
        },
        launchOptions: {
          slowMo: 500
        },
        // Set German locale for mobile demos
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin'
      }
    }
  ]
});


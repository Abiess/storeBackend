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
    // Slow down actions for better visibility
    launchOptions: {
      slowMo: 500
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
        }
      }
    }
  ]
});


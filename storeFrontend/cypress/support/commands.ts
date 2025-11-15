// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to wait for Angular to be ready
       * @example cy.waitForAngular()
       */
      waitForAngular(): Chainable<void>;
    }
  }
}

// Custom command for login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Custom command to wait for Angular
Cypress.Commands.add('waitForAngular', () => {
  cy.window().then((win: any) => {
    return new Cypress.Promise((resolve) => {
      if (win.getAllAngularTestabilities) {
        const testabilities = win.getAllAngularTestabilities();
        const count = testabilities.length;
        let remaining = count;

        testabilities.forEach((testability: any) => {
          testability.whenStable(() => {
            remaining--;
            if (remaining === 0) {
              resolve();
            }
          });
        });
      } else {
        resolve();
      }
    });
  });
});

// Prevent TypeScript from reading file as legacy script
export {};
// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR in command log for cleaner videos
Cypress.on('window:before:load', (win) => {
  // Stub console methods to reduce noise in videos
  cy.stub(win.console, 'log');
  cy.stub(win.console, 'warn');
  cy.stub(win.console, 'error');
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on uncaught exceptions
  // This is useful for demo videos where minor errors shouldn't stop the flow
  console.error('Uncaught exception:', err.message);
  return false;
});


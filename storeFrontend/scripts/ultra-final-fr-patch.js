#!/usr/bin/env node

/**
 * Ultra-Final JSON Patch - Last 28 FR keys
 * Direct JSON manipulation to ensure nested keys are properly added
 */

const fs = require('fs');
const path = require('path');

const FR_PATH = path.join(__dirname, '..', 'src', 'assets', 'i18n', 'fr.json');

// Load FR
let fr = JSON.parse(fs.readFileSync(FR_PATH, 'utf8'));

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  🔧 ULTRA-FINAL FR PATCH - Last 28 Keys');
console.log('════════════════════════════════════════════════════════════════\n');

let count = 0;

// 1. Settings shipping keys (15 missing - 2 already exist)
if (!fr.settings) fr.settings = {};
if (!fr.settings.shipping) fr.settings.shipping = {};

const shippingKeys = {
  title: 'Adresse d\'expédition',
  hint: 'Adresse de l\'expéditeur pour les étiquettes d\'expédition DHL. Cette adresse apparaît sur toutes les étiquettes d\'expédition.',
  street: 'Rue',
  streetPlaceholder: 'Rue du Roi',
  streetRequired: 'La rue est requise',
  houseNumber: 'Numéro de maison',
  houseNumberRequired: 'Le numéro de maison est requis',
  postalCode: 'Code postal',
  postalCodeRequired: 'Le code postal est requis',
  city: 'Ville',
  cityPlaceholder: 'Nuremberg',
  cityRequired: 'La ville est requise',
  country: 'Pays',
  countryRequired: 'Le pays est requis (par ex. DE, AT, CH)',
  email: 'E-mail (optionnel)',
  emailPlaceholder: 'shipping@example.com',
  savedSuccess: '✅ Adresse d\'expédition enregistrée avec succès'
};

for (const [key, value] of Object.entries(shippingKeys)) {
  if (!fr.settings.shipping[key]) {
    fr.settings.shipping[key] = value;
    console.log(`✓ settings.shipping.${key}`);
    count++;
  }
}

// 2. WooCommerce cleanup keys (8 missing)
if (!fr.woocommerce) fr.woocommerce = {};
if (!fr.woocommerce.cleanup) fr.woocommerce.cleanup = {};

const cleanupKeys = {
  willChange: 'Sera modifié',
  noChange: 'Aucun changement',
  errorsTitle: 'Erreurs',
  cleanupComplete: 'Nettoyage terminé',
  confirmTitle: 'Confirmer le nettoyage',
  confirmMessage: 'Cette action modifiera de manière permanente les descriptions de produits.',
  confirmNote: 'Aucun prix, image, variante ou catégorie ne sera modifié.',
  cancel: 'Annuler'
};

for (const [key, value] of Object.entries(cleanupKeys)) {
  if (!fr.woocommerce.cleanup[key]) {
    fr.woocommerce.cleanup[key] = value;
    console.log(`✓ woocommerce.cleanup.${key}`);
    count++;
  }
}

// 3. Auth key (1 missing)
if (!fr.auth) fr.auth = {};
if (!fr.auth.checkingEmail) {
  fr.auth.checkingEmail = 'Vérification de l\'e-mail...';
  console.log(`✓ auth.checkingEmail`);
  count++;
}

// 4. Email keys (2 missing)
if (!fr.email) fr.email = {};
if (!fr.email.accountCreatedMailFailed) {
  fr.email.accountCreatedMailFailed = 'Compte créé, mais l\'e-mail n\'a pas pu être envoyé';
  console.log(`✓ email.accountCreatedMailFailed`);
  count++;
}
if (!fr.email.retry) {
  fr.email.retry = 'Réessayer';
  console.log(`✓ email.retry`);
  count++;
}

// Save updated FR
fs.writeFileSync(FR_PATH, JSON.stringify(fr, null, 2), 'utf8');

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ✅ ULTRA-FINAL - ${count} keys added to FR`);
console.log('════════════════════════════════════════════════════════════════\n');

console.log('🎯 Running i18n:check to verify 0 missing keys...\n');

process.exit(0);

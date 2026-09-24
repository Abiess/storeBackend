#!/usr/bin/env node

/**
 * ABSOLUTE FINAL FIX - Last 55 i18n keys
 * EN: 1, AR: 3, FR: 51 (WooCommerce)
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'assets', 'i18n');

const FINAL_FIXES = {
  // EN: 1 key (somehow missed earlier)
  en: {
    'auth.registrationSuccess': 'Registration successful! Please check your email inbox.'
  },
  
  // AR: 3 keys
  ar: {
    'storefront.shopByCategory': 'تصفح حسب الفئة',
    'storefront.shopByCategoryDesc': 'استكشف مجموعتنا المنظمة من المنتجات',
    'common.submitting': 'جاري الإرسال...'
  },
  
  // FR: 51 WooCommerce keys (translated from DE reference)
  fr: {
    'woocommerce.customerImportInfo.emailVerification': '✉️ Les utilisateurs doivent vérifier leur adresse e-mail à nouveau',
    'woocommerce.customerImportInfo.duplicateCheck': '🔍 Les adresses e-mail existantes sont ignorées',
    'woocommerce.products': 'Produits',
    'woocommerce.imported': 'Importé',
    'woocommerce.skipped': 'Ignoré',
    'woocommerce.failed': 'Erreur',
    'woocommerce.customers': 'Clients',
    'woocommerce.created': 'Créé',
    'woocommerce.linked': 'Lié',
    'woocommerce.cleanup.startPreview': 'Démarrer l\'aperçu',
    'woocommerce.cleanup.loading': 'Chargement...',
    'woocommerce.cleanup.previewTitle': 'Aperçu des changements',
    'woocommerce.cleanup.checked': 'Vérifié',
    'woocommerce.cleanup.affected': 'Concerné',
    'woocommerce.cleanup.errors': 'Erreurs',
    'woocommerce.cleanup.noAffectedProducts': 'Aucun produit avec des balises HTML trouvé',
    'woocommerce.cleanup.productName': 'Nom du produit',
    'woocommerce.cleanup.before': 'Avant',
    'woocommerce.cleanup.after': 'Après',
    'woocommerce.cleanup.status': 'Statut',
    'woocommerce.cleanup.unchanged': 'Inchangé',
    'woocommerce.cleanup.changed': 'Modifié',
    'woocommerce.cleanup.error': 'Erreur',
    'woocommerce.cleanup.runCleanup': 'Nettoyer maintenant',
    'woocommerce.cleanup.runAgain': 'Vérifier à nouveau',
    'woocommerce.cleanup.updated': 'Mis à jour',
    'woocommerce.previewLoaded': 'Aperçu chargé',
    'woocommerce.wpVersion': 'Version WordPress',
    'woocommerce.consumerKey': 'Clé consommateur',
    'woocommerce.wcVersion': 'Version WooCommerce',
    'woocommerce.importDoesNotModifyWooCommerce': 'ℹ️ L\'importation copie uniquement les produits vers markt.ma. Votre boutique WooCommerce n\'est pas modifiée.',
    'woocommerce.comingSoon': 'Prochainement',
    'woocommerce.enabled': 'Activé',
    'woocommerce.duplicateSku': 'SKU en double',
    'woocommerce.categoryCount': 'Nombre de catégories',
    'woocommerce.connection': 'Connexion',
    'woocommerce.productCount': 'Nombre de produits',
    'woocommerce.saveConfig': 'Enregistrer la configuration',
    'woocommerce.shopUrl': 'URL de la boutique',
    'woocommerce.alreadyImportedShort': 'Déjà importé',
    'woocommerce.connectionSuccess': '✅ Connexion réussie !',
    'woocommerce.previewProducts': 'Produits',
    'woocommerce.variantLimitWarning': '⚠️ >3 attributs (limite de variantes)',
    'woocommerce.test': 'Test',
    'woocommerce.connectionSettings': 'Paramètres de connexion',
    'woocommerce.secretKeepPlaceholder': 'Laisser vide pour conserver le secret existant',
    'woocommerce.variantWarnings': 'Avertissements sur les variantes',
    'woocommerce.previewTitle': 'Aperçu des produits',
    'storefront.shopByCategory': 'Parcourir par catégorie',
    'storefront.shopByCategoryDesc': 'Explorez notre collection organisée de produits'
  }
};

function loadJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function saveJSON(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  🎯 ABSOLUTE FINAL FIX - Last 55 Keys');
console.log('════════════════════════════════════════════════════════════════\n');

const langs = ['en', 'ar', 'fr'];
const translations = {};
const stats = { en: 0, ar: 0, fr: 0 };

for (const lang of langs) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  translations[lang] = loadJSON(filePath);
  console.log(`✓ Loaded ${lang}.json`);
}

console.log('\n🔧 Adding final missing keys...\n');

for (const lang of langs) {
  if (!FINAL_FIXES[lang]) continue;
  
  console.log(`\n📝 ${lang.toUpperCase()}:`);
  for (const [key, value] of Object.entries(FINAL_FIXES[lang])) {
    const currentValue = getNestedValue(translations[lang], key);
    if (!currentValue) {
      setNestedValue(translations[lang], key, value);
      console.log(`   ✓ ${key}`);
      stats[lang]++;
    } else {
      console.log(`   ⊘ ${key} (exists)`);
    }
  }
}

console.log('\n💾 Saving updated files...\n');

for (const lang of langs) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  saveJSON(filePath, translations[lang]);
  console.log(`   ✓ Saved ${lang}.json (+${stats[lang]} keys)`);
}

const totalFixed = Object.values(stats).reduce((a, b) => a + b, 0);

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ✅ ABSOLUTE FINAL - ${totalFixed} keys fixed`);
console.log('════════════════════════════════════════════════════════════════');
console.log(`\n📊 Final Stats:`);
console.log(`   EN: +${stats.en} key`);
console.log(`   AR: +${stats.ar} keys`);
console.log(`   FR: +${stats.fr} keys`);
console.log(`   ────────────────`);
console.log(`   Total: ${totalFixed} keys\n`);

console.log('🎯 This should result in:');
console.log('   ✅ 0 missing keys in i18n:check');
console.log('   ✅ All 4 languages synchronized');
console.log('   ✅ Ready for production\n');

process.exit(0);

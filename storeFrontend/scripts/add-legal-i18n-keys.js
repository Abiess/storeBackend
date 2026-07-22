#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'assets', 'i18n');

const LEGAL_KEYS = {
  de: {
    'legal.terms.notConfigured': 'AGB noch nicht hinterlegt',
    'legal.terms.notConfiguredDesc': 'Der Betreiber dieses Stores hat noch keine Allgemeinen Geschäftsbedingungen veröffentlicht.',
    'legal.privacy.notConfigured': 'Datenschutzerklärung noch nicht hinterlegt',
    'legal.privacy.notConfiguredDesc': 'Der Betreiber dieses Stores hat noch keine Datenschutzerklärung veröffentlicht.',
    'legal.impressum.notConfigured': 'Impressum noch nicht vollständig',
    'legal.impressum.notConfiguredDesc': 'Der Betreiber dieses Stores hat seine Anbieterinformationen noch nicht vollständig hinterlegt.',
    'legal.impressum.incompleteNotice': 'Das Impressum ist noch nicht vollständig. Bitte ergänzen Sie alle erforderlichen Angaben.',
    'legal.impressum.legalForm': 'Rechtsform',
    'legal.return.title': 'Rückgabebedingungen',
    'legal.return.notConfigured': 'Rückgabebedingungen noch nicht hinterlegt',
    'legal.return.notConfiguredDesc': 'Der Betreiber dieses Stores hat noch keine Rückgabebedingungen veröffentlicht.',
    'legal.shipping.title': 'Versandbedingungen',
    'legal.shipping.notConfigured': 'Versandbedingungen noch nicht hinterlegt',
    'legal.shipping.notConfiguredDesc': 'Der Betreiber dieses Stores hat noch keine Versandinformationen veröffentlicht.',
    'legal.owner.setupHint': 'Diese Seite ist für Ihre Kunden noch nicht vollständig eingerichtet. Bitte ergänzen Sie die rechtlichen Angaben in den Store-Einstellungen.',
    'legal.owner.setupButton': 'Jetzt einrichten',
    'legal.platformNotice': 'markt.ma stellt die technische Shop-Plattform bereit und ist nicht Verkäufer der in diesem Store angebotenen Produkte.'
  },
  en: {
    'legal.terms.notConfigured': 'Terms and conditions not yet available',
    'legal.terms.notConfiguredDesc': 'The operator of this store has not yet published any terms and conditions.',
    'legal.privacy.notConfigured': 'Privacy policy not yet available',
    'legal.privacy.notConfiguredDesc': 'The operator of this store has not yet published a privacy policy.',
    'legal.impressum.notConfigured': 'Imprint not yet complete',
    'legal.impressum.notConfiguredDesc': 'The operator of this store has not yet completely provided their provider information.',
    'legal.impressum.incompleteNotice': 'The imprint is not yet complete. Please add all required information.',
    'legal.impressum.legalForm': 'Legal form',
    'legal.return.title': 'Return policy',
    'legal.return.notConfigured': 'Return policy not yet available',
    'legal.return.notConfiguredDesc': 'The operator of this store has not yet published a return policy.',
    'legal.shipping.title': 'Shipping information',
    'legal.shipping.notConfigured': 'Shipping information not yet available',
    'legal.shipping.notConfiguredDesc': 'The operator of this store has not yet published shipping information.',
    'legal.owner.setupHint': 'This page is not yet fully configured for your customers. Please add the legal information in the store settings.',
    'legal.owner.setupButton': 'Configure now',
    'legal.platformNotice': 'markt.ma provides the technical shop platform and is not the seller of the products offered in this store.'
  },
  ar: {
    'legal.terms.notConfigured': 'لم يتم نشر الشروط والأحكام بعد',
    'legal.terms.notConfiguredDesc': 'لم يقم مشغّل هذا المتجر بعد بنشر الشروط والأحكام الخاصة به.',
    'legal.privacy.notConfigured': 'لم يتم نشر سياسة الخصوصية بعد',
    'legal.privacy.notConfiguredDesc': 'لم يقم مشغّل هذا المتجر بعد بنشر سياسة الخصوصية.',
    'legal.impressum.notConfigured': 'البيانات التعريفية غير مكتملة بعد',
    'legal.impressum.notConfiguredDesc': 'لم يقم مشغّل هذا المتجر بعد بتقديم معلومات المزود الخاصة به بشكل كامل.',
    'legal.impressum.incompleteNotice': 'البيانات التعريفية غير مكتملة بعد. يرجى إضافة جميع المعلومات المطلوبة.',
    'legal.impressum.legalForm': 'الشكل القانوني',
    'legal.return.title': 'شروط الإرجاع',
    'legal.return.notConfigured': 'لم يتم نشر شروط الإرجاع بعد',
    'legal.return.notConfiguredDesc': 'لم يقم مشغّل هذا المتجر بعد بنشر شروط الإرجاع.',
    'legal.shipping.title': 'شروط الشحن',
    'legal.shipping.notConfigured': 'لم يتم نشر معلومات الشحن بعد',
    'legal.shipping.notConfiguredDesc': 'لم يقم مشغّل هذا المتجر بعد بنشر معلومات الشحن.',
    'legal.owner.setupHint': 'هذه الصفحة لم يتم إعدادها بالكامل بعد لعملائك. يرجى إضافة المعلومات القانونية في إعدادات المتجر.',
    'legal.owner.setupButton': 'إعداد الآن',
    'legal.platformNotice': 'توفر markt.ma منصة المتجر التقنية وليست بائعة للمنتجات المعروضة في هذا المتجر.'
  },
  fr: {
    'legal.terms.notConfigured': 'Conditions générales non encore publiées',
    'legal.terms.notConfiguredDesc': 'L\'exploitant de cette boutique n\'a pas encore publié de conditions générales.',
    'legal.privacy.notConfigured': 'Déclaration de confidentialité non encore publiée',
    'legal.privacy.notConfiguredDesc': 'L\'exploitant de cette boutique n\'a pas encore publié de déclaration de confidentialité.',
    'legal.impressum.notConfigured': 'Mentions légales non encore complètes',
    'legal.impressum.notConfiguredDesc': 'L\'exploitant de cette boutique n\'a pas encore fourni complètement ses informations légales.',
    'legal.impressum.incompleteNotice': 'Les mentions légales ne sont pas encore complètes. Veuillez ajouter toutes les informations requises.',
    'legal.impressum.legalForm': 'Forme juridique',
    'legal.return.title': 'Conditions de retour',
    'legal.return.notConfigured': 'Conditions de retour non encore publiées',
    'legal.return.notConfiguredDesc': 'L\'exploitant de cette boutique n\'a pas encore publié de conditions de retour.',
    'legal.shipping.title': 'Informations de livraison',
    'legal.shipping.notConfigured': 'Informations de livraison non encore publiées',
    'legal.shipping.notConfiguredDesc': 'L\'exploitant de cette boutique n\'a pas encore publié d\'informations de livraison.',
    'legal.owner.setupHint': 'Cette page n\'est pas encore entièrement configurée pour vos clients. Veuillez ajouter les informations légales dans les paramètres de la boutique.',
    'legal.owner.setupButton': 'Configurer maintenant',
    'legal.platformNotice': 'markt.ma fournit la plateforme technique de boutique et n\'est pas le vendeur des produits proposés dans cette boutique.'
  }
};

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  🔧 Adding Legal Empty State Keys');
console.log('═══════════════════════════════════════════════════════════\n');

const langs = ['de', 'en', 'ar', 'fr'];
const stats = {};

for (const lang of langs) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  const translations = loadJSON(filePath);
  let added = 0;

  for (const [key, value] of Object.entries(LEGAL_KEYS[lang])) {
    setNestedValue(translations, key, value);
    added++;
  }

  saveJSON(filePath, translations);
  stats[lang] = added;
  console.log(`✓ ${lang}.json: +${added} keys`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  ✅ Complete: ${Object.values(stats).reduce((a,b) => a+b, 0)} keys added`);
console.log('═══════════════════════════════════════════════════════════\n');

process.exit(0);

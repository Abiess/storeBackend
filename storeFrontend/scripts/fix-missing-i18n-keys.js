#!/usr/bin/env node

/**
 * Auto-Fix Missing i18n Keys Script - Phase 2: AR-only Keys
 * Systematically adds missing Arabic keys based on de/en/fr references
 */

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'assets', 'i18n');
const REPORT_PATH = path.join(__dirname, '..', 'i18n-missing-keys.json');

// AR-only missing keys with translations
const AR_FIXES = {
  // Product tax/category keys
  'product.taxCategory': 'فئة الضريبة',
  'product.taxStandard': 'قياسي (19%)',
  'product.taxReduced': 'مخفض (7%)',
  'product.taxZero': 'صفر (0%)',
  'product.taxExempt': 'معفى من الضريبة (0%)',
  'product.taxRate': 'معدل الضريبة',
  'product.taxResponsibilityHint': 'ℹ️ يرجى اختيار معدل الضريبة المطبق قانونياً. تصنيف الضرائب هو مسؤولية التاجر.',
  
  // Product variants keys
  'product.variants.title': 'المتغيرات',
  'product.variants.defineOptions': 'تحديد خيارات المنتج',
  'product.variants.optionName': 'اسم الخيار',
  'product.variants.addOption': 'إضافة خيار',
  'product.variants.addValue': 'إضافة قيمة',
  'product.variants.optionsHint': 'حدّد خيارات المنتج (مثل اللون، الحجم) والقيم المتاحة',
  'product.variants.generateTitle': 'إنشاء المتغيرات',
  'product.variants.basePrice': 'السعر الأساسي',
  'product.variants.baseStock': 'المخزون الأساسي',
  'product.variants.generate': 'إنشاء المتغيرات',
  'product.variants.generatedVariants': 'المتغيرات المُنشأة',
  'product.variants.barcode': 'الباركود/EAN',
  'product.variants.comparePrice': 'سعر المقارنة',
  'product.variants.costPrice': 'سعر التكلفة',
  'product.variants.weight': 'الوزن',
  'product.variants.active': 'نشط',
  'product.variants.stock': 'المخزون',
  'product.variants.saveAll': 'حفظ جميع المتغيرات',
  
  // Settings tax keys
  'settings.tax.title': 'الضرائب والعملة',
  'settings.tax.hint': 'حدّد العملة والبلد وإعدادات الضرائب لمتجرك',
  'settings.tax.currency': 'العملة',
  'settings.tax.currencyMAD': 'درهم مغربي',
  'settings.tax.currencyGBP': 'جنيه إسترليني',
  'settings.tax.currencyChangeWarning': 'تحذير: تغيير العملة يؤثر على جميع المنتجات',
  'settings.tax.country': 'البلد',
  'settings.tax.countryDE': 'ألمانيا',
  'settings.tax.countryMA': 'المغرب',
  'settings.tax.countryUS': 'الولايات المتحدة',
  'settings.tax.countryGB': 'بريطانيا',
  'settings.tax.priceMode': 'نموذج السعر',
  'settings.tax.grossPrices': 'أسعار إجمالية (شاملة الضريبة)',
  'settings.tax.grossPricesHint': 'تُعرض الأسعار مع ضريبة القيمة المضافة',
  'settings.tax.netPrices': 'أسعار صافية (باستثناء الضريبة)',
  'settings.tax.netPricesHint': 'تُعرض الأسعار بدون ضريبة القيمة المضافة',
  'settings.tax.vatEnabled': 'تفعيل ضريبة القيمة المضافة',
  'settings.tax.vatEnabledHint': 'عطّل هذا الخيار إذا كنت معفى من الضرائب',
  'settings.tax.defaultTaxRate': 'معدل الضريبة الافتراضي',
  'settings.tax.defaultTaxRateHint': 'معدل الضريبة العادي للمنتجات (مثل 19% في ألمانيا)',
  'settings.tax.shippingTaxRate': 'معدل ضريبة الشحن',
  'settings.tax.shippingTaxStrategy': 'استراتيجية ضريبة الشحن',
  'settings.tax.shippingTaxStrategyHint': 'كيفية حساب ضريبة تكاليف الشحن',
  'settings.tax.shippingTaxStoreDefined': 'معرّف من المتجر (يستخدم معدل ضريبة الشحن)',
  'settings.tax.shippingTaxStandard': 'قياسي (نفس معدل الضريبة الافتراضي)',
  'settings.tax.shippingTaxProportional': 'نسبي (متوسط ضرائب المنتجات)',
  'settings.tax.vatExemptionText': 'نص الإعفاء الضريبي',
  'settings.tax.vatExemptionTextHint': 'نص يُعرض للعملاء المعفيين من الضرائب',
  'settings.tax.vatExemptionTextPlaceholder': 'معفى من الضريبة حسب §...',
  
  // Settings shipping keys (3 remaining)
  'settings.shipping.title': 'عنوان الشحن',
  'settings.shipping.hint': 'عنوان المرسل لملصقات شحن DHL. يظهر هذا العنوان على جميع ملصقات الشحن.',
  'settings.shipping.street': 'الشارع',
  'settings.shipping.streetPlaceholder': 'شارع الملك',
  'settings.shipping.streetRequired': 'الشارع مطلوب',
  'settings.shipping.houseNumber': 'رقم المنزل',
  'settings.shipping.houseNumberRequired': 'رقم المنزل مطلوب',
  'settings.shipping.postalCode': 'الرمز البريدي',
  'settings.shipping.postalCodeRequired': 'الرمز البريدي مطلوب',
  'settings.shipping.city': 'المدينة',
  'settings.shipping.cityPlaceholder': 'نورمبرغ',
  'settings.shipping.cityRequired': 'المدينة مطلوبة',
  'settings.shipping.country': 'البلد',
  'settings.shipping.countryRequired': 'البلد مطلوب (مثل DE، AT، CH)',
  'settings.shipping.email': 'البريد الإلكتروني (اختياري)',
  'settings.shipping.emailPlaceholder': 'shipping@example.com',
  'settings.shipping.savedSuccess': '✅ تم حفظ عنوان الشحن بنجاح'
};

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    throw error;
  }
}

function saveJSON(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error.message);
    return false;
  }
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
console.log('  🔧 Auto-Fix AR-Only Missing Keys (Phase 2)');
console.log('════════════════════════════════════════════════════════════════\n');

// Load AR translation file
const arPath = path.join(I18N_DIR, 'ar.json');
let ar = loadJSON(arPath);
let totalFixed = 0;

console.log('✓ Loaded ar.json\n');
console.log('🔧 Adding 54 AR-only missing keys...\n');

// Apply AR fixes
for (const [key, value] of Object.entries(AR_FIXES)) {
  const currentValue = getNestedValue(ar, key);
  if (!currentValue) {
    setNestedValue(ar, key, value);
    console.log(`   ✓ Added: ${key}`);
    totalFixed++;
  } else {
    console.log(`   ⊘ Skipped (exists): ${key}`);
  }
}

// Save updated AR translation
console.log('\n💾 Saving updated ar.json...\n');

if (saveJSON(arPath, ar)) {
  console.log('   ✓ Saved ar.json');
}

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  ✅ Fixed ${totalFixed} AR-only keys`);
console.log('════════════════════════════════════════════════════════════════\n');

console.log('💡 Next steps:');
console.log('   1. npm run i18n:check');
console.log('   2. Verify remaining keys');
console.log('   3. Check WooCommerce status\n');

process.exit(0);

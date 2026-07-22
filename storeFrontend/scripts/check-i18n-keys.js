#!/usr/bin/env node

/**
 * i18n Key Checker
 * Extracts all i18n keys from TypeScript/HTML files and validates against translation files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, '../src/app');
const I18N_DIR = path.join(__dirname, '../src/assets/i18n');

const TRANSLATION_FILES = {
  de: path.join(I18N_DIR, 'de.json'),
  en: path.join(I18N_DIR, 'en.json'),
  ar: path.join(I18N_DIR, 'ar.json'),
  fr: path.join(I18N_DIR, 'fr.json')
};

// Regex patterns to find translation keys
const KEY_PATTERNS = [
  // Template: 'KEY' | translate or "KEY" | translate
  /'([A-Z_][A-Z0-9_.]*)'[\s\n]*\|[\s\n]*translate/gi,
  /"([A-Z_][A-Z0-9_.]*)"[\s\n]*\|[\s\n]*translate/gi,
  
  // TypeScript: translate.instant('KEY')
  /translate\.instant\(['"]([A-Z_][A-Z0-9_.]*)['"\]]/gi,
  
  // TypeScript: translate.get('KEY')
  /translate\.get\(['"]([A-Z_][A-Z0-9_.]*)['"\]]/gi,
  
  // Also catch lowercase keys (less common but exist)
  /'([a-z][a-zA-Z0-9_.]*)'[\s\n]*\|[\s\n]*translate/gi,
  /"([a-z][a-zA-Z0-9_.]*)"[\s\n]*\|[\s\n]*translate/gi,
];

function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();
  
  KEY_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  });
  
  return Array.from(keys);
}

function findAllTranslationKeys() {
  const files = glob.sync('**/*.{ts,html}', {
    cwd: SRC_DIR,
    absolute: true,
    ignore: ['**/*.spec.ts', '**/node_modules/**']
  });
  
  const keyUsage = {};
  
  files.forEach(file => {
    const keys = extractKeysFromFile(file);
    const relativePath = path.relative(process.cwd(), file);
    
    keys.forEach(key => {
      if (!keyUsage[key]) {
        keyUsage[key] = [];
      }
      keyUsage[key].push(relativePath);
    });
  });
  
  return keyUsage;
}

function loadTranslations() {
  const translations = {};
  
  Object.entries(TRANSLATION_FILES).forEach(([lang, filePath]) => {
    if (fs.existsSync(filePath)) {
      try {
        translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (error) {
        console.error(`❌ Error parsing ${lang}.json:`, error.message);
        translations[lang] = {};
      }
    } else {
      console.warn(`⚠️  ${lang}.json not found`);
      translations[lang] = {};
    }
  });
  
  return translations;
}

function checkKeyInTranslations(key, translations) {
  const parts = key.split('.');
  const result = {};
  
  Object.entries(translations).forEach(([lang, data]) => {
    let current = data;
    let found = true;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    
    result[lang] = found;
  });
  
  return result;
}

function generateReport(keyUsage, translations) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  📊 i18n Key Validation Report');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  const missingKeys = {};
  const okKeys = [];
  
  Object.entries(keyUsage).forEach(([key, files]) => {
    const status = checkKeyInTranslations(key, translations);
    
    const missingLangs = Object.entries(status)
      .filter(([_, exists]) => !exists)
      .map(([lang]) => lang);
    
    if (missingLangs.length > 0) {
      missingKeys[key] = {
        missing: missingLangs,
        files: files
      };
    } else {
      okKeys.push(key);
    }
  });
  
  console.log(`✅ Valid keys: ${okKeys.length}`);
  console.log(`❌ Missing keys: ${Object.keys(missingKeys).length}\n`);
  
  if (Object.keys(missingKeys).length > 0) {
    console.log('Missing Keys by Language:\n');
    
    const byLanguage = { de: [], en: [], ar: [], fr: [] };
    
    Object.entries(missingKeys).forEach(([key, info]) => {
      info.missing.forEach(lang => {
        if (byLanguage[lang]) {
          byLanguage[lang].push(key);
        }
      });
    });
    
    Object.entries(byLanguage).forEach(([lang, keys]) => {
      if (keys.length > 0) {
        console.log(`\n${lang.toUpperCase()}: ${keys.length} missing keys`);
        keys.slice(0, 20).forEach(key => {
          console.log(`   → ${key}`);
        });
        if (keys.length > 20) {
          console.log(`   ... and ${keys.length - 20} more`);
        }
      }
    });
    
    console.log('\n\nDetailed Missing Keys:\n');
    Object.entries(missingKeys).slice(0, 30).forEach(([key, info]) => {
      console.log(`❌ ${key}`);
      console.log(`   Missing in: ${info.missing.join(', ')}`);
      console.log(`   Used in: ${info.files[0]}`);
      if (info.files.length > 1) {
        console.log(`           ... and ${info.files.length - 1} more files`);
      }
      console.log();
    });
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../i18n-missing-keys.json');
    fs.writeFileSync(reportPath, JSON.stringify(missingKeys, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════════\n');
  
  return Object.keys(missingKeys).length === 0;
}

// Main
console.log('🔍 Scanning for i18n keys...');
const keyUsage = findAllTranslationKeys();
console.log(`📊 Found ${Object.keys(keyUsage).length} unique translation keys`);

console.log('📖 Loading translation files...');
const translations = loadTranslations();

const allOk = generateReport(keyUsage, translations);

process.exit(allOk ? 0 : 1);

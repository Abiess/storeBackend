#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const flowName = process.argv[2];

if (!flowName) {
  console.error('❌ Usage: npm run record <flow-name>');
  console.log('Available flows:');
  const testsDir = path.join(__dirname, '../tests/flows');
  if (fs.existsSync(testsDir)) {
    fs.readdirSync(testsDir)
      .filter(f => f.endsWith('.spec.js'))
      .forEach(f => console.log(`  - ${f.replace('.spec.js', '')}`));
  }
  process.exit(1);
}

const testFile = path.join(__dirname, `../tests/flows/${flowName}.spec.js`);

if (!fs.existsSync(testFile)) {
  console.error(`❌ Test file not found: ${testFile}`);
  process.exit(1);
}

console.log(`🎬 Recording flow: ${flowName}`);
console.log('─'.repeat(50));

try {
  // Use relative path for Playwright (works better on Windows)
  const relativePath = `tests/flows/${flowName}.spec.js`;

  execSync(`npx playwright test "${relativePath}" --headed`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('─'.repeat(50));
  console.log(`✅ Recording complete: ${flowName}`);
  console.log('\nNext steps:');
  console.log(`  1. Check video: test-results/`);
  console.log(`  2. Process video: npm run process ${flowName}`);
} catch (error) {
  console.error(`❌ Recording failed for ${flowName}`);
  process.exit(1);
}

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dirsToClean = [
  path.join(__dirname, '../test-results'),
  path.join(__dirname, '../output'),
  path.join(__dirname, '../playwright-report')
];

console.log('🧹 Cleaning up...');

dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  ✅ Removed: ${dir}`);
  }
});

console.log('✅ Cleanup complete!');


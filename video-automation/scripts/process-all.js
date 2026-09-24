#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const flows = ['login', 'checkout', 'products', 'create-store'];

console.log('⚙️  Processing all videos...');
console.log('═'.repeat(50));

flows.forEach((flow, index) => {
  console.log(`\n[${index + 1}/${flows.length}] Processing: ${flow}`);
  console.log('─'.repeat(50));

  try {
    execSync(`node ${path.join(__dirname, 'process-video.js')} ${flow}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error(`❌ Failed to process ${flow}`);
  }
});

console.log('\n═'.repeat(50));
console.log('✅ All videos processed!');
console.log('\nNext: npm run howto <feature>');

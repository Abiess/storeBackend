#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const flows = ['login', 'checkout', 'products', 'create-store'];

console.log('🎬 Recording all flows...');

const basePath = path.resolve(__dirname, '../..');
const outputPath = path.join(basePath, 'output');

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath);
}

flows.forEach((flow) => {
  console.log(`   └─ ${flow}`);
  const flowPath = path.join(basePath, `src/flows/${flow}`);
  const flowOutputPath = path.join(outputPath, `${flow}.mp4`);

  execSync(
    `npx -y playwright codegen --target=js --output=${flowPath}/index.js --trace=on --video=on --name="${flow}" ${flowPath}/`,
    { stdio: 'inherit' }
  );

  execSync(
    `npx -y playwright show-trace ${flowPath}/trace.zip`,
    { stdio: 'inherit' }
  );

  execSync(
    `ffmpeg -i ${flowPath}/trace.zip -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart ${flowOutputPath}`,
    { stdio: 'inherit' }
  );
});

console.log('✅ All flows recorded successfully!');

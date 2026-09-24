#!/usr/bin/env node
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const featureName = process.env.FEATURE || process.argv[2];

if (!featureName) {
  console.error('❌ Usage: npm run howto FEATURE=<feature-name>');
  console.log('   or: npm run howto <feature-name>');
  process.exit(1);
}

const config = {
  outputDir: process.env.OUTPUT_DIR || './output',
  brandName: process.env.BRAND_NAME || 'Markt-MA',
  subtitleLang: process.env.SUBTITLE_LANG || 'de'
};

const inputVideo = path.join(config.outputDir, `${featureName}_processed.mp4`);
const inputSubtitles = path.join(config.outputDir, `${featureName}_processed.srt`);
const outputVideo = path.join(config.outputDir, `HOWTO_${featureName}_FINAL.mp4`);

if (!fs.existsSync(inputVideo)) {
  console.error(`❌ Processed video not found: ${inputVideo}`);
  console.log('Run: npm run process ' + featureName);
  process.exit(1);
}

console.log(`🎬 Building final How-to video: ${featureName}`);
console.log('─'.repeat(50));

// Burn subtitles into video if available
if (fs.existsSync(inputSubtitles)) {
  console.log('📝 Burning subtitles into video...');

  ffmpeg(inputVideo)
    .outputOptions([
      `-vf`,
      `subtitles=${inputSubtitles.replace(/\\/g, '/')}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,MarginV=30'`
    ])
    .videoCodec('libx264')
    .audioCodec('copy')
    .outputOptions(['-preset medium', '-crf 23'])
    .on('progress', (progress) => {
      if (progress.percent) {
        process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
      }
    })
    .on('end', () => {
      console.log('\n✅ Final video created successfully!');
      console.log('─'.repeat(50));
      console.log(`📁 Output: ${outputVideo}`);
      console.log(`📊 File size: ${(fs.statSync(outputVideo).size / 1024 / 1024).toFixed(2)} MB`);
      console.log('\n🎉 Ready to publish!');
    })
    .on('error', (err) => {
      console.error('\n❌ Error creating final video:', err.message);
      process.exit(1);
    })
    .save(outputVideo);
} else {
  console.log('⚠️  No subtitles found, copying processed video...');
  fs.copyFileSync(inputVideo, outputVideo);
  console.log('✅ Final video created!');
  console.log(`📁 Output: ${outputVideo}`);
}


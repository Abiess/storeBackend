#!/usr/bin/env node
/**
 * Advanced Subtitle Generator using Whisper
 * Requires: pip install openai-whisper
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const videoFile = process.argv[2];

if (!videoFile) {
  console.error('❌ Usage: npm run subtitles <video-file>');
  console.log('Example: npm run subtitles output/checkout_processed.mp4');
  process.exit(1);
}

const config = {
  whisperModel: process.env.WHISPER_MODEL || 'base',
  subtitleLang: process.env.SUBTITLE_LANG || 'de',
  outputDir: process.env.OUTPUT_DIR || './output'
};

const videoPath = path.resolve(videoFile);
if (!fs.existsSync(videoPath)) {
  console.error(`❌ Video file not found: ${videoPath}`);
  process.exit(1);
}

const outputSRT = videoPath.replace(/\.(mp4|webm)$/, '.srt');
const outputVTT = videoPath.replace(/\.(mp4|webm)$/, '.vtt');

console.log('🎤 Generating subtitles with Whisper...');
console.log('─'.repeat(50));
console.log(`   Video: ${videoPath}`);
console.log(`   Model: ${config.whisperModel}`);
console.log(`   Language: ${config.subtitleLang}`);
console.log('─'.repeat(50));

try {
  // Check if Whisper is installed
  execSync('whisper --version', { stdio: 'pipe' });

  // Generate subtitles with Whisper
  const command = `whisper "${videoPath}" --model ${config.whisperModel} --language ${config.subtitleLang} --output_format srt --output_dir "${path.dirname(videoPath)}"`;

  console.log('\n⚙️  Running Whisper transcription...');
  console.log('   This may take a few minutes...\n');

  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ Subtitles generated successfully!');
  console.log(`   SRT: ${outputSRT}`);

  // Convert SRT to VTT if needed
  if (fs.existsSync(outputSRT)) {
    convertSRTtoVTT(outputSRT, outputVTT);
    console.log(`   VTT: ${outputVTT}`);
  }

  console.log('\nNext: npm run howto ' + path.basename(videoPath, '_processed.mp4'));

} catch (error) {
  console.error('\n❌ Whisper not found or error occurred');
  console.log('\n📝 Installing Whisper:');
  console.log('   pip install openai-whisper');
  console.log('   Or: pip install git+https://github.com/openai/whisper.git\n');

  console.log('💡 Alternatively, use manual subtitles:');
  console.log(`   1. Edit: ${outputSRT}`);
  console.log('   2. Run: npm run howto ' + path.basename(videoPath, '_processed.mp4'));

  process.exit(1);
}

function convertSRTtoVTT(srtPath, vttPath) {
  const srtContent = fs.readFileSync(srtPath, 'utf8');
  const vttContent = 'WEBVTT\n\n' + srtContent.replace(/,(\d{3})/g, '.$1');
  fs.writeFileSync(vttPath, vttContent, 'utf8');
}


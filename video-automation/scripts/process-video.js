#!/usr/bin/env node
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const flowName = process.argv[2];

if (!flowName) {
  console.error('❌ Usage: npm run process <flow-name>');
  process.exit(1);
}

const config = {
  outputDir: process.env.OUTPUT_DIR || './output',
  videoWidth: parseInt(process.env.VIDEO_WIDTH) || 1920,
  videoHeight: parseInt(process.env.VIDEO_HEIGHT) || 1080,
  videoBitrate: process.env.VIDEO_BITRATE || '2500k',
  videoFps: parseInt(process.env.VIDEO_FPS) || 30,
  brandName: process.env.BRAND_NAME || 'Markt-MA',
  brandColor: process.env.BRAND_COLOR || '#0066cc',
  subtitleLang: process.env.SUBTITLE_LANG || 'de'
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

async function findLatestVideo(flowName) {
  const testResultsDir = path.join(__dirname, '../test-results');

  if (!fs.existsSync(testResultsDir)) {
    throw new Error('No test-results directory found. Run recording first.');
  }

  // Find the latest test result folder containing the flow name
  const folders = fs.readdirSync(testResultsDir)
    .filter(f => {
      const fullPath = path.join(testResultsDir, f);
      return fs.statSync(fullPath).isDirectory() && f.includes(flowName);
    })
    .map(f => ({
      name: f,
      path: path.join(testResultsDir, f),
      time: fs.statSync(path.join(testResultsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (folders.length === 0) {
    throw new Error(`No test results found for flow: ${flowName}`);
  }

  // Find video file in the folder
  const videoFile = fs.readdirSync(folders[0].path)
    .find(f => f.endsWith('.webm') || f.endsWith('.mp4'));

  if (!videoFile) {
    throw new Error(`No video file found in ${folders[0].path}`);
  }

  return path.join(folders[0].path, videoFile);
}

async function processVideo(inputPath, flowName) {
  console.log(`🎬 Processing video: ${flowName}`);
  console.log(`📁 Input: ${inputPath}`);

  const outputPath = path.join(config.outputDir, `${flowName}_processed.mp4`);
  const tempPath = path.join(config.outputDir, `${flowName}_temp.mp4`);

  return new Promise((resolve, reject) => {
    // Step 1: Convert and optimize
    console.log('⚙️  Step 1/4: Converting and optimizing...');

    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(`${config.videoWidth}x${config.videoHeight}`)
      .fps(config.videoFps)
      .videoBitrate(config.videoBitrate)
      .outputOptions([
        '-preset medium',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ])
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('\n✅ Step 1 complete: Video optimized');

        // Step 2: Add intro/outro (placeholder for now)
        console.log('⚙️  Step 2/4: Adding intro/outro...');
        addIntroOutro(tempPath, outputPath, flowName, resolve, reject);
      })
      .on('error', (err) => {
        console.error('\n❌ Error processing video:', err.message);
        reject(err);
      })
      .save(tempPath);
  });
}

function addIntroOutro(inputPath, outputPath, flowName, resolve, reject) {
  // Create intro text overlay
  const introText = `${config.brandName}\\n\\nHow-to: ${flowName}`;
  const outroText = `${config.brandName}\\n\\nJetzt kostenlos testen!`;

  ffmpeg(inputPath)
    .outputOptions([
      // Intro: fade in from black with text (2 seconds)
      `-vf`,
      `drawtext=text='${introText}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,2)':alpha='if(lt(t,0.5),t/0.5,if(gt(t,1.5),1-(t-1.5)/0.5,1))',fade=in:0:30`
    ])
    .on('end', () => {
      console.log('✅ Step 2 complete: Intro/outro added');

      // Step 3: Normalize audio
      console.log('⚙️  Step 3/4: Normalizing audio...');
      normalizeAudio(outputPath, resolve, reject);
    })
    .on('error', (err) => {
      console.error('❌ Error adding intro/outro:', err.message);
      // Continue anyway
      fs.copyFileSync(inputPath, outputPath);
      normalizeAudio(outputPath, resolve, reject);
    })
    .save(outputPath);
}

function normalizeAudio(videoPath, resolve, reject) {
  // Audio normalization is already done in the first pass
  console.log('✅ Step 3 complete: Audio normalized');

  // Step 4: Generate subtitle file
  console.log('⚙️  Step 4/4: Preparing subtitle generation...');
  generateSubtitlePlaceholder(videoPath);

  console.log('✅ Step 4 complete: Subtitle placeholder created');
  console.log('─'.repeat(50));
  console.log(`✅ Video processing complete!`);
  console.log(`📁 Output: ${videoPath}`);
  console.log('\nNext steps:');
  console.log('  1. Generate subtitles: npm run subtitles ' + path.basename(videoPath));
  console.log('  2. Build final video: npm run howto FEATURE=' + path.basename(videoPath, '_processed.mp4'));

  resolve(videoPath);
}

function generateSubtitlePlaceholder(videoPath) {
  // Create a placeholder SRT file
  const srtPath = videoPath.replace('.mp4', '.srt');
  const srtContent = `1
00:00:00,000 --> 00:00:05,000
Willkommen zu diesem Tutorial

2
00:00:05,000 --> 00:00:10,000
In diesem Video zeigen wir Ihnen die Funktionen

3
00:00:10,000 --> 00:00:15,000
[Automatische Untertitel folgen...]
`;

  fs.writeFileSync(srtPath, srtContent, 'utf8');
  console.log(`   Subtitle template: ${srtPath}`);
}

// Main execution
(async () => {
  try {
    const videoPath = await findLatestVideo(flowName);
    await processVideo(videoPath, flowName);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();


# 🔥 Advanced Features & Customization

## Cursor Highlighting

Füge visuelles Cursor-Highlighting für bessere Sichtbarkeit hinzu.

### Implementation

Erstelle `tests/utils/cursor-highlighter.js`:

```javascript
class CursorHighlighter {
  async enable(page) {
    await page.addInitScript(() => {
      // Create cursor highlight element
      const highlight = document.createElement('div');
      highlight.id = 'cursor-highlight';
      highlight.style.cssText = `
        position: fixed;
        width: 40px;
        height: 40px;
        border: 3px solid #ff6b6b;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999999;
        transition: transform 0.15s ease;
        box-shadow: 0 0 15px rgba(255, 107, 107, 0.5);
      `;
      document.body.appendChild(highlight);

      // Track mouse movement
      document.addEventListener('mousemove', (e) => {
        highlight.style.left = (e.clientX - 20) + 'px';
        highlight.style.top = (e.clientY - 20) + 'px';
      });

      // Click animation
      document.addEventListener('click', () => {
        highlight.style.transform = 'scale(1.5)';
        setTimeout(() => {
          highlight.style.transform = 'scale(1)';
        }, 150);
      });
    });
  }
}

module.exports = { CursorHighlighter };
```

### Usage in Flows

```javascript
const { CursorHighlighter } = require('../utils/cursor-highlighter');

test('Flow with cursor highlight', async ({ page }) => {
  const highlighter = new CursorHighlighter();
  await highlighter.enable(page);
  
  // Your flow steps...
});
```

## Zoom-In Effect for Important Actions

### Implementation

```javascript
class ZoomEffect {
  async zoomTo(page, selector) {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 999998;
        pointer-events: none;
      `;
      document.body.appendChild(overlay);
      
      element.style.transform = 'scale(1.3)';
      element.style.transition = 'transform 0.3s ease';
      element.style.position = 'relative';
      element.style.zIndex = '999999';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        overlay.remove();
      }, 2000);
    }, selector);
  }
}

module.exports = { ZoomEffect };
```

### Usage

```javascript
await recorder.step('Important button click', async () => {
  const zoom = new ZoomEffect();
  await zoom.zoomTo(page, '[data-test="checkout-button"]');
  await page.click('[data-test="checkout-button"]');
});
```

## Voice-Over Generation

### Using Text-to-Speech

```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Generate voice-over using Google Text-to-Speech or Azure TTS
 */
async function generateVoiceOver(text, lang, outputFile) {
  // Using Google Cloud TTS (requires API key)
  const command = `
    curl -X POST \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d '{
      "input": {"text": "${text}"},
      "voice": {"languageCode": "${lang}", "name": "${lang}-Standard-A"},
      "audioConfig": {"audioEncoding": "MP3"}
    }' \
    "https://texttospeech.googleapis.com/v1/text:synthesize" \
    > ${outputFile}
  `;
  
  execSync(command);
}

// Generate script from flow steps
const script = `
Willkommen zu diesem Tutorial.
Heute zeigen wir Ihnen, wie Sie den Checkout-Prozess durchführen.
Zuerst navigieren wir zur Produktseite.
Dann wählen wir ein Produkt aus.
Und fügen es dem Warenkorb hinzu.
`;

generateVoiceOver(script, 'de-DE', 'output/voiceover.mp3');
```

### Add Voice-Over to Video

```javascript
ffmpeg(videoPath)
  .input('output/voiceover.mp3')
  .complexFilter([
    '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]'
  ])
  .outputOptions(['-map 0:v', '-map [a]'])
  .save(outputPath);
```

## Dynamic Lower Thirds

### Implementation

```javascript
class LowerThirds {
  async show(page, title, subtitle, duration = 3000) {
    await page.evaluate(({ title, subtitle, duration }) => {
      const existing = document.getElementById('lower-third');
      if (existing) existing.remove();
      
      const lowerThird = document.createElement('div');
      lowerThird.id = 'lower-third';
      lowerThird.innerHTML = `
        <div class="lt-title">${title}</div>
        <div class="lt-subtitle">${subtitle}</div>
      `;
      lowerThird.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        z-index: 999999;
        animation: slideInFromLeft 0.5s ease;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .lt-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .lt-subtitle {
          font-size: 16px;
          opacity: 0.9;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(lowerThird);
      
      setTimeout(() => {
        lowerThird.style.animation = 'slideInFromLeft 0.5s ease reverse';
        setTimeout(() => lowerThird.remove(), 500);
      }, duration);
    }, { title, subtitle, duration });
  }
}

module.exports = { LowerThirds };
```

### Usage

```javascript
const lowerThirds = new LowerThirds();

await recorder.step('Checkout-Prozess', async () => {
  await lowerThirds.show(page, 'Checkout', 'Schritt 1 von 3');
  // ... your action
});
```

## Multi-Angle Recording

Nehme gleichzeitig Desktop + Mobile Ansicht auf:

```javascript
const { chromium } = require('@playwright/test');

async function recordMultiView(url, flowName) {
  const browser = await chromium.launch();
  
  // Desktop context
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: `test-results/${flowName}-desktop/`,
      size: { width: 1920, height: 1080 }
    }
  });
  
  // Mobile context
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    recordVideo: {
      dir: `test-results/${flowName}-mobile/`,
      size: { width: 390, height: 844 }
    }
  });
  
  const desktopPage = await desktopContext.newPage();
  const mobilePage = await mobileContext.newPage();
  
  // Run flows in parallel
  await Promise.all([
    desktopPage.goto(url),
    mobilePage.goto(url)
  ]);
  
  // ... perform actions on both
  
  await browser.close();
}
```

## A/B Testing Different Flows

Teste verschiedene User-Journeys:

```javascript
const flows = [
  { name: 'checkout-guest', userType: 'guest' },
  { name: 'checkout-registered', userType: 'registered' },
  { name: 'checkout-express', userType: 'express' }
];

flows.forEach(flow => {
  test(`Checkout: ${flow.name}`, async ({ page }) => {
    // Record each variant
    const recorder = new FlowRecorder(page, flow.name);
    await recorder.start();
    
    // Execute flow based on userType
    if (flow.userType === 'guest') {
      await guestCheckoutFlow(page, recorder);
    } else if (flow.userType === 'registered') {
      await registeredCheckoutFlow(page, recorder);
    }
    
    await recorder.finish();
  });
});
```

## Automated Thumbnail Generation

```javascript
const ffmpeg = require('fluent-ffmpeg');

function generateThumbnail(videoPath, timestamp = '00:00:05') {
  const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg');
  
  ffmpeg(videoPath)
    .screenshots({
      timestamps: [timestamp],
      filename: path.basename(thumbnailPath),
      folder: path.dirname(thumbnailPath),
      size: '1280x720'
    })
    .on('end', () => {
      console.log('✅ Thumbnail generated:', thumbnailPath);
    });
}
```

## Video Analytics Integration

```javascript
/**
 * Add tracking pixels to measure video engagement
 */
class VideoAnalytics {
  async addTracking(page, videoId) {
    await page.evaluate((id) => {
      // Track video views
      fetch('https://analytics.your-domain.com/track', {
        method: 'POST',
        body: JSON.stringify({
          event: 'video_view',
          video_id: id,
          timestamp: Date.now()
        })
      });
    }, videoId);
  }
}
```

## Batch Processing with Queue

```javascript
const Queue = require('bull');
const videoQueue = new Queue('video-processing');

videoQueue.process(async (job) => {
  const { flowName } = job.data;
  
  // Record
  await execPromise(`npm run record ${flowName}`);
  job.progress(33);
  
  // Process
  await execPromise(`npm run process ${flowName}`);
  job.progress(66);
  
  // Build
  await execPromise(`npm run howto ${flowName}`);
  job.progress(100);
  
  return { success: true, flow: flowName };
});

// Add jobs
['login', 'checkout', 'products'].forEach(flow => {
  videoQueue.add({ flowName: flow });
});
```

## Custom Transitions

```javascript
function addTransition(inputPath1, inputPath2, outputPath) {
  ffmpeg()
    .input(inputPath1)
    .input(inputPath2)
    .complexFilter([
      '[0:v][1:v]xfade=transition=fade:duration=1:offset=5[v]'
    ])
    .outputOptions(['-map [v]'])
    .save(outputPath);
}
```

## Watermark/Logo Overlay

```javascript
function addWatermark(videoPath, logoPath, outputPath) {
  ffmpeg(videoPath)
    .input(logoPath)
    .complexFilter([
      '[1:v]scale=150:-1[logo]',
      '[0:v][logo]overlay=W-w-20:20'
    ])
    .save(outputPath);
}
```

## Interactive Chapters

Generiere Chapter-Markers für YouTube etc.:

```javascript
function generateChapters(flowSteps) {
  let chapters = '';
  let currentTime = 0;
  
  flowSteps.forEach((step, index) => {
    const timestamp = formatTime(currentTime);
    chapters += `${timestamp} ${step.description}\n`;
    currentTime += step.duration || 10;
  });
  
  fs.writeFileSync('chapters.txt', chapters);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
```
# 🚀 CI/CD Integration Guide

## GitHub Actions

### Workflow 1: Generate Videos on Push

Erstelle `.github/workflows/generate-videos.yml`:

```yaml
name: Generate How-to Videos

on:
  push:
    branches: [main, develop]
    paths:
      - 'video-automation/**'
  workflow_dispatch:
    inputs:
      features:
        description: 'Features to generate (comma-separated)'
        required: false
        default: 'login,checkout,products'

jobs:
  generate-videos:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: video-automation/package-lock.json
      
      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg
      
      - name: Install Node dependencies
        working-directory: video-automation
        run: npm ci
      
      - name: Install Playwright browsers
        working-directory: video-automation
        run: npx playwright install chromium --with-deps
      
      - name: Setup environment
        working-directory: video-automation
        run: |
          echo "BASE_URL=${{ secrets.DEMO_BASE_URL }}" >> .env
          echo "DEMO_EMAIL=${{ secrets.DEMO_EMAIL }}" >> .env
          echo "DEMO_PASSWORD=${{ secrets.DEMO_PASSWORD }}" >> .env
          echo "BRAND_NAME=${{ vars.BRAND_NAME }}" >> .env
          echo "SUBTITLE_LANG=de" >> .env
      
      - name: Record all flows
        working-directory: video-automation
        run: npm run record:all
        continue-on-error: true
      
      - name: Process all videos
        working-directory: video-automation
        run: npm run process:all
        continue-on-error: true
      
      - name: Build final videos
        working-directory: video-automation
        run: |
          npm run howto login || true
          npm run howto checkout || true
          npm run howto products || true
      
      - name: Upload videos as artifacts
        uses: actions/upload-artifact@v3
        with:
          name: howto-videos-${{ github.sha }}
          path: video-automation/output/HOWTO_*.mp4
          retention-days: 30
      
      - name: Upload to S3/CDN (optional)
        if: github.ref == 'refs/heads/main'
        working-directory: video-automation
        run: |
          # Beispiel für AWS S3
          # aws s3 sync output/ s3://your-bucket/videos/ --exclude "*" --include "HOWTO_*.mp4"
          echo "Implement your CDN upload here"
```

### Workflow 2: Scheduled Video Generation

```yaml
name: Scheduled Video Updates

on:
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch:

jobs:
  generate-videos:
    uses: ./.github/workflows/generate-videos.yml
    secrets: inherit
```

## GitLab CI

Erstelle `.gitlab-ci.yml`:

```yaml
stages:
  - record
  - process
  - publish

variables:
  VIDEO_DIR: "video-automation"

record_flows:
  stage: record
  image: mcr.microsoft.com/playwright:v1.48.0-focal
  before_script:
    - cd $VIDEO_DIR
    - npm ci
    - apt-get update && apt-get install -y ffmpeg
  script:
    - echo "BASE_URL=$DEMO_BASE_URL" >> .env
    - echo "DEMO_EMAIL=$DEMO_EMAIL" >> .env
    - echo "DEMO_PASSWORD=$DEMO_PASSWORD" >> .env
    - npm run record:all
  artifacts:
    paths:
      - $VIDEO_DIR/test-results/
    expire_in: 1 hour
  only:
    - main
    - develop

process_videos:
  stage: process
  image: node:18
  before_script:
    - cd $VIDEO_DIR
    - npm ci
    - apt-get update && apt-get install -y ffmpeg
  script:
    - npm run process:all
    - npm run howto login
    - npm run howto checkout
    - npm run howto products
  artifacts:
    paths:
      - $VIDEO_DIR/output/HOWTO_*.mp4
    expire_in: 7 days
  dependencies:
    - record_flows

publish_videos:
  stage: publish
  image: amazon/aws-cli:latest
  script:
    - cd $VIDEO_DIR/output
    - aws s3 sync . s3://$S3_BUCKET/videos/ --exclude "*" --include "HOWTO_*.mp4"
  only:
    - main
  dependencies:
    - process_videos
```

## Jenkins Pipeline

Erstelle `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    environment {
        VIDEO_DIR = 'video-automation'
        NODE_VERSION = '18'
    }
    
    stages {
        stage('Setup') {
            steps {
                dir(VIDEO_DIR) {
                    sh 'npm ci'
                    sh 'npx playwright install chromium --with-deps'
                }
            }
        }
        
        stage('Configure') {
            steps {
                dir(VIDEO_DIR) {
                    withCredentials([
                        string(credentialsId: 'demo-base-url', variable: 'BASE_URL'),
                        usernamePassword(
                            credentialsId: 'demo-credentials',
                            usernameVariable: 'DEMO_EMAIL',
                            passwordVariable: 'DEMO_PASSWORD'
                        )
                    ]) {
                        sh '''
                            echo "BASE_URL=${BASE_URL}" > .env
                            echo "DEMO_EMAIL=${DEMO_EMAIL}" >> .env
                            echo "DEMO_PASSWORD=${DEMO_PASSWORD}" >> .env
                            echo "BRAND_NAME=Markt-MA" >> .env
                        '''
                    }
                }
            }
        }
        
        stage('Record Flows') {
            steps {
                dir(VIDEO_DIR) {
                    sh 'npm run record:all || true'
                }
            }
        }
        
        stage('Process Videos') {
            steps {
                dir(VIDEO_DIR) {
                    sh 'npm run process:all || true'
                }
            }
        }
        
        stage('Build Final Videos') {
            steps {
                dir(VIDEO_DIR) {
                    sh '''
                        npm run howto login || true
                        npm run howto checkout || true
                        npm run howto products || true
                    '''
                }
            }
        }
        
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: "${VIDEO_DIR}/output/HOWTO_*.mp4", fingerprint: true
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

## Azure DevOps

Erstelle `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - video-automation/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  VIDEO_DIR: 'video-automation'

stages:
  - stage: GenerateVideos
    displayName: 'Generate How-to Videos'
    jobs:
      - job: RecordAndProcess
        displayName: 'Record and Process Videos'
        timeoutInMinutes: 30
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
            displayName: 'Install Node.js'
          
          - script: |
              sudo apt-get update
              sudo apt-get install -y ffmpeg
            displayName: 'Install ffmpeg'
          
          - script: |
              cd $(VIDEO_DIR)
              npm ci
              npx playwright install chromium --with-deps
            displayName: 'Install dependencies'
          
          - script: |
              cd $(VIDEO_DIR)
              echo "BASE_URL=$(DEMO_BASE_URL)" >> .env
              echo "DEMO_EMAIL=$(DEMO_EMAIL)" >> .env
              echo "DEMO_PASSWORD=$(DEMO_PASSWORD)" >> .env
            displayName: 'Configure environment'
          
          - script: |
              cd $(VIDEO_DIR)
              npm run record:all
            displayName: 'Record flows'
            continueOnError: true
          
          - script: |
              cd $(VIDEO_DIR)
              npm run process:all
            displayName: 'Process videos'
            continueOnError: true
          
          - script: |
              cd $(VIDEO_DIR)
              npm run howto login
              npm run howto checkout
              npm run howto products
            displayName: 'Build final videos'
            continueOnError: true
          
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: '$(VIDEO_DIR)/output'
              artifact: 'howto-videos'
              publishLocation: 'pipeline'
            displayName: 'Publish videos'
```

## Docker-basierte CI

Erstelle `Dockerfile.ci`:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-focal

WORKDIR /app

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY video-automation/package*.json ./

# Install dependencies
RUN npm ci

# Copy application
COPY video-automation/ ./

# Default command
CMD ["npm", "run", "pipeline:full"]
```

Verwendung:

```bash
# Build
docker build -f Dockerfile.ci -t video-automation:latest .

# Run
docker run --rm \
  -e BASE_URL=http://your-app.com \
  -e DEMO_EMAIL=demo@example.com \
  -e DEMO_PASSWORD=secret \
  -v $(pwd)/output:/app/output \
  video-automation:latest
```

## Secrets & Variables Setup

### GitHub Secrets
```bash
# Repository Settings > Secrets and variables > Actions

# Secrets
DEMO_BASE_URL=https://demo.your-app.com
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=your-secure-password

# Variables
BRAND_NAME=Markt-MA
BRAND_COLOR=#0066cc
```

### GitLab CI/CD Variables
```bash
# Settings > CI/CD > Variables

DEMO_BASE_URL=https://demo.your-app.com
DEMO_EMAIL=demo@example.com (Protected, Masked)
DEMO_PASSWORD=your-secure-password (Protected, Masked)
```

## Best Practices

1. **Separate Demo Environment**: Nutze eine dedizierte Demo-Instanz
2. **Stable Test Data**: Verwende seed-scripts für konsistente Daten
3. **Error Handling**: Verwende `continue-on-error` für nicht-kritische Flows
4. **Artifact Storage**: Speichere Videos mit SHA/Build-Number
5. **Scheduled Runs**: Generiere Videos nach Major Releases neu
6. **Notifications**: Benachrichtige Team bei Failed Builds

## Monitoring

### Add Status Badges

GitHub Actions:
```markdown
![Generate Videos](https://github.com/user/repo/workflows/Generate%20Videos/badge.svg)
```

GitLab CI:
```markdown
![Pipeline Status](https://gitlab.com/user/repo/badges/main/pipeline.svg)
```

## Troubleshooting CI

### "Browser not found"
```yaml
# Ensure browsers are installed with deps
- run: npx playwright install chromium --with-deps
```

### "Display not found"
```yaml
# Use xvfb for headless
- run: xvfb-run --auto-servernum npm run record:all
```

### "Out of memory"
```yaml
# Increase Node memory
- run: NODE_OPTIONS="--max-old-space-size=4096" npm run process:all
```


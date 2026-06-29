# markt.ma Demo Videos

Automated demo video recordings for marketing, social media, and presentations.

## 🎬 Available Demos

### 1. Platform Demo (Desktop)
**File:** `marktma-platform-demo.spec.js`  
**Duration:** ~2-3 minutes  
**Purpose:** Full platform showcase for landing pages, ads, investor presentations  

**Flow:**
1. Landing Page (Hero & Features)
2. Login with Demo User
3. Dashboard Overview
4. Demo Store
5. Products & Categories
6. Store Settings
7. Bot Protection (if available)
8. Public Storefront
9. Product Detail
10. WhatsApp Order Button (demo only, not executed)
11. Restaurant/Riad Features (if available)
12. Call to Action

### 2. Mobile Demo
**File:** `marktma-mobile-demo.spec.js`  
**Duration:** ~60-90 seconds  
**Purpose:** Mobile experience showcase for social media, mobile ads  

**Flow:**
1. Mobile Landing Page
2. Mobile Login
3. Mobile Dashboard
4. Mobile Storefront
5. Mobile Product Detail
6. Mobile WhatsApp Button
7. Mobile Restaurant Menu (if available)
8. Mobile CTA

## 🚀 How to Run

### Prerequisites
```bash
cd video-automation
npm install
npm run install:browsers
```

### Run Platform Demo (Desktop)
```bash
npm run demo:platform
```

### Run Mobile Demo
```bash
npm run demo:mobile
```

### Run All Demos
```bash
npm run demo:all
```

### Debug Mode
```bash
npm run demo:debug
```

## 📹 Video Output

Videos are saved to:
```
video-automation/test-results/
  demo-marktma-platform-demo-chromium/
    video.webm
  demo-marktma-mobile-demo-Mobile-Chrome/
    video.webm
```

## 🔐 Environment Variables

**IMPORTANT:** Always use demo credentials. Never use real customer data!

Create `.env` file:
```bash
# Base URL
BASE_URL=https://www.markt.ma

# Demo User (NEVER use real credentials!)
DEMO_EMAIL=demo@markt.ma
DEMO_PASSWORD=demoatmarkt.ma

# Demo Store
DEMO_STORE_SLUG=demoshop

# Video Settings (optional)
VIDEO_WIDTH=1920
VIDEO_HEIGHT=1080
VIDEO_FPS=30
VIDEO_BITRATE=2500k
```

## ⚠️ Safety Guidelines

### ✅ DO:
- Use demo credentials from ENV
- Use dedicated demo stores
- Show features without executing real actions
- Record on staging/test environments when possible
- Keep videos short and focused

### ❌ DON'T:
- **NEVER** use real customer credentials
- **NEVER** send real WhatsApp messages
- **NEVER** create real orders
- **NEVER** modify production data
- **NEVER** hardcode credentials in code
- **NEVER** commit `.env` files (already in .gitignore)

## 🎨 Video Features

All demos use FlowRecorder for:
- ✅ Beautiful gradient step indicators (markt.ma purple)
- ✅ Click position tracking
- ✅ Smooth animations
- ✅ Professional pacing
- ✅ No hetic movements
- ✅ Clear visual feedback

## 🔧 Customization

### Change Demo Flow
Edit the spec files in `tests/demo/`:
- `marktma-platform-demo.spec.js` - Desktop flow
- `marktma-mobile-demo.spec.js` - Mobile flow

### Change Timings
Adjust `recorder.pause(milliseconds)` in each step:
```javascript
await recorder.pause(2000); // 2 seconds
```

### Change Video Resolution
Edit `.env`:
```bash
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
```

### Add New Demo
1. Copy existing demo spec
2. Modify flow steps
3. Add script to `package.json`:
```json
"demo:custom": "playwright test tests/demo/my-custom-demo.spec.js --headed"
```

## 📊 Post-Processing

Use existing video processing pipeline:
```bash
# Process video (add branding, subtitles, etc.)
npm run process -- marktma-platform-demo

# Generate subtitles
npm run subtitles -- marktma-platform-demo

# Full pipeline
npm run pipeline:full
```

See parent `README.md` for full processing documentation.

## 🐛 Troubleshooting

### Video not recording
- Check playwright.config.js has `video: { mode: 'on' }`
- Check test-results/ directory permissions

### Demo fails with timeout
- Increase timeout in step: `await page.waitForLoadState('networkidle', { timeout: 30000 });`
- Check network connectivity
- Verify BASE_URL is correct

### Login fails
- Verify DEMO_EMAIL and DEMO_PASSWORD in .env
- Check if demo user exists
- Try manual login first

### Bot Protection not shown
- Feature may not be deployed yet
- Demo will skip automatically
- Check console: "Bot Protection not visible, skipping"

### WhatsApp opens real app
- This should NOT happen (we only hover, not click)
- If it does, check line with `whatsappButton.hover()` not `.click()`

## 📝 Notes

- Demos are independent from E2E tests
- Original flow tests in `tests/flows/` are NOT modified
- FlowRecorder utility is shared
- All demos run sequentially (workers: 1)
- slowMo: 500ms for better visibility

## 🎯 Next Steps

1. Run demo and verify output
2. Check video quality
3. Adjust timings if needed
4. Process video with branding
5. Share with team!

---

**Created:** 2026-06-28  
**Version:** 1.0.0  
**Contact:** Team markt.ma

# 🎬 Quick Start - markt.ma Demo Videos

## Sofort loslegen in 3 Schritten:

### 1. Environment Setup
Erstelle `.env` Datei im `video-automation/` Ordner:

```bash
BASE_URL=https://www.markt.ma
DEMO_EMAIL=demo@markt.ma
DEMO_PASSWORD=demoatmarkt.ma
DEMO_STORE_SLUG=demoshop
```

### 2. Demo starten
```bash
cd video-automation
npm run demo:platform
```

### 3. Video finden
```
video-automation/test-results/demo-marktma-platform-demo-chromium/video.webm
```

---

## 📋 Alle Befehle

```bash
# Platform Demo (Desktop, 2-3 min)
npm run demo:platform

# Mobile Demo (60-90s)
npm run demo:mobile

# Beide Demos hintereinander
npm run demo:all

# Debug Mode (Schritt für Schritt)
npm run demo:debug
```

---

## ⚠️ WICHTIG - Sicherheit

### ✅ ERLAUBT:
- Demo-Credentials aus .env verwenden
- Auf Staging/Test-Umgebung testen
- Features zeigen ohne Aktionen auszuführen

### ❌ VERBOTEN:
- **NIEMALS** echte Kundendaten verwenden
- **NIEMALS** echte WhatsApp-Nachrichten senden
- **NIEMALS** echte Bestellungen erstellen
- **NIEMALS** Production-Daten ändern
- **NIEMALS** Credentials im Code hardcoden
- **NIEMALS** .env committen (ist in .gitignore)

---

## 🎯 Demo-Flows

### Platform Demo (2-3 min)
1. ✅ Landing Page
2. ✅ Login
3. ✅ Dashboard
4. ✅ Store öffnen
5. ✅ Produkte/Kategorien
6. ✅ Store Settings
7. ✅ Bot Protection (falls vorhanden)
8. ✅ Public Storefront
9. ✅ Produktdetail
10. ✅ WhatsApp Button (nur zeigen!)
11. ✅ Restaurant/Riad (optional)
12. ✅ CTA

### Mobile Demo (60-90s)
1. ✅ Mobile Landing
2. ✅ Mobile Login
3. ✅ Mobile Dashboard
4. ✅ Mobile Storefront
5. ✅ Mobile Produktdetail
6. ✅ Mobile WhatsApp
7. ✅ Mobile Restaurant (optional)
8. ✅ Mobile CTA

---

## 🔧 Anpassungen

### Timings ändern
Datei öffnen: `tests/demo/marktma-platform-demo.spec.js`

```javascript
await recorder.pause(2000); // 2 Sekunden Pause
```

### Video-Auflösung ändern
In `.env`:
```bash
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
```

### Anderen Store verwenden
In `.env`:
```bash
DEMO_STORE_SLUG=restaurant-demo
```

---

## 🐛 Probleme?

### Video wird nicht aufgenommen
- ✅ Prüfe: `playwright.config.js` hat `video: { mode: 'on' }`
- ✅ Prüfe: `test-results/` Ordner existiert

### Demo schlägt fehl
- ✅ Prüfe: `.env` Datei existiert
- ✅ Prüfe: Demo-User existiert
- ✅ Prüfe: BASE_URL ist korrekt
- ✅ Erhöhe Timeout in Script

### Login funktioniert nicht
- ✅ Prüfe DEMO_EMAIL und DEMO_PASSWORD
- ✅ Teste manuellen Login zuerst
- ✅ Prüfe ob Demo-User aktiv ist

### Bot Protection wird nicht gezeigt
- ℹ️ Feature ist eventuell noch nicht deployed
- ℹ️ Demo überspringt automatisch mit Log:
  ```
  ⚠️ Bot Protection not visible, skipping
  ```

---

## 📊 Nach der Aufnahme

### Video verarbeiten (optional)
```bash
# Branding + Untertitel hinzufügen
npm run process -- marktma-platform-demo

# Untertitel generieren
npm run subtitles -- marktma-platform-demo

# Komplette Pipeline
npm run pipeline:full
```

### Video teilen
1. ✅ Video aus `test-results/` kopieren
2. ✅ Mit Team teilen
3. ✅ Für Social Media optimieren
4. ✅ Auf Landing Page einbinden

---

## 📞 Support

Bei Fragen:
1. Siehe `tests/demo/README.md` für Details
2. Siehe `ANALYSIS_DEMO_VIDEO.md` für vollständige Analyse
3. Kontaktiere Team markt.ma

---

**Erstellt:** 2026-06-28  
**Version:** 1.0.0  
**Status:** ✅ Produktionsbereit

# 🔧 AI Feature - 500 Error Troubleshooting Guide

## Problem
Der AI-Endpunkt gibt einen **500 Internal Server Error** zurück.

## Wahrscheinlichste Ursachen

### 1. ❌ Hugging Face API Key nicht gesetzt
Dies ist die häufigste Ursache!

### 2. ❌ RestTemplate Bean fehlt
Der Service kann nicht initialisiert werden.

### 3. ❌ Backend wurde nicht neu deployed
Die neuen Klassen sind noch nicht auf dem Server.

---

## 🔍 Diagnose-Schritte

### Schritt 1: Backend-Logs prüfen

SSH auf Ihren VPS verbinden:
```bash
ssh your-user@markt.ma
```

Backend-Logs anzeigen:
```bash
# Letzte 100 Zeilen
sudo journalctl -u storebackend -n 100 --no-pager

# Live-Logs verfolgen
sudo journalctl -u storebackend -f
```

**Suchen Sie nach folgenden Log-Meldungen:**

✅ **Erfolg:**
```
🤖 AiImageCaptioningService initialized
🔑 API Key configured: YES
```

❌ **Problem - Kein API Key:**
```
🤖 AiImageCaptioningService initialized
🔑 API Key configured: NO
```

❌ **Problem - Service nicht initialisiert:**
```
Error creating bean with name 'aiImageCaptioningService'
Could not autowire. No beans of 'RestTemplate' type found
```

---

### Schritt 2: Environment Variable prüfen

Auf dem VPS:
```bash
# Prüfe ob Variable gesetzt ist
sudo systemctl show storebackend --property=Environment | grep HUGGING

# Sollte zeigen:
# Environment=HUGGINGFACE_API_KEY=hf_xxxxxxxxxx
```

**Wenn nichts angezeigt wird:** API Key ist NICHT gesetzt!

---

## 🛠️ Lösungen

### Lösung 1: API Key manuell setzen (Quickfix)

```bash
# SSH auf VPS
ssh your-user@markt.ma

# Systemd Service-Datei bearbeiten
sudo nano /etc/systemd/system/storebackend.service
```

Fügen Sie unter `[Service]` hinzu:
```ini
[Service]
Environment="HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Speichern (Ctrl+O, Enter, Ctrl+X) und neu starten:
```bash
sudo systemctl daemon-reload
sudo systemctl restart storebackend
sudo journalctl -u storebackend -f
```

Warten Sie ~30 Sekunden auf:
```
🤖 AiImageCaptioningService initialized
🔑 API Key configured: YES
```

---

### Lösung 2: Über GitHub Actions (Automatisch)

**Der Token ist bereits in GitHub Secrets gespeichert!**

Sie müssen nur einen neuen Deployment anstoßen:

```bash
# Lokaler Terminal
cd storeBackend

# Dummy-Commit erstellen
git commit --allow-empty -m "Trigger deployment for AI feature"
git push origin main
```

GitHub Actions wird:
1. ✅ Token aus Secrets laden
2. ✅ Als Environment Variable exportieren
3. ✅ Backend neu deployen
4. ✅ Service mit Token starten

**Überwachen Sie den Deployment-Prozess:**
- GitHub → Your Repo → Actions Tab
- Warten Sie auf grünen Haken ✅

---

### Lösung 3: RestTemplate Bean fehlt (falls nötig)

Falls die Logs zeigen:
```
Could not autowire. No beans of 'RestTemplate' type found
```

Prüfen Sie `WebConfig.java`:
```bash
# Lokal
cat src/main/java/storebackend/config/WebConfig.java | grep -A 3 "RestTemplate"
```

Sollte enthalten:
```java
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

Falls nicht:
```bash
git pull origin main  # Holen Sie die neueste Version
mvn clean package     # Neu bauen
git push origin main  # Deploy
```

---

## 🧪 Testen nach dem Fix

### Test 1: Status-Endpoint aufrufen

```bash
curl -X GET "https://api.markt.ma/api/stores/5/products/ai-status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Erwartete Antwort:**
```json
{
  "serviceAvailable": true,
  "message": "AI service is available"
}
```

### Test 2: AI Feature im Frontend testen

1. Öffne: https://markt.ma
2. Login als Store-Owner
3. Gehe zu: Produkte → Neues Produkt
4. Klicke auf Tab: "🤖 KI-Assistent"
5. Lade ein Bild hoch
6. Klicke "Generieren"

**Erwartetes Ergebnis:**
- ✅ Keine Fehlermeldung
- ✅ AI generiert Titel und Beschreibung
- ✅ Daten können übernommen werden

---

## 📊 Welche Lösung ist die Richtige?

| Situation | Empfohlene Lösung |
|-----------|-------------------|
| **Erstes Setup** | Lösung 1 (Manuell) - schnell |
| **Produktion** | Lösung 2 (GitHub Actions) - automatisch |
| **RestTemplate fehlt** | Lösung 3 - Code-Fix nötig |

---

## 🔍 Erweiterte Diagnostik

### Prüfe ob Backend läuft:
```bash
curl https://api.markt.ma/actuator/health
# Sollte: {"status":"UP"}
```

### Prüfe AI-Endpoint (ohne Bild):
```bash
curl -X POST "https://api.markt.ma/api/stores/5/products/ai-suggest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Sollte: 400 Bad Request (weil Bild fehlt) - aber NICHT 500!
```

### Prüfe Spring Boot Startup:
```bash
sudo journalctl -u storebackend --since "5 minutes ago" | grep -i "ai\|hugging\|error"
```

---

## 🚨 Häufige Fehler

### Fehler 1: "Authentication required"
**Problem:** JWT Token ist abgelaufen oder ungültig
**Lösung:** Neu einloggen im Frontend

### Fehler 2: "Access denied"
**Problem:** User hat keine Berechtigung für Store 5
**Lösung:** Mit dem richtigen Store-Owner einloggen

### Fehler 3: "API key is not configured"
**Problem:** Environment Variable nicht gesetzt
**Lösung:** Siehe Lösung 1 oder 2 oben

### Fehler 4: "Failed to parse Hugging Face API response"
**Problem:** Hugging Face API ist down oder Token ungültig
**Lösung:** 
1. Prüfe Token auf https://huggingface.co/settings/tokens
2. Generiere neuen Token falls nötig
3. Aktualisiere GitHub Secret oder Environment Variable

---

## ✅ Success Checklist

Nach dem Fix sollten Sie sehen:

- [ ] Backend startet ohne Fehler
- [ ] Logs zeigen: "🤖 AiImageCaptioningService initialized"
- [ ] Logs zeigen: "🔑 API Key configured: YES"
- [ ] Status-Endpoint gibt `serviceAvailable: true`
- [ ] AI-Feature funktioniert im Frontend
- [ ] Bild wird hochgeladen und analysiert
- [ ] Titel und Beschreibung werden generiert

---

## 💡 Quick Commands Zusammenfassung

```bash
# 1. Auf VPS verbinden
ssh your-user@markt.ma

# 2. Logs checken
sudo journalctl -u storebackend -n 50 | grep -i "ai\|hugging\|error"

# 3. Environment prüfen
sudo systemctl show storebackend --property=Environment | grep HUGGING

# 4. Falls leer: Manuell setzen
sudo nano /etc/systemd/system/storebackend.service
# Füge hinzu: Environment="HUGGINGFACE_API_KEY=hf_xxx"

# 5. Neu starten
sudo systemctl daemon-reload
sudo systemctl restart storebackend

# 6. Status prüfen
sudo journalctl -u storebackend -f
```

---

## 📞 Nächste Schritte

1. **Wählen Sie Ihre Lösung** (1, 2 oder 3)
2. **Führen Sie die Schritte aus**
3. **Prüfen Sie die Logs**
4. **Testen Sie das Feature**
5. **Bei Problemen:** Senden Sie mir die Backend-Logs

---

**Status:** 🔧 Warten auf Ihre Aktion

Bitte führen Sie **Lösung 1** oder **Lösung 2** aus und teilen Sie mir die Ergebnisse mit!


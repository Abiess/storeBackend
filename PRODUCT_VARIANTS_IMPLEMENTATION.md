# Produktvarianten mit Bildern - Implementierungs-Guide
## ✅ Was wurde implementiert:
### Backend (Java):
1. **ProductVariant Entity** erweitert um:
   - \image_url VARCHAR(500)\ - Haupt-Bild der Variante
2. **ProductVariantDTO** erweitert um:
   - \imageUrl\ - Haupt-Bild URL
   - \images\ - Liste von Bild-URLs (für zukünftige Erweiterung)
3. **ProductVariantService** aktualisiert:
   - \	oDTO()\ überträgt jetzt imageUrl
   - \createVariant()\ speichert imageUrl
   - \updateVariant()\ aktualisiert imageUrl
4. **Datenbank Schema** aktualisiert:
   - \src/main/resources/schema.sql\ (H2)
   - \scripts/db/schema.sql\ (PostgreSQL)
   - Migrations-Script: \scripts/db/add_variant_images.sql\
### Frontend (Angular):
1. **ProductVariant Model** erweitert um:
   - \imageUrl?: string\
   - \images?: string[]\
   - \mediaUrls?: string[]\
2. **ProductVariantsManagerComponent** erweitert:
   - ImageUploadComponent integriert
   - \getVariantImages()\ - Konvertiert Varianten-Bilder für Upload-Komponente
   - \onVariantImagesChange()\ - Speichert geänderte Bilder
   - Erweiterte Varianten-Cards mit Bild-Upload-Bereich
3. **UI-Verbesserungen**:
   - Separate Bild-Upload-Sektion für jede Variante
   - Responsive Grid-Layout
   - Visuelle Trennung der Bereiche
   - Bessere Übersichtlichkeit
## 🚀 Verwendung:
### Produkt mit Varianten erstellen:
1. **Login** auf https://markt.ma
2. **Store-Verwaltung öffnen** → Manage Store
3. **Produkt erstellen/bearbeiten**
4. **Tab "Varianten"** wählen
5. **Optionen definieren**:
   - z.B. Option 1: "Farbe" → Werte: "Rot", "Blau", "Schwarz"
   - z.B. Option 2: "Größe" → Werte: "S", "M", "L"
6. **Basispreis** und **Basislagerbestand** eingeben
7. **"Varianten generieren"** klicken
8. **Für jede Variante**:
   - 📸 Bilder hochladen (Drag & Drop oder Auswahl)
   - 💰 Individuellen Preis festlegen
   - 📦 Individuellen Lagerbestand eingeben
   - SKU anpassen (optional)
9. **"Alle Varianten speichern"** klicken
## 🗄️ Datenbank-Migration ausführen:
### Lokal (H2):
Backend automatisch neu starten - Schema wird automatisch aktualisiert
### Produktion (PostgreSQL):
\\\ash
psql -U your_user -d your_database -f scripts/db/add_variant_images.sql
\\\
## 🧪 Test-Daten (Demo T-Shirts):
Demo-Bilder befinden sich unter:
- \storeFrontend/src/assets/images/demo-products/tshirt-white.svg\
- \storeFrontend/src/assets/images/demo-products/tshirt-black.svg\
## 📋 Checkliste:
- [x] Backend Entity erweitert
- [x] Backend DTO erweitert
- [x] Backend Service aktualisiert
- [x] Datenbank Schema aktualisiert
- [x] Frontend Model erweitert
- [x] Frontend Komponente erweitert
- [x] UI mit Image-Upload integriert
- [x] Alle Übersetzungen hinzugefügt (DE, EN, AR)
- [x] CSS-Styles für erweiterte Cards
- [ ] Datenbank-Migration ausführen
- [ ] Backend neu starten
- [ ] Frontend testen
## 🐛 Bekannte Probleme:
1. **canGenerate() Null-Check**: 
   - Problem: \option.values.length\ kann null sein
   - Status: Wird überprüft
2. **Image Upload Integration**:
   - Die ImageUploadComponent erwartet File-Uploads
   - Varianten-Bilder werden als URLs gespeichert
   - Beide Ansätze müssen harmonisiert werden
## 🔧 Nächste Schritte:
1. Backend neu starten
2. Datenbank-Migration ausführen (falls nötig)
3. Produkt mit Varianten testen
4. Playwright-Test erstellen für "Produkt mit Varianten hinzufügen"

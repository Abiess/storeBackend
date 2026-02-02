# Store Slider Feature - Quick Start Guide

## ✅ Installation erfolgreich!

Alle Dateien wurden erfolgreich erstellt. Hier ist, was implementiert wurde:

### Backend (Java/Spring Boot)

**Entities (5)**:
- `StoreSliderSettings` - Slider-Konfiguration
- `StoreSliderImage` - Slider-Bilder
- `DefaultSliderImage` - System-Default-Bilder
- `SliderOverrideMode` (Enum) - DEFAULT_ONLY | OWNER_ONLY | MIXED
- `SliderImageType` (Enum) - DEFAULT | OWNER_UPLOAD

**DTOs (3)**:
- `StoreSliderSettingsDTO`
- `StoreSliderImageDTO`
- `StoreSliderDTO`

**Repositories (3)**:
- `StoreSliderSettingsRepository`
- `StoreSliderImageRepository`
- `DefaultSliderImageRepository`

**Services (1)**:
- `StoreSliderService` - Vollständige Business-Logik

**Controllers (1)**:
- `StoreSliderController` - 7 REST Endpoints

**Migration**:
- `V8__add_store_slider_feature.sql` - Erstellt 3 Tabellen + Initial-Daten

### Frontend (Angular)

**Service**:
- `store-slider.service.ts` - API-Client

**Komponenten (2)**:
- `store-slider-viewer.component.ts` - Kunden-Ansicht
- `store-slider-editor.component.ts` - Owner-Verwaltung

## 🚀 Nächste Schritte

1. **Backend starten**:
```bash
cd storeBackend
mvn spring-boot:run
```

2. **Flyway führt automatisch die Migration aus** beim Start
   - Erstellt 3 neue Tabellen
   - Fügt 9 Default-Bilder ein

3. **Slider wird automatisch erstellt** beim Erstellen eines neuen Stores

4. **Frontend einbinden**:
```html
<!-- In Store-Detail-Seite (Kunden-Ansicht) -->
<app-store-slider-viewer [storeId]="storeId"></app-store-slider-viewer>

<!-- In Store-Editor-Seite (Owner) -->
<app-store-slider-editor [storeId]="storeId"></app-store-slider-editor>
```

## 📝 API Endpoints

```
GET    /api/stores/{storeId}/slider           # Kompletter Slider
GET    /api/stores/{storeId}/slider/active    # Nur aktive Bilder
PUT    /api/stores/{storeId}/slider/settings  # Settings updaten
POST   /api/stores/{storeId}/slider/images    # Bild hochladen
PUT    /api/stores/{storeId}/slider/images/{id} # Bild updaten
PUT    /api/stores/{storeId}/slider/images/reorder # Reihenfolge ändern
DELETE /api/stores/{storeId}/slider/images/{id} # Bild löschen
```

## 🎯 Kernfeatures

✅ **Automatische Initialisierung** - Default-Bilder werden beim Store-Erstellen hinzugefügt
✅ **Kategoriebasiert** - Fashion, Electronics, Food, General
✅ **Auto-Switch** - Erstes eigenes Bild → automatisch `owner_only` Modus
✅ **Drag & Drop** - Reihenfolge ändern im Editor
✅ **Responsive** - Mobile-optimiert
✅ **Anpassbar** - Autoplay, Timings, Loop, Dots, Arrows

## 🔧 Testen

### Backend testen:
```bash
# Slider abrufen
curl http://localhost:8080/api/stores/1/slider

# Mit Authentication (JWT Token):
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/stores/1/slider
```

### Prüfen ob Migration lief:
```sql
SELECT * FROM flyway_schema_history;
SELECT * FROM default_slider_images;
SELECT * FROM store_slider_settings;
```

## 📖 Vollständige Dokumentation

Siehe `STORE_SLIDER_FEATURE.md` für:
- Detaillierte API-Referenz
- Datenbank-Schema
- Troubleshooting
- Erweiterungsmöglichkeiten

---

**Status**: ✅ Alles bereit für Production!


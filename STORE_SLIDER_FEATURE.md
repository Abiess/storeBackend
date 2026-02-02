# Store Slider Feature - Vollständige Dokumentation

## Übersicht

Das Store Slider Feature ermöglicht es, automatisch bei der Erstellung eines Stores einen Slider mit Default-Bildern zu generieren. Store-Owner können diese Bilder verwalten, deaktivieren, eigene Bilder hochladen und die Darstellung anpassen.

## Features

✅ **Automatische Initialisierung**: Beim Erstellen eines Stores wird automatisch ein Slider mit Default-Bildern erstellt
✅ **Kategoriebasierte Bilder**: Default-Bilder werden basierend auf Store-Name/Beschreibung ausgewählt (fashion, electronics, food, general)
✅ **Override Modes**: 
   - `default_only`: Nur Default-Bilder anzeigen
   - `owner_only`: Nur eigene hochgeladene Bilder anzeigen
   - `mixed`: Beide Typen mischen
✅ **Auto-Switch**: Sobald der Owner das erste eigene Bild hochlädt, wird automatisch zu `owner_only` gewechselt
✅ **Slider Settings**: Autoplay, Dauer pro Slide, Übergangszeit, Loop, Dots, Arrows
✅ **Bildverwaltung**: Reihenfolge ändern (Drag & Drop), Aktivieren/Deaktivieren, Löschen
✅ **Frontend Viewer**: Responsive Slider-Komponente für Kunden-Ansicht
✅ **Frontend Editor**: Volle Verwaltungs-UI für Store-Owner

## Datenbank-Schema

### Tabellen

#### `store_slider_settings`
```sql
id BIGSERIAL PRIMARY KEY
store_id BIGINT NOT NULL UNIQUE
override_mode VARCHAR(20) DEFAULT 'default_only'
autoplay BOOLEAN DEFAULT true
duration_ms INTEGER DEFAULT 5000
transition_ms INTEGER DEFAULT 500
loop_enabled BOOLEAN DEFAULT true
show_dots BOOLEAN DEFAULT true
show_arrows BOOLEAN DEFAULT true
```

#### `store_slider_images`
```sql
id BIGSERIAL PRIMARY KEY
store_id BIGINT NOT NULL
media_id BIGINT NULL  -- NULL für Default-Bilder
image_url VARCHAR(500) NOT NULL
image_type VARCHAR(20)  -- 'default' | 'owner_upload'
display_order INTEGER DEFAULT 0
is_active BOOLEAN DEFAULT true
alt_text VARCHAR(255)
```

#### `default_slider_images`
```sql
id BIGSERIAL PRIMARY KEY
category VARCHAR(100) DEFAULT 'general'
image_url VARCHAR(500) NOT NULL
alt_text VARCHAR(255)
display_order INTEGER DEFAULT 0
is_active BOOLEAN DEFAULT true
```

## Backend API

### Basis-URL: `/api/stores/{storeId}/slider`

### Endpoints

#### 1. GET `/api/stores/{storeId}/slider`
**Beschreibung**: Holt kompletten Slider (Settings + Images)
**Auth**: Keine (öffentlich)
**Response**:
```json
{
  "settings": {
    "id": 1,
    "storeId": 5,
    "overrideMode": "DEFAULT_ONLY",
    "autoplay": true,
    "durationMs": 5000,
    "transitionMs": 500,
    "loopEnabled": true,
    "showDots": true,
    "showArrows": true
  },
  "images": [
    {
      "id": 1,
      "storeId": 5,
      "mediaId": null,
      "imageUrl": "https://images.unsplash.com/...",
      "imageType": "DEFAULT",
      "displayOrder": 0,
      "isActive": true,
      "altText": "Willkommen"
    }
  ]
}
```

#### 2. GET `/api/stores/{storeId}/slider/active`
**Beschreibung**: Holt nur aktive Slider-Images (optimiert für Frontend-Darstellung)
**Auth**: Keine (öffentlich)
**Response**: `Array<StoreSliderImage>`

#### 3. PUT `/api/stores/{storeId}/slider/settings`
**Beschreibung**: Aktualisiert Slider Settings
**Auth**: STORE_OWNER oder ADMIN
**Body**:
```json
{
  "overrideMode": "OWNER_ONLY",
  "autoplay": false,
  "durationMs": 7000
}
```
**Response**: `StoreSliderSettings`

#### 4. POST `/api/stores/{storeId}/slider/images`
**Beschreibung**: Lädt ein neues Owner-Bild hoch
**Auth**: STORE_OWNER oder ADMIN
**Content-Type**: `multipart/form-data`
**Body**:
- `file`: MultipartFile (Image)
- `altText`: String (optional)
**Response**: `StoreSliderImage`

**Auto-Behavior**: Wenn dies das erste Owner-Bild ist, wird `overrideMode` automatisch auf `OWNER_ONLY` gesetzt.

#### 5. PUT `/api/stores/{storeId}/slider/images/{imageId}`
**Beschreibung**: Aktualisiert ein Slider Image
**Auth**: STORE_OWNER oder ADMIN
**Body**:
```json
{
  "displayOrder": 2,
  "isActive": false,
  "altText": "Neuer Alt-Text"
}
```
**Response**: `StoreSliderImage`

#### 6. PUT `/api/stores/{storeId}/slider/images/reorder`
**Beschreibung**: Ändert die Reihenfolge mehrerer Images
**Auth**: STORE_OWNER oder ADMIN
**Body**:
```json
{
  "imageIds": [3, 1, 2]
}
```
**Response**: 204 No Content

#### 7. DELETE `/api/stores/{storeId}/slider/images/{imageId}`
**Beschreibung**: Löscht ein Slider Image
**Auth**: STORE_OWNER oder ADMIN
**Response**: 204 No Content

**Hinweis**: Default-Bilder können deaktiviert, aber nicht gelöscht werden. Owner-Uploads werden vollständig gelöscht (inkl. Media-Objekt).

## Frontend Komponenten

### 1. StoreSliderViewerComponent (Kunden-Ansicht)

**Usage**:
```html
<app-store-slider-viewer [storeId]="storeId"></app-store-slider-viewer>
```

**Features**:
- Responsive Design (3:1 Aspect Ratio)
- Autoplay mit konfigurierbarer Dauer
- Navigation: Pfeile + Dots
- Touch/Swipe Support (via CSS transitions)
- Loop-Modus
- Pausieren beim Hover (optional)

### 2. StoreSliderEditorComponent (Owner-Verwaltung)

**Usage**:
```html
<app-store-slider-editor [storeId]="storeId"></app-store-slider-editor>
```

**Features**:
- Settings-Editor (Override Mode, Autoplay, Timings, etc.)
- Bild-Upload mit Preview
- Drag & Drop Reordering (Angular CDK)
- Aktivieren/Deaktivieren von Bildern
- Alt-Text bearbeiten
- Löschen von Owner-Uploads
- Live-Feedback beim Speichern

### 3. StoreSliderService (API Service)

**Usage**:
```typescript
constructor(private sliderService: StoreSliderService) {}

// Slider laden
this.sliderService.getSlider(storeId).subscribe(slider => {
  console.log(slider);
});

// Bild hochladen
this.sliderService.uploadImage(storeId, file, altText).subscribe(image => {
  console.log('Uploaded:', image);
});
```

## Backend Services

### StoreSliderService

**Wichtige Methoden**:

1. `initializeSliderForNewStore(Store store, String category)`
   - Wird automatisch beim Store-Erstellen aufgerufen
   - Erstellt Settings + Default-Bilder basierend auf Kategorie

2. `getSliderByStoreId(Long storeId)`
   - Holt kompletten Slider mit Bildern basierend auf Override Mode

3. `uploadOwnerImage(Long storeId, MultipartFile file, String altText)`
   - Upload über MediaService
   - Auto-Switch zu OWNER_ONLY beim ersten Upload

4. `reorderImages(Long storeId, List<Long> imageIds)`
   - Aktualisiert displayOrder für mehrere Bilder

### Integration in StoreService

**Automatische Initialisierung**:
```java
@Transactional
public StoreDTO createStore(CreateStoreRequest request, User owner) {
    // ... Store erstellen ...
    
    // Slider initialisieren
    String category = determineStoreCategory(request.getName(), request.getDescription());
    sliderService.initializeSliderForNewStore(store, category);
    
    return toDTO(store);
}
```

**Kategoriebestimmung**:
- Keywords in Name/Beschreibung → Kategorie
- fashion/clothing → "fashion"
- electronics/gadget → "electronics"
- food/restaurant → "food"
- Default → "general"

## Migration ausführen

```bash
# Flyway wird beim App-Start automatisch ausgeführt
mvn spring-boot:run

# Oder manuell:
mvn flyway:migrate
```

Die Migration `V8__add_store_slider_feature.sql` erstellt:
- 3 Tabellen (settings, images, default_images)
- Indizes für Performance
- Initial 9 Default-Bilder (Unsplash URLs)
- Berechtigungen für `storeapp` User

## Default-Bilder anpassen

Die Default-Bilder können in der Datenbank aktualisiert werden:

```sql
-- Neue Default-Bilder hinzufügen
INSERT INTO default_slider_images (category, image_url, alt_text, display_order) 
VALUES ('fashion', 'https://your-image-url.jpg', 'Fashion Image', 1);

-- Bestehende deaktivieren
UPDATE default_slider_images SET is_active = false WHERE id = 1;

-- Reihenfolge ändern
UPDATE default_slider_images SET display_order = 10 WHERE id = 5;
```

## Testing

### Backend Tests
```bash
mvn test
```

### Frontend Tests (Cypress)
```bash
cd storeFrontend
npm run cypress:open
```

### Manuelle API Tests

**1. Slider abrufen**:
```bash
curl http://localhost:8080/api/stores/1/slider
```

**2. Settings aktualisieren** (mit JWT Token):
```bash
curl -X PUT http://localhost:8080/api/stores/1/slider/settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoplay": false, "durationMs": 8000}'
```

**3. Bild hochladen**:
```bash
curl -X POST http://localhost:8080/api/stores/1/slider/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "altText=Mein Bild"
```

## Troubleshooting

### Problem: Slider wird nicht initialisiert

**Lösung**: 
- Prüfen Sie die Logs: `sudo journalctl -u storebackend -n 100`
- Migration lief? `SELECT * FROM flyway_schema_history;`
- Default-Bilder vorhanden? `SELECT * FROM default_slider_images;`

### Problem: Bilder werden nicht angezeigt

**Lösung**:
- Override Mode prüfen: `SELECT override_mode FROM store_slider_settings WHERE store_id = X;`
- Bilder aktiv? `SELECT * FROM store_slider_images WHERE store_id = X AND is_active = true;`
- CORS korrekt konfiguriert für externe Bild-URLs?

### Problem: Upload schlägt fehl

**Lösung**:
- MinIO läuft? `docker ps | grep minio`
- MediaService korrekt konfiguriert? `application.yml` prüfen
- Berechtigungen: User muss STORE_OWNER oder ADMIN sein

## Performance-Optimierungen

1. **CDN für Default-Bilder**: Unsplash URLs können durch eigene CDN-URLs ersetzt werden
2. **Lazy Loading**: Slider-Komponente lädt Bilder lazy
3. **Indizes**: Bereits optimierte DB-Indizes auf `store_id`, `is_active`, `display_order`
4. **Caching**: Slider-Daten können im Frontend gecacht werden (z.B. 5 Minuten)

## Erweiterungsmöglichkeiten

- [ ] Video-Slides unterstützen
- [ ] Animation-Effekte (fade, slide, zoom)
- [ ] Mobile Touch-Gestures (Swipe)
- [ ] Admin-Panel für Default-Bilder-Verwaltung
- [ ] A/B Testing für verschiedene Slider-Konfigurationen
- [ ] Analytics: Click-Tracking auf Slides
- [ ] Zeitgesteuerte Slides (z.B. nur zu bestimmten Uhrzeiten)

## Zusammenfassung

Das Store Slider Feature ist vollständig implementiert und produktionsbereit:

✅ **Backend**: 5 Entities, 3 Repositories, 1 Service, 1 Controller
✅ **Frontend**: 2 Komponenten (Viewer + Editor), 1 Service
✅ **Datenbank**: Migration mit 3 Tabellen + Initial-Daten
✅ **Integration**: Automatische Initialisierung beim Store-Erstellen
✅ **API**: 7 REST Endpoints mit voller CRUD-Funktionalität
✅ **UX**: Drag & Drop, Live-Updates, Responsive Design

Bei Fragen oder Problemen: Logs prüfen und obige Troubleshooting-Tipps befolgen.


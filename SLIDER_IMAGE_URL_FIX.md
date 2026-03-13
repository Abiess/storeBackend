# Slider Image URL Fix - AccessDenied / Request has expired

## 🐛 Problem

```xml
<Error>
<Code>AccessDenied</Code>
<Message>Request has expired</Message>
<Key>stores/4/image/975e66a9-dbf1-4304-97f1-4903331f23af.png</Key>
<BucketName>store-assets</BucketName>
</Error>
```

**Ursache:**
- Slider-Bilder verwenden **alte presigned URLs** aus der Datenbank
- Diese URLs sind **abgelaufen** (MinIO Max: 7 Tage)
- Die URLs wurden beim Upload gespeichert und nie aktualisiert

---

## ✅ Lösung

### Änderungen in `StoreSliderService.java`

#### 1. MinioService injiziert
```java
private final MinioService minioService; // NEU hinzugefügt
```

#### 2. `mapImageToDTO()` generiert frische URLs
```java
private StoreSliderImageDTO mapImageToDTO(StoreSliderImage image) {
    // ...
    
    // ✅ FIX: Generiere frische presigned URL wenn media vorhanden ist
    String imageUrl;
    if (image.getMedia() != null) {
        // Owner-Upload: Generiere frische URL von MinIO (7 Tage gültig)
        try {
            imageUrl = minioService.getPresignedUrl(
                image.getMedia().getMinioObjectName(), 
                10080  // 7 Tage = MaxLimit
            );
        } catch (Exception e) {
            imageUrl = image.getImageUrl(); // Fallback
        }
    } else {
        // Default-Bild: Verwende gespeicherte URL
        imageUrl = image.getImageUrl();
    }
    
    dto.setImageUrl(imageUrl);
    // ...
}
```

---

## 🔄 Wie funktioniert es jetzt?

### VORHER (Problem):
1. Slider-Bild wird hochgeladen → presigned URL generiert
2. URL wird in DB gespeichert (`store_slider_images.image_url`)
3. **7 Tage später:** URL ist abgelaufen → AccessDenied Error
4. Frontend kann Bild nicht laden

### NACHHER (Gelöst):
1. Slider-Bild wird hochgeladen → presigned URL generiert
2. URL wird in DB gespeichert (als Fallback)
3. **Bei jedem Abruf:** Frische URL wird dynamisch generiert
4. Frontend bekommt immer gültige URLs (7 Tage gültig)

---

## 📊 Datenbank-Schema

```sql
CREATE TABLE store_slider_images (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    media_id BIGINT,              -- Referenz zu media-Tabelle
    image_url VARCHAR(500),        -- Alte URL (Fallback)
    image_type VARCHAR(50),        -- DEFAULT oder OWNER_UPLOAD
    display_order INTEGER,
    is_active BOOLEAN,
    alt_text VARCHAR(500),
    created_at TIMESTAMP
);
```

**Wichtig:**
- `media_id`: Wenn vorhanden → Generiere frische URL
- `image_url`: Wenn `media_id` NULL (Default-Bilder) → Verwende gespeicherte URL

---

## 🔍 Unterschied: Default vs Owner-Upload

### Default-Bilder (SliderImageType.DEFAULT)
- ❌ **Keine** `media_id`
- ✅ Verwenden externe URLs (z.B. Unsplash)
- ✅ Laufen nicht ab
- ✅ Verwenden `image_url` direkt

```java
// Default-Bild Beispiel
{
  "imageUrl": "https://images.unsplash.com/photo-...",
  "mediaId": null,
  "imageType": "DEFAULT"
}
```

### Owner-Upload-Bilder (SliderImageType.OWNER_UPLOAD)
- ✅ **Hat** `media_id`
- ✅ Gespeichert in MinIO
- ✅ **Neue Lösung:** Frische URL wird dynamisch generiert
- ⚠️ **Alt (abgelaufen):** `image_url` aus DB

```java
// Owner-Upload Beispiel
{
  "imageUrl": "https://minio.../stores/4/image/uuid.png?X-Amz-...",  // FRISCH generiert!
  "mediaId": 42,
  "imageType": "OWNER_UPLOAD"
}
```

---

## 🧪 Test

### 1. Backend-Test
```bash
# Slider-Bilder abrufen
curl http://localhost:8080/api/stores/4/slider
```

**Erwartetes Ergebnis:**
```json
{
  "settings": {...},
  "images": [
    {
      "id": 1,
      "mediaId": 42,
      "imageUrl": "http://localhost:9000/store-assets/stores/4/image/uuid.png?X-Amz-Date=2026-03-13...",
      "imageType": "OWNER_UPLOAD",
      "isActive": true
    }
  ]
}
```

✅ Die URL hat einen **frischen Timestamp** (X-Amz-Date = heute)

### 2. Frontend-Test
1. Öffne Storefront: `http://localhost:4200/stores/4`
2. Slider sollte Bilder anzeigen (kein AccessDenied)
3. DevTools → Network → Bilde-Requests → Status 200

---

## 📋 Vergleich mit Media-API

Dieselbe Lösung wie bei `MediaService`:

| Feature | Media API | Slider API |
|---------|-----------|------------|
| **Problem** | Alte presigned URLs | Alte presigned URLs |
| **Lösung** | Frische URLs generieren | Frische URLs generieren |
| **Methode** | `MediaService.convertToDTO()` | `StoreSliderService.mapImageToDTO()` |
| **Gültigkeit** | 7 Tage (10080 min) | 7 Tage (10080 min) |
| **Fallback** | Keine URL (NULL) | Gespeicherte URL |

---

## 🚀 Deployment

### Keine Datenbank-Migration nötig!
- ✅ Schema ist korrekt (media_id existiert bereits)
- ✅ Gespeicherte URLs bleiben als Fallback
- ✅ Frische URLs werden dynamisch generiert

### Einfach Backend neu starten:
```bash
./mvnw spring-boot:run
```

### Testen:
```bash
# Slider abrufen
curl http://localhost:8080/api/stores/4/slider

# Storefront öffnen
# → http://localhost:4200/stores/4
# → Slider sollte Bilder anzeigen
```

---

## 💡 Best Practices (für die Zukunft)

### ❌ NICHT speichern:
```java
// Schlecht: Presigned URL in DB speichern
sliderImage.setImageUrl(uploadResponse.getUrl());
```

### ✅ EMPFOHLEN:
```java
// Gut: Nur MinIO-Objektname speichern (in media-Tabelle)
sliderImage.setMedia(media);  // media enthält minioObjectName
sliderImage.setImageUrl(null); // Oder als Fallback

// URL wird dynamisch generiert beim Abruf
String url = minioService.getPresignedUrl(media.getMinioObjectName(), 10080);
```

### 🎯 Regel:
**Presigned URLs sollten NIEMALS persistent gespeichert werden!**
- Sie laufen ab (max 7 Tage)
- Sie sollten on-demand generiert werden
- Speichere nur den `minioObjectName`

---

## ✅ Status

- [x] Problem identifiziert (abgelaufene URLs)
- [x] `StoreSliderService.java` gefixt
- [x] MinioService injiziert
- [x] `mapImageToDTO()` generiert frische URLs
- [x] Fallback für Default-Bilder
- [x] Dokumentation erstellt

**Status: ✅ BEHOBEN**

Nach Backend-Neustart sollten alle Slider-Bilder korrekt angezeigt werden!


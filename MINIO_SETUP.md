```json
{
  "id": 1,
  "storeId": 1,
  "storageBytes": 15728640,
  "storageMb": 15,
  "imageCount": 25,
  "productCount": 12,
  "maxStorageMb": 100,
  "maxImageCount": 100,
  "maxProducts": 50,
  "storageUsagePercent": 15.0,
  "imageUsagePercent": 25.0,
  "productUsagePercent": 24.0
}
```

**Verwendung im Frontend:**
- Progress Bars für Quota-Anzeige
- Warnungen bei 80%+ Nutzung
- Upgrade-Prompts bei Limit-Erreichen

---

## 🚀 Performance-Optimierungen

### 1. **Lazy Loading**
```java
@ManyToOne(fetch = FetchType.LAZY)
private Store store;
```

### 2. **Presigned URL Caching**
- URLs für 60 Min gültig → clientseitig cachen
- Reduziert Backend-Requests

### 3. **Thumbnails** (zukünftig)
```java
// Generiere kleinere Versionen beim Upload:
// - thumbnail (150x150)
// - medium (800x600)
// - large (1920x1080)
```

### 4. **CDN vor MinIO** (Production)
```
Client → CloudFlare CDN → Nginx → MinIO
         ↑ Cache         ↑ Proxy
```

---

## 📝 Best Practices

### Upload-Flow im Frontend

```javascript
async function uploadProductImage(storeId, file, altText) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mediaType', 'PRODUCT_IMAGE');
  formData.append('altText', altText);

  const response = await fetch(
    `https://app.markt.ma/api/stores/${storeId}/media/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  const data = await response.json();
  // data.url → presigned URL zum Anzeigen
  // data.mediaId → für spätere Referenz
  
  return data;
}
```

### Produkt mit Bildern verknüpfen

```java
// Zukünftige Erweiterung:
@Entity
public class Product {
    // ...existing code...
    
    @OneToMany(mappedBy = "product")
    private List<Media> images;
    
    @ManyToOne
    private Media primaryImage;
}
```

---

## 🚀 Setup

### 1. MinIO installieren und starten

#### Windows (Docker):
```bash
docker run -p 9000:9000 -p 9001:9001 ^
  --name minio ^
  -e "MINIO_ROOT_USER=minioadmin" ^
  -e "MINIO_ROOT_PASSWORD=minioadmin" ^
  quay.io/minio/minio server /data --console-address ":9001"
```

#### Linux:
```bash
docker run -p 9000:9000 -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"
```

### 2. MinIO Console öffnen
- URL: http://localhost:9001
- Login: minioadmin / minioadmin

### 3. Maven Dependency hinzufügen

Fügen Sie diese Dependency zur `pom.xml` hinzu (nach jjwt-jackson):

```xml
<!-- MinIO Client for S3-compatible storage -->
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>
```

### 4. Konfiguration

Die `application.yml` wurde bereits aktualisiert:

```yaml
minio:
  endpoint: http://localhost:9000
  accessKey: minioadmin
  secretKey: minioadmin
  bucket: markt-media
  region: us-east-1
  secure: false
```

### 5. Backend starten

```bash
mvn clean install
mvn spring-boot:run
```

Das Backend erstellt automatisch den Bucket `markt-media` beim Start.

---

## 🧪 Testing

Verwenden Sie die `media-test.http` Datei für API-Tests:

### Workflow:
1. Benutzer registrieren und anmelden
2. Store erstellen
3. Usage Statistics abrufen (sollte 0 sein)
4. Bild hochladen
5. Alle Media abrufen
6. Usage Statistics erneut prüfen (Storage/Count erhöht)
7. Media löschen (Usage wird reduziert)

### Beispiel: Bild hochladen

**WICHTIG**: IntelliJ IDEA und VS Code haben unterschiedliche Formate für Multipart-Uploads.

#### Für IntelliJ IDEA HTTP Client:
```http
POST http://localhost:8080/api/stores/{{store_id}}/media/upload
Authorization: Bearer {{auth_token}}
Content-Type: multipart/form-data; boundary=WebAppBoundary

--WebAppBoundary
Content-Disposition: form-data; name="file"; filename="test.jpg"
Content-Type: image/jpeg

< ./test-images/product.jpg
--WebAppBoundary
Content-Disposition: form-data; name="mediaType"

PRODUCT_IMAGE
--WebAppBoundary
Content-Disposition: form-data; name="altText"

Beautiful product image
--WebAppBoundary--
```

#### Alternative: cURL
```bash
curl -X POST http://localhost:8080/api/stores/1/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "mediaType=PRODUCT_IMAGE" \
  -F "altText=Product image"
```

---

## 🔧 Limit Enforcement

### Storage Limit
Beim Upload wird geprüft:
- Aktueller Speicherverbrauch + neue Dateigröße ≤ Plan-Limit
- Bei Überschreitung: `400 Bad Request` mit Fehlermeldung

### Image Count Limit
- FREE Plan: max 100 Bilder
- PRO Plan: max 5000 Bilder
- ENTERPRISE: unbegrenzt (-1)

### Product Count Limit
- Wird jetzt auch bei `POST /api/stores/{storeId}/products` geprüft
- FREE Plan: max 50 Produkte

---

## 🏗️ Architektur

### Services

1. **MinioService**: Low-level MinIO-Operationen (Upload, Delete, Presigned URLs)
2. **StoreUsageService**: Tracking und Limit-Prüfung
3. **MediaService**: Business-Logik für Media-Management
4. **ProductService**: Erweitert um Produkt-Limit-Prüfung

### Datenfluss: Upload

```
Client → MediaController → MediaService
  ↓
  Validate file (Typ, Größe)
  ↓
  Check limits (StoreUsageService)
  ↓
  Upload to MinIO (MinioService)
  ↓
  Save metadata (MediaRepository)
  ↓
  Update usage (StoreUsageService)
  ↓
  Return presigned URL
```

---

## 🌐 Production Deployment (VPS)

### 1. MinIO auf VPS installieren

```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Service erstellen
sudo nano /etc/systemd/system/minio.service
```

Inhalt:
```ini
[Unit]
Description=MinIO
After=network.target

[Service]
Type=simple
User=minio
Group=minio
WorkingDirectory=/var/minio
ExecStart=/usr/local/bin/minio server /var/minio/data --console-address ":9001"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd -r minio
sudo mkdir -p /var/minio/data
sudo chown -R minio:minio /var/minio
sudo systemctl enable minio
sudo systemctl start minio
```

### 2. Nginx Reverse Proxy

```nginx
# MinIO API
location /minio/ {
    proxy_pass http://localhost:9000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# MinIO Console
location /minio-console/ {
    proxy_pass http://localhost:9001/;
    proxy_set_header Host $host;
}
```

### 3. Backend Konfiguration für Production

```yaml
minio:
  endpoint: http://localhost:9000  # oder https://yourdomain.com/minio
  accessKey: ${MINIO_ACCESS_KEY}   # Aus Environment
  secretKey: ${MINIO_SECRET_KEY}   # Aus Environment
  bucket: markt-media
  region: us-east-1
  secure: true  # wenn HTTPS
```

---

## 🔍 Troubleshooting

### MinIO verbindet nicht
```bash
# Prüfen ob MinIO läuft
docker ps | grep minio

# Logs prüfen
docker logs minio
```

### Bucket wird nicht erstellt
- Prüfen Sie die Credentials in application.yml
- Manuell in MinIO Console erstellen: http://localhost:9001

### Upload schlägt fehl
- Prüfen Sie Dateigröße (max 10 MB)
- Prüfen Sie Content-Type (nur Images erlaubt)
- Prüfen Sie Storage-Limit des Plans

### Presigned URLs funktionieren nicht
- Endpoint muss von außen erreichbar sein
- Für Production: Verwenden Sie öffentliche Domain

---

## 🎯 Nächste Schritte

1. **Product-Media Relation**: Verknüpfen Sie Media mit Products
2. **Image Variants**: Generieren Sie Thumbnails
3. **CDN Integration**: CloudFlare vor MinIO für Performance
4. **Backup**: S3-Replikation für Disaster Recovery

---

**Viel Erfolg mit der MinIO-Integration! 🚀**

Für vollständige VPS-Deployment-Anleitung siehe: `VPS_DEPLOYMENT_GUIDE.md`
# MinIO Integration - Setup Guide

## Übersicht

Dieses Backend unterstützt jetzt MinIO (S3-kompatiblen Object Storage) für Media-Management mit Plan-basierten Limits.

---

## 📚 Was ist MinIO?

**MinIO** ist ein High-Performance Object Storage System, das mit Amazon S3 kompatibel ist. Es ermöglicht:

- ✅ **Skalierbare Datei-Speicherung** (Bilder, Videos, Dokumente)
- ✅ **S3-kompatible API** (dieselbe API wie Amazon S3)
- ✅ **Self-Hosted** (volle Kontrolle, keine Cloud-Kosten)
- ✅ **Presigned URLs** (sichere, zeitlich begrenzte Download-Links)
- ✅ **Buckets** (Container für Dateien, ähnlich wie Ordner)

### Warum MinIO für MarktMA?

In einem Multi-Tenant E-Commerce SaaS wie MarktMA benötigen wir:

1. **Produkt-Bilder** pro Store
2. **Store-Logos und Banner**
3. **Skalierbare Storage** (viele Stores = viele Dateien)
4. **Quota-Management** (Storage-Limits pro Plan)
5. **Sichere URLs** (nur autorisierte Nutzer sehen Bilder)

MinIO löst all diese Probleme elegant und kostengünstig!

---

## 🏗️ Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/Mobile)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         NGINX (Proxy)                       │
│  - app.markt.ma       → Backend API (Port 8080)            │
│  - minio.markt.ma     → MinIO API (Port 9000)              │
│  - console.minio.ma   → MinIO Console (Port 9001)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────┐
│  Spring Boot  │  │  MinIO Server   │  │ PostgreSQL   │
│  Backend API  │  │  Object Storage │  │   Database   │
│  (Port 8080)  │  │  (Port 9000)    │  │ (Port 5432)  │
└───────────────┘  └─────────────────┘  └──────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────┐
│              FILE SYSTEM / DISK STORAGE               │
│  - Backend JAR Files                                  │
│  - MinIO Data (/var/minio/data/markt-media/)         │
│  - PostgreSQL Data                                    │
└───────────────────────────────────────────────────────┘
```

### Datenfluss: Bild hochladen

```
1. Client → POST /api/stores/1/media/upload (Multipart/Form-Data)
                ↓
2. MediaController → Authentifizierung & Authorization prüfen
                ↓
3. MediaService → Validierung (Dateityp, Größe)
                ↓
4. StoreUsageService → Quota prüfen (Plan-Limits)
                ↓
5. MinioService → Datei zu MinIO hochladen
                ↓
6. MinIO Server → Datei speichern in Bucket "markt-media"
                ↓
7. MediaRepository → Metadata in PostgreSQL speichern
                ↓
8. StoreUsageService → Usage aktualisieren (Bytes, Count)
                ↓
9. MinioService → Presigned URL generieren (60 Min gültig)
                ↓
10. Response → Client erhält URL + Metadata
```

---

## 🆕 Neue Features

### 1. **Storage Limits pro Store**

Jeder Plan hat definierte Limits:

| Plan | Storage | Produkte | Bilder |
|------|---------|----------|--------|
| **FREE** | 100 MB | 50 | 100 |
| **PRO** | 10 GB | 1000 | 5000 |
| **ENTERPRISE** | 100 GB | ∞ | ∞ |

**Enforcement:**
- Beim Upload wird geprüft: `aktuelle_nutzung + neue_datei ≤ plan_limit`
- Bei Überschreitung: `400 Bad Request` mit Fehlermeldung
- Bei Löschung: Usage wird automatisch reduziert

### 2. **Neue Entitäten**

#### `StoreUsage` (Tracking)
```java
@Entity
public class StoreUsage {
    private Long id;
    private Store store;           // OneToOne
    private Long storageBytes;     // Aktueller Speicherverbrauch
    private Integer imageCount;    // Anzahl Bilder
    private Integer productCount;  // Anzahl Produkte
    private LocalDateTime updatedAt;
}
```

**Zweck:** Real-time Tracking der Ressourcen-Nutzung pro Store

#### `Media` (Metadata)
```java
@Entity
public class Media {
    private Long id;
    private Store store;              // ManyToOne
    private String filename;          // Original-Name
    private String contentType;       // image/jpeg, image/png
    private Long sizeBytes;           // Dateigröße
    private String minioObjectName;   // Pfad in MinIO
    private MediaType mediaType;      // PRODUCT_IMAGE, STORE_LOGO, etc.
    private String altText;           // SEO/Accessibility
    private LocalDateTime createdAt;
}
```

**Zweck:** Metadata für jedes hochgeladene File in der Datenbank

#### `MediaType` (Enum)
```java
public enum MediaType {
    PRODUCT_IMAGE,    // Produktfotos
    STORE_LOGO,       // Store-Logo
    STORE_BANNER,     // Header-Banner
    OTHER             // Sonstige Dateien
}
```

### 3. **Neue Endpunkte**

| Methode | Endpoint | Beschreibung | Auth |
|---------|----------|--------------|------|
| POST | `/api/stores/{storeId}/media/upload` | Datei hochladen | ✅ |
| GET | `/api/stores/{storeId}/media` | Alle Media des Stores | ✅ |
| GET | `/api/stores/{storeId}/media/{id}/url` | Presigned URL abrufen | ✅ |
| DELETE | `/api/stores/{storeId}/media/{id}` | Media löschen | ✅ |
| GET | `/api/stores/{storeId}/media/usage` | Nutzungs-Statistiken | ✅ |

---

## 🛠️ Technische Details

### MinIO-Konfiguration (`application.yml`)

```yaml
minio:
  endpoint: http://localhost:9000      # MinIO API Endpoint
  accessKey: minioadmin                # Access Key (wie AWS_ACCESS_KEY_ID)
  secretKey: minioadmin                # Secret Key (wie AWS_SECRET_ACCESS_KEY)
  bucket: markt-media                  # Bucket-Name (Container für Files)
  region: us-east-1                    # Region (für S3-Kompatibilität)
  secure: false                        # false=HTTP, true=HTTPS
```

**Production (VPS):**
```yaml
minio:
  endpoint: https://minio.markt.ma     # Über Nginx Proxy
  accessKey: ${MINIO_ACCESS_KEY}       # Aus Environment Variable
  secretKey: ${MINIO_SECRET_KEY}       # Aus Environment Variable
  bucket: markt-media
  region: us-east-1
  secure: true                         # HTTPS aktiviert
```

### Services-Übersicht

#### 1. **MinioService** (Low-Level MinIO-Operationen)

```java
@Service
public class MinioService {
    // Upload File zu MinIO
    public String uploadFile(MultipartFile file, Long storeId, String folder);
    
    // Delete File von MinIO
    public void deleteFile(String objectName);
    
    // Presigned URL generieren (temporärer Link)
    public String getPresignedUrl(String objectName, int expiryMinutes);
    
    // File als InputStream abrufen
    public InputStream getFile(String objectName);
}
```

**Object-Name-Format:**
```
stores/{storeId}/{folder}/{uuid}.{extension}

Beispiel:
stores/1/product_image/a3f7b2c9-4d5e-6f7a-8b9c-0d1e2f3a4b5c.jpg
```

#### 2. **StoreUsageService** (Quota-Management)

```java
@Service
public class StoreUsageService {
    // Prüfungen
    public boolean canUploadImage(Store store, User owner);
    public boolean hasEnoughStorage(Store store, User owner, long requiredBytes);
    public boolean canCreateProduct(Store store, User owner);
    
    // Tracking
    public void incrementStorage(Store store, long bytes);
    public void decrementStorage(Store store, long bytes);
    public void incrementImageCount(Store store);
    public void decrementImageCount(Store store);
    
    // DTO
    public StoreUsageDTO getStoreUsageDTO(Store store, User owner);
}
```

#### 3. **MediaService** (Business-Logik)

```java
@Service
public class MediaService {
    public UploadMediaResponse uploadMedia(
        MultipartFile file,
        Store store,
        User owner,
        MediaType mediaType,
        String altText
    );
    
    public List<MediaDTO> getMediaByStore(Store store);
    public Media getMediaById(Long mediaId);
    public void deleteMedia(Long mediaId, Store store);
    public String getMediaUrl(Long mediaId);
}
```

### Validierung beim Upload

```java
// Erlaubte Dateitypen
private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
);

// Max. Dateigröße
private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

**Validierungs-Schritte:**
1. ✅ Datei nicht leer?
2. ✅ Dateigröße ≤ 10 MB?
3. ✅ Content-Type erlaubt?
4. ✅ Storage-Limit nicht überschritten?
5. ✅ Image-Count-Limit nicht überschritten?

### Presigned URLs

**Was sind Presigned URLs?**
- Temporäre URLs mit eingebautem Access Token
- Gültig für definierte Zeit (z.B. 60 Minuten)
- Kein Backend-Auth nötig für Download
- Automatisch ablaufend (Security!)

**Beispiel:**
```
https://minio.markt.ma/markt-media/stores/1/product_image/xyz.jpg?
X-Amz-Algorithm=AWS4-HMAC-SHA256&
X-Amz-Credential=...&
X-Amz-Date=20251112T120000Z&
X-Amz-Expires=3600&
X-Amz-SignedHeaders=host&
X-Amz-Signature=abc123...
```

**Generierung:**
```java
public String getPresignedUrl(String objectName, int expiryMinutes) {
    return minioClient.getPresignedObjectUrl(
        GetPresignedObjectUrlArgs.builder()
            .method(Method.GET)
            .bucket(bucket)
            .object(objectName)
            .expiry(expiryMinutes, TimeUnit.MINUTES)
            .build()
    );
}
```

---

## 💾 Datenbank-Schema

### Neue Tabellen

```sql
-- StoreUsage Tracking
CREATE TABLE store_usage (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL UNIQUE REFERENCES stores(id),
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    image_count INTEGER NOT NULL DEFAULT 0,
    product_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL
);

-- Media Metadata
CREATE TABLE media (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES stores(id),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    minio_object_name VARCHAR(500) NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    alt_text TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_media_store ON media(store_id);
```

### Erweiterte Tabelle

```sql
-- Plan mit neuen Limits
ALTER TABLE plans ADD COLUMN max_products INTEGER NOT NULL DEFAULT 50;
ALTER TABLE plans ADD COLUMN max_image_count INTEGER NOT NULL DEFAULT 100;
```

---

## 🔒 Security-Aspekte

### 1. **Authorization**

```java
// Nur Store-Owner kann Media hochladen
if (!store.getOwner().getId().equals(user.getId())) {
    return ResponseEntity.status(403).body("Not authorized");
}
```

### 2. **File Validation**

```java
// Nur erlaubte Dateitypen
if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
    throw new RuntimeException("Invalid file type");
}

// Größen-Limit
if (file.getSize() > MAX_FILE_SIZE) {
    throw new RuntimeException("File too large");
}
```

### 3. **Presigned URLs mit Ablauf**

```java
// URL nur 60 Minuten gültig
String url = minioService.getPresignedUrl(objectName, 60);
```

### 4. **MinIO Credentials in Environment**

```bash
# Niemals hardcoded in Code!
# Immer aus Environment Variables:
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

---

## 📊 Monitoring & Analytics

### Usage-Statistiken abrufen

```bash
GET /api/stores/1/media/usage
```

**Response:**


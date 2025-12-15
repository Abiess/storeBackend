# 🎯 Swagger Vollständiger Test-Guide

## ✅ Was ist jetzt in Swagger verfügbar

Mit den hinzugefügten Swagger-Annotationen haben Sie jetzt **vollständige API-Dokumentation** zum Testen!

### 📋 Test-Reihenfolge (empfohlen)

#### 1️⃣ **Authentication** (Zuerst!)
```
POST /api/auth/login
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** JWT Token kopieren für Authorization Header

---

#### 2️⃣ **Store erstellen/abrufen**
```
GET /api/stores
POST /api/stores
```

---

#### 3️⃣ **Kategorien verwalten** (NEU!)
```
GET    /api/stores/{storeId}/categories          - Alle Kategorien
GET    /api/stores/{storeId}/categories/root     - Nur Root-Kategorien
POST   /api/stores/{storeId}/categories          - Kategorie erstellen
PUT    /api/stores/{storeId}/categories/{id}     - Kategorie aktualisieren
DELETE /api/stores/{storeId}/categories/{id}     - Kategorie löschen
```

**Beispiel - Kategorie erstellen:**
```json
{
  "name": "Elektronik",
  "description": "Elektronische Geräte",
  "sortOrder": 0
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Elektronik",
  "slug": "elektronik",
  "description": "Elektronische Geräte",
  "sortOrder": 0,
  "createdAt": "2025-12-15T10:00:00"
}
```

---

#### 4️⃣ **Produkte mit Kategorie erstellen** (NEU!)
```
GET    /api/stores/{storeId}/products             - Alle Produkte
POST   /api/stores/{storeId}/products             - Produkt erstellen
GET    /api/stores/{storeId}/products/{id}        - Produkt abrufen
PUT    /api/stores/{storeId}/products/{id}        - Produkt aktualisieren
DELETE /api/stores/{storeId}/products/{id}        - Produkt löschen
```

**Beispiel - Produkt mit Kategorie erstellen:**
```json
{
  "title": "iPhone 15 Pro",
  "description": "Neuestes Apple Smartphone",
  "basePrice": 1299.99,
  "status": "ACTIVE",
  "categoryId": 1
}
```

**Response (enthält jetzt categoryId und categoryName):**
```json
{
  "id": 1,
  "title": "iPhone 15 Pro",
  "description": "Neuestes Apple Smartphone",
  "basePrice": 1299.99,
  "status": "ACTIVE",
  "categoryId": 1,
  "categoryName": "Elektronik",
  "createdAt": "2025-12-15T10:05:00",
  "updatedAt": "2025-12-15T10:05:00"
}
```

---

#### 5️⃣ **Media Upload** (WICHTIG!)
```
POST   /api/stores/{storeId}/media/upload         - Bild hochladen
GET    /api/stores/{storeId}/media                - Alle Media abrufen
GET    /api/stores/{storeId}/media/{id}/url       - Media URL abrufen
DELETE /api/stores/{storeId}/media/{id}           - Media löschen
GET    /api/stores/{storeId}/media/usage          - Storage Usage
```

**Upload Parameter:**
- `file`: Die Bild-Datei (multipart/form-data)
- `mediaType`: `PRODUCT_IMAGE`, `LOGO`, oder `BANNER`
- `altText`: Beschreibung für SEO (optional)

**Response:**
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "mediaId": 1,
  "filename": "iphone-15-pro.jpg",
  "url": "http://localhost:9000/store-media/store-1/uuid-filename.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 245678
}
```

---

## 🔄 Komplett-Test-Szenario

### Szenario: "Produkt mit Kategorie und Bild erstellen"

1. **Login** → Token kopieren
2. **Store erstellen** → `storeId` notieren
3. **Kategorie "Smartphones" erstellen** → `categoryId` notieren
4. **Produkt mit categoryId erstellen** → `productId` notieren
5. **Bild hochladen** → `mediaId` notieren
6. **Produkt abrufen** → Kategorie-Info wird angezeigt!

---

## 🎨 Swagger UI Features

### In Swagger UI können Sie jetzt sehen:

✅ **Gruppen/Tags:**
- 📦 **Products** - Produkt-Management mit Kategorie-Zuordnung
- 📁 **Categories** - Kategorie-Management
- 🖼️ **Media** - Bild-Upload zu MinIO
- 🏪 **Stores** - Store-Verwaltung
- 🔐 **Auth** - Authentication

✅ **Beschreibungen:**
- Jeder Endpoint hat eine klare Beschreibung
- Parameter sind dokumentiert
- Response-Codes sind erklärt

✅ **Request Beispiele:**
- Swagger generiert automatisch Beispiel-JSON
- Sie können die Beispiele direkt bearbeiten

✅ **Try it out:**
- Direkt in Swagger testen
- Authorization Header wird automatisch gesetzt

---

## 🎯 Was funktioniert jetzt?

### ✅ Category → Product Beziehung:
- **Many-to-One**: Viele Produkte gehören zu einer Kategorie
- **Optional**: `categoryId` kann `null` sein
- **Cascade**: Kategorie löschen → `category_id` wird auf `NULL` gesetzt (nicht CASCADE DELETE)

### ✅ Media Upload:
- Bilder zu MinIO hochladen
- `alt_text` Spalte in Datenbank vorhanden
- Media-URLs abrufen
- Storage-Limits prüfen

### ✅ Vollständige CRUD:
- **C**reate: Produkt mit Kategorie erstellen
- **R**ead: Produkt mit Kategorie-Info abrufen
- **U**pdate: Kategorie-Zuordnung ändern
- **D**elete: Produkt oder Kategorie löschen

---

## 🚀 Swagger URL

Nach Deployment:
```
https://store.daddeln.online/swagger-ui/index.html
```

Lokal:
```
http://localhost:8080/swagger-ui/index.html
```

---

## 📝 Wichtige Hinweise

### Authorization:
Klicken Sie auf "Authorize" (🔒) oben rechts und geben Sie ein:
```
Bearer YOUR_JWT_TOKEN_HERE
```

### storeId:
- Verwenden Sie die `storeId` aus der Response von `GET /api/stores`
- Jeder User hat mindestens einen Store

### categoryId:
- Erstellen Sie zuerst eine Kategorie
- `categoryId` ist **optional** beim Produkt erstellen
- Sie können später eine Kategorie zuweisen mit `PUT`

---

## 🐛 Troubleshooting

### 403 Forbidden?
→ Prüfen Sie, ob der JWT Token gültig ist
→ Verwenden Sie die richtige `storeId` (Ihr Store!)

### Media Upload Error?
→ Warten Sie, bis GitHub Actions das neue Schema deployed hat
→ MinIO muss laufen (`systemctl status minio`)
→ Datenbank-Tabelle `media` muss aktualisiert sein

### Category not found?
→ Erstellen Sie zuerst eine Kategorie mit `POST /categories`
→ Verwenden Sie die `categoryId` aus der Response

---

## ✅ Ist das ausreichend zum Testen?

**JA!** Mit Swagger haben Sie jetzt:

✅ Alle Endpoints dokumentiert
✅ Request/Response Beispiele
✅ Parameter-Beschreibungen  
✅ Direct Testing in UI
✅ Authorization Support
✅ Error Responses dokumentiert

Sie brauchen **keine zusätzlichen Tools** wie Postman - Swagger UI reicht vollständig aus! 🎉


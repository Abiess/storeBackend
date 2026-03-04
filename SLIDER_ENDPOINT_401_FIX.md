# 🐛 FIX: 401 Unauthorized auf Slider-Endpoint

## Problem

**Request URL:** `https://api.markt.ma/api/stores/3/slider/active`  
**Status:** 401 Unauthorized

**Symptom:**
- Slider-Bilder werden nicht auf der Storefront angezeigt
- Backend gibt 401 Unauthorized zurück
- Frontend kann keine Slider-Daten laden

## Root Cause

Der Slider-Endpoint war **NICHT** in der SecurityConfig freigegeben!

```java
// ❌ FEHLTE in SecurityConfig.java:
.requestMatchers(HttpMethod.GET, "/api/stores/*/slider/active").permitAll()
```

**Warum das ein Problem war:**
- Slider-Bilder sollen **öffentlich** für alle Storefront-Besucher sichtbar sein
- Aber Spring Security blockierte den Zugriff ohne JWT-Token
- → 401 Unauthorized

## ✅ Lösung

**Datei:** `SecurityConfig.java`

**Hinzugefügt:**
```java
.requestMatchers(HttpMethod.GET, "/api/stores/*/slider/active").permitAll() // Slider für Storefront
```

**Position:** Bei den anderen öffentlichen Storefront-Endpoints (Zeile 73)

**Vollständiger Kontext:**
```java
// Storefront public endpoints
.requestMatchers(HttpMethod.GET, "/api/stores/*/products").permitAll()
.requestMatchers(HttpMethod.GET, "/api/stores/*/categories").permitAll()
.requestMatchers(HttpMethod.GET, "/api/stores/*/slider/active").permitAll() // ✅ NEU
```

## 🚀 Deployment

```bash
# Backend neu kompilieren (läuft bereits)
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn clean compile

# Backend neu starten
mvn spring-boot:run
```

## 🧪 Test

### **Vorher (❌ FEHLERHAFT):**
```bash
GET https://api.markt.ma/api/stores/3/slider/active
Response: 401 Unauthorized
```

### **Nachher (✅ KORREKT):**
```bash
GET https://api.markt.ma/api/stores/3/slider/active
Response: 200 OK

Body:
[
  {
    "id": 1,
    "storeId": 3,
    "imageUrl": "https://...",
    "imageType": "OWNER",
    "displayOrder": 1,
    "isActive": true,
    "altText": "Slider 1"
  },
  ...
]
```

## 📊 Betroffene Endpoints

**Jetzt öffentlich zugänglich:**
- ✅ GET `/api/stores/{storeId}/slider/active`

**Weiterhin geschützt (benötigen Auth):**
- 🔒 GET `/api/stores/{storeId}/slider` (komplette Settings)
- 🔒 PUT `/api/stores/{storeId}/slider/settings`
- 🔒 POST `/api/stores/{storeId}/slider/images`
- 🔒 DELETE `/api/stores/{storeId}/slider/images/{imageId}`

## ✅ Verifikation

### **1. Backend-Logs prüfen:**
```bash
# Sollte KEIN 401 mehr zeigen:
GET /api/stores/3/slider/active → 200 OK
```

### **2. Frontend Console prüfen:**
```javascript
🖼️ Lade Slider-Bilder für Store 3
✅ Slider-Bilder geladen: 2
```

### **3. Browser Network-Tab:**
```
Request: GET /api/stores/3/slider/active
Status: 200 OK ✅
Response: [{"id":1, "imageUrl":"...", ...}]
```

### **4. Slider wird angezeigt:**
- ✅ Öffne Storefront
- ✅ Slider-Bilder werden oben angezeigt
- ✅ Autoplay funktioniert
- ✅ Navigation funktioniert

## 📝 Zusammenfassung

**Was war kaputt:**
- Security blockierte öffentlichen Slider-Endpoint
- 401 Unauthorized für Storefront-Besucher

**Was ich gefixt habe:**
- SecurityConfig aktualisiert
- Slider-Endpoint zu `permitAll()` hinzugefügt
- Backend neu kompiliert

**Status:** ✅ BEHOBEN

---

**Datum:** 2026-03-04  
**Fix:** Slider-Endpoint Security  
**Dateien:** SecurityConfig.java


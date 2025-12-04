# 🚀 Swagger UI - API Dokumentation & Testing

## ✅ Was wurde konfiguriert:

1. **Springdoc OpenAPI** hinzugefügt (moderne Swagger-Alternative für Spring Boot 3)
2. **Security-Bypass** für Swagger-Endpunkte
3. **JWT-Authentication** in Swagger UI integriert
4. **Custom API-Dokumentation** mit markt.ma Branding

---

## 🌐 Swagger UI URLs

### Production (HTTPS):
```
https://api.markt.ma/swagger-ui.html
https://api.markt.ma/v3/api-docs
```

### Lokal (Development):
```
http://localhost:8080/swagger-ui.html
http://localhost:8080/v3/api-docs
```

---

## 📋 Wie Sie die API im Browser testen:

### Schritt 1: Öffnen Sie Swagger UI

Gehen Sie zu: **https://api.markt.ma/swagger-ui.html**

Sie sehen eine interaktive Dokumentation aller API-Endpunkte!

### Schritt 2: Öffentliche Endpoints testen (ohne Login)

Diese funktionieren sofort ohne Token:

1. **GET /api/plans** - Alle verfügbaren Pläne anzeigen
   - Klicken Sie auf "Try it out"
   - Klicken Sie auf "Execute"
   - Sehen Sie die Response

2. **POST /api/auth/register** - Neuen User registrieren
   - Klicken Sie auf "Try it out"
   - Geben Sie Email und Passwort ein:
   ```json
   {
     "email": "test@markt.ma",
     "password": "password123"
   }
   ```
   - Klicken Sie auf "Execute"

3. **POST /api/auth/login** - Einloggen und Token erhalten
   - Klicken Sie auf "Try it out"
   - Geben Sie Ihre Credentials ein
   - Klicken Sie auf "Execute"
   - **KOPIEREN SIE DEN TOKEN** aus der Response!

### Schritt 3: Authentifizierte Endpoints testen (mit JWT Token)

1. **Authorize-Button** (oben rechts, Schloss-Symbol) klicken

2. Im Popup:
   - Geben Sie Ihren JWT Token ein (ohne "Bearer ")
   - Klicken Sie auf "Authorize"
   - Klicken Sie auf "Close"

3. Jetzt können Sie geschützte Endpoints testen:
   - **GET /api/me/stores** - Ihre Stores anzeigen
   - **POST /api/me/stores** - Neuen Store erstellen
   - **GET /api/auth/me** - Ihr Profil anzeigen

---

## 🎯 Beispiel-Workflow im Browser:

### 1. User registrieren
```
POST /api/auth/register
Body:
{
  "email": "demo@markt.ma",
  "password": "Demo123!"
}
```

### 2. Einloggen und Token erhalten
```
POST /api/auth/login
Body:
{
  "email": "demo@markt.ma",
  "password": "Demo123!"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "demo@markt.ma"
}
```

### 3. Token in Swagger autorisieren
- Klicken Sie auf "Authorize" (Schloss-Symbol)
- Token einfügen
- "Authorize" klicken

### 4. Store erstellen
```
POST /api/me/stores
Body:
{
  "name": "Mein Shop",
  "slug": "mein-shop"
}
```

### 5. Alle meine Stores anzeigen
```
GET /api/me/stores
```

---

## 🔓 Öffentliche Endpoints (kein Token nötig)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/auth/register` | POST | Neuen User registrieren |
| `/api/auth/login` | POST | Einloggen und Token erhalten |
| `/api/auth/validate` | POST | Token validieren |
| `/api/plans` | GET | Verfügbare Pläne anzeigen |
| `/api/public/**` | GET | Öffentliche Store-Daten |
| `/actuator/health` | GET | Health Check |

---

## 🔐 Geschützte Endpoints (Token erforderlich)

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/auth/me` | GET | Eigenes Profil anzeigen |
| `/api/me/stores` | GET | Meine Stores anzeigen |
| `/api/me/stores` | POST | Neuen Store erstellen |
| `/api/stores/{id}` | GET | Store-Details |
| `/api/stores/{id}` | PUT | Store aktualisieren |
| `/api/stores/{id}` | DELETE | Store löschen |
| `/api/stores/{id}/domains` | GET | Store-Domains anzeigen |

---

## 🎨 Features von Swagger UI

✅ **Interaktive Dokumentation** - Alle Endpoints mit Parametern
✅ **Try it out** - Direkt im Browser testen
✅ **Response Preview** - Beispiel-Responses sehen
✅ **Schema Models** - DTO-Strukturen visualisiert
✅ **JWT Authentication** - Token-basierte Tests
✅ **Download OpenAPI Spec** - JSON/YAML Download

---

## 📱 Alternative: Swagger als JSON/YAML

### OpenAPI Specification (JSON):
```
https://api.markt.ma/v3/api-docs
```

### Import in andere Tools:
- **Postman**: File → Import → URL eingeben
- **Insomnia**: Import → From URL
- **VS Code REST Client**: Spec generieren

---

## 🐛 Troubleshooting

### Problem: "403 Forbidden" bei geschützten Endpoints
**Lösung:** Token im Authorize-Dialog eingeben

### Problem: Swagger UI lädt nicht
**Lösung 1:** Cache leeren (Ctrl+Shift+R)
**Lösung 2:** Prüfen ob App läuft: `https://api.markt.ma/actuator/health`

### Problem: "401 Unauthorized"
**Lösung:** 
1. Einloggen via `/api/auth/login`
2. Token kopieren
3. "Authorize" klicken und Token einfügen

---

## 🚀 Nach dem Deployment

Nach jedem `git push` müssen Sie:

1. ✅ Warten bis Deployment fertig ist (GitHub Actions)
2. ✅ Swagger UI neu laden: `https://api.markt.ma/swagger-ui.html`
3. ✅ Cache leeren wenn nötig (Ctrl+Shift+R)

---

## 📋 Quick Commands

### Deployment mit Swagger:
```bash
# 1. Änderungen committen
git add .
git commit -m "Add Swagger UI"
git push

# 2. Warten auf Deployment (ca. 2-3 Minuten)

# 3. Swagger UI öffnen
# Browser: https://api.markt.ma/swagger-ui.html
```

### Lokal testen:
```bash
# Backend starten
.\start-backend.bat

# Swagger UI öffnen
# Browser: http://localhost:8080/swagger-ui.html
```

---

## 🎯 Zusammenfassung

**Swagger UI URL:** https://api.markt.ma/swagger-ui.html

**Workflow:**
1. ✅ Swagger UI im Browser öffnen
2. ✅ Öffentliche Endpoints direkt testen
3. ✅ Für geschützte Endpoints: Login → Token kopieren → Authorize
4. ✅ Alle Endpoints interaktiv testen

**Kein Code-Editor nötig!** Alles direkt im Browser! 🎉


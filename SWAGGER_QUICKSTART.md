# 🚀 Swagger UI - Schnellstart

## ✅ Was wurde konfiguriert:

1. ✅ **Springdoc OpenAPI** Dependency zu pom.xml hinzugefügt
2. ✅ **Security-Konfiguration** bereits vorbereitet (Swagger-Endpunkte sind öffentlich)
3. ✅ **OpenAPI-Konfiguration** erstellt mit JWT-Support
4. ✅ **Application.yml** mit Swagger-Settings aktualisiert

---

## 🎯 Nächste Schritte:

### 1. Committen und Pushen:

```powershell
cd C:\Users\t13016a\Downloads\Team2\storeBackend

git add .
git commit -m "Add Swagger UI for API testing"
git push
```

### 2. Warten auf Deployment (ca. 2-3 Minuten)

GitHub Actions baut das Projekt und deployed es automatisch.

### 3. Swagger UI öffnen:

**Im Browser:**
```
https://api.markt.ma/swagger-ui.html
```

---

## 🧪 Swagger UI verwenden:

### Öffentliche Endpoints (kein Login nötig):

1. **GET /api/plans** - Pläne anzeigen
   - Klick auf "Try it out"
   - Klick auf "Execute"
   - Fertig! ✅

2. **POST /api/auth/login** - Einloggen
   ```json
   {
     "email": "test@markt.ma",
     "password": "password123"
   }
   ```
   - Token aus Response kopieren

### Geschützte Endpoints (Token nötig):

1. **"Authorize" Button** klicken (Schloss-Symbol oben rechts)
2. **Token einfügen** (ohne "Bearer")
3. **"Authorize" klicken**
4. Jetzt alle Endpoints testen! ✅

---

## 📋 Wichtige URLs:

| URL | Beschreibung |
|-----|--------------|
| `https://api.markt.ma/swagger-ui.html` | **Swagger UI** - Interaktive API-Doku |
| `https://api.markt.ma/v3/api-docs` | OpenAPI JSON Spec |
| `https://api.markt.ma/actuator/health` | Health Check |

---

## 🎉 Fertig!

Nach dem Push können Sie die gesamte API direkt im Browser testen:
- ✅ Keine Code-Editor nötig
- ✅ Keine Postman nötig
- ✅ Direkt im Browser mit Swagger UI

**Jetzt committen und pushen Sie die Änderungen!**


# Store Backend - API Testing Guide

## 🚀 Backend starten

### 1. PostgreSQL Datenbank erstellen
```sql
CREATE DATABASE storedb;
```

### 2. Application starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend
mvn spring-boot:run
```

Das Backend läuft auf: **http://localhost:8080**

---

## 📝 API Endpoints testen

### Option 1: Mit cURL (Kommandozeile)

#### 1. Benutzer registrieren
```bash
curl -X POST http://localhost:8080/auth/register 
  -H "Content-Type: application/json" 
  -d "{\"email\":\"test@example.com\",\"password\":\"Test123!\"}"
```

**Erwartete Antwort:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "email": "test@example.com",
  "userId": 1
}
```

#### 2. Benutzer anmelden
```bash
curl -X POST http://localhost:8080/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test123!\"}"
```

#### 3. Aktuellen Benutzer abrufen (mit Token)
```bash
curl -X GET http://localhost:8080/auth/me ^
  -H "Authorization: Bearer IHR_TOKEN_HIER"
```

#### 4. Store erstellen
```bash
curl -X POST http://localhost:8080/me/stores ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer IHR_TOKEN_HIER" ^
  -d "{\"name\":\"Mein Shop\",\"slug\":\"mein-shop\"}"
```

#### 5. Eigene Stores auflisten
```bash
curl -X GET http://localhost:8080/me/stores ^
  -H "Authorization: Bearer IHR_TOKEN_HIER"
```

#### 6. Domain zu Store hinzufügen
```bash
curl -X POST http://localhost:8080/stores/1/domains ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer IHR_TOKEN_HIER" ^
  -d "{\"host\":\"shop.example.com\",\"type\":\"CUSTOM\"}"
```

#### 7. Produkt erstellen
```bash
curl -X POST http://localhost:8080/stores/1/products ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer IHR_TOKEN_HIER" ^
  -d "{\"title\":\"T-Shirt\",\"description\":\"Cooles Shirt\",\"basePrice\":29.99,\"status\":\"ACTIVE\"}"
```

#### 8. Store per Domain auflösen (Public API)
```bash
curl -X GET "http://localhost:8080/public/store/resolve?host=shop.example.com"
```

---

## 📬 Option 2: Mit Postman

### Postman Collection importieren

1. Öffnen Sie Postman
2. Klicken Sie auf "Import"
3. Fügen Sie die Datei `postman_collection.json` hinzu (siehe unten)

---

## 🔧 Option 3: Mit IntelliJ HTTP Client

Verwenden Sie die Datei `api-test.http` (siehe nächste Datei)

---

## 🧪 Kompletter Test-Flow

### Schritt 1: Benutzer registrieren
```
POST /auth/register
Body: {"email":"user@test.com","password":"Pass123!"}
```
→ Speichern Sie den **token** aus der Antwort

### Schritt 2: Store erstellen
```
POST /me/stores
Header: Authorization: Bearer {token}
Body: {"name":"Test Shop","slug":"test-shop"}
```
→ Speichern Sie die **storeId**

### Schritt 3: Domain hinzufügen
```
POST /stores/{storeId}/domains
Header: Authorization: Bearer {token}
Body: {"host":"testshop.myplatform.com","type":"SUBDOMAIN"}
```

### Schritt 4: Produkt erstellen
```
POST /stores/{storeId}/products
Header: Authorization: Bearer {token}
Body: {
  "title":"Produkt 1",
  "description":"Tolles Produkt",
  "basePrice":49.99,
  "status":"ACTIVE"
}
```

### Schritt 5: Public Store Resolution testen
```
GET /public/store/resolve?host=testshop.myplatform.com
(Kein Token erforderlich)
```

---

## 📊 Datenbank überprüfen

### PostgreSQL Konsole öffnen:
```bash
psql -U postgres -d storedb
```

### Tabellen anzeigen:
```sql
\dt
```

### Benutzer anzeigen:
```sql
SELECT * FROM users;
```

### Stores anzeigen:
```sql
SELECT * FROM stores;
```

### Pläne anzeigen:
```sql
SELECT * FROM plans;
```

---

## ⚠️ Troubleshooting

### Problem: "Connection refused"
→ PostgreSQL läuft nicht. Starten Sie PostgreSQL:
```bash
net start postgresql-x64-15
```

### Problem: "Unable to connect to database"
→ Überprüfen Sie die Credentials in `application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/storedb
    username: postgres
    password: postgres
```

### Problem: "401 Unauthorized"
→ Token ist abgelaufen oder ungültig. Melden Sie sich erneut an.

### Problem: "403 Forbidden"
→ Sie versuchen auf einen Store zuzugreifen, der Ihnen nicht gehört.

---

## 📌 Wichtige Hinweise

1. **JWT Token** ist 24 Stunden gültig
2. **FREE Plan** erlaubt 1 Store, 0 Custom Domains
3. **PRO Plan** erlaubt 10 Stores, 5 Custom Domains
4. Beim ersten Start werden automatisch FREE und PRO Pläne angelegt
5. Neue Benutzer bekommen automatisch den FREE Plan

---

## 🔗 API Übersicht

| Methode | Endpoint | Authentifizierung | Beschreibung |
|---------|----------|-------------------|--------------|
| POST | /auth/register | Nein | Benutzer registrieren |
| POST | /auth/login | Nein | Benutzer anmelden |
| GET | /auth/me | Ja | Aktuellen Benutzer abrufen |
| GET | /me/stores | Ja | Eigene Stores auflisten |
| POST | /me/stores | Ja | Store erstellen |
| GET | /stores/{id}/domains | Ja | Store-Domains auflisten |
| POST | /stores/{id}/domains | Ja | Domain hinzufügen |
| GET | /stores/{id}/products | Ja | Store-Produkte auflisten |
| GET | /stores/{id}/products/{pid} | Ja | Produkt abrufen |
| POST | /stores/{id}/products | Ja | Produkt erstellen |
| PUT | /stores/{id}/products/{pid} | Ja | Produkt aktualisieren |
| DELETE | /stores/{id}/products/{pid} | Ja | Produkt löschen |
| GET | /public/store/resolve | Nein | Store per Domain finden |


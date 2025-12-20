# 403 Forbidden - Product POST Request Fix

## Problem
POST-Requests auf `/api/stores/{storeId}/products` führen zu **403 Forbidden** Fehlern, obwohl ein gültiger JWT-Token gesendet wird.

## Ursache
Basierend auf dem Stack-Trace wird der Request von Spring Security auf Security-Ebene blockiert, **bevor** er den Controller erreicht. Das deutet darauf hin, dass:

1. **JWT-Authentifizierung fehlschlägt** - Der Token wird nicht korrekt verarbeitet
2. **User nicht im SecurityContext gesetzt** - Nach der Token-Validierung wird kein User-Objekt in den SecurityContext geschrieben
3. **Spring Security blockiert** - Da keine Authentifizierung vorhanden ist, gibt Spring Security 403 zurück

## Durchgeführte Änderungen

### 1. Custom Exception Handler erstellt
Ich habe zwei neue Security-Handler erstellt, um bessere Debug-Informationen zu erhalten:

#### `CustomAccessDeniedHandler.java`
- Loggt detaillierte Informationen bei 403-Fehlern
- Zeigt Authentication-Status, Authorities und Request-Details

#### `CustomAuthenticationEntryPoint.java`
- Fängt 401/403 Authentication-Fehler ab
- Loggt warum die Authentifizierung fehlschlägt

### 2. SecurityConfig aktualisiert
- Die neuen Handler wurden in die SecurityConfig integriert:
```java
.exceptionHandling(exceptions -> exceptions
    .accessDeniedHandler(accessDeniedHandler)
    .authenticationEntryPoint(authenticationEntryPoint)
)
```

### 3. ProductController behoben
- `created.getName()` wurde zu `created.getTitle()` geändert
- ProductDTO hat keine `getName()`-Methode, sondern `getTitle()`

## Nächste Schritte zur Diagnose

### 1. Überprüfen Sie die Logs nach dem Neustart
Nach dem Deployment werden die neuen Handler detaillierte Logs ausgeben, wenn ein 403-Fehler auftritt:

```
=== 403 ACCESS DENIED ===
Request URI: POST /api/stores/123/products
Authentication: NULL (oder Username)
Authorities: NONE (oder Rollen)
Is Authenticated: false
Exception: Access Denied
Authorization Header: Present/Missing
```

### 2. Häufige Ursachen prüfen

#### A) JWT-Token ist abgelaufen
```bash
# Überprüfen Sie die Token-Gültigkeit
# Schauen Sie in den Logs nach:
# "Token validation result: INVALID"
```

#### B) User existiert nicht in der Datenbank
```bash
# Logs zeigen:
# "❌ User not found in database: user@example.com"
```

#### C) JWT_SECRET stimmt nicht überein
```bash
# Überprüfen Sie auf dem Server:
echo $JWT_SECRET

# Oder in der Datenbank:
SELECT * FROM github_secrets WHERE name = 'JWT_SECRET';
```

#### D) User hat keine Rolle
```bash
# SQL-Abfrage:
SELECT u.email, ur.role 
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE u.email = 'test@example.com';
```

### 3. Test-Request mit curl
```bash
# 1. Login und Token erhalten
TOKEN=$(curl -X POST https://api.markt-ma.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. Product erstellen mit Token
curl -X POST https://api.markt-ma.de/api/stores/1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "description": "Test Description",
    "basePrice": 19.99,
    "status": "ACTIVE"
  }' -v
```

### 4. JWT-Filter Logging überprüfen
Der `JwtAuthenticationFilter` loggt jetzt:
- Welcher Request verarbeitet wird
- Ob ein Token gefunden wurde
- Ob der Token validiert werden konnte
- Ob der User in der DB existiert
- Welche Rollen gesetzt wurden

Suchen Sie nach:
```
=== JWT Filter - Processing POST request to: /api/stores/1/products ===
```

## Mögliche Lösungen

### Lösung 1: Token neu generieren
Wenn der Token abgelaufen oder ungültig ist:
```bash
# Neues Login durchführen
curl -X POST https://api.markt-ma.de/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Lösung 2: User-Rollen überprüfen und setzen
```sql
-- Überprüfen
SELECT u.id, u.email, ur.role 
FROM users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE u.email = 'test@example.com';

-- Falls keine Rolle: STORE_OWNER Rolle hinzufügen
INSERT INTO user_roles (user_id, role) 
VALUES ((SELECT id FROM users WHERE email = 'test@example.com'), 'STORE_OWNER');
```

### Lösung 3: JWT_SECRET überprüfen
```bash
# Auf dem Server
echo $JWT_SECRET

# Falls nicht gesetzt oder falsch:
export JWT_SECRET="IhrGeheimerSchlüsselMindestens256BitsLang"

# Service neu starten
sudo systemctl restart storebackend
```

### Lösung 4: Store-Zugriff überprüfen
```sql
-- Überprüfen Sie, ob der User Zugriff auf den Store hat
SELECT s.id, s.name, s.owner_id, u.email
FROM stores s
JOIN users u ON s.owner_id = u.id
WHERE s.id = 1;

-- Falls der User nicht Owner ist, müssen Sie ihn als Owner setzen:
UPDATE stores SET owner_id = (SELECT id FROM users WHERE email = 'test@example.com')
WHERE id = 1;
```

## Deployment

### Backend neu kompilieren und deployen
```bash
# Lokal
mvn clean package -DskipTests

# Auf den Server hochladen
scp target/storeBackend-0.0.1-SNAPSHOT.jar user@server:/path/to/app/

# Service neu starten
sudo systemctl restart storebackend

# Logs überwachen
sudo journalctl -u storebackend -f
```

### Logs in Echtzeit überwachen
```bash
# Alle Logs
sudo journalctl -u storebackend -f

# Nur 403-Fehler
sudo journalctl -u storebackend -f | grep "403"

# Nur JWT-Filter Logs
sudo journalctl -u storebackend -f | grep "JWT Filter"
```

## Zusammenfassung

Die implementierten Änderungen bieten **deutlich besseres Logging** für 403-Fehler. Nach dem nächsten Deployment werden Sie genau sehen können:

1. ✅ Ob der JWT-Token korrekt verarbeitet wird
2. ✅ Ob der User authentifiziert ist
3. ✅ Welche Rollen der User hat
4. ✅ Warum genau der 403-Fehler auftritt

**Nächster Schritt:** Deployen Sie die Änderungen und schauen Sie sich die detaillierten Logs an, um die genaue Ursache zu identifizieren.


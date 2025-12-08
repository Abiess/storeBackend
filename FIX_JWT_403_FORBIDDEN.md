# 🔧 JWT 403 Forbidden - Problem gelöst

## ❌ Problem

**Symptom:**
```
POST /api/me/stores
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
→ 403 Forbidden
```

Der JWT Token wurde generiert und war gültig, aber alle authentifizierten Endpoints gaben 403 Forbidden zurück.

---

## 🔍 Root Cause Analysis

Es gab **zwei verschiedene JWT-Implementierungen** im Code:

### 1. AuthService (Token-Generierung)
```java
@Value("${jwt.secret:defaultSecretKeyThatShouldBeChangedInProduction1234567890}")
private String jwtSecret;

// Verwendete alte JJWT API mit HS512
Jwts.builder()
    .signWith(key, SignatureAlgorithm.HS512)
```

### 2. JwtUtil (Token-Validierung)
```java
@Value("${jwt.secret:mySecretKeyForJWTTokenGenerationThatIsAtLeast256BitsLong}")
private String secret;

// Verwendete neue JJWT API
Jwts.builder()
    .signWith(getSigningKey())
```

**Problem:**
- Unterschiedliche Default-Secrets
- Unterschiedliche JJWT-API-Versionen
- Token wurde mit Secret A signiert, aber mit Secret B validiert
- → Token-Validierung schlug fehl → 403 Forbidden

---

## ✅ Lösung

**AuthService wurde refactored**, um die einheitliche `JwtUtil`-Klasse zu verwenden:

### Vorher:
```java
public class AuthService {
    @Value("${jwt.secret:defaultSecretKeyThatShouldBeChangedInProduction1234567890}")
    private String jwtSecret;
    
    // Eigene JWT-Generierung mit altem API
    public String generateToken(User user) {
        // ... duplicate code
    }
}
```

### Nachher:
```java
public class AuthService {
    private final JwtUtil jwtUtil;
    
    // Verwendet die zentrale JwtUtil-Klasse
    public AuthResponse register(RegisterRequest request) {
        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new AuthResponse(token, user.getEmail(), user.getId());
    }
}
```

---

## 🎯 Änderungen

### Datei: `AuthService.java`

**Entfernt:**
- ✅ Duplizierte JWT Secret-Konfiguration
- ✅ Eigene `generateToken()` Methode
- ✅ Eigene `validateToken()` Methode
- ✅ Import von `io.jsonwebtoken.SignatureAlgorithm`
- ✅ Import von `io.jsonwebtoken.Claims`

**Hinzugefügt:**
- ✅ Dependency auf `JwtUtil`
- ✅ Verwendung von `jwtUtil.generateToken()`
- ✅ Verwendung von `jwtUtil.extractEmail()`
- ✅ Verwendung von `jwtUtil.extractUserId()`

---

## 🧪 Test-Workflow

### Schritt 1: Registrieren
```bash
curl -X 'POST' \
  'https://api.markt.ma/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "test@example.com",
  "password": "password123"
}'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "test@example.com",
  "userId": 1
}
```

### Schritt 2: Store erstellen (mit Token)
```bash
curl -X 'POST' \
  'https://api.markt.ma/api/me/stores' \
  -H 'Authorization: Bearer [IHR_TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Mein Shop",
  "slug": "mein-shop"
}'
```

**Erwartete Response (✅ Erfolg):**
```json
{
  "id": 1,
  "name": "Mein Shop",
  "slug": "mein-shop",
  "ownerId": 1,
  "active": true,
  "createdAt": "2025-12-08T22:00:00"
}
```

---

## 📋 Deployment

### Automatisch via GitHub Actions:

```bash
git add .
git commit -m "Fix JWT authentication - unified token generation and validation"
git push origin main
```

Die GitHub Action:
1. ✅ Kompiliert das Projekt
2. ✅ Deployed auf den VPS
3. ✅ Startet den Service neu
4. ✅ Verwendet den korrekten JWT_SECRET aus GitHub Secrets

### Manuell (falls nötig):

```bash
# Kompilieren
mvnw.cmd clean package -DskipTests

# JAR auf Server hochladen
scp target/storebackend-0.0.1-SNAPSHOT.jar root@195.90.210.156:/tmp/app.jar

# Auf Server: Deployment ausführen
ssh root@195.90.210.156
cd /opt/storebackend
./deploy.sh
```

---

## ✅ Verification Checklist

Nach dem Deployment:

- [ ] **Registrierung funktioniert**: `POST /api/auth/register` → 200 OK
- [ ] **Login funktioniert**: `POST /api/auth/login` → 200 OK mit Token
- [ ] **Token-Validierung funktioniert**: `GET /api/auth/me` mit Token → 200 OK
- [ ] **Store-Erstellung funktioniert**: `POST /api/me/stores` mit Token → 200 OK
- [ ] **Keine 403 Forbidden mehr** bei authentifizierten Endpoints

---

## 🔧 Related Fixes

Dieser Fix baut auf folgenden vorherigen Fixes auf:

1. ✅ **User Entity**: `password_hash` Spalten-Mapping korrigiert
2. ✅ **JWT Secret**: Deploy-Script generiert sicheren 512-Bit Secret
3. ✅ **GitHub Actions**: JWT_SECRET aus Repository Secrets verwenden

---

## 📚 Best Practices (für die Zukunft)

### ❌ Vermeiden:
- Duplizierte JWT-Logik
- Unterschiedliche Secrets für Token-Generierung und -Validierung
- Mischen von alten und neuen API-Versionen

### ✅ Empfohlen:
- **Eine zentrale `JwtUtil`-Klasse** für alle JWT-Operationen
- **Ein Secret** für alle JWT-Operationen
- **Dependency Injection** statt dupliziertem Code
- **Einheitliche API-Version** verwenden

---

## 🎉 Ergebnis

Nach diesem Fix sollten alle authentifizierten Endpoints funktionieren:

- ✅ Store erstellen
- ✅ Store aktualisieren
- ✅ Store löschen
- ✅ Domains verwalten
- ✅ Produkte verwalten
- ✅ Orders verwalten

**Keine 403 Forbidden Fehler mehr!** 🎊


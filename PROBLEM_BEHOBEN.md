# ✅ Probleme Behoben - Store Backend

## 🎯 Behobene Probleme

### 1. ❌ 403 Forbidden beim Store-Erstellen

**Problem:** 
```
POST /api/me/stores → 403 Forbidden
```

**Ursache:**
Du hast im Authorization-Header **doppelt "Bearer"** gesendet:
```
Authorization: Bearer Bearer eyJhbGci...
```

**✅ Lösung:**
Entferne das doppelte "Bearer". Der korrekte Header ist:
```
Authorization: Bearer eyJhbGci...
```

### 2. 🔐 JWT Token enthält jetzt Rollen

**Problem:**
Der JWT Token enthielt keine Rollen-Informationen, was zu 403-Fehlern führte.

**✅ Lösung:**
Ich habe `JwtUtil.java` und `AuthService.java` aktualisiert:

- JWT Token enthält jetzt die User-Rollen
- Bei Login und Registrierung werden die Rollen automatisch in den Token eingebunden
- Spring Security kann die Rollen nun korrekt validieren

**Geänderte Dateien:**
- ✅ `src/main/java/storebackend/security/JwtUtil.java`
- ✅ `src/main/java/storebackend/service/AuthService.java`

### 3. 🔑 JWT Secret aus GitHub Actions

**Problem:**
JWT Secret sollte aus GitHub Secrets kommen, nicht hardcoded sein.

**✅ Lösung:**
Das Deployment-System ist bereits korrekt konfiguriert:

1. **GitHub Actions** (`.github/workflows/deploy.yml`):
   ```yaml
   env:
     JWT_SECRET: ${{ secrets.JWT_SECRET }}
   ```

2. **Deploy Script** (`scripts/deploy.sh`):
   - Verwendet `$JWT_SECRET` aus Umgebungsvariablen
   - Generiert automatisch ein sicheres Secret, falls nicht gesetzt
   - Schreibt es in `/etc/storebackend.env`

3. **Application** (`application.yml`):
   ```yaml
   jwt:
     secret: ${JWT_SECRET:mySecretKeyForJWTTokenGenerationThatIsAtLeast256BitsLongForHS256Algorithm}
   ```

## 📋 GitHub Secrets Einrichten

Falls noch nicht geschehen, musst du in GitHub folgende Secrets konfigurieren:

1. Gehe zu deinem Repository → **Settings** → **Secrets and variables** → **Actions**
2. Klicke auf **New repository secret**
3. Erstelle folgende Secrets:

| Name | Beschreibung | Beispiel |
|------|-------------|----------|
| `JWT_SECRET` | JWT Secret Key (min. 256 Bits) | Generiere mit: `openssl rand -base64 64` |
| `DB_PASSWORD` | PostgreSQL Passwort | dein-db-passwort |
| `VPS_HOST` | VPS IP/Hostname | api.markt.ma |
| `VPS_USER` | SSH User | root oder dein-user |
| `VPS_SSH_KEY` | SSH Private Key | -----BEGIN RSA PRIVATE KEY----- ... |
| `VPS_PORT` | SSH Port | 22 |

## 🚀 Wie du die API jetzt nutzt

### 1️⃣ Registrierung (kein Token nötig)

```bash
curl -X 'POST' \
  'https://api.markt.ma/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "test@markt.ma",
  "password": "password123"
}'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VySWQiOjIsInJvbGVzIjpbIlVTRVIiXSwic3ViIjoidGVzdEBtYXJrdC5tYSIsImlhdCI6MTczMzg2MjAwMCwiZXhwIjoxNzMzOTQ4NDAwfQ...",
  "email": "test@markt.ma",
  "userId": 2
}
```

### 2️⃣ Login (kein Token nötig)

```bash
curl -X 'POST' \
  'https://api.markt.ma/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "test@markt.ma",
  "password": "password123"
}'
```

### 3️⃣ Store erstellen (Token erforderlich)

**⚠️ WICHTIG:** Nur EIN "Bearer" im Authorization-Header!

```bash
curl -X 'POST' \
  'https://api.markt.ma/api/me/stores' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Mein Shop",
  "slug": "mein-shop"
}'
```

## 🧪 Testing mit Swagger

1. Öffne Swagger UI: https://api.markt.ma/swagger-ui.html

2. **Registrierung:**
   - Gehe zu `POST /api/auth/register`
   - Klicke auf "Try it out"
   - Gib Email und Passwort ein
   - Klicke auf "Execute"
   - **Kopiere den Token aus der Response**

3. **Authorization setzen:**
   - Klicke oben rechts auf **"Authorize"** 🔓
   - Gib den Token ein: `eyJhbGciOiJIUzUxMiJ9...` (OHNE "Bearer")
   - Klicke auf "Authorize"
   - Klicke auf "Close"

4. **Store erstellen:**
   - Gehe zu `POST /api/me/stores`
   - Klicke auf "Try it out"
   - Gib Store-Daten ein
   - Klicke auf "Execute"
   - ✅ Sollte jetzt funktionieren!

## 🔍 Debugging

Wenn du immer noch 403-Fehler bekommst:

### 1. Token im Header prüfen
```bash
# Falsch ❌
Authorization: Bearer Bearer eyJhbGci...

# Richtig ✅
Authorization: Bearer eyJhbGci...
```

### 2. Token-Inhalt prüfen
Gehe zu https://jwt.io und füge deinen Token ein. Er sollte enthalten:
```json
{
  "userId": 2,
  "roles": ["USER"],
  "sub": "test@markt.ma",
  "iat": 1733862000,
  "exp": 1733948400
}
```

### 3. Backend-Logs prüfen
```bash
ssh root@api.markt.ma
sudo journalctl -u storebackend -f
```

## 📦 Deployment

Nach einem Push zu `main` oder `master`:

1. GitHub Actions startet automatisch
2. Backend wird gebaut
3. JAR wird zum VPS hochgeladen
4. Deploy-Script wird ausgeführt:
   - JWT_SECRET aus GitHub Secrets wird verwendet
   - Environment-File wird erstellt
   - Service wird neu gestartet

## ✅ Checkliste

- [x] JWT Token enthält jetzt Rollen
- [x] JWT Secret aus Umgebungsvariablen
- [x] GitHub Actions konfiguriert JWT_SECRET
- [x] Deploy-Script nutzt JWT_SECRET
- [x] Dokumentation erstellt

## 🎉 Nächste Schritte

1. **Teste die Registrierung** in Swagger UI
2. **Kopiere den Token** aus der Response
3. **Authorize** in Swagger mit dem Token
4. **Erstelle einen Store** - sollte jetzt funktionieren!

Falls du weitere Probleme hast, prüfe die Backend-Logs mit:
```bash
ssh root@api.markt.ma "sudo journalctl -u storebackend -n 100 --no-pager"
```


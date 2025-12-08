# 🔐 JWT Secret Fix - 256 Bit Requirement

## ❌ Problem

Der aktuelle JWT Secret ist zu kurz (nur 192 Bits). JWT HMAC-SHA Algorithmen erfordern mindestens 256 Bits.

**Fehlermeldung:**
```
The specified key byte array is 192 bits which is not secure enough for any JWT HMAC-SHA algorithm.
```

---

## ✅ Lösung: Neuen sicheren JWT Secret generieren

### Schritt 1: Sicheren Secret generieren

**Auf Ihrem VPS Server:**

```bash
# Verbinden Sie sich mit Ihrem Server
ssh root@195.90.210.156

# Generieren Sie einen neuen sicheren Secret (512 Bits = 64 Bytes base64)
openssl rand -base64 64 | tr -d '\n'
```

Dies erzeugt einen String wie:
```
xK8pQ2mN5vR9tY3wE6hJ7fL1nP4sA0bC8dF2gH9jK5lM3oQ7rT1uV6xZ4yB8cD0eF3gH6jK9lN2pR5tW8yA1bC4dE7fG0hJ3kL6mN9oP2qR5sT8uV1wX4yZ7aB0cD3eF6gH9jK2lM5nP8qR1sT4uV7wX0yZ3aB6cD9eF2gH5jK8lM1nP4oQ7rT0uV3wX6yZ9aB2cD5eF8gH1jK4lM7nP0oQ3rT6sU9vX2wY5zA8bC1dD4eF7gG0hH3iJ6kK9lL2mM5nN8oO1pP4qQ7rR0sS3tT6uU9vV2wW5xX8yY1zZ4aA7bB0cC3dD6eE9fF2gG5hH8iI1jJ4kK7lL0mM3nN6oO9pP2qQ5rR8sS1tT4uU7vV0wW3xX6yY9zZ2aA5bB8cC1dD4eE7fF0gG3hH6iI9jJ2kK5lL8mM1nN4oO7pP0qQ3rR6sS9tT2uU5vV8wW1xX4yY7zZ0aA3bB6cC9dD2eE5fF8gG1hH4iI7jJ0kK3lL6mM9nN2oO5pP8qQ1rR4sS7tT0uU3vV6wW9xX2yY5zZ8aA1bB4cC7dD0eE3fF6gG9hH2iI5jJ8kK1lL4mM7nN0oO3pP6qQ9rR2sS5tT8uU1vV4wW7xX0yY3zZ6aA9bB2cC5dD8eE1fF4gG7hH0iI3jJ6kK9lL2mM5nN8oO1pP4qQ7rR0sS3tT6uU9vV2wW5xX8yY1zZ4aA7bB0cC3dD6eE9fF2gG5hH8iI1jJ4kK7lL0mM3nN6oO9pP
```

**Kopieren Sie den kompletten generierten String!**

---

### Schritt 2: Secret auf dem Server aktualisieren

```bash
# Editieren Sie die Environment-Datei
nano /etc/storebackend.env
```

**Suchen Sie die Zeile mit `JWT_SECRET` und ersetzen Sie sie:**

```bash
# VORHER (zu kurz):
JWT_SECRET=change-me-in-production

# NACHHER (sicher, mindestens 256 Bits):
JWT_SECRET=IHR_GENERIERTER_LANGER_SECRET_HIER
```

**Speichern:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Schritt 3: Backend-Service neu starten

```bash
# Service neu starten, um neue Umgebungsvariable zu laden
systemctl restart storebackend

# Status prüfen
systemctl status storebackend

# Logs prüfen
journalctl -u storebackend -f
```

---

### Schritt 4: Testen

```bash
# Registrierung testen (sollte jetzt funktionieren)
curl -X 'POST' \
  'https://api.markt.ma/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "test@markt.ma",
  "password": "password123"
}'
```

**Erwartete Response (✅ Erfolg):**
```json
{
  "message": "User registered successfully"
}
```

---

## 🔍 Überprüfung

### Secret-Länge überprüfen (auf dem Server):

```bash
# Zeigt die Länge in Bytes (sollte >= 32 sein)
cat /etc/storebackend.env | grep JWT_SECRET | cut -d'=' -f2 | wc -c
```

**Minimum:** 43 Zeichen (32 Bytes base64-encoded + Newline)
**Empfohlen:** 85+ Zeichen (64 Bytes base64-encoded)

---

## 📋 Quick Fix Commands

```bash
# Alles in einem Durchgang:
ssh root@195.90.210.156 << 'EOF'
  # Neuen Secret generieren
  NEW_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  
  # In Environment-Datei schreiben (ersetzt alte Zeile)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW_SECRET|" /etc/storebackend.env
  
  # Service neu starten
  systemctl restart storebackend
  
  # Status zeigen
  systemctl status storebackend --no-pager
  
  echo "✅ JWT Secret wurde aktualisiert!"
EOF
```

---

## ⚠️ Wichtig

1. **Neuer Secret invalidiert alte Tokens** - Alle User müssen sich neu einloggen
2. **Secret niemals im Git committen** - Nur auf dem Server speichern
3. **Backup erstellen** - Vor Änderungen: `cp /etc/storebackend.env /etc/storebackend.env.backup`

---

## 🐛 Troubleshooting

### Problem: Service startet nicht nach Änderung

```bash
# Logs prüfen
journalctl -u storebackend -n 50

# Umgebungsvariablen prüfen
systemctl show storebackend | grep JWT_SECRET
```

### Problem: Secret wird nicht geladen

```bash
# Prüfen ob Datei existiert und Rechte korrekt sind
ls -la /etc/storebackend.env
cat /etc/storebackend.env | grep JWT_SECRET

# Service-Konfiguration prüfen
cat /etc/systemd/system/storebackend.service | grep EnvironmentFile
```

---

## ✅ Nach dem Fix

Nach erfolgreicher Aktualisierung sollten folgende Endpoints funktionieren:

1. ✅ **POST /api/auth/register** - User registrieren
2. ✅ **POST /api/auth/login** - Login und Token erhalten
3. ✅ **GET /api/auth/me** - Profil abrufen (mit Token)

Testen Sie via Swagger UI: https://api.markt.ma/swagger-ui.html

---

## 📚 Weiterführende Links

- [RFC 7518 - JWT HMAC-SHA Algorithms](https://tools.ietf.org/html/rfc7518#section-3.2)
- [OWASP JWT Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
#!/bin/bash
# Generate a secure JWT secret (256 bits minimum)
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo ""
echo "✅ Your new JWT_SECRET (copy this!):"
echo "================================================"
echo "$JWT_SECRET"
echo "================================================"
echo ""
echo "Add this to your server's /etc/storebackend.env:"
echo "JWT_SECRET=$JWT_SECRET"


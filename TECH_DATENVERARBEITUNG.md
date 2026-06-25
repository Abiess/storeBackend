# Technische Datenverarbeitungs-Übersicht (für Entwickler)

**Zweck:** Schnellreferenz für Entwickler, welche personenbezogenen Daten wo gespeichert werden.  
**Zielgruppe:** Dev-Team, Security-Audits, DSGVO-Dokumentation

---

## Backend: Gespeicherte Personendaten (PostgreSQL)

### Tabelle: `users`
```sql
- id (PK)
- email (UNIQUE, NOT NULL)
- name (optional)
- password_hash (bcrypt, NIEMALS Klartext!)
- phone_number (UNIQUE, nullable, für WhatsApp/Telegram-Auth)
- email_verified (boolean)
- preferred_language ('de'|'en'|'ar'|'fr')
- roles (user_roles-Tabelle: STORE_OWNER, ADMIN, etc.)
- plan_id (FK zu plans)
- ai_calls_this_month (Zähler für AI-Nutzung)
- created_at, updated_at
```

### Tabelle: `stores`
```sql
- id (PK)
- owner_id (FK zu users)
- name
- slug (UNIQUE)
- description
- whatsapp_number
- contact_email
- contact_phone
- address (für Restaurant/Riad)
- opening_hours (Freitext)
- google_maps_url
- telegram_url, facebook_url, instagram_url, tiktok_url
- logo_url, banner_image_url, slider_images (JSON-Array mit URLs)
- greeting_message, footer_text
- business_type (SHOP, RESTAURANT, RIAD)
- status (ACTIVE, INACTIVE, DELETED)
- created_at, updated_at
```

### Tabelle: `orders`
```sql
- id (PK)
- order_number (UNIQUE)
- store_id (FK)
- customer_id (FK zu users, nullable für Gast-Käufe)
- customer_email (für Gast-Käufe)
- status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- total_amount, delivery_fee
- payment_method (COD, CREDIT_CARD, etc.)
- phone_verified (boolean, für COD)
- phone_verification_id (FK)

-- Embedded Shipping Address:
- shipping_first_name, shipping_last_name
- shipping_address1, shipping_address2
- shipping_city, shipping_postal_code, shipping_country
- shipping_phone

-- Embedded Billing Address:
- billing_first_name, billing_last_name
- billing_address1, billing_address2
- billing_city, billing_postal_code, billing_country
- billing_phone

- tracking_number, tracking_carrier, tracking_url
- notes (Freitext-Notizen)
- created_at, updated_at, shipped_at, delivered_at, cancelled_at
```

### Tabelle: `customer_profiles`
```sql
- id (PK)
- user_id (FK, UNIQUE, 1:1 Relation)
- first_name, last_name
- phone
- default_shipping_address (embedded: firstName, lastName, address1/2, city, postalCode, country, phone)
- default_billing_address (embedded, gleiche Felder)
- created_at, updated_at
```

### Tabelle: `customer_addresses`
```sql
- id (PK)
- customer_id (FK)
- address_type (SHIPPING, BILLING)
- first_name, last_name, company
- street, street2, city, state_province, postal_code, country
- phone
- is_default (boolean)
- created_at, updated_at
```

### Tabelle: `phone_verifications`
```sql
- id (PK)
- phone_number (für COD-Verifikation oder Phone-Auth)
- code (z.B. 6-stellig)
- store_id (0 = Auth-Flow, >0 = COD)
- verified (boolean)
- verified_at
- attempts (Anti-Brute-Force-Zähler)
- channel ('sms' oder 'whatsapp')
- expires_at (Code gültig für max. 10 Min)
- created_at
```

### Tabelle: `product_reviews`
```sql
- id (PK)
- product_id (FK)
- customer_id (FK zu users)
- order_id (FK, optional, für "Verifizierter Kauf")
- rating (1-5)
- title, comment
- is_verified_purchase (boolean)
- is_approved (boolean, Moderation)
- helpful_count, not_helpful_count
- created_at, updated_at, approved_at
- approved_by (FK zu users)
```

### Tabelle: `chat_messages`
```sql
- id (PK)
- session_id (FK zu chat_sessions)
- sender_type (CUSTOMER, STORE, BOT)
- sender_id (FK zu users, nullable für BOT)
- sender_name (Display-Name)
- message_type (TEXT, IMAGE, FILE)
- content (max. 5000 Zeichen)
- metadata (JSON)
- is_read (boolean)
- created_at
```

### Tabelle: `password_reset_tokens`
```sql
- id (PK)
- user_id (FK)
- token (UUID)
- expires_at (z.B. 1 Stunde)
- created_at
```

### Tabelle: `email_verifications`
```sql
- id (PK)
- user_id (FK)
- token (UUID)
- expires_at
- verified_at
- created_at
```

### Tabelle: `telegram_store_config` (falls aktiviert)
```sql
- id (PK)
- store_id (FK)
- chat_id (Telegram-Chat-ID)
- sync_enabled (boolean)
- last_sync_at
```

### Tabelle: `telegram_import_log` (falls aktiviert)
```sql
- id (PK)
- store_id (FK)
- message_id (Telegram-Message-ID)
- product_id (FK)
- imported_at
- status (SUCCESS, FAILED)
```

---

## Frontend: LocalStorage (personenbezogene Daten im Browser)

**⚠️ WICHTIG:** Niemals sensible Daten wie Passwörter oder vollständige Kreditkartendaten in LocalStorage speichern!

### Gespeicherte Keys:
```javascript
// Authentifizierung
localStorage.setItem('auth_token', jwt);           // JWT-Token (enthält User-ID, Rollen, Ablaufzeit)
localStorage.setItem('currentUser', JSON.stringify(user)); // {id, email, name, roles}

// Warenkorb
localStorage.setItem('cart_session_id', sessionId); // UUID für Gast-Warenkörbe

// Einstellungen
localStorage.setItem('preferredLanguage', 'de');    // Spracheinstellung
localStorage.setItem('notification_settings', JSON.stringify(settings)); // Lokal, nicht an Server

// UI-Status (lokal, keine Personendaten)
localStorage.setItem('onboarding_dismissed_<storeId>', '1');
localStorage.setItem('preferredStoreType', 'SHOP'); // Letzte Wahl (Shop/Restaurant/Riad)
localStorage.setItem('last_store_id', '123');       // Zuletzt besuchter Store
localStorage.setItem('betaAccess', 'true');         // Beta-Flag (lokal)

// Checkout (temporär)
localStorage.setItem('checkout_form_data', JSON.stringify({...})); // Formulardaten für Wiederherstellung

// Chatbot
localStorage.setItem('chatbot_session', JSON.stringify({sessionId, storeId}));
```

### Cookies:
```javascript
// [TODO: Liste aller Cookies ergänzen]
// Derzeit primär LocalStorage statt Cookies
```

---

## MinIO (S3-kompatibel): Objekt-Speicher

**Bucket-Struktur (vermutlich):**
```
/stores/<storeId>/logo.png
/stores/<storeId>/banner.jpg
/stores/<storeId>/products/<productId>/image1.jpg
/users/<userId>/avatar.png
```

**Gespeicherte Metadaten:**
- Dateiname (original + generiert)
- MIME-Type (z.B. image/jpeg)
- Dateigröße
- Upload-Zeitpunkt
- Zuordnung zu Store/User/Product

**KEINE personenbezogenen Daten in Dateinamen!**  
✅ Gut: `/stores/123/logo_abc123.png`  
❌ Schlecht: `/stores/max-mustermann-shop/logo.png`

---

## Server-Logs (IONOS)

**Automatisch geloggt:**
```
[2026-06-25 13:35:12] INFO 192.168.1.1 - GET /api/stores/123 - 200 OK - Mozilla/5.0...
[2026-06-25 13:35:15] ERROR 10.0.0.5 - POST /api/auth/login - 401 Unauthorized
```

**Enthält:**
- IP-Adresse (für max. 7 Tage, dann anonymisieren!)
- Zeitstempel
- HTTP-Methode + URL
- Statuscode
- User-Agent

**Speicherdauer:** [TODO: Festlegen, z.B. 30 Tage] dann automatisch gelöscht/rotiert.

---

## Analytics (falls aktiviert)

### Microsoft Clarity
```typescript
// app.component.ts
clarity.init();  // Nur wenn clarityId in environment.prod.ts gesetzt
clarity.identify(String(userId));
clarity.setTag('userId', String(userId));
clarity.setTag('page', currentPath);
clarity.event('user_clicked_create_store');
```

**Übertragene Daten:**
- User-ID (falls eingeloggt)
- Seitenaufrufe, Navigation
- Klicks, Scrollverhalten (anonymisiert)
- Geräte-/Browser-Informationen

**Aktivierung:** Nur wenn `environment.prod.ts` → `clarityId: 'abc123xyz'` gesetzt ist.

### Meta Pixel (Facebook)
```typescript
// Derzeit NICHT aktiv (metaPixelId: '' in environment.prod.ts)
// Falls aktiviert:
fbq('init', pixelId);
fbq('track', 'PageView');
fbq('trackCustom', 'StoreCreated', {storeId: 123});
```

**⚠️ TODO:** Cookie-Banner implementieren BEVOR Clarity oder Meta Pixel aktiviert wird!

---

## JWT-Token-Struktur

**Beispiel-Payload (nicht verschlüsselt, nur SIGNIERT):**
```json
{
  "sub": "42",              // User-ID
  "email": "max@example.com",
  "roles": ["STORE_OWNER"],
  "iat": 1719319512,        // Issued At (UNIX-Timestamp)
  "exp": 1719405912         // Expiration (24h später)
}
```

**WICHTIG:**
- JWT enthält KEINE sensiblen Daten (kein Passwort!)
- Token ist SIGNIERT (mit Secret) → Fälschungssicher
- Token ist NICHT verschlüsselt → Payload lesbar (nicht für sensible Daten!)
- Token läuft nach 24h ab → Neuer Login erforderlich

---

## Passwort-Sicherheit

**Hashing:**
```java
// User.java
@Column(name = "password_hash", nullable = false)
private String passwordHash;  // bcrypt mit Salts
```

**NIEMALS:**
- Passwörter im Klartext speichern
- Passwörter in Logs ausgeben
- Passwörter in API-Responses zurückgeben (`@JsonIgnore` nutzen!)

**Verwendetes Verfahren:** bcrypt (adaptive Hashing-Funktion mit Salts)

---

## Datenlöschung: Implementierungsstatus

### ✅ Bereits implementiert:
- Logout löscht JWT-Token und currentUser aus LocalStorage
- Cart-Session wird bei Logout gelöscht

### ⚠️ TODO: Account-Löschung implementieren
```typescript
// DELETE /api/users/{userId}
// MUSS folgendes löschen:
// 1. User-Entity
// 2. Verknüpfte customer_profiles
// 3. Verknüpfte customer_addresses
// 4. Verknüpfte chat_messages (als Sender)
// 5. Verknüpfte product_reviews (Customer-ID anonymisieren oder löschen)
// 6. Verknüpfte phone_verifications
// 7. Verknüpfte email_verifications
// 8. Verknüpfte password_reset_tokens
// 9. LocalStorage löschen (Frontend)
// 10. MinIO: Avatar-Bilder löschen

// AUSNAHME: Bestellungen (orders)
// → customer_id auf NULL setzen, customer_email behalten (Aufbewahrungspflicht HGB §257)
```

### ⚠️ TODO: Store-Löschung implementieren
```typescript
// DELETE /api/stores/{storeId}
// MUSS folgendes löschen:
// 1. Store-Entity (status = DELETED oder harte Löschung)
// 2. Alle verknüpften Products
// 3. Alle verknüpften Orders (Aufbewahrungspflicht beachten!)
// 4. Alle verknüpften Reviews
// 5. Alle Chat-Sessions und Messages
// 6. Alle StoreThemes, StoreSliderImages, etc.
// 7. MinIO: Alle Store-Bilder (Logo, Banner, Produkte)
// 8. Telegram-Konfiguration (falls vorhanden)
```

---

## DSGVO-Compliance-Checkliste (technisch)

### ✅ Bereits umgesetzt:
- [x] Passwörter werden gehashed (bcrypt)
- [x] JWT-Tokens sind signiert und zeitlich begrenzt
- [x] HTTPS/TLS für alle Verbindungen (IONOS)
- [x] `@JsonIgnore` für passwordHash in API-Responses
- [x] Rollenbasierte Zugriffskontrolle (RBAC)
- [x] LocalStorage für Auth-Token (nicht Cookies = CSRF-sicher)
- [x] Phone-Verifizierungscodes laufen automatisch ab (10 Min)

### ⚠️ TODO (hohe Priorität):
- [ ] **Cookie-Banner implementieren** (für Clarity/Meta Pixel)
- [ ] **Account-Löschung implementieren** (DELETE /api/users/{id})
- [ ] **Store-Löschung implementieren** (DELETE /api/stores/{id})
- [ ] **Server-Log-Anonymisierung** (IP-Adressen nach 7 Tagen entfernen)
- [ ] **Daten-Export-Funktion** (DSGVO Art. 20 – Datenübertragbarkeit)
- [ ] **AVV mit IONOS abschließen** (Art. 28 DSGVO)
- [ ] **Backup-Retention dokumentieren** (wie lange werden Backups aufbewahrt?)

### ⚠️ TODO (mittlere Priorität):
- [ ] Datenschutz-Folgenabschätzung (DSFA) durchführen
- [ ] Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) erstellen
- [ ] TOMs (Technische und organisatorische Maßnahmen) dokumentieren
- [ ] Rate-Limiting für API-Endpunkte (DDoS-Schutz)
- [ ] Zwei-Faktor-Authentifizierung (2FA) implementieren

### 📋 Nice-to-Have:
- [ ] Audit-Log für Admin-Aktionen (wer hat wann was geändert?)
- [ ] Passwort-Stärke-Prüfung im Frontend
- [ ] Warnung bei Login von neuer IP-Adresse
- [ ] Auto-Logout nach 24h Inaktivität

---

## Sicherheitshinweise für Entwickler

### ❌ NEVER DO:
```java
// ❌ NIEMALS Passwörter loggen
log.info("User logged in: " + user.getPasswordHash());

// ❌ NIEMALS Passwörter in API-Responses
public User getUser() { return user; } // password_hash könnte mitserialisiert werden!

// ❌ NIEMALS sensible Daten in URLs
GET /api/users/reset-password?token=abc123&password=MyNewPassword

// ❌ NIEMALS personenbezogene Daten in Dateinamen
/stores/max-mustermann-12345/logo.png

// ❌ NIEMALS unverschlüsselte Verbindungen (nur HTTPS!)
http://markt.ma/api/auth/login  // ❌
```

### ✅ ALWAYS DO:
```java
// ✅ Passwörter hashen
String hash = BCrypt.hashpw(password, BCrypt.gensalt());

// ✅ @JsonIgnore für sensible Felder
@JsonIgnore
@Column(name = "password_hash")
private String passwordHash;

// ✅ POST-Requests für sensible Daten
POST /api/auth/reset-password
Body: {"token": "abc123", "newPassword": "..."}

// ✅ UUIDs/IDs in Dateinamen
/stores/123/logo_a7b3c9.png

// ✅ HTTPS erzwingen
if (!request.isSecure()) {
    response.sendRedirect("https://..." + request.getRequestURI());
}

// ✅ Input-Validierung
if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
    throw new ValidationException("Invalid email");
}

// ✅ SQL-Injection verhindern (JPA/Hibernate nutzen!)
String hql = "FROM User WHERE email = :email";  // ✅ Prepared Statement
// NICHT: "FROM User WHERE email = '" + userInput + "'";  // ❌ SQL-Injection!
```

---

## Testing: DSGVO-Testfälle

```typescript
describe('DSGVO Compliance', () => {
  it('should NOT return passwordHash in API response', async () => {
    const user = await api.get('/api/users/me');
    expect(user.passwordHash).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it('should clear LocalStorage on logout', () => {
    authService.logout();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('should expire JWT tokens after 24h', () => {
    const token = jwt.sign({sub: 42}, secret, {expiresIn: '24h'});
    // ... Test Token-Ablauf
  });

  it('should delete user account and all related data', async () => {
    await api.delete('/api/users/42');
    const user = await api.get('/api/users/42');
    expect(user).toBeNull(); // 404
    // Prüfe auch customer_profiles, addresses, etc.
  });
});
```

---

**Erstellt:** 25.06.2026  
**Autor:** GitHub Copilot CLI (Code-Analyse)  
**Nächster Review:** Bei jeder neuen Feature-Implementierung die prüfen, ob neue personenbezogene Daten gespeichert werden!

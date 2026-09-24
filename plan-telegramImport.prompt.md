# Plan: Telegram Import & Bot Integration für markt.ma
# ⚡ KEIN PYTHON – 100% Java (Telegram Bot API = REST/HTTP)

## Status-Analyse: Was existiert bereits?

### ✅ Nichts Telegram-spezifisches vorhanden
- Kein `telegram`-Keyword in Java- oder TypeScript-Dateien
- Kein Schema-Eintrag für Telegram-Credentials
- → 100% Neuimplementierung notwendig

### ✅ Wiederverwendbare Muster & existierende Infrastruktur

| Was | Wo | Wiederverwendung |
|---|---|---|
| Credential-Storage per Store | `supplier_connections`-Tabelle (store_id, supplier_type, api_key, api_secret, access_token) | Exaktes Muster für Telegram-Config |
| WhatsApp-Messaging-Muster | `WhatsAppService.java` | Blaupause für `TelegramBotService.java` |
| WhatsApp-Felder in Store | `stores.whatsapp_number`, `stores.whatsapp_notifications_enabled` | Analog: `telegram_bot_token`, `telegram_channel_id` |
| Produkterstellung | `ProductService.java` | Import mappt direkt auf existierende `createProduct()`-Methode |
| Kategorie-Verwaltung | `CategoryService.java` | Hashtags → Kategorien via existierender `findOrCreate()`-Logik |
| Medien-Upload | `MediaService.java` + `MinioService.java` | Bilder aus Telegram-Posts → MinIO via existierende Upload-Pipeline |
| Auth/Security | JWT, `@AuthenticationPrincipal UserDetails` | Unverändert übernehmen |
| Frontend-Struktur | `/features/settings/` + `/features/stores/` | Neue Komponente einbetten |
| DB-Pattern | `ddl-auto: update` lokal + `schema.sql` für Produktion | Neue Felder in Entity → automatisch; schema.sql ergänzen |
| application.properties | `whatsapp.*`-Block | Analog: `telegram.bot.*`-Block |

---

## ⚡ Kein Python notwendig – Warum?

### Die zwei Telegram-API-Varianten

| API | Protokoll | Credentials | Wofür | Java möglich? |
|---|---|---|---|---|
| **Telegram Bot API** | **REST/HTTP** | BotFather-Token (pro Bot) | Bot-Nachrichten senden/empfangen, Channel-Posts lesen (wenn Bot Admin ist) | ✅ Ja – `RestTemplate` wie WhatsAppService |
| MTProto API (Telethon/Pyrogram) | Binär-Protokoll | api_id + api_hash (Nutzer-Account) | Beliebige öffentliche Channels scrapen OHNE Mitgliedschaft | ❌ Braucht Python oder TDLib |

### Entscheidung: Telegram Bot API (100% Java, kein Python, kein Docker)

**Bedingung:** Der Bot muss als **Admin** in den zu importierenden Channel eingeladen werden.

Das ist akzeptabel weil:
- Store-Besitzer importiert typischerweise aus **seinem eigenen** Telegram-Channel
- Sicherheitstechnisch besser (kein Scrapen fremder Channels mit Nutzer-Account)
- Telegram Bot API unterstützt alles was wir brauchen:
  - `getUpdates` / Webhook → neue Posts empfangen
  - `getHistory` → nachträglich importieren
  - `sendMessage`, `sendPhoto` → Benachrichtigungen senden
- **Exakt dasselbe Muster wie `WhatsAppService.java`** → pure Java REST

**Vergleich:**
```
WhatsAppService  →  graph.facebook.com  (Meta REST)
TelegramBotService  →  api.telegram.org/bot{token}/...  (Telegram REST)
```
Selbes Muster, andere URL. Kein neues Protokoll, keine Fremdsprache.

---

## 1. Architektur-Überblick (100% Java, kein Python)

```
Telegram Channel (Bot ist Admin)
         │
         │  REST/HTTPS (getUpdates / Webhook)
         ▼
[Spring Boot Backend]
  TelegramBotService.java     ← 1:1 analog WhatsAppService.java
  TelegramImportService.java  ← parst Posts, mappt auf Produkte
  TelegramController.java
         │
         ├──► ProductService.createProduct()        (existierend, unverändert)
         ├──► CategoryService.findOrCreate()         (existierend, unverändert)
         ├──► MediaService.uploadFromUrl()           (eine neue Methode ergänzen)
         └──► TelegramStoreConfigRepository          (neu)
```

---

## 2. Datenbank (schema.sql idempotent ergänzen)

### Neue Tabelle: `telegram_store_config`
```sql
CREATE TABLE IF NOT EXISTS telegram_store_config (
    id                   BIGSERIAL PRIMARY KEY,
    store_id             BIGINT NOT NULL UNIQUE,
    bot_token            VARCHAR(500),          -- BotFather Token (masked im GET-Response)
    channel_id           VARCHAR(100),          -- @meinkanal ODER -100123456789
    notify_new_orders    BOOLEAN NOT NULL DEFAULT TRUE,
    notify_low_stock     BOOLEAN NOT NULL DEFAULT FALSE,
    post_new_products    BOOLEAN NOT NULL DEFAULT FALSE,
    low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
    is_active            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telegram_config_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_telegram_config_store ON telegram_store_config(store_id);
```

### Neue Tabelle: `telegram_import_log` (Deduplizierung)
```sql
CREATE TABLE IF NOT EXISTS telegram_import_log (
    id                BIGSERIAL PRIMARY KEY,
    store_id          BIGINT NOT NULL,
    channel_id        VARCHAR(100) NOT NULL,
    telegram_msg_id   BIGINT NOT NULL,          -- Eindeutige Telegram Message-ID
    product_id        BIGINT,                   -- Erstelltes Produkt (null bei Fehler)
    status            VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',  -- SUCCESS|SKIPPED|ERROR
    error_message     TEXT,
    imported_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_telegram_import_log_store
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT uq_telegram_import
        UNIQUE (store_id, channel_id, telegram_msg_id)
);
CREATE INDEX IF NOT EXISTS idx_telegram_import_store ON telegram_import_log(store_id);
```

### application.properties Ergänzung
```properties
# Telegram Bot (global dev toggle)
# Jeder Store hat seinen eigenen Bot-Token in telegram_store_config DB-Tabelle
telegram.enabled=false
```

## 3. Was muss neu gebaut werden (Java/Spring Boot)

### 3.1 Entities
```
entity/TelegramStoreConfig.java   → @Entity für telegram_store_config
entity/TelegramImportLog.java     → @Entity für telegram_import_log
```

### 3.2 Repositories
```
repository/TelegramStoreConfigRepository.java
  findByStoreId(Long storeId)

repository/TelegramImportLogRepository.java
  existsByStoreIdAndChannelIdAndTelegramMsgId(Long, String, Long)
  findByStoreIdOrderByImportedAtDesc(Long storeId)
```

### 3.3 TelegramBotService.java (analog WhatsAppService)
```java
// Alle Calls → https://api.telegram.org/bot{token}/{method}  (REST/HTTP wie WhatsApp)

sendMessage(String chatId, String text, String botToken)
sendPhoto(String chatId, String imageUrl, String caption, String botToken)

// Business-Methoden (rufen sendMessage intern auf):
sendNewOrderNotification(TelegramStoreConfig cfg, Order order)
sendLowStockAlert(TelegramStoreConfig cfg, Product product, int currentStock)
postNewProductToChannel(TelegramStoreConfig cfg, Product product)

// Import: Bot-API liefert letzte Channel-Nachrichten (Bot muss Channel-Admin sein):
getChannelHistory(String channelId, String botToken, int limit) → List<TelegramMessageDto>

isConfigured(TelegramStoreConfig cfg) → boolean
testConnection(TelegramStoreConfig cfg) → boolean   // sendet "✅ Bot verbunden!"
simulateSend(...)                                   // wie WhatsAppService bei disabled=true
```

### 3.4 TelegramImportService.java
```java
importFromChannel(Long storeId, Long userId) → TelegramImportResult
  1. Config laden (bot_token, channel_id)
  2. TelegramBotService.getChannelHistory() aufrufen
  3. Für jeden Post → parsePost() + Duplikat-Check (import_log UNIQUE constraint)
  4. mapToProductRequest() → ProductService.createProduct()     (unverändert)
  5. Bilder → MediaService.uploadFromUrl()                      (eine neue Methode)
  6. Hashtags → CategoryService.findOrCreate()                  (unverändert)
  7. TelegramImportLog speichern

parsePost(msg) → ParsedProduct
  extractPrice(text)    → Regex: €, $, MAD, DH, DZD, درهم, دج, EUR
  extractHashtags(text) → #tag → Kategorienamen
  extractPhones(text)   → Regex-Telefonnummern
  extractLinks(text)    → wa.me/... , t.me/... Links
```

### 3.5 TelegramController.java
```
GET  /api/stores/{storeId}/telegram/config      → Konfiguration laden (Token gemaskiert)
PUT  /api/stores/{storeId}/telegram/config      → Konfiguration speichern
POST /api/stores/{storeId}/telegram/test        → Testnachricht senden
POST /api/stores/{storeId}/telegram/import      → Import auslösen
GET  /api/stores/{storeId}/telegram/import/log  → Import-Historie
POST /api/stores/{storeId}/telegram/webhook     → Telegram-Webhook-Receiver (Phase 3)
```

### 3.6 DTOs
```
dto/TelegramConfigDto.java        → { channelId, botToken(masked ****last4), notify*, isActive }
dto/TelegramImportResultDto.java  → { imported, skipped, errors, products[] }
dto/TelegramImportLogDto.java     → { msgId, status, productId, importedAt, errorMsg }
dto/TelegramMessageDto.java       → { msgId, text, photoUrls[], date, fromChannel }
```

### 3.7 MediaService (nur eine neue Methode ergänzen, Rest unverändert)
```java
public Media uploadFromUrl(Long storeId, String imageUrl, String altText) {
    // URL → InputStream → MinioService.uploadFile() → Media Entity speichern
    // Wiederverwendet intern: MinioService + Media Entity (alles existierend)
}
```

---

## 4. Was darf NICHT geändert werden

| Datei/Klasse | Status |
|---|---|
| `ProductService.createProduct()` | ✅ Nur aufrufen |
| `CategoryService` | ✅ Nur aufrufen |
| `WhatsAppService.java` | ✅ Unberührt |
| `MediaService.java` (bestehend) | ✅ Nur neue Methode `uploadFromUrl()` ergänzen |
| `OrderService.java` | ⚠️ Nur neuen `@EventListener` hinzufügen (1 Zeile) |
| `Store.java` (Entity) | ✅ Unberührt – separate `telegram_store_config`-Tabelle |
| `schema.sql` | ✅ Nur idempotent anhängen (CREATE TABLE IF NOT EXISTS) |
| `app.routes.ts` | ✅ Nur neue Route ergänzen |

---

## 5. Frontend (Angular 17 Standalone)

### Neue Komponenten
```
features/settings/telegram/
  telegram-settings.component.ts      → Bot-Token, Channel-ID, Toggle-Switches, Test-Button
  telegram-import.component.ts        → Import auslösen + Ergebnis anzeigen
  telegram-import-log.component.ts    → Tabelle via app-responsive-data-list
```

### Neuer Service
```
core/services/telegram.service.ts
  getTelegramConfig(storeId)
  saveTelegramConfig(storeId, config)
  testBot(storeId)
  triggerImport(storeId)
  getImportLog(storeId)
```

### Import-Log Template
```html
<app-responsive-data-list
  [items]="importLog"
  [columns]="logColumns"
  [loading]="loading"
  emptyIcon="📨"
  emptyMessage="Noch keine Imports"
  searchPlaceholder="Log durchsuchen...">
</app-responsive-data-list>
```

---

## 6. Preis-Extraktion (Java Regex)
```java
private static final Pattern PRICE_PATTERN = Pattern.compile(
    "(\\d{1,6}(?:[.,]\\d{1,3})?)\\s*(?:€|\\$|MAD|DH|DZD|درهم|دج|EUR|USD)",
    Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
);
// Erkennt: "199 MAD", "€ 29,90", "$15", "50.000 دج", "150 DH"
```

---

## 7. Sicherheit & Credentials

| Credential | Speicherort | Verschlüsselung |
|---|---|---|
| `bot_token` pro Store | `telegram_store_config.bot_token` | Plaintext (wie WhatsApp-Token aktuell) – optional Jasypt |
| Kein api_id/api_hash | Nicht benötigt (Bot API = REST) | – |

**Regel:** Bot-Token im GET-Response immer gemaskiert: `****{last4}`.

---

## 8. Implementierungsreihenfolge (ROI-optimiert, kein Python)

### Phase 1 – Bot Notifications (1-2 Tage, sofortiger Nutzen)
1. `telegram_store_config` Tabelle + `TelegramStoreConfig` JPA-Entity
2. `TelegramBotService.java` → `sendMessage()` + `testConnection()`
3. `TelegramController` → Config CRUD + Test-Endpunkt
4. Hook in `OrderService` → neue Bestellung → Telegram-Nachricht an Store-Owner
5. Frontend: `telegram-settings.component.ts`

### Phase 2 – Channel Import (2-3 Tage)
1. `TelegramBotService.getChannelHistory()` implementieren
2. `TelegramImportService.java` (parse, map, dedupliziere)
3. `MediaService.uploadFromUrl()` ergänzen
4. `telegram_import_log` Tabelle + Entity
5. `TelegramController` → `/import` Endpunkt
6. Frontend: `telegram-import.component.ts` + `telegram-import-log.component.ts`

### Phase 3 – Automatisierung (optional)
1. Telegram Webhook statt Polling
2. Low-Stock-Alerts via Telegram
3. Neue Produkte automatisch in Channel posten
4. Mehrsprachen-Nachrichten (de/en/ar) wie in WhatsAppService

---

## 9. ✅ Entscheidungen (final)

| Frage | Entscheidung |
|---|---|
| Fremde Channels? | ❌ Nein – nur eigene Channels (Bot muss Admin sein) |
| Credential-Verschlüsselung | Plaintext wie WhatsApp-Token (in DB) |
| Polling vs. Webhook | ✅ Polling via `getUpdates` |
| Post-Limit | 50 (konfigurierbar 1–100 pro Store) |
| Sichtbarkeit | ✅ Für alle Plans sichtbar |

## 10. ✅ Implementierungsstatus

### Backend (vollständig implementiert)
- ✅ `entity/TelegramStoreConfig.java`
- ✅ `entity/TelegramImportLog.java`
- ✅ `repository/TelegramStoreConfigRepository.java`
- ✅ `repository/TelegramImportLogRepository.java`
- ✅ `service/TelegramBotService.java` (analog WhatsAppService)
- ✅ `service/TelegramImportService.java`
- ✅ `controller/TelegramController.java`
- ✅ `dto/TelegramConfigDto.java`, `TelegramMessageDto.java`, `TelegramImportResultDto.java`, `TelegramImportLogDto.java`
- ✅ `event/OrderStatusEventListener.java` → Telegram-Hook bei neuer Bestellung
- ✅ `service/MediaService.java` → `uploadFromUrl()` ergänzt
- ✅ `service/MinioService.java` → `uploadInputStream()` ergänzt
- ✅ `scripts/db/schema.sql` → V22 idempotent angehängt
- ✅ `application.properties` → `telegram.enabled=false` ergänzt

### Frontend (vollständig implementiert)
- ✅ `core/services/telegram.service.ts`
- ✅ `features/settings/telegram/telegram-settings.component.ts`
- ✅ `features/settings/telegram/telegram-import.component.ts`
- ✅ `features/settings/telegram/telegram-import-log.component.ts`
- ✅ `features/settings/telegram/telegram-page.component.ts`
- ✅ `app.routes.ts` → Route `stores/:id/telegram` ergänzt
- ✅ `features/stores/store-settings.component.ts` → Tab "Telegram" mit Router-Navigation


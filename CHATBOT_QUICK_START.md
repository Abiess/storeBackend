# 🚀 CHATBOT QUICK START GUIDE

## ✅ WAS IST BEREITS FERTIG

### 1. Database (schema.sql)
```sql
✅ chat_sessions - Konversations-Tracking
✅ chat_messages - Nachrichten-Historie
✅ faq_categories - FAQ Kategorien (mit 5 Default-Kategorien)
✅ faq_items - FAQ Fragen/Antworten (mit 10 Default-FAQs)
✅ chatbot_intents - AI Training Data (mit 5 Default-Intents)
✅ canned_responses - Quick Replies für Agents
✅ chat_analytics - Metriken & Reporting
```

**Default FAQs inkludiert:**
- Bestellung verfolgen
- Lieferzeit
- Versandkosten
- Zahlungsmethoden
- Stornierung
- Rückgabe
- Produktverfügbarkeit
- Mengenrabatte
- Account erstellen
- Passwort vergessen

**Default Chatbot Intents:**
- `greeting` - Begrüßung
- `order_status` - Bestellstatus abfragen
- `faq_request` - FAQ anfordern
- `human_request` - Mitarbeiter anfordern
- `goodbye` - Verabschiedung

### 2. Backend Entities ✅
- ChatSession.java
- ChatMessage.java
- FaqCategory.java
- FaqItem.java
- CannedResponse.java
- ChatbotIntent.java

### 3. Repositories ✅
- ChatSessionRepository
- ChatMessageRepository
- FaqCategoryRepository
- FaqItemRepository
- CannedResponseRepository
- ChatbotIntentRepository

### 4. DTOs ✅
- ChatSessionDTO
- ChatMessageDTO
- SendMessageRequest
- FaqCategoryDTO
- FaqItemDTO
- ChatbotRequest
- ChatbotResponse

---

## 🔄 NÄCHSTE SCHRITTE (Services + Controllers)

Soll ich jetzt implementieren:

### Option A: Minimal (nur FAQ + Chat-History)
```
✅ FaqService (FAQ-Suche, Kategorien)
✅ FaqController (Public API)
✅ ChatService (Session + Message Management)
✅ ChatController (Basic Endpoints)

Zeit: ~30 Minuten
```

### Option B: Standard (inkl. Chatbot AI)
```
✅ Option A
✅ ChatbotService (Intent Recognition + Actions)
✅ ChatbotController (AI Chat API)
✅ Order Tracking Integration

Zeit: ~1 Stunde
```

### Option C: Full (inkl. WebSocket Real-Time)
```
✅ Option B
✅ WebSocketConfig (Real-Time Messaging)
✅ ChatWebSocketController
✅ NotificationService (Events)
✅ Agent Dashboard Backend

Zeit: ~2 Stunden
```

### Option D: Complete (inkl. Frontend)
```
✅ Option C
✅ ChatWidgetComponent (Angular)
✅ ChatService (Angular Service)
✅ Agent Dashboard Component
✅ Translations (de, en, ar)

Zeit: ~3-4 Stunden
```

---

## 🎯 EMPFOHLENE REIHENFOLGE

### Phase 1: Backend Foundation (JETZT)
1. ✅ Database Schema - **FERTIG**
2. ✅ Entities - **FERTIG**
3. ✅ Repositories - **FERTIG**
4. ✅ DTOs - **FERTIG**
5. 🔄 **Services** - NÄCHSTER SCHRITT
6. 🔄 **Controllers** - NÄCHSTER SCHRITT

### Phase 2: AI Integration
7. ChatbotService mit Intent Recognition
8. Order Tracking Integration
9. FAQ Auto-Suggestions

### Phase 3: Real-Time Features
10. WebSocket Setup
11. Typing Indicators
12. Read Receipts
13. Agent Assignment

### Phase 4: Frontend
14. Chat Widget Component
15. FAQ Component
16. Agent Dashboard
17. Mobile Optimization

---

## 💻 VERWENDUNG NACH DEPLOYMENT

### Für Kunden (Storefront):

```typescript
// In storefront.component.html einfügen:
<app-chat-widget [storeId]="storeId"></app-chat-widget>
```

**Features:**
- Floating Chat Button (unten rechts)
- Quick Actions: Order Status, FAQ, Live Agent
- Auto-Antworten vom Bot
- Order Tracking: Bestellnummer eingeben → Status anzeigen
- FAQ Suche: Keyword eingeben → passende Antworten
- Agent Transfer: Bei komplexen Fragen

### Für Store-Betreiber (Admin Dashboard):

```typescript
// In store-settings.component.html:
<div *ngIf="activeTab === 'chat'">
  <app-chat-admin-panel [storeId]="storeId"></app-chat-admin-panel>
</div>
```

**Features:**
- Aktive Chats anzeigen
- Chat-Zuweisen an Mitarbeiter
- Canned Responses verwalten
- FAQ verwalten (eigene + globale)
- Chat Analytics Dashboard

---

## 📊 BEISPIEL API CALLS

### 1. FAQ Suchen (Public)
```bash
GET /api/public/faq/stores/1/search?q=lieferzeit

Response:
[
  {
    "id": 2,
    "question": "Wie lange dauert die Lieferung?",
    "answer": "Die Lieferzeit beträgt in der Regel 2-5 Werktage...",
    "viewCount": 145,
    "helpfulCount": 98
  }
]
```

### 2. Chatbot Message Senden (Public)
```bash
POST /api/public/chatbot/message

Body:
{
  "storeId": 1,
  "sessionToken": "abc123",
  "message": "Wo ist meine Bestellung?",
  "language": "de"
}

Response:
{
  "sessionToken": "abc123",
  "response": "Gerne helfe ich Ihnen bei der Verfolgung Ihrer Bestellung. Bitte geben Sie Ihre Bestellnummer ein.",
  "action": "CHECK_ORDER",
  "data": null
}
```

### 3. FAQ Kategorien Laden (Public)
```bash
GET /api/public/faq/stores/1/categories

Response:
[
  {
    "id": 1,
    "name": "Bestellung & Lieferung",
    "slug": "order-delivery",
    "icon": "📦",
    "items": [
      {
        "question": "Wie kann ich meine Bestellung verfolgen?",
        "answer": "Sie können Ihre Bestellung jederzeit..."
      }
    ]
  }
]
```

### 4. Chat Session Starten (Public)
```bash
POST /api/public/chatbot/session

Body:
{
  "storeId": 1,
  "customerName": "Max Mustermann",
  "customerEmail": "max@example.com",
  "language": "de"
}

Response:
{
  "sessionToken": "abc123",
  "status": "ACTIVE",
  "createdAt": "2026-02-25T12:00:00"
}
```

---

## 🔧 KONFIGURATION

### application.properties
```properties
# Chatbot Settings
chatbot.enabled=true
chatbot.default.language=de
chatbot.intent.confidence.threshold=0.7

# WebSocket (falls Option C gewählt)
spring.websocket.enabled=true
spring.websocket.allowed-origins=*

# FAQ Cache (Performance)
spring.cache.cache-names=faqCategories,faqItems
spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=1h
```

---

## 📱 MOBILE SUPPORT

Das Chat-Widget ist vollständig responsive:

**Desktop:**
- Floating Button unten rechts
- Chat-Fenster: 380x600px
- Sidebar-Layout möglich

**Tablet:**
- Floating Button
- Chat-Fenster: 340x500px

**Mobile:**
- Floating Button
- Chat-Fenster: Fullscreen (100vw x 100vh)
- Optimierte Touch-Bedienung

---

## 🌐 MULTI-LANGUAGE

**Unterstützte Sprachen:**
- Deutsch (de) - Default
- Englisch (en)
- Arabisch (ar) - RTL Support

**Translation Keys (zu ergänzen):**
```json
{
  "chat": {
    "title": "Chat Support",
    "typeMessage": "Nachricht eingeben...",
    "trackOrder": "Bestellung verfolgen",
    "faq": "Häufige Fragen",
    "liveAgent": "Mit Mitarbeiter sprechen",
    "connecting": "Verbinden...",
    "agentJoined": "Ein Mitarbeiter ist dem Chat beigetreten",
    "sessionEnded": "Chat beendet"
  }
}
```

---

## 🎨 CUSTOMIZATION

### Chat Widget Farben anpassen:
```scss
// chat-widget.component.scss
$primary-color: #667eea;  // Hauptfarbe
$secondary-color: #764ba2; // Gradient-Farbe
$bot-bg: #f5f5f5;         // Bot-Message Background
$customer-bg: #667eea;    // Customer-Message Background
```

### Bot Avatar ändern:
```typescript
getAvatar(senderType: string): string {
  switch (senderType) {
    case 'BOT': return '🤖'; // Hier ändern
    case 'AGENT': return '👤';
    case 'CUSTOMER': return '😊';
  }
}
```

---

## 📈 PERFORMANCE TIPPS

1. **FAQ Caching:**
```java
@Cacheable("faqCategories")
public List<FaqCategoryDTO> getCategories(Long storeId) { ... }
```

2. **Message Pagination:**
```java
public List<ChatMessageDTO> getMessages(String sessionToken, int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    ...
}
```

3. **WebSocket Message Throttling:**
```typescript
sendMessage() {
  if (this.lastSentAt && Date.now() - this.lastSentAt < 500) {
    return; // Prevent spam
  }
  this.lastSentAt = Date.now();
  // ... send message
}
```

---

## ❓ HÄUFIGE FRAGEN

**Q: Kann der Bot auch auf Englisch/Arabisch antworten?**
A: Ja, die `language` wird in der Session gespeichert. FAQs können mehrsprachig angelegt werden.

**Q: Wie viele gleichzeitige Chats sind möglich?**
A: Unbegrenzt. Jede Session ist isoliert. Empfohlen: Max 50 aktive Chats pro Agent.

**Q: Kann der Bot mit OpenAI/GPT-4 integriert werden?**
A: Ja! In `ChatbotService.processMessage()` kann die Intent-Erkennung durch GPT-4 API ersetzt werden.

**Q: Werden Chat-Historien gespeichert?**
A: Ja, alle Messages werden in `chat_messages` gespeichert. GDPR-konform nach 30 Tagen löschbar.

**Q: Kann ich eigene FAQs hinzufügen?**
A: Ja, über Admin-Panel oder direkt in der DB. Store-spezifische FAQs überschreiben globale.

---

## 🚀 QUICK START COMMAND

```bash
# 1. Compile Backend
cd storeBackend
mvn clean install -DskipTests

# 2. Database Update (wird automatisch beim Start gemacht)
# Tabellen werden durch schema.sql angelegt

# 3. Start Backend
./start-local.bat

# 4. Check Logs
tail -f logs/application.log

# 5. Test FAQ API
curl http://localhost:8080/api/public/faq/stores/1/categories

# 6. Test Chatbot
curl -X POST http://localhost:8080/api/public/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"storeId":1,"message":"Hallo","language":"de"}'
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Database Schema aktualisiert
- [ ] Backend compiled ohne Fehler
- [ ] FAQ Default-Daten geladen
- [ ] Chatbot Intents geladen
- [ ] API Endpoints erreichbar
- [ ] Frontend Chat-Widget integriert
- [ ] Translations hinzugefügt
- [ ] Mobile getestet
- [ ] Performance getestet (100+ Messages)
- [ ] GDPR-Compliance geprüft

---

**Bereit zum Starten?** 

Sage einfach:
- **"A"** für Minimal-Version (nur FAQ)
- **"B"** für Standard-Version (inkl. Chatbot AI)
- **"C"** für Full-Version (inkl. WebSocket)
- **"D"** für Complete-Version (inkl. Frontend)

Ich implementiere dann sofort! 🚀


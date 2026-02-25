# 24/7 Chatbot Feature - Vollständige Integration

## 🎯 Überblick

Der 24/7 Chatbot ist vollständig in Ihr SaaS-System integriert und bietet:
- Automatische Beantwortung häufiger Fragen
- Bestellstatus-Tracking
- FAQ-Integration
- Mehrsprachige Unterstützung (DE, EN, AR)
- Weiterleitung an menschliche Agenten
- Anpassbare Intents durch Store Manager

---

## 📦 Backend-Implementierung

### ✅ Entities
- `ChatbotIntent` - Trainierbare Bot-Intents
- `ChatSession` - Konversationssitzungen
- `ChatMessage` - Chat-Nachrichten

### ✅ DTOs
- `ChatbotRequest` - Bot-Anfragen
- `ChatbotResponse` - Bot-Antworten
- `ChatbotIntentDTO` - Intent-Verwaltung
- `ChatbotStatisticsDTO` - Statistiken
- `ChatMessageDTO` - Nachrichten
- `ChatSessionDTO` - Sitzungen

### ✅ Repositories
- `ChatbotIntentRepository` - Intent-Datenzugriff
- `ChatSessionRepository` - Session-Verwaltung mit erweiterten Queries
- `ChatMessageRepository` - Nachrichtenverwaltung

### ✅ Services
**ChatbotService** - Kern-Bot-Logik:
- Nachrichtenverarbeitung
- Intent-Matching
- Bestellstatus-Tracking
- FAQ-Suche
- Mehrsprachige Antworten

**ChatbotIntentService** - Intent-Verwaltung:
- CRUD für Intents
- Bulk-Import/Export
- Intent-Testing
- Statistiken
- Toggle-Funktion

### ✅ Controllers
**ChatbotController** (`/api/public/chatbot`):
- `POST /message` - Nachricht senden
- `GET /session/{token}` - Session abrufen
- `GET /stores/{id}/faq/categories` - FAQ-Kategorien
- `GET /stores/{id}/faq/search` - FAQ-Suche

**ChatbotIntentManagementController** (`/api/chatbot/intents`):
- `GET /` - Alle Intents
- `GET /active` - Aktive Intents
- `GET /statistics` - Bot-Statistiken
- `POST /` - Intent erstellen
- `PUT /{id}` - Intent aktualisieren
- `DELETE /{id}` - Intent löschen
- `POST /{id}/toggle` - Intent aktivieren/deaktivieren
- `POST /{id}/test` - Intent testen
- `POST /bulk-import` - Bulk-Import

### ✅ Datenbank (schema.sql)
Alle Tabellen bereits vorhanden:
- `chatbot_intents` - Intent-Definitionen
- `chat_sessions` - Sitzungen
- `chat_messages` - Nachrichten
- `chat_analytics` - Statistiken
- `faq_categories` - FAQ-Kategorien
- `faq_items` - FAQ-Einträge

**Standard-Intents bereits eingefügt:**
- Begrüßung
- Bestellstatus
- FAQ-Anfragen
- Agent-Anfragen
- Verabschiedung

---

## 🎨 Frontend-Implementierung

### ✅ Services
**ChatbotService** (`chatbot.service.ts`):
- Session-Management (localStorage)
- Nachrichtenverwaltung
- Typing-Indicator
- FAQ-Integration

**ChatbotManagementService** (`chatbot-management.service.ts`):
- Intent-Verwaltung
- Statistiken
- Test-Funktionen
- Bulk-Import/Export

### ✅ Components

#### ChatbotWidgetComponent (Kundenansicht)
**Dateien:**
- `chatbot-widget.component.ts`
- `chatbot-widget.component.html`
- `chatbot-widget.component.scss`

**Features:**
- Schwebendes Chat-Widget
- Echtzeitnachrichten
- Typing-Indicator
- Quick-Action-Buttons
- Auto-Scroll
- Session-Persistenz
- Responsive Design
- Animationen

#### ChatbotManagementComponent (Store Manager)
**Dateien:**
- `chatbot-management.component.ts`
- `chatbot-management.component.html`
- `chatbot-management.component.scss`

**Features:**
- Intent-Verwaltung (CRUD)
- Live-Testing
- Statistik-Dashboard
- Bulk-Import/Export (JSON)
- Trainingsphrasen-Editor
- Action-Mapping
- Confidence-Threshold-Konfiguration
- Aktivieren/Deaktivieren von Intents

---

## 🚀 Integration in bestehende App

### 1. Widget in Storefront einbinden

In `app.component.ts` (oder Layout-Component):

```typescript
import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component';

@Component({
  // ...
  imports: [
    // ... andere imports
    ChatbotWidgetComponent
  ]
})
export class AppComponent {}
```

In `app.component.html`:

```html
<router-outlet></router-outlet>
<app-chatbot-widget></app-chatbot-widget>
```

### 2. Management in Store Manager Dashboard

Routing hinzufügen (z.B. in `app.routes.ts`):

```typescript
import { ChatbotManagementComponent } from './components/chatbot-management/chatbot-management.component';

export const routes: Routes = [
  // ... andere Routes
  {
    path: 'manager/chatbot',
    component: ChatbotManagementComponent,
    canActivate: [AuthGuard],
    data: { roles: ['STORE_MANAGER', 'STORE_OWNER'] }
  }
];
```

Navigation hinzufügen:

```html
<a routerLink="/manager/chatbot" routerLinkActive="active">
  🤖 Chatbot
</a>
```

### 3. Security-Konfiguration

In `SecurityConfig.java` bereits konfiguriert:
```java
.requestMatchers("/api/public/chatbot/**").permitAll()
.requestMatchers("/api/chatbot/intents/**").hasAnyRole("STORE_MANAGER", "STORE_OWNER")
```

---

## 📊 Verwendung

### Als Kunde:
1. Widget erscheint rechts unten auf allen Seiten
2. Klick öffnet Chat
3. Nachricht eingeben
4. Bot antwortet automatisch
5. Quick-Actions nutzen (z.B. Bestellung verfolgen)

### Als Store Manager:
1. Zu "Chatbot-Verwaltung" navigieren
2. Statistiken einsehen
3. Intents erstellen/bearbeiten:
   - Name vergeben
   - Trainingsphrasen hinzufügen
   - Antwort-Template definieren
   - Aktion zuweisen
   - Testen
4. Export/Import für Backup

---

## 🔧 Konfiguration

### Default-Intents anpassen

In `schema.sql` (Zeile 873-895) oder über Management-Interface.

### Neue Aktionen hinzufügen

1. Backend: `ChatbotService.handleXXX()` Methode
2. Frontend Widget: `handleQuickAction()` erweitern
3. Management: `availableActions` Array erweitern

### Sprachen hinzufügen

In `ChatbotService.java`:
- `getGreetingMessage()`
- `getGoodbyeMessage()`
- weitere Nachrichten

---

## 📈 Statistiken & Analytics

**Verfügbare Metriken:**
- Gesamt-Sessions
- Bot-Auflösungsrate
- An Agent weitergeleitet
- Durchschnittliche Antwortzeit
- Kundenzufriedenheit
- Aktive Sessions
- Heute's Sessions

**Datenquelle:** `chat_analytics` Tabelle

---

## 🎨 Styling-Anpassungen

### Farben ändern

In `chatbot-widget.component.scss`:
```scss
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Durch eigene Farben ersetzen.

### Position ändern

```scss
.chatbot-widget {
  bottom: 20px;  // Abstand von unten
  right: 20px;   // Abstand von rechts
}
```

---

## 🧪 Testing

### Intent testen
1. Management-Interface öffnen
2. Intent auswählen → "Testen"
3. Testnachricht eingeben
4. Ergebnis prüfen (Match, Confidence, Antwort)

### E2E-Test
1. Als Kunde Widget öffnen
2. Verschiedene Nachrichten senden
3. Intents prüfen
4. FAQ-Integration testen
5. Bestellstatus-Tracking testen

---

## 📝 Weitere Features (Optional)

### Machine Learning Integration
- TensorFlow.js für Intent-Matching
- NLP-Bibliothek (z.B. compromise.js)
- Training-Pipeline

### Live-Chat-Übernahme
- WebSocket-Integration
- Agent-Dashboard
- Chat-Queue

### Analytics-Erweiterung
- Conversation-Heatmap
- Drop-off-Analyse
- A/B-Testing für Antworten

---

## 🐛 Troubleshooting

### Bot antwortet nicht
- CORS-Einstellungen prüfen
- Backend-Logs prüfen (`/actuator/health`)
- Browser-Console prüfen

### Intents werden nicht erkannt
- Confidence-Threshold zu hoch
- Trainingsphrasen zu spezifisch
- Intent inaktiv

### Session wird nicht gespeichert
- localStorage aktiviert?
- Browser im Inkognito-Modus?

---

## ✅ Checkliste

- [x] Backend Entities erstellt
- [x] DTOs definiert
- [x] Repositories erweitert
- [x] Services implementiert
- [x] Controllers erstellt
- [x] Datenbank-Schema vorhanden
- [x] Frontend Services erstellt
- [x] Widget-Component erstellt
- [x] Management-Component erstellt
- [x] Styling implementiert
- [x] Dokumentation erstellt

---

## 🎉 Fertig!

Der 24/7 Chatbot ist vollständig implementiert und einsatzbereit.

**Nächste Schritte:**
1. Widget in App einbinden (siehe Integration)
2. Management-Route hinzufügen
3. Default-Intents anpassen
4. In Produktion testen
5. Kundenfeedback sammeln
6. Intents verfeinern

**Support:**
- Backend läuft auf Port 8080
- Frontend auf Port 4200
- API-Docs: `/swagger-ui.html`


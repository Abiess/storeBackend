# 🤖 24/7 CHATBOT & CUSTOMER SUPPORT SYSTEM - VOLLSTÄNDIGES KONZEPT

**Erstellt am:** 2026-02-25  
**Version:** 1.0  
**Status:** ✅ Datenbank & Entities fertig | 🔄 Services & Controller folgen

---

## 📋 INHALTSVERZEICHNIS

1. [Überblick](#überblick)
2. [Architektur](#architektur)
3. [Bereits implementiert](#bereits-implementiert)
4. [Noch zu implementieren](#noch-zu-implementieren)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [AI Features](#ai-features)
8. [Deployment](#deployment)

---

## 🎯 ÜBERBLICK

### Features
- ✅ 24/7 AI-Chatbot (Order Status, FAQ, Product Info)
- ✅ Live Chat mit Store-Betreiber (Agent-Weiterleitung)
- ✅ FAQ Knowledge Base (Global + Store-spezifisch)
- ✅ Order Tracking Integration
- ✅ Multi-Language Support (DE, EN, AR)
- ✅ Chat History & Analytics
- ✅ Canned Responses (Quick Replies für Agents)
- ✅ Typing Indicators & Read Receipts
- ✅ File/Image Attachments
- ✅ Offline Message Collection
- ✅ Customer Satisfaction Rating

---

## 🏗️ ARCHITEKTUR

```
┌─────────────────────────────────────────────────────────────┐
│                    CUSTOMER FRONTEND                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Chat Widget (Floating Button)                       │   │
│  │  - Minimized/Maximized State                         │   │
│  │  - Message Input + Quick Actions                     │   │
│  │  - Order Tracking, FAQ, Live Chat                    │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ChatbotController (AI Intent Recognition)          │   │
│  │  ChatController (Live Chat Sessions)                 │   │
│  │  FaqController (Knowledge Base)                      │   │
│  │  OrderTrackingController (Order Status)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ChatbotService (Intent Matching + Actions)         │   │
│  │  ChatService (Session + Message Management)          │   │
│  │  FaqService (Search, Categories, Items)              │   │
│  │  NotificationService (WebSocket Events)              │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                           │
│  - chat_sessions (Conversation History)                     │
│  - chat_messages (All Messages)                             │
│  - faq_categories + faq_items (Knowledge Base)              │
│  - chatbot_intents (AI Training Data)                       │
│  - canned_responses (Quick Replies)                         │
│  - chat_analytics (Metrics)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ BEREITS IMPLEMENTIERT

### 1. Database Schema (schema.sql)
- ✅ `chat_sessions` - Conversation tracking
- ✅ `chat_messages` - Message history
- ✅ `faq_categories` - FAQ kategorien
- ✅ `faq_items` - FAQ fragen & antworten
- ✅ `canned_responses` - Quick replies für agents
- ✅ `chatbot_intents` - AI training data
- ✅ `chat_analytics` - Metrics & reporting
- ✅ Default FAQ data seeding
- ✅ Default chatbot intents

### 2. Backend Entities
- ✅ `ChatSession.java`
- ✅ `ChatMessage.java`
- ✅ `FaqCategory.java`
- ✅ `FaqItem.java`
- ✅ `CannedResponse.java`
- ✅ `ChatbotIntent.java`

### 3. Enums
- ✅ `ChatSessionStatus` (ACTIVE, CLOSED, TRANSFERRED)
- ✅ `ChatChannel` (CHATBOT, LIVE_CHAT, EMAIL)
- ✅ `ChatSenderType` (CUSTOMER, AGENT, BOT)
- ✅ `ChatMessageType` (TEXT, IMAGE, FILE, ORDER_LINK, PRODUCT_LINK, SYSTEM)

### 4. Repositories
- ✅ `ChatSessionRepository`
- ✅ `ChatMessageRepository`
- ✅ `FaqCategoryRepository`
- ✅ `FaqItemRepository`
- ✅ `CannedResponseRepository`
- ✅ `ChatbotIntentRepository`

### 5. DTOs
- ✅ `ChatSessionDTO`
- ✅ `ChatMessageDTO`
- ✅ `SendMessageRequest`
- ✅ `FaqCategoryDTO`
- ✅ `FaqItemDTO`
- ✅ `ChatbotRequest`
- ✅ `ChatbotResponse`

---

## 🔄 NOCH ZU IMPLEMENTIEREN

### 1. Backend Services

#### ChatbotService.java
```java
@Service
public class ChatbotService {
    
    // Intent Recognition (Simple Keyword Matching oder ML-Integration)
    public ChatbotResponse processMessage(ChatbotRequest request);
    
    // Action Handlers
    private void handleOrderStatusRequest(String orderNumber);
    private void handleFaqRequest(String keyword);
    private void handleTransferToAgent();
    
    // Intent Matching
    private ChatbotIntent matchIntent(String message, List<ChatbotIntent> intents);
}
```

**Funktionen:**
- Intent-Erkennung (Keywords + Confidence Score)
- Order-Tracking Integration
- FAQ-Suche Integration
- Agent-Weiterleitung

#### ChatService.java
```java
@Service
public class ChatService {
    
    // Session Management
    public ChatSessionDTO createSession(Long storeId, String customerName, String customerEmail);
    public ChatSessionDTO getSession(String sessionToken);
    public void closeSession(String sessionToken);
    
    // Message Management
    public ChatMessageDTO sendMessage(SendMessageRequest request);
    public List<ChatMessageDTO> getMessages(String sessionToken);
    public void markAsRead(Long sessionId);
    
    // Agent Assignment
    public void assignAgent(Long sessionId, Long agentId);
    public List<ChatSessionDTO> getActiveSessionsForAgent(Long agentId);
}
```

#### FaqService.java
```java
@Service
public class FaqService {
    
    public List<FaqCategoryDTO> getCategories(Long storeId);
    public List<FaqItemDTO> getItemsByCategory(Long categoryId);
    public List<FaqItemDTO> searchFaq(Long storeId, String keyword);
    public void incrementViewCount(Long faqItemId);
    public void incrementHelpfulCount(Long faqItemId);
}
```

### 2. Backend Controllers

#### ChatbotController.java
```java
@RestController
@RequestMapping("/api/public/chatbot")
public class ChatbotController {
    
    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> sendMessage(@RequestBody ChatbotRequest request);
    
    @GetMapping("/session/{token}")
    public ResponseEntity<ChatSessionDTO> getSession(@PathVariable String token);
}
```

#### ChatController.java
```java
@RestController
@RequestMapping("/api/chat")
public class ChatController {
    
    // Agent Endpoints (requires auth)
    @GetMapping("/sessions/active")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<List<ChatSessionDTO>> getActiveSessions();
    
    @PostMapping("/sessions/{sessionId}/assign")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<?> assignAgent(@PathVariable Long sessionId, @RequestParam Long agentId);
    
    @PostMapping("/messages/send")
    @PreAuthorize("hasRole('STORE_OWNER')")
    public ResponseEntity<ChatMessageDTO> sendAgentMessage(@RequestBody SendMessageRequest request);
}
```

#### FaqController.java
```java
@RestController
@RequestMapping("/api/public/faq")
public class FaqController {
    
    @GetMapping("/stores/{storeId}/categories")
    public ResponseEntity<List<FaqCategoryDTO>> getCategories(@PathVariable Long storeId);
    
    @GetMapping("/stores/{storeId}/search")
    public ResponseEntity<List<FaqItemDTO>> search(@PathVariable Long storeId, @RequestParam String q);
    
    @PostMapping("/items/{itemId}/helpful")
    public ResponseEntity<?> markAsHelpful(@PathVariable Long itemId);
}
```

### 3. WebSocket Support (Real-Time Chat)

#### WebSocketConfig.java
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/chat").setAllowedOrigins("*").withSockJS();
    }
}
```

#### ChatWebSocketController.java
```java
@Controller
public class ChatWebSocketController {
    
    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessageDTO sendMessage(@Payload ChatMessageDTO message) {
        return message;
    }
    
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessageDTO addUser(@Payload ChatMessageDTO message, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", message.getSenderName());
        return message;
    }
}
```

---

## 🌐 FRONTEND COMPONENTS

### 1. Chat Widget Component (Angular)

#### chat-widget.component.ts
```typescript
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  template: `
    <div class="chat-widget" [class.minimized]="isMinimized" [class.maximized]="!isMinimized">
      <!-- Minimized View -->
      <button *ngIf="isMinimized" class="chat-trigger" (click)="toggleChat()">
        <span class="chat-icon">💬</span>
        <span class="unread-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
      </button>

      <!-- Maximized View -->
      <div *ngIf="!isMinimized" class="chat-window">
        <!-- Header -->
        <div class="chat-header">
          <h3>{{ 'chat.title' | translate }}</h3>
          <div class="chat-actions">
            <button (click)="toggleChat()">_</button>
            <button (click)="closeChat()">×</button>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" #messageContainer>
          <div *ngFor="let msg of messages" 
               [class.bot-message]="msg.senderType === 'BOT'"
               [class.customer-message]="msg.senderType === 'CUSTOMER'"
               [class.agent-message]="msg.senderType === 'AGENT'">
            <div class="message-avatar">{{ getAvatar(msg.senderType) }}</div>
            <div class="message-content">
              <div class="message-sender">{{ msg.senderName }}</div>
              <div class="message-text">{{ msg.content }}</div>
              <div class="message-time">{{ msg.createdAt | date:'short' }}</div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div *ngIf="isTyping" class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions" *ngIf="!sessionStarted">
          <button (click)="selectAction('order_status')">
            📦 {{ 'chat.trackOrder' | translate }}
          </button>
          <button (click)="selectAction('faq')">
            ❓ {{ 'chat.faq' | translate }}
          </button>
          <button (click)="selectAction('live_agent')">
            👤 {{ 'chat.liveAgent' | translate }}
          </button>
        </div>

        <!-- Input -->
        <div class="chat-input">
          <input 
            type="text" 
            [(ngModel)]="currentMessage"
            (keyup.enter)="sendMessage()"
            [placeholder]="'chat.typeMessage' | translate">
          <button (click)="sendMessage()" [disabled]="!currentMessage.trim()">
            ➤
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }

    .chat-trigger {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.3s;
      position: relative;
    }

    .chat-trigger:hover {
      transform: scale(1.1);
    }

    .chat-icon {
      font-size: 28px;
    }

    .unread-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ff3b30;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }

    .chat-window {
      width: 380px;
      height: 600px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .chat-actions button {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      margin-left: 8px;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f5f5f5;
    }

    .bot-message, .customer-message, .agent-message {
      display: flex;
      margin-bottom: 16px;
      animation: slideIn 0.3s;
    }

    .customer-message {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #667eea;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 8px;
      font-size: 18px;
    }

    .message-content {
      max-width: 70%;
      background: white;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .customer-message .message-content {
      background: #667eea;
      color: white;
    }

    .message-sender {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 4px;
      opacity: 0.8;
    }

    .message-text {
      margin-bottom: 4px;
    }

    .message-time {
      font-size: 11px;
      opacity: 0.6;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: bounce 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #e0e0e0;
      flex-wrap: wrap;
    }

    .quick-actions button {
      flex: 1;
      padding: 10px;
      border: 1px solid #667eea;
      background: white;
      color: #667eea;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    }

    .quick-actions button:hover {
      background: #667eea;
      color: white;
    }

    .chat-input {
      display: flex;
      padding: 12px;
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .chat-input input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      padding: 10px 16px;
      outline: none;
      font-size: 14px;
    }

    .chat-input button {
      margin-left: 8px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      font-size: 18px;
    }

    .chat-input button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .chat-window {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        bottom: 0;
        right: 0;
      }
    }
  `]
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @Input() storeId!: number;
  
  isMinimized = true;
  sessionStarted = false;
  sessionToken = '';
  messages: ChatMessageDTO[] = [];
  currentMessage = '';
  unreadCount = 0;
  isTyping = false;
  
  constructor(
    private chatService: ChatService,
    private translationService: TranslationService
  ) {}
  
  ngOnInit() {
    // Load session from localStorage if exists
    const savedToken = localStorage.getItem(`chat_session_${this.storeId}`);
    if (savedToken) {
      this.sessionToken = savedToken;
      this.loadMessages();
    }
  }
  
  toggleChat() {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized && !this.sessionStarted) {
      this.startSession();
    }
    if (!this.isMinimized) {
      this.markAsRead();
    }
  }
  
  closeChat() {
    this.isMinimized = true;
  }
  
  startSession() {
    this.chatService.createSession(this.storeId).subscribe({
      next: (session) => {
        this.sessionToken = session.sessionToken;
        this.sessionStarted = true;
        localStorage.setItem(`chat_session_${this.storeId}`, this.sessionToken);
        
        // Send welcome message
        this.addBotMessage('Hallo! 👋 Wie kann ich Ihnen heute helfen?');
      },
      error: (err) => console.error('Failed to start chat session', err)
    });
  }
  
  sendMessage() {
    if (!this.currentMessage.trim()) return;
    
    const message = this.currentMessage;
    this.currentMessage = '';
    
    // Add customer message immediately
    this.addCustomerMessage(message);
    
    // Send to bot
    this.isTyping = true;
    this.chatService.sendMessage({
      sessionToken: this.sessionToken,
      content: message,
      messageType: 'TEXT'
    }).subscribe({
      next: (response) => {
        this.isTyping = false;
        this.addBotMessage(response.response);
        
        // Handle special actions
        if (response.action === 'SHOW_FAQ') {
          // Show FAQ items
        } else if (response.action === 'CHECK_ORDER') {
          // Show order tracking
        } else if (response.action === 'TRANSFER_TO_AGENT') {
          this.addSystemMessage('Sie werden mit einem Mitarbeiter verbunden...');
        }
      },
      error: (err) => {
        this.isTyping = false;
        console.error('Failed to send message', err);
      }
    });
  }
  
  selectAction(action: string) {
    switch (action) {
      case 'order_status':
        this.addBotMessage('Gerne helfe ich Ihnen bei der Verfolgung Ihrer Bestellung. Bitte geben Sie Ihre Bestellnummer ein.');
        break;
      case 'faq':
        this.addBotMessage('Hier sind unsere häufigsten Fragen. Was interessiert Sie?');
        // Load FAQ categories
        break;
      case 'live_agent':
        this.addBotMessage('Ich verbinde Sie mit einem unserer Mitarbeiter. Einen Moment bitte...');
        // Transfer to agent
        break;
    }
  }
  
  private addCustomerMessage(content: string) {
    this.messages.push({
      id: Date.now(),
      sessionId: null,
      senderType: 'CUSTOMER',
      senderName: 'Sie',
      content,
      messageType: 'TEXT',
      isRead: false,
      createdAt: new Date()
    } as any);
    this.scrollToBottom();
  }
  
  private addBotMessage(content: string) {
    this.messages.push({
      id: Date.now(),
      sessionId: null,
      senderType: 'BOT',
      senderName: 'Bot',
      content,
      messageType: 'TEXT',
      isRead: false,
      createdAt: new Date()
    } as any);
    this.scrollToBottom();
  }
  
  private addSystemMessage(content: string) {
    this.messages.push({
      id: Date.now(),
      sessionId: null,
      senderType: 'BOT',
      senderName: 'System',
      content,
      messageType: 'SYSTEM',
      isRead: false,
      createdAt: new Date()
    } as any);
    this.scrollToBottom();
  }
  
  private loadMessages() {
    // Load chat history
  }
  
  private markAsRead() {
    this.unreadCount = 0;
  }
  
  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
  
  getAvatar(senderType: string): string {
    switch (senderType) {
      case 'BOT': return '🤖';
      case 'AGENT': return '👤';
      case 'CUSTOMER': return '😊';
      default: return '💬';
    }
  }
  
  ngOnDestroy() {
    // Cleanup
  }
}
```

### 2. Chat Service (Angular)

#### chat.service.ts
```typescript
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/public/chatbot`;
  
  constructor(private http: HttpClient) {}
  
  createSession(storeId: number): Observable<ChatSessionDTO> {
    return this.http.post<ChatSessionDTO>(`${this.apiUrl}/session`, {
      storeId,
      customerName: 'Gast',
      customerEmail: null,
      language: 'de'
    });
  }
  
  sendMessage(request: SendMessageRequest): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/message`, request);
  }
  
  getMessages(sessionToken: string): Observable<ChatMessageDTO[]> {
    return this.http.get<ChatMessageDTO[]>(`${this.apiUrl}/session/${sessionToken}/messages`);
  }
  
  searchFaq(storeId: number, query: string): Observable<FaqItemDTO[]> {
    return this.http.get<FaqItemDTO[]>(`${environment.apiUrl}/public/faq/stores/${storeId}/search`, {
      params: { q: query }
    });
  }
}
```

---

## 🤖 AI FEATURES

### Intent Recognition (Simple Version)

```java
public ChatbotIntent matchIntent(String userMessage, List<ChatbotIntent> intents) {
    String normalizedMessage = userMessage.toLowerCase().trim();
    
    for (ChatbotIntent intent : intents) {
        String[] phrases = parseTrainingPhrases(intent.getTrainingPhrases());
        
        for (String phrase : phrases) {
            if (normalizedMessage.contains(phrase.toLowerCase())) {
                return intent;
            }
        }
    }
    
    return null; // No match found
}
```

### Advanced AI Integration (Optional)

Für bessere Intent-Erkennung kann später integriert werden:
- OpenAI GPT-4 API
- Dialogflow (Google)
- Rasa NLU (Open Source)
- Custom ML Model (TensorFlow/PyTorch)

---

## 📊 ANALYTICS & METRICS

### Tracking:
- Total Sessions per Day
- Bot Resolved vs Agent Transferred
- Average Response Time
- Customer Satisfaction Score
- Most Asked Questions
- Peak Hours

### Dashboard für Store-Betreiber:
```typescript
@Component({
  selector: 'app-chat-analytics',
  template: `
    <div class="analytics-dashboard">
      <div class="metric-card">
        <h3>{{ totalSessions }}</h3>
        <p>Total Chats Today</p>
      </div>
      <div class="metric-card">
        <h3>{{ botResolvedPercent }}%</h3>
        <p>Bot Resolved</p>
      </div>
      <div class="metric-card">
        <h3>{{ avgResponseTime }}s</h3>
        <p>Avg Response Time</p>
      </div>
      <div class="metric-card">
        <h3>{{ satisfactionScore }}/5</h3>
        <p>Customer Satisfaction</p>
      </div>
    </div>
  `
})
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Backend:
- [ ] Compile all new Java files
- [ ] Run `mvn clean install`
- [ ] Update `application.properties` (WebSocket config)
- [ ] Deploy to VPS
- [ ] Run database migration

### Frontend:
- [ ] Add ChatWidgetComponent to Storefront
- [ ] Add Translation Keys (de.json, en.json, ar.json)
- [ ] Build Angular app
- [ ] Deploy to production

### Testing:
- [ ] Test chatbot responses
- [ ] Test order tracking integration
- [ ] Test FAQ search
- [ ] Test live agent transfer
- [ ] Test WebSocket real-time messages
- [ ] Test mobile responsiveness

---

## 📝 NÄCHSTE SCHRITTE

1. **ChatbotService implementieren** ✅ PRIORITY 1
2. **ChatService implementieren** ✅ PRIORITY 1
3. **FaqService implementieren** ✅ PRIORITY 2
4. **Controllers erstellen** ✅ PRIORITY 1
5. **WebSocket Setup** ✅ PRIORITY 2
6. **Frontend Chat Widget** ✅ PRIORITY 1
7. **Agent Dashboard** ✅ PRIORITY 3
8. **Analytics Dashboard** ✅ PRIORITY 3

---

## 💡 VERWENDUNG

### Kunde (Storefront):
1. Chat-Widget erscheint unten rechts
2. Klick auf Widget öffnet Chat
3. Optionen: Order Status, FAQ, Live Agent
4. Bot beantwortet automatisch
5. Bei Bedarf Weiterleitung an Mitarbeiter

### Store-Betreiber (Admin):
1. Dashboard zeigt aktive Chats
2. Zuweisen von Chats an Agents
3. Canned Responses für schnelle Antworten
4. FAQ verwalten (eigene + globale)
5. Analytics einsehen

---

**Status:** ✅ Konzept fertig | 🔄 Implementation startet jetzt

Soll ich mit der **Implementation der Services und Controller** fortfahren? (Y/N)


import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatbotService, ChatbotSession, ChatbotMessage } from '../../services/chatbot.service';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.scss']
})
export class ChatbotWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  session: ChatbotSession | null = null;
  currentMessage: string = '';
  storeId: number = 1; // Default store ID
  private subscription: Subscription = new Subscription();

  constructor(
    private chatbotService: ChatbotService
  ) {}

  ngOnInit(): void {
    // Try to get store ID from localStorage or use default
    const storedStoreId = localStorage.getItem('currentStoreId');
    if (storedStoreId) {
      this.storeId = parseInt(storedStoreId, 10);
    }

    // Subscribe to session changes
    this.subscription.add(
      this.chatbotService.session$.subscribe(session => {
        this.session = session;
        setTimeout(() => this.scrollToBottom(), 100);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleChat(): void {
    if (this.session?.isOpen) {
      this.chatbotService.closeChat();
    } else {
      this.chatbotService.openChat();
      if (!this.session || this.session.messages.length === 0) {
        // Send initial greeting
        this.sendInitialGreeting();
      }
    }
  }

  sendMessage(): void {
    if (!this.currentMessage.trim()) {
      return;
    }

    const message = this.currentMessage.trim();
    this.currentMessage = '';

    this.chatbotService.sendMessage(message, this.storeId, 'de').subscribe({
      next: () => {
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error sending message', error);
      }
    });
  }

  private sendInitialGreeting(): void {
    setTimeout(() => {
      this.chatbotService.sendMessage('Hallo', this.storeId, 'de').subscribe();
    }, 500);
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  clearChat(): void {
    if (confirm('Möchten Sie den Chat wirklich zurücksetzen?')) {
      this.chatbotService.clearSession();
    }
  }

  formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  handleQuickAction(action: string, data?: any): void {
    switch (action) {
      case 'CHECK_ORDER':
        // Handle order tracking
        this.currentMessage = 'Ich möchte meine Bestellung verfolgen';
        this.sendMessage();
        break;
      case 'SHOW_FAQ':
        // Handle FAQ display
        this.currentMessage = 'Häufige Fragen anzeigen';
        this.sendMessage();
        break;
      case 'TRANSFER_TO_AGENT':
        // Handle agent transfer
        alert('Ein Mitarbeiter wird sich in Kürze bei Ihnen melden.');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }
}


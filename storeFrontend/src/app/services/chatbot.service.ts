import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatbotMessage {
  id?: number;
  senderType: 'CUSTOMER' | 'BOT';
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
}

export interface ChatbotSession {
  sessionToken: string;
  messages: ChatbotMessage[];
  isOpen: boolean;
  isTyping: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/public/chatbot`;
  private sessionSubject = new BehaviorSubject<ChatbotSession | null>(null);
  public session$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  private loadSession(): void {
    const savedSession = localStorage.getItem('chatbot_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        this.sessionSubject.next(session);
      } catch (e) {
        console.error('Failed to load chatbot session', e);
      }
    }
  }

  private saveSession(session: ChatbotSession): void {
    localStorage.setItem('chatbot_session', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  openChat(): void {
    let session = this.sessionSubject.value;
    if (!session) {
      session = {
        sessionToken: '',
        messages: [],
        isOpen: true,
        isTyping: false
      };
    } else {
      session.isOpen = true;
    }
    this.saveSession(session);
  }

  closeChat(): void {
    const session = this.sessionSubject.value;
    if (session) {
      session.isOpen = false;
      this.saveSession(session);
    }
  }

  sendMessage(message: string, storeId: number, language: string = 'de'): Observable<any> {
    const session = this.sessionSubject.value;

    const request = {
      storeId,
      sessionToken: session?.sessionToken || null,
      message,
      language,
      customerName: this.getCustomerName(),
      customerEmail: this.getCustomerEmail()
    };

    // Add customer message immediately
    this.addMessage({
      senderType: 'CUSTOMER',
      content: message,
      timestamp: new Date()
    });

    // Set typing indicator
    this.setTyping(true);

    return new Observable(observer => {
      this.http.post<any>(`${this.apiUrl}/message`, request).subscribe({
        next: (response) => {
          // Update session token
          if (response.sessionToken) {
            const currentSession = this.sessionSubject.value;
            if (currentSession) {
              currentSession.sessionToken = response.sessionToken;
              this.saveSession(currentSession);
            }
          }

          // Add bot response
          setTimeout(() => {
            this.addMessage({
              senderType: 'BOT',
              content: response.response,
              timestamp: new Date(),
              action: response.action,
              data: response.data
            });
            this.setTyping(false);
            observer.next(response);
            observer.complete();
          }, 500); // Simulate typing delay
        },
        error: (error) => {
          this.setTyping(false);
          this.addMessage({
            senderType: 'BOT',
            content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
            timestamp: new Date()
          });
          observer.error(error);
        }
      });
    });
  }

  private addMessage(message: ChatbotMessage): void {
    const session = this.sessionSubject.value || {
      sessionToken: '',
      messages: [],
      isOpen: true,
      isTyping: false
    };

    session.messages.push(message);
    this.saveSession(session);
  }

  private setTyping(isTyping: boolean): void {
    const session = this.sessionSubject.value;
    if (session) {
      session.isTyping = isTyping;
      this.saveSession(session);
    }
  }

  clearSession(): void {
    localStorage.removeItem('chatbot_session');
    this.sessionSubject.next(null);
  }

  private getCustomerName(): string | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.name || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private getCustomerEmail(): string | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.email || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  getFaqCategories(storeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stores/${storeId}/faq/categories`);
  }

  searchFaq(storeId: number, query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stores/${storeId}/faq/search`, {
      params: { q: query }
    });
  }
}


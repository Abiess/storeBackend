import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatbotIntent {
  id?: number;
  storeId?: number;
  intentName: string;
  description: string;
  trainingPhrases: string[];
  responseTemplate: string;
  action: string;
  confidenceThreshold: number;
  isActive: boolean;
  createdAt?: Date;
}

export interface ChatbotStatistics {
  totalSessions: number;
  botResolved: number;
  agentTransferred: number;
  avgResponseTimeSeconds: number;
  customerSatisfactionScore: number;
  activeSessionsNow: number;
  todaySessions: number;
  resolutionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotManagementService {
  private apiUrl = `${environment.apiUrl}/stores`;

  constructor(private http: HttpClient) {}

  getIntents(storeId: number): Observable<ChatbotIntent[]> {
    return this.http.get<ChatbotIntent[]>(`${this.apiUrl}/${storeId}/chatbot/intents`);
  }

  getActiveIntents(storeId: number): Observable<ChatbotIntent[]> {
    return this.http.get<ChatbotIntent[]>(`${this.apiUrl}/${storeId}/chatbot/intents/active`);
  }

  getStatistics(storeId: number): Observable<ChatbotStatistics> {
    return this.http.get<ChatbotStatistics>(`${this.apiUrl}/${storeId}/chatbot/intents/statistics`);
  }

  createIntent(storeId: number, intent: Partial<ChatbotIntent>): Observable<ChatbotIntent> {
    return this.http.post<ChatbotIntent>(`${this.apiUrl}/${storeId}/chatbot/intents`, intent);
  }

  updateIntent(storeId: number, intentId: number, intent: Partial<ChatbotIntent>): Observable<ChatbotIntent> {
    return this.http.put<ChatbotIntent>(`${this.apiUrl}/${storeId}/chatbot/intents/${intentId}`, intent);
  }

  deleteIntent(storeId: number, intentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${storeId}/chatbot/intents/${intentId}`);
  }

  toggleIntent(storeId: number, intentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${storeId}/chatbot/intents/${intentId}/toggle`, {});
  }

  testIntent(storeId: number, intentId: number, message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${storeId}/chatbot/intents/${intentId}/test`, { message });
  }

  bulkImportIntents(storeId: number, intents: ChatbotIntent[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${storeId}/chatbot/intents/bulk-import`, intents);
  }
}


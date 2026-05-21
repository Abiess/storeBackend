import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface TelegramConfig {
  id?: number;
  storeId: number;
  botToken?: string;          // gemaskiert im GET
  channelId?: string;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  postNewProducts: boolean;
  lowStockThreshold: number;
  importLimit: number;
  active: boolean;
  connected?: boolean;        // nur im Response
}

export interface TelegramImportResult {
  imported: number;
  skipped: number;
  errors: number;
  importedTitles: string[];
  errorMessages: string[];
}

export interface TelegramImportLogEntry {
  id: number;
  channelId: string;
  telegramMsgId: number;
  productId?: number;
  status: 'SUCCESS' | 'SKIPPED' | 'ERROR';
  errorMessage?: string;
  importedAt: string;
}

export interface TelegramTestResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TelegramService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Telegram-Konfiguration laden (Token gemaskiert) */
  getConfig(storeId: number): Observable<TelegramConfig> {
    return this.http.get<TelegramConfig>(`${this.apiUrl}/stores/${storeId}/telegram/config`);
  }

  /** Telegram-Konfiguration speichern */
  saveConfig(storeId: number, config: TelegramConfig): Observable<TelegramConfig> {
    return this.http.put<TelegramConfig>(`${this.apiUrl}/stores/${storeId}/telegram/config`, config);
  }

  /** Testnachricht senden – prüft Bot + Channel Verbindung */
  testConnection(storeId: number): Observable<TelegramTestResult> {
    return this.http.post<TelegramTestResult>(`${this.apiUrl}/stores/${storeId}/telegram/test`, {});
  }

  /** Channel-Import auslösen (Polling der letzten Posts) */
  triggerImport(storeId: number): Observable<TelegramImportResult> {
    return this.http.post<TelegramImportResult>(`${this.apiUrl}/stores/${storeId}/telegram/import`, {});
  }

  /** Import-Historie laden */
  getImportLog(storeId: number): Observable<TelegramImportLogEntry[]> {
    return this.http.get<TelegramImportLogEntry[]>(`${this.apiUrl}/stores/${storeId}/telegram/import/log`);
  }
}


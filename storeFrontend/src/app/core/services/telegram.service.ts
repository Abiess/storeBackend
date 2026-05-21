import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

// ─── Bot Token (Benachrichtigungen senden) ───────────────────────────────────

export interface TelegramConfig {
  id?: number;
  storeId: number;
  botToken?: string;
  channelId?: string;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  postNewProducts: boolean;
  lowStockThreshold: number;
  importLimit: number;
  active: boolean;
  connected?: boolean;
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

// ─── MTProto (Channel lesen / importieren) ───────────────────────────────────

export interface MtprotoStatus {
  hasConfig: boolean;
  authenticated: boolean;
  sessionValid: boolean;
  phone: string;
  watchedChannels: string;   // JSON string "["@kanal"]"
  importLimit: number;
  active: boolean;
}

export interface ChannelInfo {
  id: number;
  title: string;
  username?: string;
  members_count?: number;
}

@Injectable({ providedIn: 'root' })
export class TelegramService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Bot Token API ────────────────────────────────────────────────────────

  getConfig(storeId: number): Observable<TelegramConfig> {
    return this.http.get<TelegramConfig>(`${this.apiUrl}/stores/${storeId}/telegram/config`);
  }

  saveConfig(storeId: number, config: TelegramConfig): Observable<TelegramConfig> {
    return this.http.put<TelegramConfig>(`${this.apiUrl}/stores/${storeId}/telegram/config`, config);
  }

  testConnection(storeId: number): Observable<TelegramTestResult> {
    return this.http.post<TelegramTestResult>(`${this.apiUrl}/stores/${storeId}/telegram/test`, {});
  }

  triggerImport(storeId: number): Observable<TelegramImportResult> {
    return this.http.post<TelegramImportResult>(`${this.apiUrl}/stores/${storeId}/telegram/import`, {});
  }

  getImportLog(storeId: number): Observable<TelegramImportLogEntry[]> {
    return this.http.get<TelegramImportLogEntry[]>(`${this.apiUrl}/stores/${storeId}/telegram/import/log`);
  }

  // ── MTProto API ──────────────────────────────────────────────────────────

  /** Schritt 1: Code ans Telefon senden */
  mtprotoRequestCode(storeId: number, apiId: number, apiHash: string, phone: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/auth/request-code`,
      { apiId, apiHash, phone });
  }

  /** Schritt 2: Code verifizieren → Session erstellen */
  mtprotoVerifyCode(storeId: number, code: string, password?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/auth/verify-code`,
      { code, password });
  }

  /** Session-Status prüfen */
  mtprotoStatus(storeId: number): Observable<MtprotoStatus> {
    return this.http.get<MtprotoStatus>(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/auth/status`);
  }

  /** Logout – Session invalidieren */
  mtprotoLogout(storeId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/auth/session`);
  }

  /** Abonnierte Channels auflisten */
  mtprotoListChannels(storeId: number): Observable<{ channels: ChannelInfo[] }> {
    return this.http.get<{ channels: ChannelInfo[] }>(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/channels`);
  }

  /** Zu importierende Channels aktualisieren */
  mtprotoUpdateWatchedChannels(storeId: number, channels: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/channels/watched`, { channels });
  }

  /** Einzelnen Channel importieren */
  mtprotoImportChannel(storeId: number, channel: string): Observable<TelegramImportResult> {
    return this.http.post<TelegramImportResult>(
      `${this.apiUrl}/stores/${storeId}/telegram/mtproto/import`, { channel });
  }

  /** Alle überwachten Channels importieren */
  mtprotoImportAll(storeId: number): Observable<Record<string, TelegramImportResult>> {
    return this.http.post<Record<string, TelegramImportResult>>(
      `${this.apiUrl}/stores/${storeId}/telegram/mtproto/import/all`, {});
  }

  /** Konfiguration laden */
  mtprotoGetConfig(storeId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/config`);
  }

  /** Import-Einstellungen speichern */
  mtprotoUpdateConfig(storeId: number, data: { importLimit?: number; active?: boolean }): Observable<any> {
    return this.http.put(`${this.apiUrl}/stores/${storeId}/telegram/mtproto/config`, data);
  }
}



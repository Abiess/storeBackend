import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { StorageAdapter } from './storage-adapter';

/**
 * Secure-Storage-Implementierung für Capacitor (Mobile-Factory M3a).
 *
 * Plattformen: CAPACITOR_ANDROID (heute) / CAPACITOR_IOS (später, siehe
 * ARCHITECTURE_APP_FACTORY.md §M3a "offene Punkte für iOS").
 *
 * Plugin: `@aparajita/capacitor-secure-storage`
 *  - Android: Werte werden über Android Keystore-gesicherte
 *    EncryptedSharedPreferences abgelegt.
 *  - iOS: Werte werden im System-Keychain abgelegt.
 *  - Keine Cloud-/Account-Abhängigkeit (kein iCloud-Sync, keine
 *    Google-Account-Bindung) – rein lokal, gerätegebunden.
 *  - Aktiv gepflegt, Capacitor-8-kompatibel (peerDependency @capacitor/core ^8).
 *
 * WICHTIG: Alle Methoden sind nativ async (Plugin-Bridge zu Keystore/
 * Keychain). Es gibt HIER bewusst KEINEN Sync-Wrapper – die Sync-Anforderung
 * von `AuthService.getToken()` wird stattdessen über einen In-Memory-Cache in
 * `AuthService` gelöst (siehe dort `initialize()` / `tokenCache`).
 */
@Injectable({ providedIn: 'root' })
export class CapacitorSecureStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStorage.getItem(key);
    } catch (e) {
      console.error(`🔐 SecureStorage.get('${key}') fehlgeschlagen:`, e);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStorage.setItem(key, value);
    } catch (e) {
      console.error(`🔐 SecureStorage.set('${key}') fehlgeschlagen:`, e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await SecureStorage.removeItem(key);
    } catch (e) {
      console.error(`🔐 SecureStorage.remove('${key}') fehlgeschlagen:`, e);
    }
  }
}

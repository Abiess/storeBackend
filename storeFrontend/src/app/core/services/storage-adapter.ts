import { Injectable } from '@angular/core';

/**
 * Generische Storage-Abstraktion für die App Factory (Mobile-Pilot M1).
 *
 * Ziel: `AuthService` (und später ggf. weitere Kernservices) sollen NICHT
 * mehr direkt `localStorage` verwenden, sondern gegen diese Schnittstelle
 * programmieren. Web nutzt weiterhin `localStorage` 1:1 (kein
 * Verhaltensunterschied). Für Capacitor (iOS/Android) kann später eine
 * `CapacitorSecureStorageAdapter` (Keychain/Keystore) bereitgestellt werden,
 * OHNE `AuthService` selbst zu ändern:
 *
 * AuthService
 *    ↓
 * StorageAdapter (abstract)
 *    ├── WebLocalStorageAdapter   (heute, Default via DI)
 *    └── CapacitorSecureStorageAdapter (später, nur Provider-Austausch)
 *
 * WICHTIG: Dies ist bewusst KEINE neue Parallel-Architektur – es gibt
 * weiterhin nur einen `AuthService`. Nur die Low-Level-Persistenz ist
 * austauschbar.
 */
export abstract class StorageAdapter {
  abstract get(key: string): string | null;
  abstract set(key: string, value: string): void;
  abstract remove(key: string): void;
}

/**
 * Default-Implementierung (Web/PWA): unverändertes `localStorage`-Verhalten.
 * Wird in `app.config.ts` als Default-Provider für `StorageAdapter`
 * registriert. Ein späterer Capacitor-Adapter ersetzt NUR diesen Provider.
 */
@Injectable({ providedIn: 'root' })
export class WebLocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}

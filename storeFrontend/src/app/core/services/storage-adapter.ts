import { Injectable } from '@angular/core';

/**
 * Generische Storage-Abstraktion für die App Factory (Mobile-Pilot M1 → M3a).
 *
 * Ziel: `AuthService` (und später ggf. weitere Kernservices) sollen NICHT
 * mehr direkt `localStorage` verwenden, sondern gegen diese Schnittstelle
 * programmieren.
 *
 * AuthService
 *    ↓
 * StorageAdapter (abstract, ASYNC – siehe M3a-Begründung unten)
 *    ├── WebLocalStorageAdapter          (WEB/PWA, Default via DI)
 *    └── CapacitorSecureStorageAdapter   (CAPACITOR_ANDROID, später CAPACITOR_IOS)
 *
 * WICHTIG: Dies ist bewusst KEINE neue Parallel-Architektur – es gibt
 * weiterhin nur einen `AuthService`. Nur die Low-Level-Persistenz ist
 * austauschbar (Provider-Switch in `app.config.ts` je nach `PlatformService`).
 *
 * WARUM ASYNC (M3a)?
 * Natives Secure Storage (Android Keystore / iOS Keychain, siehe
 * `CapacitorSecureStorageAdapter`) ist grundsätzlich async (Plugin-Bridge).
 * Ein synchroner Adapter würde entweder (a) einen Fake-Sync-Wrapper über
 * einen Promise benötigen (Datenverlust-Risiko, race conditions) oder (b)
 * einen Promise-Caching-Hack erzwingen. Beides ist explizit NICHT gewollt.
 * Stattdessen ist `StorageAdapter` durchgehend Promise-basiert – auch für
 * Web (dort ist `localStorage` synchron, wird aber nur in eine bereits
 * aufgelöste Promise gewrappt; das Verhalten bleibt 1:1 identisch).
 *
 * Die eigentliche Sync-Anforderung von `AuthService.getToken()` /
 * `isAuthenticated()` (Guards, Interceptor, viele Fach-Services rufen das
 * synchron auf) wird NICHT über diesen Adapter gelöst, sondern über einen
 * In-Memory-Cache in `AuthService` selbst, der einmal beim App-Start
 * (`AuthService.initialize()`, siehe APP_INITIALIZER in `app.config.ts`)
 * asynchron aus dem `StorageAdapter` geladen wird. Siehe
 * ARCHITECTURE_APP_FACTORY.md §M3a für die volle Begründung.
 */
export abstract class StorageAdapter {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract remove(key: string): Promise<void>;
}

/**
 * Default-Implementierung (Web/PWA): unverändertes `localStorage`-Verhalten,
 * nur in Promises gewrappt (kein Verhaltensunterschied, da `localStorage`
 * ohnehin synchron ist – die Promise löst im selben Tick auf).
 * Wird in `app.config.ts` als Default-Provider für `StorageAdapter`
 * registriert (WEB/PWA). Der Capacitor-Adapter ersetzt NUR diesen Provider,
 * ausschließlich im nativen Kontext (`PlatformService.isNative`).
 */
@Injectable({ providedIn: 'root' })
export class WebLocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

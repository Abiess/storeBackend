import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AppEntitlement, AppKey } from '../models';

/**
 * Generische Repräsentation eines "Contexts" innerhalb einer App. `contextId`
 * ist bewusst ein String und NICHT `storeId` genannt: für DHL ist das heute
 * technisch weiterhin die Store-ID, künftige Apps können hier ohne
 * Breaking-Change eine `tenantId`/`locationId`/`workspaceId` durchreichen.
 */
export interface AppContext {
  app: AppKey;
  contextId: string | null;
  enabled: boolean;
}

/**
 * Zentrale, generische Quelle für "welche Apps + welche Contexts (Stores/...)
 * darf der aktuelle User grundsätzlich sehen" – ausschließlich abgeleitet aus
 * den bereits vorhandenen `AppEntitlement`s in `AuthService.getCurrentUser()`.
 *
 * Dieser Service trifft KEINE Sicherheitsentscheidung (das bleibt Backend +
 * `AppAccessService.isUrlAllowed`) – er bereitet nur Daten für UI auf
 * (App-Launcher, App-Switcher, Context-Auswahl) und wird von
 * `AppAccessService` mitgenutzt, um doppelte Entitlement-Auswertung zu
 * vermeiden.
 */
@Injectable({ providedIn: 'root' })
export class AppContextService {
  private authService = inject(AuthService);

  private getEntitlements(): AppEntitlement[] {
    return this.authService.getCurrentUser()?.apps ?? [];
  }

  /** Alle Apps, für die mind. ein aktives (enabled) Entitlement existiert. */
  getAvailableApps(): AppKey[] {
    const seen = new Set<AppKey>();
    for (const e of this.getEntitlements()) {
      if (e.enabled) {
        seen.add(e.app);
      }
    }
    return Array.from(seen);
  }

  /** Alle Contexts (z.B. Stores) einer App, generisch als `AppContext[]`. */
  getContexts(app: AppKey): AppContext[] {
    return this.getEntitlements()
      .filter(e => e.enabled && e.app === app)
      .map(e => ({
        app: e.app,
        contextId: e.storeId != null ? String(e.storeId) : null,
        enabled: e.enabled
      }));
  }

  hasMultipleApps(): boolean {
    return this.getAvailableApps().length > 1;
  }
}

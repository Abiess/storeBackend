import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppContextService } from '@app/core/services/app-context.service';
import { AppAccessService } from '@app/core/services/app-access.service';
import { APP_REGISTRY, APP_REGISTRY_ORDER, AppRegistryEntry } from '@app/core/config/app-registry';
import { AppKey } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Generischer "Meine Apps"-Launcher (`/apps`). Zeigt EINE Karte pro
 * verfügbarer App (nicht pro Context/Store) – App-Auswahl und
 * Context-/Standort-Auswahl bleiben bewusst getrennt (Context-Auswahl siehe
 * `AppContextSelectorComponent`).
 *
 * Rein präsentational: Quelle der erlaubten Apps ist ausschließlich
 * `AppContextService` (⇒ `AuthService`-Entitlements). `APP_REGISTRY` liefert
 * nur Darstellungs-/Routing-Metadaten (Titel, Icon, Ziel-Route), KEINE
 * Berechtigungslogik.
 *
 * Neue Apps benötigen KEINE eigene Launcher-Karten-Komponente – ein
 * zusätzlicher `APP_REGISTRY`-Eintrag + Entitlements genügen.
 */
@Component({
  selector: 'app-launcher',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-launcher.component.html',
  styleUrls: ['./app-launcher.component.scss']
})
export class AppLauncherComponent {
  private appContextService = inject(AppContextService);
  private appAccessService = inject(AppAccessService);
  private router = inject(Router);

  readonly apps: AppRegistryEntry[] = this.resolveAvailableEntries();

  private resolveAvailableEntries(): AppRegistryEntry[] {
    const available = new Set<AppKey>(this.appContextService.getAvailableApps());
    return APP_REGISTRY_ORDER.filter(key => available.has(key)).map(key => APP_REGISTRY[key]);
  }

  open(entry: AppRegistryEntry): void {
    this.router.navigateByUrl(this.appAccessService.resolveAppEntryUrl(entry.key));
  }
}

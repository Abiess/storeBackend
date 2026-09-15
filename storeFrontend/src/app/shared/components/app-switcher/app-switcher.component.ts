import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppContextService } from '@app/core/services/app-context.service';
import { AppAccessService } from '@app/core/services/app-access.service';
import { APP_REGISTRY, APP_REGISTRY_ORDER, AppRegistryEntry } from '@app/core/config/app-registry';
import { AppKey } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Dezenter "Apps wechseln"-Einstieg für innerhalb einer App (Desktop:
 * Dropdown neben der App-Navigation, siehe `AppNavigationComponent`).
 *
 * Wird NUR angezeigt, wenn der aktuelle User mehr als eine App besitzt
 * (`AppContextService.hasMultipleApps()`) – bei genau einer App bleibt die
 * Navigation unverändert ohne unnötigen Switcher.
 *
 * Bewusst KEIN eigener `AppShellComponent`: dieser Switcher wird als
 * kleiner, wiederverwendbarer Baustein in die bestehende
 * `AppNavigationComponent` eingehängt, statt eine neue Shell-Struktur mit
 * Parent-/Child-Routing einzuführen (Risiko-Minimierung, siehe
 * ARCHITECTURE_APP_FACTORY.md Abschnitt 7a/7b).
 */
@Component({
  selector: 'app-switcher',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-switcher.component.html',
  styleUrls: ['./app-switcher.component.scss']
})
export class AppSwitcherComponent {
  private appContextService = inject(AppContextService);
  private appAccessService = inject(AppAccessService);
  private router = inject(Router);

  readonly open = signal(false);

  get visible(): boolean {
    return this.appContextService.hasMultipleApps();
  }

  get apps(): AppRegistryEntry[] {
    const available = new Set<AppKey>(this.appContextService.getAvailableApps());
    return APP_REGISTRY_ORDER.filter(key => available.has(key)).map(key => APP_REGISTRY[key]);
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  select(entry: AppRegistryEntry): void {
    this.open.set(false);
    this.router.navigateByUrl(this.appAccessService.resolveAppEntryUrl(entry.key));
  }
}

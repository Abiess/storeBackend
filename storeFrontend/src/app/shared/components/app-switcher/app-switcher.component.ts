import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkMenuModule } from '@angular/cdk/menu';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AppContextService } from '@app/core/services/app-context.service';
import { AppAccessService } from '@app/core/services/app-access.service';
import { APP_REGISTRY, APP_REGISTRY_ORDER, AppRegistryEntry } from '@app/core/config/app-registry';
import { AppKey } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { AppSwitcherSheetComponent } from './app-switcher-sheet.component';

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
 *
 * UI-Hardening (siehe ARCHITECTURE_APP_FACTORY.md, Abschnitt "UI Hardening
 * Pass"): Desktop-Dropdown nutzt `@angular/cdk/menu` (`cdkMenuTriggerFor` /
 * `cdkMenu` / `cdkMenuItem`) statt eines selbstgebauten Overlays – liefert
 * Fokus-Handling, Escape, Outside-Click, Keyboard-Navigation und
 * `aria-haspopup`/`aria-expanded` automatisch, OHNE eigenes Markup/CSS zu
 * verändern (CDK Menu ist unstyled, reine Mechanik). Auf sehr kleinen
 * Viewports (Handset) wird stattdessen ein `MatBottomSheet` verwendet
 * (bessere Touch-Ergonomie als ein Dropdown), da hier ein echter
 * Mehrwert entsteht (siehe `AppSwitcherSheetComponent`). Für
 * `AppContextSelectorComponent` wurde bewusst KEIN BottomSheet eingeführt,
 * da es dort um eine vollwertige, geroutete Seite geht, kein transientes
 * Menü (siehe Doku).
 *
 * KEINE Änderung an der Factory-Fachlogik: `visible`/`apps`/`select()`
 * bleiben unverändert (weiterhin ausschließlich `AppContextService` /
 * `AppAccessService` / `APP_REGISTRY`).
 */
@Component({
  selector: 'app-switcher',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CdkMenuModule],
  templateUrl: './app-switcher.component.html',
  styleUrls: ['./app-switcher.component.scss']
})
export class AppSwitcherComponent {
  private appContextService = inject(AppContextService);
  private appAccessService = inject(AppAccessService);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private breakpointObserver = inject(BreakpointObserver);

  /** Handset-Breakpoint bewusst identisch zum bisherigen `@media (max-width: 600px)` in den Component-Styles. */
  private static readonly HANDSET_QUERY = '(max-width: 600px)';

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(AppSwitcherComponent.HANDSET_QUERY).pipe(map(state => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(AppSwitcherComponent.HANDSET_QUERY) }
  );

  get visible(): boolean {
    return this.appContextService.hasMultipleApps();
  }

  get apps(): AppRegistryEntry[] {
    const available = new Set<AppKey>(this.appContextService.getAvailableApps());
    return APP_REGISTRY_ORDER.filter(key => available.has(key)).map(key => APP_REGISTRY[key]);
  }

  /**
   * Wird auf Handset-Viewports statt `cdkMenuTriggerFor` verwendet (siehe
   * Template: `[cdkMenuTriggerFor]="isHandset() ? null : switcherMenu"` –
   * bei `null` bleibt der CDK-Trigger inaktiv, sodass hier kein
   * Doppel-Öffnen möglich ist).
   */
  onToggleClick(): void {
    if (!this.isHandset()) {
      return;
    }
    const ref = this.bottomSheet.open<AppSwitcherSheetComponent, { apps: AppRegistryEntry[] }, AppRegistryEntry>(
      AppSwitcherSheetComponent,
      { data: { apps: this.apps }, panelClass: 'app-switcher-sheet-panel' }
    );
    ref.afterDismissed().subscribe(entry => {
      if (entry) {
        this.select(entry);
      }
    });
  }

  select(entry: AppRegistryEntry): void {
    this.router.navigateByUrl(this.appAccessService.resolveAppEntryUrl(entry.key));
  }
}

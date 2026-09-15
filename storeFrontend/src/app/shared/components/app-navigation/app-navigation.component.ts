import { Component, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { resolveAppBasePath, AppRouteConfig } from '@app/core/utils/app-route.util';
import { AppSwitcherComponent } from '@app/shared/components/app-switcher/app-switcher.component';

/**
 * Ein Eintrag der App-Navigation. Bewusst minimal & framework-neutral
 * gehalten (nur Icon/Label/relatives Routen-Segment), damit dieselbe
 * Struktur später 1:1 als Bottom-Navigation oder Drawer einer Capacitor-App
 * (iOS/Android) wiederverwendet werden kann, ohne die Navigationslogik neu
 * zu bauen.
 */
export interface AppNavItem {
  key: string;
  labelKey: string;
  icon: string;
  /** Routen-Segment relativ zum App-Basis-Pfad, OHNE führenden Slash, z.B. '' | 'store' | 'pickup' | 'plan' | 'account' */
  route: string;
}

/**
 * Konfiguration einer App-Navigation. Entspricht bewusst nah dem
 * Zielbild `{ app, routeSegment, legacySegment, navigation }` – eine neue
 * App (MARITIME, LOYALTY, ISSUE_ANALYSIS, ...) benötigt i.d.R. NUR ein
 * solches Konfigurationsobjekt, keine neue Navigations-Komponente.
 */
export interface AppNavConfig extends AppRouteConfig {
  items: AppNavItem[];
}

/**
 * Generische, konsistente App-Navigation für alle Seiten einer "App"
 * innerhalb der Plattform (aktuell: DHL; künftig z.B. MARITIME, LOYALTY,
 * ISSUE_ANALYSIS). Erkennt selbst, ob sie gerade unter der app-zentrischen
 * Route `/apps/{appSegment}/:contextId` oder einem optionalen Legacy-Alias
 * `/stores/:contextId/{legacySegment}` gerendert wird, und verlinkt
 * konsequent innerhalb derselben Routen-Familie (siehe `resolveAppBasePath`).
 *
 * Rein präsentational + konfigurationsgetrieben: kennt keine App-fachlichen
 * Details (kein `storeId`, kein DHL-Wissen) – nur die generische
 * `AppNavConfig`.
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, AppSwitcherComponent],
  templateUrl: './app-navigation.component.html',
  styleUrls: ['./app-navigation.component.scss']
})
export class AppNavigationComponent {
  private router = inject(Router);

  readonly config = input.required<AppNavConfig>();

  private readonly currentUrl = signal(this.router.url);
  readonly currentPath = computed(() => this.extractPath(this.currentUrl()));
  readonly basePath = computed(() => resolveAppBasePath(this.currentUrl(), this.config()));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
  }

  targetFor(item: AppNavItem): string {
    const base = this.basePath();
    return item.route ? `${base}/${item.route}` : base;
  }

  isActive(item: AppNavItem): boolean {
    const target = this.targetFor(item);
    return item.route === '' ? this.currentPath() === target : this.currentPath().startsWith(target);
  }

  private extractPath(url: string): string {
    return (url || '').split('?')[0].split('#')[0];
  }
}

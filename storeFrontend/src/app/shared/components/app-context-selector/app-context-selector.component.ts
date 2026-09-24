import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppContextService, AppContext } from '@app/core/services/app-context.service';
import { AppAccessService } from '@app/core/services/app-access.service';
import { APP_REGISTRY, AppRegistryEntry } from '@app/core/config/app-registry';
import { AppKey } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Generische Context-/Standort-Auswahl für STORE-scoped Apps mit mehreren
 * erlaubten Contexts (z.B. DHL mit Store 121 + Store 135).
 *
 * Welche App gerade ausgewählt wird, kommt NICHT aus einer fest verdrahteten
 * Store-Auswahl-Komponente, sondern generisch aus den Routen-`data.app`
 * (siehe `app.routes.ts`, z.B. `apps/dhl` → `{ data: { app: AppKey.DHL } }`).
 * `contextId` ist bewusst generisch (aktuell technisch = storeId), damit
 * künftige Apps hier ohne neue Komponente eine andere Context-Art
 * (tenantId/locationId/workspaceId) durchreichen können.
 *
 * App-Auswahl (`AppLauncherComponent`) und Context-Auswahl (diese
 * Komponente) bleiben bewusst getrennte Schritte.
 */
@Component({
  selector: 'app-context-selector',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-context-selector.component.html',
  styleUrls: ['./app-context-selector.component.scss']
})
export class AppContextSelectorComponent {
  private route = inject(ActivatedRoute);
  private appContextService = inject(AppContextService);
  private appAccessService = inject(AppAccessService);
  private router = inject(Router);

  private readonly app: AppKey = this.route.snapshot.data['app'];
  readonly registryEntry: AppRegistryEntry = APP_REGISTRY[this.app];
  readonly contexts: AppContext[] = this.appContextService.getContexts(this.app);

  select(context: AppContext): void {
    const storeId = context.contextId != null ? Number(context.contextId) : null;
    this.router.navigateByUrl(this.appAccessService.buildAppHomeUrl(this.app, storeId));
  }
}

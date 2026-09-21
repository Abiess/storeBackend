import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from '@app/shared/components/app-navigation/app-navigation.component';
import { AppAccountComponent } from '@app/shared/components/app-account/app-account.component';
import { DOCUMENTS_NAV_CONFIG } from './documents-nav.config';

/**
 * Account-Seite der DOCUMENTS-App. KEINE eigene `DocumentsAccountComponent`-
 * Logik, sondern reine Verdrahtung bereits vorhandener Shared-Bausteine
 * (`AppNavigationComponent` + `AppAccountComponent`), analog zu
 * `MaritimeAccountComponent`/`DhlAccountComponent`.
 */
@Component({
  selector: 'app-documents-account',
  standalone: true,
  imports: [CommonModule, AppNavigationComponent, AppAccountComponent],
  template: `
    <div class="documents-account-container">
      <app-navigation [config]="navConfig"></app-navigation>
      <app-account></app-account>
    </div>
  `,
  styles: [`
    .documents-account-container {
      padding: 1.5rem;
    }
  `]
})
export class DocumentsAccountComponent {
  readonly navConfig = DOCUMENTS_NAV_CONFIG;
}

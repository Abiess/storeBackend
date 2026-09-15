import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from '@app/shared/components/app-navigation/app-navigation.component';
import { AppAccountComponent } from '@app/shared/components/app-account/app-account.component';
import { MARITIME_NAV_CONFIG } from './maritime-nav.config';

/**
 * Account-Seite der MARITIME-App. Faktortest für den generischen App-Shell-
 * Baustein: KEINE eigene `MaritimeAccountComponent`-Logik, sondern reine
 * Verdrahtung aus bereits vorhandenen Shared-Bausteinen
 * (`AppNavigationComponent` + `AppAccountComponent`), analog zu
 * `DhlAccountComponent`. Nutzt bewusst die generischen `app.account.*`
 * i18n-Keys (keine eigenen `maritime.account.*`-Texte nötig).
 */
@Component({
  selector: 'app-maritime-account',
  standalone: true,
  imports: [CommonModule, AppNavigationComponent, AppAccountComponent],
  template: `
    <div class="maritime-account-container">
      <app-navigation [config]="navConfig"></app-navigation>
      <app-account></app-account>
    </div>
  `,
  styles: [`
    .maritime-account-container {
      padding: 1.5rem;
    }
  `]
})
export class MaritimeAccountComponent {
  readonly navConfig = MARITIME_NAV_CONFIG;
}

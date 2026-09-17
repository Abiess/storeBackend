import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from '@app/shared/components/app-navigation/app-navigation.component';
import { AppAccountComponent } from '@app/shared/components/app-account/app-account.component';
import { LOYALTY_NAV_CONFIG } from './loyalty-nav.config';

/**
 * Account-Seite der LOYALTY-App. Faktortest für den generischen
 * App-Shell-Baustein (analog `DhlAccountComponent`/`MaritimeAccountComponent`):
 * KEINE eigene `LoyaltyAccountComponent`-Auth-/Logout-Logik, sondern reine
 * Verdrahtung aus bereits vorhandenen Shared-Bausteinen
 * (`AppNavigationComponent` + `AppAccountComponent`). Nutzt bewusst die
 * generischen `app.account.*` i18n-Keys (keine eigenen
 * `loyalty.account.*`-Texte nötig).
 */
@Component({
  selector: 'app-loyalty-account',
  standalone: true,
  imports: [CommonModule, AppNavigationComponent, AppAccountComponent],
  template: `
    <div class="loyalty-account-container">
      <app-navigation [config]="navConfig"></app-navigation>
      <app-account></app-account>
    </div>
  `,
  styles: [`
    .loyalty-account-container {
      padding: 1.5rem;
    }
  `]
})
export class LoyaltyAccountComponent {
  readonly navConfig = LOYALTY_NAV_CONFIG;
}

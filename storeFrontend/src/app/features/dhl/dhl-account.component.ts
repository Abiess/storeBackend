import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from '@app/shared/components/app-navigation/app-navigation.component';
import { AppAccountComponent } from '@app/shared/components/app-account/app-account.component';
import { DHL_NAV_CONFIG } from './dhl-nav.config';

/**
 * Account-Seite der DHL-App. Enthält bewusst KEINE eigene Auth-/Logout-
 * Logik – diese lebt zentral in `AppAccountComponent` (liest den
 * bestehenden, plattformweiten `AuthService`). Diese Komponente ist nur
 * noch "Konfiguration + Verdrahtung": DHL-Navigation oben, generischer
 * Account-Bereich darunter (mit den bestehenden `dhl.account.*`-Texten,
 * damit sich für Nutzer nichts ändert).
 *
 * Bewusst KEINE Wiederverwendung der Shop-/Platform-Settings-Seite
 * (`/settings`, `/stores/:id/settings`) – diese gehören zur Shop-Admin-Shell
 * und dürfen DHL-only MANAGED-Usern nicht angezeigt werden.
 */
@Component({
  selector: 'app-dhl-account',
  standalone: true,
  imports: [CommonModule, AppNavigationComponent, AppAccountComponent],
  template: `
    <div class="dhl-account-container">
      <app-navigation [config]="navConfig"></app-navigation>
      <app-account
        titleKey="dhl.account.title"
        emailLabelKey="dhl.account.email"
        logoutLabelKey="dhl.account.logout"
      ></app-account>
    </div>
  `,
  styles: [`
    .dhl-account-container {
      padding: 1.5rem;
    }
  `]
})
export class DhlAccountComponent {
  readonly navConfig = DHL_NAV_CONFIG;
}


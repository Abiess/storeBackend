import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Generischer Account-/Profil-Bereich für App-Shells (DHL, MARITIME,
 * LOYALTY, ISSUE_ANALYSIS, ...). Liest Login-/Logout-Daten AUSSCHLIESSLICH
 * über den bestehenden, plattformweiten `AuthService` (keine eigene
 * Auth-/Permission-Logik, kein App-spezifischer Zustand).
 *
 * Bewusst NICHT die Shop-/Platform-Settings-Seite (`/settings`,
 * `/stores/:id/settings`) wiederverwendet – diese gehört zur Shop-Admin-
 * Shell und darf App-only MANAGED-Usern (z.B. reine DHL-User) nicht
 * angezeigt werden (siehe `AppComponent.adminPathPrefixes`).
 *
 * i18n-Label-Keys sind per @Input überschreibbar, damit jede App ihre
 * bestehenden Übersetzungen weiterverwenden kann (z.B. `dhl.account.*`),
 * ohne die Texte/Logik zu duplizieren. Ohne Override werden generische
 * `app.account.*`-Keys verwendet.
 */
@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-account.component.html',
  styleUrls: ['./app-account.component.scss']
})
export class AppAccountComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() titleKey = 'app.account.title';
  @Input() emailLabelKey = 'app.account.email';
  @Input() logoutLabelKey = 'app.account.logout';

  userEmail(): string | null {
    return this.authService.getCurrentUserEmail();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}

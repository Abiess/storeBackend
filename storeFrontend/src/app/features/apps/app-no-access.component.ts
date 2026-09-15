import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Sichere Fallback-Seite für MANAGED-User OHNE (mehr) aktive App-Entitlements
 * (0 verfügbare Apps, siehe `AppAccessService.getPrimaryAppHomeUrl`).
 *
 * Bewusst neutral gehalten (keine Shop-/Platform-Admin-Navigation, siehe
 * `AppComponent.adminPathPrefixes`) und ohne eigene Auth-/Permission-Logik –
 * nutzt nur den bestehenden `AuthService` für Logout.
 */
@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-no-access.component.html',
  styleUrls: ['./app-no-access.component.scss']
})
export class AppNoAccessComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}

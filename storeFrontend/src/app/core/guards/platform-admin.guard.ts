import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * App Provisioning Phase 1 (Platform Administration).
 *
 * Prüft, ob der aktuell eingeloggte User die BESTEHENDE Rolle
 * `ROLE_PLATFORM_ADMIN` besitzt (siehe Backend `storebackend.enums.Role`,
 * bereits verwendet u.a. für {@code DhlAdminController}/{@code CommissionController}).
 *
 * Bewusst KEINE neue Rolle/Auth-Struktur - `User.roles` liefert die Rollen
 * bereits heute als rohe Strings vom Backend (siehe `AuthResponse.UserDTO.roles`),
 * daher der direkte String-Vergleich statt des (nur teilweise gepflegten)
 * Frontend-`Role`-Enums in `core/models.ts`.
 */
const PLATFORM_ADMIN_ROLE = 'ROLE_PLATFORM_ADMIN';

export const platformAdminGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const user = authService.getCurrentUser();
  const roles = (user?.roles ?? []) as unknown as string[];
  if (roles.includes(PLATFORM_ADMIN_ROLE)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

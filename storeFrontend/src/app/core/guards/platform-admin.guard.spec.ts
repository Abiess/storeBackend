import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { platformAdminGuard } from './platform-admin.guard';
import { AuthService } from '../services/auth.service';
import { User, Role, AppAccessMode } from '../models';

/**
 * App Provisioning Phase 1 - stellt sicher, dass die neue Platform-Admin-Seite
 * NUR für Benutzer mit der bestehenden Rolle `ROLE_PLATFORM_ADMIN` erreichbar
 * ist (Frontend-Spiegel des Backend-`@PreAuthorize`).
 */
describe('platformAdminGuard', () => {
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let router: Router;

  const baseUser: User = {
    id: 1,
    email: 'user@example.com',
    roles: [] as unknown as Role[],
    createdAt: '',
    updatedAt: '',
    appAccessMode: AppAccessMode.LEGACY
  };

  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      platformAdminGuard({} as any, { url: '/admin/platform/app-provisioning' } as any)
    );
  }

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('denies access and redirects to /login when not authenticated', () => {
    authServiceMock.isAuthenticated.and.returnValue(false);

    const result = runGuard();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], jasmine.any(Object));
  });

  it('denies access and redirects to /dashboard when authenticated but lacking ROLE_PLATFORM_ADMIN', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock.getCurrentUser.and.returnValue({ ...baseUser, roles: ['USER'] as unknown as Role[] });

    const result = runGuard();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows access when the user has ROLE_PLATFORM_ADMIN', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    authServiceMock.getCurrentUser.and.returnValue({
      ...baseUser,
      roles: ['ROLE_PLATFORM_ADMIN'] as unknown as Role[]
    });

    const result = runGuard();

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

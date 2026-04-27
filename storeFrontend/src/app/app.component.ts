import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component';
import { AdminSidebarComponent } from './shared/components/admin-sidebar/admin-sidebar.component';
import { FabHostComponent } from './shared/components/fab-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ChatbotWidgetComponent, AdminSidebarComponent, FabHostComponent],
  template: `
    <ng-container *ngIf="showAdminShell; else publicShell">
      <div class="app-admin-shell">
        <app-admin-sidebar></app-admin-sidebar>
        <div class="app-admin-shell__content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </ng-container>

    <ng-template #publicShell>
      <router-outlet></router-outlet>
    </ng-template>

    <app-chatbot-widget></app-chatbot-widget>
    <app-fab-host></app-fab-host>
  `,
  styles: [`
    .app-admin-shell {
      display: flex;
      min-height: 100vh;
      background: var(--theme-background, #f6f6f7);
    }
    .app-admin-shell__content {
      flex: 1;
      min-width: 0;
      margin-left: var(--sidebar-width, 240px);
      transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @media (max-width: 1023px) {
      .app-admin-shell__content { margin-left: 0; }
    }
    [dir="rtl"] .app-admin-shell__content {
      margin-left: 0;
      margin-right: var(--sidebar-width, 240px);
    }
    @media (max-width: 1023px) {
      [dir="rtl"] .app-admin-shell__content { margin-right: 0; }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'markt.ma - Multi-Tenant E-Commerce Platform';
  showAdminShell = false;

  /**
   * URL-Pfade, bei denen die persistente Admin-Sidebar gerendert wird.
   * Storefront, Auth, Landing & Customer-Bereich bleiben unverändert.
   *
   * WICHTIG: `/dashboard` ist BEWUSST nicht enthalten – das Dashboard hat
   * eine eigene moderne Navbar und braucht keine zusätzliche Sidebar.
   * Sobald der User in einen konkreten Store navigiert (`/stores/123/...`),
   * erscheint die Sidebar wieder für die Store-Verwaltung.
   */
  private readonly adminPathPrefixes = [
    '/settings',
    '/subscription',
    '/role-management',
    '/stores/'
  ];

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // FIXED: Verbinde AuthService mit CartService für Warenkorb-Bereinigung beim Logout
    this.authService.setCartService(this.cartService);
    console.log('✅ AuthService und CartService verbunden');

    // Initial check + bei jedem NavigationEnd neu evaluieren
    this.evaluateShell(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.evaluateShell(e.urlAfterRedirects));
  }

  private evaluateShell(url: string): void {
    const path = (url || '').split('?')[0].split('#')[0];
    this.showAdminShell = this.adminPathPrefixes.some(
      p => path === p || path.startsWith(p)
    );
  }
}

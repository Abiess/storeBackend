import { Component, OnInit, signal, computed } from '@angular/core';
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

    <!-- ═══════════════════════════════════════════════════
         GLOBALER STORE-VORSCHAU-FAB
         Erscheint auf ALLEN /stores/ID-Seiten automatisch.
         ═══════════════════════════════════════════════════ -->
    <ng-container *ngIf="storePreviewFab()">
      <!-- Speed-Dial Backdrop -->
      <ng-container *ngIf="storePreviewOpen()">
        <div class="sp-backdrop" (click)="storePreviewOpen.set(false)"></div>
        <div class="sp-dial">
          <button class="sp-dial__item sp-dial__item--blue"
                  (click)="openStorefront('tab')">
            <span>🌐</span><span>Im neuen Tab öffnen</span>
          </button>
          <button class="sp-dial__item sp-dial__item--teal"
                  (click)="openStorefront('panel')">
            <span>📱</span><span>Mobile-Vorschau</span>
          </button>
          <button class="sp-dial__item sp-dial__item--purple"
                  (click)="openStorefront('copy')">
            <span>🔗</span><span>Link kopieren</span>
          </button>
        </div>
      </ng-container>

      <!-- Hauptbutton -->
      <button class="sp-fab"
              [class.sp-fab--open]="storePreviewOpen()"
              (click)="toggleStorePreview()"
              title="Store-Vorschau">
        <span class="sp-fab__icon">{{ storePreviewOpen() ? '✕' : '👁' }}</span>
        <span class="sp-fab__label">{{ storePreviewOpen() ? 'Schließen' : 'Vorschau' }}</span>
      </button>

      <!-- Mobile-Vorschau Panel -->
      <ng-container *ngIf="mobilePreviewOpen()">
        <div class="sp-backdrop" (click)="mobilePreviewOpen.set(false)"></div>
        <div class="sp-mobile-panel">
          <div class="sp-mobile-panel__header">
            <span>📱 Mobile-Vorschau</span>
            <div class="sp-mobile-panel__url">{{ currentStorefrontUrl() }}</div>
            <button (click)="mobilePreviewOpen.set(false)">✕</button>
          </div>
          <div class="sp-mobile-panel__frame-wrap">
            <div class="sp-mobile-phone">
              <iframe [src]="safeStorefrontUrl()"
                      class="sp-mobile-iframe"
                      title="Mobile Storefront Vorschau"
                      loading="lazy"
                      referrerpolicy="no-referrer">
              </iframe>
            </div>
          </div>
        </div>
      </ng-container>
    </ng-container>
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

    /* ═══════════════════════════════════════════════════
       GLOBALER STORE-VORSCHAU-FAB  (.sp-*)
       ═══════════════════════════════════════════════════ */

    /* Haupt-FAB */
    .sp-fab {
      position: fixed;
      bottom: 2rem;
      /* Rechts neben evtl. registrierten Feature-FABs (die sind auch bottom:2rem right:2rem)
         → wir setzen den Store-FAB links vom Feature-FAB */
      right: calc(2rem + 160px);
      z-index: 1201;
      display: flex;
      align-items: center;
      gap: .45rem;
      padding: .75rem 1.15rem;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: #fff;
      border: none;
      border-radius: 50px;
      font-size: .875rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(14,165,233,.45);
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
      white-space: nowrap;
    }
    .sp-fab:hover {
      transform: translateY(-3px) scale(1.04);
      box-shadow: 0 8px 24px rgba(14,165,233,.55);
    }
    .sp-fab--open {
      background: linear-gradient(135deg,#e53e3e,#c53030);
      box-shadow: 0 4px 18px rgba(229,62,62,.4);
    }
    .sp-fab__icon { font-size: 1.05rem; }
    .sp-fab__label { font-size: .78rem; }

    /* Speed-Dial */
    .sp-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1199;
      background: rgba(0,0,0,.25);
      backdrop-filter: blur(2px);
      animation: spFadeIn .2s ease;
    }
    .sp-dial {
      position: fixed;
      bottom: 5.2rem;
      right: calc(2rem + 80px);
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: .5rem;
      align-items: flex-end;
      animation: spSlideUp .25s cubic-bezier(.34,1.56,.64,1);
    }
    .sp-dial__item {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .5rem 1rem;
      border: none;
      border-radius: 50px;
      font-size: .8rem;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(0,0,0,.2);
      transition: all .2s ease;
      white-space: nowrap;
    }
    .sp-dial__item:hover { transform: translateX(-4px) scale(1.04); }
    .sp-dial__item--blue   { background: linear-gradient(135deg,#3b82f6,#2563eb); }
    .sp-dial__item--teal   { background: linear-gradient(135deg,#14b8a6,#0d9488); }
    .sp-dial__item--purple { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }

    /* Mobile-Vorschau Panel */
    .sp-mobile-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1210;
      background: #1e293b;
      border-radius: 16px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
      animation: spSlideUp .3s cubic-bezier(.34,1.56,.64,1);
    }
    .sp-mobile-panel__header {
      display: flex;
      align-items: center;
      gap: .75rem;
      color: #fff;
      font-weight: 700;
      font-size: .9rem;
    }
    .sp-mobile-panel__url {
      flex: 1;
      font-size: .72rem;
      color: #94a3b8;
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sp-mobile-panel__header button {
      background: rgba(255,255,255,.1);
      color: #fff;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: .9rem;
    }
    .sp-mobile-phone {
      width: 375px;
      height: 667px;
      border-radius: 40px;
      border: 8px solid #334155;
      overflow: hidden;
      background: #fff;
      box-shadow: inset 0 0 0 2px #475569;
    }
    .sp-mobile-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .sp-mobile-panel__frame-wrap {
      display: flex;
      justify-content: center;
    }

    /* Animationen */
    @keyframes spFadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes spSlideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }

    /* Mobile: FAB kompakter */
    @media (max-width: 600px) {
      .sp-fab { right: calc(2rem + 60px); padding:.75rem; border-radius:50%; }
      .sp-fab__label { display:none; }
      .sp-mobile-phone { width: 320px; height: 568px; }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'markt.ma - Multi-Tenant E-Commerce Platform';
  showAdminShell = false;

  /** Aktuelle Store-ID aus URL (null = kein Store-Kontext) */
  readonly currentStoreId = signal<number | null>(null);
  /** Vorschau-FAB nur zeigen wenn wir in einem Store sind */
  readonly storePreviewFab = computed(() => this.currentStoreId() !== null);
  /** Speed-Dial offen/zu */
  readonly storePreviewOpen = signal(false);
  /** Mobile-Preview-Panel offen/zu */
  readonly mobilePreviewOpen = signal(false);

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
    this.authService.setCartService(this.cartService);

    this.evaluateShell(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.evaluateShell(e.urlAfterRedirects);
        // Speed-Dial / Panel schließen bei Navigation
        this.storePreviewOpen.set(false);
        this.mobilePreviewOpen.set(false);
      });
  }

  private evaluateShell(url: string): void {
    const path = (url || '').split('?')[0].split('#')[0];
    this.showAdminShell = this.adminPathPrefixes.some(
      p => path === p || path.startsWith(p)
    );
    // Store-ID aus URL extrahieren (/stores/123/...)
    const match = path.match(/\/stores\/(\d+)/);
    this.currentStoreId.set(match ? +match[1] : null);
  }

  toggleStorePreview(): void {
    this.storePreviewOpen.update(v => !v);
  }

  /** Storefront-URL für den aktuellen Store */
  currentStorefrontUrl(): string {
    const id = this.currentStoreId();
    if (!id) return '';
    return `/storefront/${id}`;
  }

  /** Sicher für iframe [src] */
  safeStorefrontUrl(): string {
    return this.currentStorefrontUrl();
  }

  /** Vorschau-Aktionen */
  openStorefront(mode: 'tab' | 'panel' | 'copy'): void {
    this.storePreviewOpen.set(false);
    const url = this.currentStorefrontUrl();
    if (mode === 'tab') {
      window.open(url, '_blank', 'noopener');
    } else if (mode === 'panel') {
      this.mobilePreviewOpen.set(true);
    } else if (mode === 'copy') {
      const fullUrl = window.location.origin + url;
      navigator.clipboard.writeText(fullUrl).then(() => {
        // Kurzes visuelles Feedback
        const btn = document.querySelector('.sp-dial__item--purple') as HTMLButtonElement;
        if (btn) { btn.textContent = '✅ Kopiert!'; setTimeout(() => btn.innerHTML = '<span>🔗</span><span>Link kopieren</span>', 1500); }
      });
    }
  }
}

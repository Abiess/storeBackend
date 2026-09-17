import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LanguageService } from '@app/core/services/language.service';
import { StoreService } from '@app/core/services/store.service';
import { PwaInstallService } from '@app/core/services/pwa-install.service';
import { StoreContextService } from '@app/core/services/store-context.service';
import { AppAccessService } from '@app/core/services/app-access.service';
import { AppSwitcherComponent } from '@app/shared/components/app-switcher/app-switcher.component';
import { BusinessType } from '@app/core/models';
import { LucideAngularModule } from 'lucide-angular';
// Icons global registriert via LUCIDE_ICONS in app.config.ts

export interface NavItem {
    labelKey: string;
    icon: string;
    route?: string;
    children?: NavItem[];
    badge?: string;
    badgeClass?: string;
    /** Sichtbarkeit: false = Item wird in der Sidebar ausgeblendet. Standard: true */
    visible?: boolean;
    /** true = Dieses Item benötigt einen aktiven Store (storeId in URL).
     *  Ohne Store wird es deaktiviert dargestellt und leitet zum Dashboard. */
    requiresStore?: boolean;
    /** Optional: Nur für bestimmte BusinessTypes sichtbar */
    visibleForBusinessTypes?: BusinessType[];
    /** Optional: Alternatives Label abhängig vom BusinessType */
    labelKeyByBusinessType?: Partial<Record<BusinessType, string>>;
}

export interface NavGroup {
    titleKey?: string;
    items: NavItem[];
    /** Sichtbarkeit: false = gesamte Gruppe wird ausgeblendet. Standard: true */
    visible?: boolean;
}

@Component({
    selector: 'app-admin-sidebar',
    imports: [CommonModule, RouterModule, TranslatePipe, LucideAngularModule, AppSwitcherComponent],
    templateUrl: './admin-sidebar.component.html',
    styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent implements OnInit {
    @Input() storeId: number | null = null;

    isOpen = false;
    isMobile = false;
    isCollapsed = false;
    activeRoute = '';
    expandedGroups = new Set<string>();
    navGroups: NavGroup[] = [];

    /** Aktuell aktive Store-ID (aus URL extrahiert) – für Vorschau-Button */
    currentStoreId: number | null = null;
    /** Slug des aktuellen Stores – für echte Subdomain-URL */
    private currentStoreSlug: string | null = null;
    /** Letzter Slug-geladener Store-ID – verhindert doppelte API-Calls */
    private slugLoadedForId: number | null = null;
    
    /** BusinessType des aktuellen Stores – für UI-Anpassungen */
    currentBusinessType: BusinessType | null = null;

    constructor(
        private router: Router,
        public languageService: LanguageService,
        private storeService: StoreService,
        private storeContext: StoreContextService,
        public pwaInstall: PwaInstallService,
        private appAccessService: AppAccessService
    ) {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => {
                this.activeRoute = event.urlAfterRedirects;

                // Sidebar bleibt auf Mobile beim Klick offen UNTIL user selects an item.
                // Auf Desktop (>=1024px) immer sichtbar – siehe SCSS.
                if (this.isMobile && this.isOpen) {
                    this.isOpen = false;
                }

                this.buildNavigation();
            });
        
        // BusinessType aus StoreContext laden
        this.storeContext.businessType$.subscribe(type => {
            if (type !== this.currentBusinessType) {
                this.currentBusinessType = type;
                this.buildNavigation();
            }
        });
    }

    ngOnInit(): void {
        this.checkScreenSize();
        this.activeRoute = this.router.url;
        this.buildNavigation();
    }

    @HostListener('window:resize')
    onResize(): void {
        this.checkScreenSize();
    }

    private checkScreenSize(): void {
        this.isMobile = window.innerWidth < 1024;
    }

    private buildNavigation(): void {
        let resolvedStoreId: number | null = this.storeId;

        if (resolvedStoreId == null) {
            // Unterstützt sowohl die klassische Shop-URL (/stores/:id/...)
            // als auch die app-zentrischen DHL-/LOYALTY-Routen
            // (/apps/dhl/:id/..., /apps/loyalty/:id/...) als Quelle für den
            // technischen Store-/Mandantenkontext.
            const urlMatch = this.router.url.match(/\/stores\/(\d+)/)
                || this.router.url.match(/\/apps\/dhl\/(\d+)/)
                || this.router.url.match(/\/apps\/loyalty\/(\d+)/);

            if (urlMatch?.[1] != null) {
                const parsedId = Number(urlMatch[1]);

                if (!Number.isNaN(parsedId)) {
                    resolvedStoreId = parsedId;
                    console.log('✅ StoreId extracted from URL:', resolvedStoreId);
                }
            }
        }

        const baseRoute = resolvedStoreId != null ? `/stores/${resolvedStoreId}` : '';
        this.currentStoreId = resolvedStoreId;
        
        // Store-ID in localStorage speichern für spätere Verwendung
        if (resolvedStoreId != null) {
            localStorage.setItem('lastActiveStoreId', resolvedStoreId.toString());
        }

        // Slug laden falls Store-ID neu
        if (resolvedStoreId != null && resolvedStoreId !== this.slugLoadedForId) {
            this.slugLoadedForId = resolvedStoreId;
            this.currentStoreSlug = null; // zurücksetzen bis geladen
            this.storeService.getStoreById(resolvedStoreId).subscribe({
                next: (store) => { 
                    this.currentStoreSlug = store?.slug ?? null;
                    // BusinessType in StoreContext setzen für andere Komponenten
                    if (store?.businessType) {
                        this.storeContext.setBusinessType(store.businessType as BusinessType);
                    }
                },
                error: () => { 
                    this.currentStoreSlug = null;
                    this.storeContext.setBusinessType(null);
                }
            });
        }

        if (resolvedStoreId == null && this.router.url.includes('/stores/')) {
            console.warn('⚠️ Sidebar: No storeId found, but /stores/ route is active');
        }

        this.navGroups = [
            {
                titleKey: 'sidebarAdmin.groups.overview',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.dashboard',
                        icon: 'layout-dashboard',
                        route: '/dashboard'
                    }
                ]
            },
            {
                // TEMP: isolierter Test-Bereich für die OpenRouter-Vision Issue-Analyse.
                // Kein Business-Feature, kein Store-Bezug (requiresStore bewusst weggelassen).
                titleKey: 'sidebarAdmin.groups.aiTools',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.issueAnalysis',
                        icon: 'wrench',
                        route: '/tools/issue-analysis'
                    },
                    {
                        // Maritime (AIS Live-Schiffsdaten MVP, Tanger Med) – globales Admin-Tool,
                        // kein Store-Bezug (requiresStore bewusst weggelassen), analog issue-analysis.
                        labelKey: 'sidebarAdmin.items.maritime',
                        icon: 'anchor',
                        route: '/tools/maritime'
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.commerce',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.pos',
                        icon: 'shopping-cart',
                        route: `${baseRoute}/pos`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // POS nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.loyalty',
                        icon: 'gift',
                        // App-zentrische Route (Ziel-Bild: LOYALTY als eigenständige App,
                        // analog DHL). Der bisherige Pfad `${baseRoute}/loyalty` bleibt
                        // als Legacy-Alias weiterhin voll funktionsfähig.
                        route: resolvedStoreId != null ? `/apps/loyalty/${resolvedStoreId}` : `${baseRoute}/loyalty`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Loyalty-MVP nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.dhl',
                        icon: 'truck',
                        // App-zentrische Route (Ziel-Bild: DHL als eigenständige App).
                        // Der bisherige Pfad `${baseRoute}/dhl` bleibt als
                        // Legacy-Alias weiterhin voll funktionsfähig.
                        route: resolvedStoreId != null ? `/apps/dhl/${resolvedStoreId}` : `${baseRoute}/dhl`,
                        requiresStore: true
                    },
                    {
                        labelKey: 'sidebarAdmin.items.products',
                        labelKeyByBusinessType: { [BusinessType.SERVICE]: 'sidebarAdmin.items.services' },
                        icon: 'package',
                        route: `${baseRoute}/products`,
                        requiresStore: true
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.purchasing',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.supplierInvoices',
                        icon: 'file-text',
                        route: `${baseRoute}/supplier-invoices`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Lieferantenrechnungen nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.productsExpiry',
                        icon: 'calendar',
                        route: `${baseRoute}/products-expiry`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Ablaufdatum nur für SHOP
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.customerService',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.reviews',
                        icon: 'star',
                        route: `${baseRoute}/reviews`,
                        requiresStore: true
                    },
                    {
                        labelKey: 'sidebarAdmin.items.chatbot',
                        icon: 'bot',
                        route: `${baseRoute}/chatbot`,
                        requiresStore: true
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.storeSetup',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.storeSettings',
                        icon: 'settings',
                        route: `${baseRoute}/settings`,
                        requiresStore: true
                    },
                    {
                        labelKey: 'sidebarAdmin.items.designTheme',
                        icon: 'palette',
                        route: `${baseRoute}/theme`,
                        requiresStore: true
                    },
                    {
                        labelKey: 'sidebarAdmin.items.banner',
                        icon: 'megaphone',
                        route: `${baseRoute}/banner`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Promo-Banner nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.delivery',
                        icon: 'truck',
                        route: `${baseRoute}/delivery`,
                        requiresStore: true,
                        visible: true,   // DHL-Integration: Store-spezifische Liefereinstellungen wieder aktiviert
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Lieferung nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.seo',
                        icon: 'search',
                        route: `${baseRoute}/seo`,
                        requiresStore: true
                    },
                    {
                        labelKey: 'sidebarAdmin.items.brand',
                        labelKeyByBusinessType: { [BusinessType.SERVICE]: 'sidebarAdmin.items.brandingDesign' },
                        icon: 'tag',
                        route: `${baseRoute}/brand`,
                        requiresStore: true
                        // ✅ visibleForBusinessTypes entfernt - für SHOP und SERVICE sichtbar
                    },
                    {
                        labelKey: 'sidebarAdmin.items.woocommerce',
                        icon: 'shopping-bag',
                        route: `${baseRoute}/woocommerce`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // WooCommerce nur für SHOP
                    },
                    {
                        labelKey: 'sidebarAdmin.items.telegram',
                        icon: 'send',
                        route: `${baseRoute}/telegram`,
                        requiresStore: true,
                        visibleForBusinessTypes: [BusinessType.SHOP]  // Telegram nur für SHOP
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.team',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.teamRoles',
                        icon: 'users',
                        route: `${baseRoute}/roles`,
                        requiresStore: true
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.account',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.myAccount',
                        icon: 'user',
                        route: '/settings'
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.platform',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.platformDelivery',
                        icon: 'truck',
                        route: '/platform/delivery'
                    }
                ]
            }
        ];
    }

    toggleSidebar(): void {
        this.isOpen = !this.isOpen;
    }

    closeSidebar(): void {
        if (this.isMobile) {
            this.isOpen = false;
        }
    }

    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this.isMobile && this.isOpen) {
            this.closeSidebar();
        }
    }

    isRouteActive(route?: string): string | boolean {
        if (!route) return false;
        const current = (this.activeRoute || '').split('?')[0].split('#')[0];
        // Exact match (Dashboard) – verhindert false-positive bei /dashboard/stores/...
        if (route === '/dashboard') {
            return current === '/dashboard';
        }
        // Prefix match aber nur an Segmentgrenze
        return current === route || current.startsWith(route + '/');
    }

    isRTL(): boolean {
        return this.languageService.isRTL();
    }

    /** true wenn ein aktiver Store in der URL erkannt wurde */
    get hasStore(): boolean {
        return this.currentStoreId != null;
    }

    /** Klick auf store-spezifisches Item ohne aktiven Store → Dashboard mit Hinweis */
    onNoStoreClick(): void {
        this.router.navigate(['/dashboard'], { queryParams: { hint: 'createStore' } });
        if (this.isMobile) this.isOpen = false;
    }

    /** Gibt nur sichtbare Gruppen zurück (visible !== false + mindestens ein sichtbares Item) */
    get visibleGroups(): NavGroup[] {
        return this.navGroups
            .filter(g => g.visible !== false)
            .filter(g => this.visibleItems(g).length > 0);
    }

    /** Gibt nur sichtbare Items einer Gruppe zurück (visible !== false + businessType-Filter + App-Zugriff) */
    visibleItems(group: NavGroup): NavItem[] {
        return group.items.filter(item => {
            // Grundlegende Sichtbarkeit
            if (item.visible === false) return false;
            
            // BusinessType-Filter prüfen
            if (item.visibleForBusinessTypes && this.currentBusinessType) {
                if (!item.visibleForBusinessTypes.includes(this.currentBusinessType)) {
                    return false;
                }
            }

            // App-Entitlement Phase 2: MANAGED-User sehen nur Navigation zu
            // Apps, für die sie explizit freigeschaltet sind. LEGACY-User
            // sehen die Sidebar unverändert wie bisher (isRouteAllowed()
            // liefert dann immer true).
            if (!this.appAccessService.isRouteAllowed(item.route)) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Gibt das passende Label für ein Item zurück (berücksichtigt labelKeyByBusinessType)
     */
    getItemLabel(item: NavItem): string {
        if (item.labelKeyByBusinessType && this.currentBusinessType) {
            const specificLabel = item.labelKeyByBusinessType[this.currentBusinessType];
            if (specificLabel) {
                return specificLabel;
            }
        }
        return item.labelKey;
    }

    toggleGroup(groupTitle: string): void {
        if (this.expandedGroups.has(groupTitle)) {
            this.expandedGroups.delete(groupTitle);
        } else {
            this.expandedGroups.add(groupTitle);
        }
    }

    toggleCollapse(): void {
        this.isCollapsed = !this.isCollapsed;
    }

    isGroupExpanded(groupTitle: string): boolean {
        return this.expandedGroups.has(groupTitle);
    }

    /** Storefront in neuem Tab öffnen – echte Subdomain-URL wenn Slug bekannt */
    openStorePreview(): void {
        if (!this.currentStoreId) return;
        const url = this.currentStoreSlug
            ? `https://${this.currentStoreSlug}.markt.ma`
            : `/storefront/${this.currentStoreId}`;
        window.open(url, '_blank', 'noopener');
    }
}

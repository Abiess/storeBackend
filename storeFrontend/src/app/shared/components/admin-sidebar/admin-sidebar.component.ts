import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LanguageService } from '@app/core/services/language.service';

export interface NavItem {
    labelKey: string;
    icon: string;
    route?: string;
    children?: NavItem[];
    badge?: string;
    badgeClass?: string;
}

export interface NavGroup {
    titleKey?: string;
    items: NavItem[];
}

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './admin-sidebar.component.html',
    styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent implements OnInit {
    @Input() storeId: number | null = null;

    isOpen = false;
    isMobile = false;
    activeRoute = '';
    expandedGroups = new Set<string>();
    navGroups: NavGroup[] = [];

    /** Aktuell aktive Store-ID (aus URL extrahiert) – für Vorschau-Button */
    currentStoreId: number | null = null;

    constructor(
        private router: Router,
        public languageService: LanguageService
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
            const urlMatch = this.router.url.match(/\/stores\/(\d+)/);

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

        if (resolvedStoreId == null && this.router.url.includes('/stores/')) {
            console.warn('⚠️ Sidebar: No storeId found, but /stores/ route is active');
        }

        this.navGroups = [
            {
                titleKey: 'sidebarAdmin.groups.overview',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.dashboard',
                        icon: '📊',
                        route: '/dashboard'
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.commerce',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.products',
                        icon: '📦',
                        route: `${baseRoute}/products`
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.customerService',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.reviews',
                        icon: '⭐',
                        route: `${baseRoute}/reviews`
                    },
                    {
                        labelKey: 'sidebarAdmin.items.chatbot',
                        icon: '🤖',
                        route: `${baseRoute}/chatbot`
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.storeSetup',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.storeSettings',
                        icon: '⚙️',
                        route: `${baseRoute}/settings`
                    },
                    {
                        labelKey: 'sidebarAdmin.items.designTheme',
                        icon: '🎨',
                        route: `${baseRoute}/theme`
                    },
                    {
                        labelKey: 'sidebarAdmin.items.delivery',
                        icon: '🚚',
                        route: `${baseRoute}/delivery`
                    },
                    {
                        labelKey: 'sidebarAdmin.items.seo',
                        icon: '🔍',
                        route: `${baseRoute}/seo`
                    },
                    {
                        labelKey: 'sidebarAdmin.items.brand',
                        icon: '🏷️',
                        route: `${baseRoute}/brand`
                    }
                ]
            },
            {
                titleKey: 'sidebarAdmin.groups.account',
                items: [
                    {
                        labelKey: 'sidebarAdmin.items.myAccount',
                        icon: '👤',
                        route: '/settings'
                    },
                    {
                        labelKey: 'sidebarAdmin.items.subscription',
                        icon: '💎',
                        route: '/subscription'
                    },
                    {
                        labelKey: 'sidebarAdmin.items.roles',
                        icon: '👥',
                        route: '/role-management'
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

    toggleGroup(groupTitle: string): void {
        if (this.expandedGroups.has(groupTitle)) {
            this.expandedGroups.delete(groupTitle);
        } else {
            this.expandedGroups.add(groupTitle);
        }
    }

    isGroupExpanded(groupTitle: string): boolean {
        return this.expandedGroups.has(groupTitle);
    }

    /** Storefront in neuem Tab öffnen */
    openStorePreview(): void {
        if (!this.currentStoreId) return;
        window.open(`/storefront/${this.currentStoreId}`, '_blank', 'noopener');
    }
}

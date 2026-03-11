import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface NavItem {
    label: string;
    icon: string;
    route?: string;
    children?: NavItem[];
    badge?: string;
    badgeClass?: string;
}

export interface NavGroup {
    title?: string;
    items: NavItem[];
}

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
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

    constructor(private router: Router) {
        this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe((event) => {
                this.activeRoute = event.urlAfterRedirects;

                if (this.isMobile) {
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

        // Nur aus URL extrahieren, wenn Input wirklich nicht gesetzt ist
        if (resolvedStoreId == null) {
            const urlMatch = this.router.url.match(/\/stores\/(\d+)/);

            if (urlMatch?.[1] != null) {
                const parsedId = Number(urlMatch[1]);

                if (!Number.isNaN(parsedId)) {
                    resolvedStoreId = parsedId;
                    console.log('✅ StoreId aus URL extrahiert:', resolvedStoreId);
                }
            }
        }

        const baseRoute = resolvedStoreId != null ? `/stores/${resolvedStoreId}` : '';

        if (resolvedStoreId == null && this.router.url.includes('/stores/')) {
            console.warn('⚠️ Sidebar: Keine storeId gefunden, aber /stores/ Route aktiv');
        }

        this.navGroups = [
            {
                title: 'Übersicht',
                items: [
                    {
                        label: 'Dashboard',
                        icon: '📊',
                        route: '/dashboard'
                    }
                ]
            },
            {
                title: 'Commerce',
                items: [
                    {
                        label: 'Produkte',
                        icon: '📦',
                        route: `${baseRoute}/products`
                    },
                    /*{
                        label: 'Kategorien',
                        icon: '📁',
                        route: `${baseRoute}/categories`
                    },
                    {
                        label: 'Bestellungen',
                        icon: '📋',
                        route: `${baseRoute}/orders`
                    },
                    {
                        label: 'Gutscheine',
                        icon: '🎟️',
                        route: `${baseRoute}/coupons`
                    }*/
                ]
            },
            {
                title: 'Kundenservice',
                items: [
                    {
                        label: 'Bewertungen',
                        icon: '⭐',
                        route: `${baseRoute}/reviews`
                    },
                    {
                        label: 'Chatbot',
                        icon: '🤖',
                        route: `${baseRoute}/chatbot`
                    }
                ]
            },
            {
                title: 'Store Setup',
                items: [
                    {
                        label: 'Store Einstellungen',
                        icon: '⚙️',
                        route: `${baseRoute}/settings`
                    },
                    {
                        label: 'Design & Theme',
                        icon: '🎨',
                        route: `${baseRoute}/theme`
                    },
                    {
                        label: 'Lieferung',
                        icon: '🚚',
                        route: `${baseRoute}/delivery`
                    },
                    {
                        label: 'SEO',
                        icon: '🔍',
                        route: `${baseRoute}/seo`
                    },
                    {
                        label: 'Marke',
                        icon: '🏷️',
                        route: `${baseRoute}/brand`
                    }
                ]
            },
            {
                title: 'Account',
                items: [
                    {
                        label: 'Mein Account',
                        icon: '👤',
                        route: '/settings'
                    },
                    {
                        label: 'Abonnement',
                        icon: '💎',
                        route: '/subscription'
                    },
                    {
                        label: 'Rollen',
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

    isRouteActive(route?: string): boolean {
        if (!route) return false;
        return this.activeRoute.startsWith(route);
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
}

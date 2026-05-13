import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from 'src/app/core/pipes/translate.pipe';
import { OrderVerificationCounterService } from 'src/app/core/services/order-verification-counter.service';
import { StoreContextService } from 'src/app/core/services/store-context.service';

/**
 * NavTab-Interface – wiederverwendbar für jede Tab-Navigation.
 * `visible` → false = komplett ausgeblendet (Feature-Flag)
 * `beta` → true = nur für Beta-User sichtbar + Badge "Beta"
 */
export interface NavTab {
    icon: string;
    label: string;
    route: (storeId: number) => any[];
    exact?: boolean;
    showBadge?: boolean;
    /** Auf false setzen um den Tab komplett auszublenden */
    visible?: boolean;
    /** Beta-Feature: nur sichtbar wenn User Beta-Zugang hat */
    beta?: boolean;
}

@Component({
    selector: 'app-productnavigation-bar',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TranslatePipe
    ],
    templateUrl: './productnavigation-bar.component.html',
    styleUrl: './productnavigation-bar.component.scss'
})
export class ProductnavigationBarComponent implements OnInit {
    storeId$: Observable<number | null>;
    unverifiedCount$: Observable<number>;

    /** Setzt man auf true, werden beta-Tabs angezeigt */
    isBetaUser = false;

    constructor(
        private counterService: OrderVerificationCounterService,
        private storeContext: StoreContextService
    ) {
        this.storeId$ = this.storeContext.storeId$;
        this.unverifiedCount$ = this.counterService.unverifiedCount$;
    }

    ngOnInit(): void {
        // Beta-Flag könnte z.B. aus localStorage oder UserService kommen
        this.isBetaUser = localStorage.getItem('betaAccess') === 'true';
    }

    /** Gibt nur die sichtbaren Tabs zurück (respektiert visible + beta Flags) */
    get visibleTabs(): NavTab[] {
        return this.navTabs.filter(tab => {
            if (tab.visible === false) return false;
            if (tab.beta && !this.isBetaUser) return false;
            return true;
        });
    }

    navTabs: NavTab[] = [
        {
            icon: '📊',
            label: 'navigation.overview',
            route: (id) => ['/dashboard/stores', id],
            exact: true
        },
        {
            icon: '🏷️',
            label: 'navigation.categories',
            route: (id) => ['/dashboard/stores', id, 'categories']
        },
        {
            icon: '📦',
            label: 'navigation.products',
            route: (id) => ['/dashboard/stores', id, 'products']
        },
        {
            icon: '🛒',
            label: 'navigation.orders',
            route: (id) => ['/dashboard/stores', id, 'orders'],
            exact: true,
            showBadge: true
        },
        {
            icon: '⭐',
            label: 'navigation.reviews',
            route: (id) => ['/stores', id, 'reviews']
        },
        {
            icon: '🚚',
            label: 'navigation.delivery',
            route: (id) => ['/stores', id, 'delivery']
        },
        {
            icon: '🏠',
            label: 'navigation.homepage',
            route: (id) => ['/dashboard/stores', id, 'homepage-builder']
        },
        {
            icon: '⚙️',
            label: 'navigation.settings',
            route: (id) => ['/dashboard/stores', id, 'settings']
        }
    ];
}

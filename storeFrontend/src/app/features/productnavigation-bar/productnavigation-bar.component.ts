import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from 'src/app/core/pipes/translate.pipe';
import { OrderVerificationCounterService } from 'src/app/core/services/order-verification-counter.service';
import { StoreContextService } from 'src/app/core/services/store-context.service';
import { BusinessType } from '@app/core/models';
import { LucideAngularModule } from 'lucide-angular';

/**
 * NavTab-Interface – wiederverwendbar für jede Tab-Navigation.
 * `visible` → false = komplett ausgeblendet (Feature-Flag)
 * `beta` → true = nur für Beta-User sichtbar + Badge "Beta"
 * `visibleForBusinessTypes` → nur für bestimmte BusinessTypes anzeigen
 * `labelKeyByBusinessType` → alternatives Label abhängig vom BusinessType
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
    /** Optional: Nur für bestimmte BusinessTypes sichtbar */
    visibleForBusinessTypes?: BusinessType[];
    /** Optional: Alternatives Label abhängig vom BusinessType */
    labelKeyByBusinessType?: Partial<Record<BusinessType, string>>;
}

@Component({
    selector: 'app-productnavigation-bar',
    imports: [
        CommonModule,
        RouterModule,
        TranslatePipe,
        LucideAngularModule
    ],
    templateUrl: './productnavigation-bar.component.html',
    styleUrl: './productnavigation-bar.component.scss'
})
export class ProductnavigationBarComponent implements OnInit {
    storeId$: Observable<number | null>;
    unverifiedCount$: Observable<number>;
    
    /** BusinessType des aktuellen Stores – für UI-Anpassungen */
    currentBusinessType: BusinessType | null = null;

    /** Setzt man auf true, werden beta-Tabs angezeigt */
    isBetaUser = false;

    constructor(
        private counterService: OrderVerificationCounterService,
        private storeContext: StoreContextService
    ) {
        this.storeId$ = this.storeContext.storeId$;
        this.unverifiedCount$ = this.counterService.unverifiedCount$;
        
        // BusinessType aus StoreContext laden
        this.storeContext.businessType$.subscribe(type => {
            this.currentBusinessType = type;
        });
    }

    ngOnInit(): void {
        // Beta-Flag könnte z.B. aus localStorage oder UserService kommen
        this.isBetaUser = localStorage.getItem('betaAccess') === 'true';
    }

    /** Gibt nur die sichtbaren Tabs zurück (respektiert visible + beta + businessType Flags) */
    get visibleTabs(): NavTab[] {
        return this.navTabs.filter(tab => {
            if (tab.visible === false) return false;
            if (tab.beta && !this.isBetaUser) return false;
            
            // BusinessType-Filter prüfen
            if (tab.visibleForBusinessTypes && this.currentBusinessType) {
                if (!tab.visibleForBusinessTypes.includes(this.currentBusinessType)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Gibt das passende Label für einen Tab zurück (berücksichtigt labelKeyByBusinessType)
     */
    getTabLabel(tab: NavTab): string {
        if (tab.labelKeyByBusinessType && this.currentBusinessType) {
            const specificLabel = tab.labelKeyByBusinessType[this.currentBusinessType];
            if (specificLabel) {
                return specificLabel;
            }
        }
        return tab.label;
    }

    navTabs: NavTab[] = [
        {
            icon: 'layout-dashboard',
            label: 'navigation.overview',
            route: (id) => ['/dashboard/stores', id],
            exact: true
        },
        {
            icon: 'tag',
            label: 'navigation.categories',
            labelKeyByBusinessType: { [BusinessType.SERVICE]: 'navigation.serviceCategories' },
            route: (id) => ['/dashboard/stores', id, 'categories']
        },
        {
            icon: 'package',
            label: 'navigation.products',
            labelKeyByBusinessType: { [BusinessType.SERVICE]: 'navigation.services' },
            route: (id) => ['/dashboard/stores', id, 'products']
        },
        {
            icon: 'shopping-cart',
            label: 'navigation.orders',
            route: (id) => ['/dashboard/stores', id, 'orders'],
            exact: true,
            showBadge: true
        },
        {
            icon: 'star',
            label: 'navigation.reviews',
            route: (id) => ['/stores', id, 'reviews']
        },
        {
            icon: 'truck',
            label: 'navigation.delivery',
            route: (id) => ['/stores', id, 'delivery']
        },
        {
            icon: 'house',
            label: 'navigation.homepage',
            route: (id) => ['/dashboard/stores', id, 'homepage-builder']
        },
        {
            icon: 'settings',
            label: 'navigation.settings',
            route: (id) => ['/dashboard/stores', id, 'settings'],
            visible: false
        }
    ];
}

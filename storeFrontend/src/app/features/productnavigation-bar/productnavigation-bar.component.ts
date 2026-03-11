import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslatePipe } from 'src/app/core/pipes/translate.pipe';
import { OrderVerificationCounterService } from 'src/app/core/services/order-verification-counter.service';

interface NavTab {
    icon: string;
    label: string;
    route: (storeId: number) => any[];
    exact?: boolean;
    showBadge?: boolean;
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
export class ProductnavigationBarComponent {
    @Input() storeId!: number;

    unverifiedCount$: Observable<number>;

    constructor(private counterService: OrderVerificationCounterService) {
        this.unverifiedCount$ = this.counterService.unverifiedCount$;
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
            route: (id) => ['/dashboard/stores', id, 'orders']
        },
        {
            icon: '📞',
            label: 'COD Verifizierung',
            route: (id) => ['/dashboard/stores', id, 'orders', 'verification'],
            showBadge: true
        },
        {
            icon: '🚚',
            label: 'navigation.delivery',
            route: (id) => ['/dashboard/stores', id, 'delivery']
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

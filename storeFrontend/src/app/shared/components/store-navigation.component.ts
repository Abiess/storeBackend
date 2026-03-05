import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { OrderVerificationCounterService } from '@app/core/services/order-verification-counter.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-store-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="store-navigation">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a [routerLink]="['/dashboard']">{{ 'navigation.dashboard' | translate }}</a>
        <span class="separator">›</span>
        <a [routerLink]="['/dashboard/stores', storeId]">{{ 'navigation.store' | translate }}</a>
        <span class="separator">›</span>
        <span class="current">{{ currentPage }}</span>
      </nav>

      <!-- Navigation Tabs -->
      <nav class="nav-tabs">
        <a 
          [routerLink]="['/dashboard/stores', storeId]" 
          class="nav-tab"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{exact: true}">
          <span class="icon">📊</span>
          <span class="label">{{ 'navigation.overview' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'categories']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">🏷️</span>
          <span class="label">{{ 'navigation.categories' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'products']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">📦</span>
          <span class="label">{{ 'navigation.products' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'orders']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">🛒</span>
          <span class="label">{{ 'navigation.orders' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'orders', 'verification']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">📞</span>
          <span class="label">COD Verifizierung</span>
          <span class="badge" *ngIf="(unverifiedCount$ | async) as count">
            <span *ngIf="count > 0">{{ count }}</span>
          </span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'delivery']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">🚚</span>
          <span class="label">{{ 'navigation.delivery' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'homepage-builder']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">🏠</span>
          <span class="label">{{ 'navigation.homepage' | translate }}</span>
        </a>
        <a 
          [routerLink]="['/dashboard/stores', storeId, 'settings']" 
          class="nav-tab"
          routerLinkActive="active">
          <span class="icon">⚙️</span>
          <span class="label">{{ 'navigation.settings' | translate }}</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .store-navigation {
      margin-bottom: 2rem;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem 0;
      font-size: 0.875rem;
    }

    .breadcrumb a {
      color: #667eea;
      text-decoration: none;
      transition: color 0.2s;
    }

    .breadcrumb a:hover {
      color: #5568d3;
      text-decoration: underline;
    }

    .breadcrumb .separator {
      color: #999;
    }

    .breadcrumb .current {
      color: #333;
      font-weight: 600;
    }

    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e0e0e0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.25rem;
      color: #666;
      text-decoration: none;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
      white-space: nowrap;
      font-weight: 500;
      position: relative;
      top: 2px;
    }

    .nav-tab .icon {
      font-size: 1.125rem;
    }

    .nav-tab:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 8px 8px 0 0;
    }

    .nav-tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      font-weight: 600;
    }

    .nav-tab.active .icon {
      transform: scale(1.1);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: #ef4444;
      color: white;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      margin-left: 6px;
    }

    .nav-tab.active .badge {
      background: #dc2626;
    }

    @media (max-width: 768px) {
      .nav-tab .label {
        display: none;
      }

      .nav-tab {
        padding: 0.75rem 1rem;
      }

      .nav-tab .icon {
        font-size: 1.5rem;
      }

      .badge {
        position: absolute;
        top: 8px;
        right: 8px;
        min-width: 18px;
        height: 18px;
        font-size: 10px;
        padding: 0 4px;
      }
    }
  `]
})
export class StoreNavigationComponent implements OnInit {
  @Input() storeId!: number;
  @Input() currentPage: string = '';

  unverifiedCount$!: Observable<number>;

  constructor(private counterService: OrderVerificationCounterService) {}

  ngOnInit(): void {
    this.unverifiedCount$ = this.counterService.unverifiedCount$;
  }
}

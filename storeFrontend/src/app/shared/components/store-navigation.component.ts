import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { OrderVerificationCounterService } from '@app/core/services/order-verification-counter.service';
import { Observable } from 'rxjs';
import {ProductnavigationBarComponent} from "@app/features/productnavigation-bar/productnavigation-bar.component";

@Component({
  selector: 'app-store-navigation',
  standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe, ProductnavigationBarComponent],
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
        <app-productnavigation-bar
                [storeId]="storeId">
        </app-productnavigation-bar>
    
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
      flex-wrap: wrap;
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

    /* Navigation Tabs - Responsive Flexbox Wrap */
    .nav-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .nav-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      color: #666;
      text-decoration: none;
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      white-space: nowrap;
      font-weight: 500;
      position: relative;
      border-radius: 8px 8px 0 0;
      background: transparent;
      min-height: 44px; /* Touch-friendly */
    }

    .nav-tab .icon {
      font-size: 1.125rem;
      line-height: 1;
    }

    .nav-tab .label {
      font-size: 0.9375rem;
    }

    .nav-tab:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.08);
    }

    .nav-tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.05);
    }

    .nav-tab.active .icon {
      transform: scale(1.1);
    }

    /* Badge Styling */
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

    /* Tablet (768px - 1023px) */
    @media (max-width: 1023px) {
      .nav-tab {
        padding: 0.65rem 0.875rem;
      }

      .nav-tab .label {
        font-size: 0.875rem;
      }
    }

    /* Mobile (< 768px) */
    @media (max-width: 767px) {
      .store-navigation {
        margin-bottom: 1.5rem;
      }

      .breadcrumb {
        font-size: 0.8125rem;
        padding: 0.5rem 0;
      }

      .nav-tabs {
        gap: 0.375rem;
        padding-bottom: 0.375rem;
      }

      .nav-tab {
        flex: 0 0 auto;
        padding: 0.625rem 0.75rem;
        min-width: auto;
      }

      /* Kompakte Darstellung auf Mobile */
      .nav-tab .label {
        font-size: 0.8125rem;
      }

      .nav-tab .icon {
        font-size: 1rem;
      }

      /* Badge absolute positioniert */
      .badge {
        position: absolute;
        top: 4px;
        right: 4px;
        min-width: 18px;
        height: 18px;
        font-size: 10px;
        padding: 0 4px;
      }
    }

    /* Sehr kleine Screens (< 480px) */
    @media (max-width: 479px) {
      .nav-tab .label {
        display: none; /* Nur Icons auf sehr kleinen Screens */
      }

      .nav-tab {
        padding: 0.75rem;
        flex: 0 0 auto;
      }

      .nav-tab .icon {
        font-size: 1.25rem;
      }
    }

    /* Focus States für Accessibility */
    .nav-tab:focus {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    .nav-tab:focus:not(:focus-visible) {
      outline: none;
    }

    /* Hover disabled auf Touch-Geräten */
    @media (hover: none) {
      .nav-tab:hover {
        background: transparent;
      }

      .nav-tab:active {
        background: rgba(102, 126, 234, 0.1);
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

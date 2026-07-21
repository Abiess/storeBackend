import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AnalyticsService } from '@app/core/services/analytics.service';
import { RevenueSummary, TopProduct, OrderStats } from '@app/core/models/analytics';
import { ResponsiveDataListComponent, ColumnConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

@Component({
  selector: 'app-store-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TranslateModule,
    ResponsiveDataListComponent
  ],
  templateUrl: './store-analytics.component.html',
  styleUrls: ['./store-analytics.component.scss']
})
export class StoreAnalyticsComponent implements OnInit {
  @Input() storeId!: number;

  // State
  loading = false;
  error: string | null = null;

  // Data
  summary: RevenueSummary | null = null;
  topProducts: TopProduct[] = [];
  orderStats: OrderStats | null = null;

  // Zeitraumfilter
  selectedRange = 'thisYear'; // today, last7days, last30days, thisYear, custom
  customFrom: string | null = null;
  customTo: string | null = null;

  // Top-Produkte Spalten
  topProductsColumns: ColumnConfig[] = [
    { key: 'productName', label: 'ANALYTICS.PRODUCT_NAME', type: 'text' },
    { key: 'totalQuantitySold', label: 'ANALYTICS.QUANTITY_SOLD', type: 'number' },
    { key: 'totalRevenue', label: 'ANALYTICS.REVENUE', type: 'currency' },
    { key: 'orderCount', label: 'ANALYTICS.ORDER_COUNT', type: 'number' }
  ];

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    // Custom range validation: wait until both dates are set
    if (this.selectedRange === 'custom') {
      if (!this.customFrom || !this.customTo) {
        return; // Don't load until both dates are set
      }
      // Validate from <= to
      if (this.customFrom > this.customTo) {
        this.error = 'ANALYTICS.ERROR.INVALID_DATE_RANGE';
        return;
      }
    }

    this.loading = true;
    this.error = null;

    const { from, to } = this.getDateRange();

    forkJoin({
      summary: this.analyticsService.getSummary(this.storeId, from, to).pipe(
        catchError(() => of(null))
      ),
      topProducts: this.analyticsService.getTopProducts(this.storeId, from, to, 5).pipe(
        catchError(() => of([]))
      ),
      orderStats: this.analyticsService.getOrderStats(this.storeId, from, to).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: (data) => {
        this.summary = data.summary;
        this.topProducts = data.topProducts;
        this.orderStats = data.orderStats;
        this.loading = false;
      },
      error: (err) => {
        this.error = this.handleError(err);
        this.loading = false;
      }
    });
  }

  getDateRange(): { from: string; to: string } {
    const now = new Date();
    const today = this.formatDate(now);

    switch (this.selectedRange) {
      case 'today':
        return { from: today, to: today };

      case 'last7days':
        // Letzte 7 Tage inklusive heute = heute minus 6 Tage
        const last7 = new Date(now);
        last7.setDate(now.getDate() - 6);
        return { from: this.formatDate(last7), to: today };

      case 'last30days':
        // Letzte 30 Tage inklusive heute = heute minus 29 Tage
        const last30 = new Date(now);
        last30.setDate(now.getDate() - 29);
        return { from: this.formatDate(last30), to: today };

      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { from: this.formatDate(yearStart), to: today };

      case 'custom':
        return {
          from: this.customFrom || '',
          to: this.customTo || ''
        };

      default:
        return { from: '', to: '' };
    }
  }

  // Format date using local date parts (NOT toISOString() - timezone issue)
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  handleError(err: any): string {
    if (err.status === 403) {
      return 'ANALYTICS.ERROR.ACCESS_DENIED';
    }
    if (err.status === 400 && err.error?.message?.includes('after')) {
      return 'ANALYTICS.ERROR.INVALID_DATE_RANGE';
    }
    if (err.status === 400 && err.error?.message?.includes('range')) {
      return 'ANALYTICS.ERROR.RANGE_TOO_LARGE';
    }
    return 'ANALYTICS.ERROR.GENERAL';
  }

  getStatusEntries(): Array<{ key: string; value: number }> {
    if (!this.orderStats || !this.orderStats.ordersByStatus) {
      return [];
    }
    return Object.entries(this.orderStats.ordersByStatus)
      .map(([key, value]) => ({ key, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }

  getPaymentEntries(): Array<{ key: string; value: number }> {
    if (!this.orderStats || !this.orderStats.ordersByPaymentMethod) {
      return [];
    }
    return Object.entries(this.orderStats.ordersByPaymentMethod)
      .map(([key, value]) => ({ key, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }
}

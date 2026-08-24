import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CouponService, CouponDTO } from '../../../core/services/coupon.service';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { FabService } from '@app/core/services/fab.service';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { FilterBarComponent, FilterChip } from '@app/shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    PageHeaderComponent,
    ResponsiveDataListComponent,
    FilterBarComponent
  ],
  template: `
    <div class="coupons-container">
      <app-page-header
        [title]="'Gutscheine & Rabatte'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Status-Filter -->
      <app-filter-bar
        [chips]="filterChips"
        [activeValue]="statusFilter"
        (filterChange)="onFilterChange($event)">
      </app-filter-bar>

      <app-responsive-data-list
        [items]="coupons"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [rowClickable]="true"
        [searchable]="true"
        searchPlaceholder="Gutschein-Code suchen..."
        emptyMessage="Noch keine Gutscheine erstellt"
        emptyIcon="🎟️"
        (rowClick)="onEdit($event)">
      </app-responsive-data-list>
    </div>
  `,
  styles: [`
    .coupons-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    @media (max-width: 768px) { .coupons-container { padding: 1rem; } }
  `]
})
export class CouponsListComponent implements OnInit, OnDestroy {
  storeId!: number;
  coupons: CouponDTO[] = [];
  loading = false;
  statusFilter = '';
  breadcrumbItems: BreadcrumbItem[] = [];
  headerActions: HeaderAction[] = [];

  /** Filter-Chips für FilterBarComponent */
  get filterChips(): FilterChip[] {
    return [
      {
        value: '',
        label: 'Alle'
      },
      {
        value: 'ACTIVE',
        label: 'Aktiv',
        icon: '✅',
        variant: 'filter-chip--variant-success'
      },
      {
        value: 'PAUSED',
        label: 'Pausiert',
        icon: '⏸',
        variant: 'filter-chip--variant-subdued'
      },
      {
        value: 'ARCHIVED',
        label: 'Archiviert',
        icon: '📦',
        variant: 'filter-chip--variant-warning'
      }
    ];
  }

  columns: ColumnConfig[] = [
    {
      key: 'code',
      label: 'Code',
      type: 'text',
      sortable: true,
      formatFn: (v, item) => item.autoApply ? `${v} ⚡` : v
    },
    {
      key: 'type',
      label: 'Typ',
      type: 'badge',
      formatFn: (v) => v === 'PERCENT' ? '% Prozent' : v === 'FIXED' ? '€ Betrag' : '🚚 Versand',
      badgeClass: (v) => v === 'PERCENT' ? 'status-confirmed' : v === 'FIXED' ? 'status-shipped' : 'status-processing'
    },
    {
      key: 'percentDiscount',
      label: 'Rabatt',
      type: 'text',
      formatFn: (v, item) => this.getDiscountText(item)
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      formatFn: (v) => v === 'ACTIVE' ? 'Aktiv' : v === 'PAUSED' ? 'Pausiert' : 'Archiviert',
      badgeClass: (v) => v === 'ACTIVE' ? 'status-active' : v === 'PAUSED' ? 'status-draft' : 'status-archived'
    },
    {
      key: 'timesUsedTotal',
      label: 'Verwendet',
      type: 'text',
      formatFn: (v, item) => item.usageLimitTotal ? `${v || 0} / ${item.usageLimitTotal}` : String(v || 0)
    },
    {
      key: 'startsAt',
      label: 'Gültig ab',
      type: 'date',
      hideOnMobile: true
    },
    {
      key: 'endsAt',
      label: 'Gültig bis',
      type: 'date',
      hideOnMobile: true
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (c) => this.onEdit(c)
    },
    {
      icon: '⏸',
      label: 'Pausieren',
      visible: (c) => c.status === 'ACTIVE',
      handler: (c) => this.onPause(c)
    },
    {
      icon: '▶️',
      label: 'Aktivieren',
      visible: (c) => c.status === 'PAUSED',
      handler: (c) => this.onResume(c)
    },
    {
      icon: '📦',
      label: 'Archivieren',
      class: 'danger',
      visible: (c) => c.status !== 'ARCHIVED',
      handler: (c) => this.onArchive(c)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private couponService: CouponService,
    private snackBar: MatSnackBar,
    private fabService: FabService
  ) {}

  ngOnDestroy(): void { this.fabService.clear(); }

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'navigation.store', route: ['/dashboard/stores', this.storeId], icon: '🏪' },
      { label: 'Gutscheine', icon: '🎟️' }
    ];
    this.headerActions = [
      { label: 'Neuer Gutschein', class: 'btn-primary', icon: '➕', onClick: () => this.onCreate() }
    ];
    this.loadCoupons();
    this.fabService.register({
      icon: '🎟',
      label: 'Gutschein erstellen',
      color: 'orange',
      action: () => this.onCreate()
    });
  }

  loadCoupons(): void {
    this.loading = true;
    this.couponService.listCoupons(this.storeId, this.statusFilter).subscribe({
      next: (coupons) => { this.coupons = coupons; this.loading = false; },
      error: (err) => {
        console.error(err);
        this.snackBar.open('❌ Fehler beim Laden der Coupons', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onFilterChange(status: string): void {
    this.statusFilter = status;
    this.loadCoupons();
  }

  onCreate(): void { this.router.navigate(['/dashboard', this.storeId, 'coupons', 'new']); }
  onEdit(coupon: CouponDTO): void { this.router.navigate(['/dashboard', this.storeId, 'coupons', coupon.id]); }

  onPause(coupon: CouponDTO): void {
    if (!coupon.id) return;
    this.couponService.pauseCoupon(this.storeId, coupon.id).subscribe({
      next: () => { this.snackBar.open('✅ Coupon pausiert', 'OK', { duration: 2000 }); this.loadCoupons(); },
      error: () => this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 })
    });
  }

  onResume(coupon: CouponDTO): void {
    if (!coupon.id) return;
    this.couponService.resumeCoupon(this.storeId, coupon.id).subscribe({
      next: () => { this.snackBar.open('✅ Coupon aktiviert', 'OK', { duration: 2000 }); this.loadCoupons(); },
      error: () => this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 })
    });
  }

  onArchive(coupon: CouponDTO): void {
    if (!coupon.id || !confirm(`Coupon "${coupon.code}" wirklich archivieren?`)) return;
    this.couponService.archiveCoupon(this.storeId, coupon.id).subscribe({
      next: () => { this.snackBar.open('✅ Coupon archiviert', 'OK', { duration: 2000 }); this.loadCoupons(); },
      error: () => this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 })
    });
  }

  onExport(): void {
    this.couponService.exportCoupons(this.storeId).subscribe({
      next: (csv) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `coupons-store-${this.storeId}.csv`; a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('✅ Export erfolgreich', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('❌ Export fehlgeschlagen', 'OK', { duration: 3000 })
    });
  }

  getDiscountText(coupon: CouponDTO): string {
    if (coupon.type === 'PERCENT') return `${coupon.percentDiscount}%`;
    if (coupon.type === 'FIXED') return `${((coupon.valueCents ?? 0) / 100).toFixed(2)} ${coupon.currency}`;
    return 'Gratisversand';
  }
}

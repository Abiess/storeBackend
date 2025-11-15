import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CouponService, CouponDTO } from '../../../core/services/coupon.service';

@Component({
  selector: 'app-coupons-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './coupons-list.component.html',
  styleUrls: ['./coupons-list.component.scss']
})
export class CouponsListComponent implements OnInit {
  storeId!: number;
  coupons: CouponDTO[] = [];
  loading = false;
  statusFilter = '';

  displayedColumns: string[] = ['code', 'type', 'discount', 'status', 'usage', 'dates', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private couponService: CouponService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.loading = true;
    this.couponService.listCoupons(this.storeId, this.statusFilter).subscribe({
      next: (coupons) => {
        this.coupons = coupons;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load coupons', err);
        this.snackBar.open('❌ Fehler beim Laden der Coupons', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onFilterChange(status: string): void {
    this.statusFilter = status;
    this.loadCoupons();
  }

  onCreate(): void {
    this.router.navigate(['/dashboard', this.storeId, 'coupons', 'new']);
  }

  onEdit(coupon: CouponDTO): void {
    this.router.navigate(['/dashboard', this.storeId, 'coupons', coupon.id]);
  }

  onPause(coupon: CouponDTO): void {
    if (!coupon.id) return;
    this.couponService.pauseCoupon(this.storeId, coupon.id).subscribe({
      next: () => {
        this.snackBar.open('✅ Coupon pausiert', 'OK', { duration: 2000 });
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Failed to pause coupon', err);
        this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 });
      }
    });
  }

  onResume(coupon: CouponDTO): void {
    if (!coupon.id) return;
    this.couponService.resumeCoupon(this.storeId, coupon.id).subscribe({
      next: () => {
        this.snackBar.open('✅ Coupon aktiviert', 'OK', { duration: 2000 });
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Failed to resume coupon', err);
        this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 });
      }
    });
  }

  onArchive(coupon: CouponDTO): void {
    if (!coupon.id) return;
    if (!confirm(`Coupon "${coupon.code}" wirklich archivieren?`)) return;

    this.couponService.archiveCoupon(this.storeId, coupon.id).subscribe({
      next: () => {
        this.snackBar.open('✅ Coupon archiviert', 'OK', { duration: 2000 });
        this.loadCoupons();
      },
      error: (err) => {
        console.error('Failed to archive coupon', err);
        this.snackBar.open('❌ Fehler', 'OK', { duration: 3000 });
      }
    });
  }

  onImport(): void {
    this.snackBar.open('ℹ️ Import-Feature kommt bald', 'OK', { duration: 2000 });
  }

  onExport(): void {
    this.couponService.exportCoupons(this.storeId).subscribe({
      next: (csv) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coupons-store-${this.storeId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('✅ Export erfolgreich', 'OK', { duration: 2000 });
      },
      error: (err) => {
        console.error('Failed to export', err);
        this.snackBar.open('❌ Export fehlgeschlagen', 'OK', { duration: 3000 });
      }
    });
  }

  getDiscountText(coupon: CouponDTO): string {
    if (coupon.type === 'PERCENT') {
      return `${coupon.percentDiscount}%`;
    } else if (coupon.type === 'FIXED') {
      return `${(coupon.valueCents! / 100).toFixed(2)} ${coupon.currency}`;
    } else {
      return 'Free Shipping';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'primary';
      case 'PAUSED': return 'accent';
      case 'ARCHIVED': return 'warn';
      default: return '';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  }
}


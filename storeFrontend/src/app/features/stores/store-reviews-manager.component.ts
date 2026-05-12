import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductReviewService, ProductReview } from '@app/core/services/product-review.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ProductnavigationBarComponent } from '@app/features/productnavigation-bar/productnavigation-bar.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';

@Component({
  selector: 'app-store-reviews-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ProductnavigationBarComponent, PageHeaderComponent],
  template: `
    <app-productnavigation-bar></app-productnavigation-bar>

    <div class="reviews-page">
      <app-page-header
        [title]="'reviews.customerReviews'"
        [subtitle]="'Kundenbewertungen verwalten, freigeben und analysieren'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <!-- ─── Statistik-Karten ─── -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-icon">📊</span>
          <div class="stat-data">
            <span class="stat-num">{{ totalReviews }}</span>
            <span class="stat-label">{{ 'reviews.totalReviews' | translate }}</span>
          </div>
        </div>
        <div class="stat-card warn">
          <span class="stat-icon">⏳</span>
          <div class="stat-data">
            <span class="stat-num">{{ pendingReviews }}</span>
            <span class="stat-label">{{ 'reviews.pendingApproval' | translate }}</span>
          </div>
        </div>
        <div class="stat-card success">
          <span class="stat-icon">✅</span>
          <div class="stat-data">
            <span class="stat-num">{{ approvedReviews }}</span>
            <span class="stat-label">{{ 'reviews.approved' | translate }}</span>
          </div>
        </div>
        <div class="stat-card accent">
          <span class="stat-icon">⭐</span>
          <div class="stat-data">
            <span class="stat-num">{{ averageRating.toFixed(1) }}</span>
            <span class="stat-label">Ø Bewertung</span>
          </div>
        </div>
      </div>

      <!-- ─── Bewertungsverteilung ─── -->
      <div class="rating-distribution" *ngIf="reviews.length > 0">
        <div class="dist-row" *ngFor="let star of [5,4,3,2,1]">
          <span class="dist-label">{{ star }} ★</span>
          <div class="dist-bar">
            <div class="dist-fill" [style.width.%]="getStarPercent(star)"></div>
          </div>
          <span class="dist-count">{{ getStarCount(star) }}</span>
        </div>
      </div>

      <!-- ─── Filter & Suche ─── -->
      <div class="toolbar">
        <div class="filter-group">
          <button class="filter-btn" [class.active]="filter === 'all'" (click)="setFilter('all')">
            {{ 'common.all' | translate }} ({{ totalReviews }})
          </button>
          <button class="filter-btn pending" [class.active]="filter === 'pending'" (click)="setFilter('pending')">
            ⏳ {{ 'reviews.pending' | translate }} ({{ pendingReviews }})
          </button>
          <button class="filter-btn approved" [class.active]="filter === 'approved'" (click)="setFilter('approved')">
            ✅ {{ 'reviews.approved' | translate }} ({{ approvedReviews }})
          </button>
        </div>
        <div class="search-box">
          <input type="text" placeholder="🔍 Bewertungen durchsuchen..." [(ngModel)]="searchTerm" (input)="applyFilter()" />
        </div>
        <div class="sort-box">
          <select [(ngModel)]="sortBy" (change)="applyFilter()">
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="highest">Beste zuerst</option>
            <option value="lowest">Schlechteste zuerst</option>
          </select>
        </div>
      </div>

      <!-- ─── Loading ─── -->
      <div *ngIf="loading" class="loading-box">
        <div class="spinner"></div>
        <p>{{ 'common.loading' | translate }}...</p>
      </div>

      <!-- ─── Empty State ─── -->
      <div *ngIf="!loading && filteredReviews.length === 0" class="empty-state">
        <span class="empty-icon">💬</span>
        <h3>{{ 'reviews.noReviews' | translate }}</h3>
        <p *ngIf="filter === 'all'">Noch keine Kundenbewertungen für diesen Shop vorhanden.</p>
        <p *ngIf="filter === 'pending'">Keine ausstehenden Bewertungen. Alles erledigt! 🎉</p>
        <p *ngIf="filter === 'approved'">Noch keine freigegebenen Bewertungen.</p>
      </div>

      <!-- ─── Batch-Aktionen ─── -->
      <div class="batch-bar" *ngIf="selectedIds.size > 0">
        <span class="batch-count">{{ selectedIds.size }} ausgewählt</span>
        <button class="btn btn-success btn-sm" (click)="batchApprove()">✅ Alle freigeben</button>
        <button class="btn btn-danger btn-sm" (click)="batchDelete()">🗑️ Alle löschen</button>
        <button class="btn btn-outline btn-sm" (click)="selectedIds.clear()">Auswahl aufheben</button>
      </div>

      <!-- ─── Review-Liste ─── -->
      <div class="reviews-list" *ngIf="!loading && filteredReviews.length > 0">
        <div class="review-card" *ngFor="let review of filteredReviews" [class.pending]="!review.isApproved">
          <div class="review-select">
            <input type="checkbox" [checked]="selectedIds.has(review.id)" (change)="toggleSelect(review.id)" />
          </div>

          <div class="review-body">
            <!-- Header -->
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-avatar">{{ getInitials(review.customerName) }}</div>
                <div>
                  <strong class="reviewer-name">{{ review.customerName }}</strong>
                  <span class="review-date">{{ review.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                </div>
              </div>
              <div class="review-badges">
                <span class="status-badge" [class.approved]="review.isApproved" [class.pending-badge]="!review.isApproved">
                  {{ review.isApproved ? '✅ Freigegeben' : '⏳ Ausstehend' }}
                </span>
                <span class="verified-badge" *ngIf="review.isVerifiedPurchase">
                  🛒 {{ 'reviews.verifiedPurchase' | translate }}
                </span>
              </div>
            </div>

            <!-- Rating -->
            <div class="review-rating">
              <div class="stars-display">
                <span *ngFor="let s of [1,2,3,4,5]" class="star" [class.filled]="s <= review.rating">★</span>
              </div>
              <span class="product-ref">Produkt #{{ review.productId }}</span>
            </div>

            <!-- Content -->
            <h4 class="review-title" *ngIf="review.title">{{ review.title }}</h4>
            <p class="review-comment">{{ review.comment || 'Kein Kommentar' }}</p>

            <!-- Helpfulness -->
            <div class="review-meta-row">
              <span class="helpful">👍 {{ review.helpfulCount }} hilfreich</span>
              <span class="not-helpful">👎 {{ review.notHelpfulCount }}</span>
              <span class="order-ref" *ngIf="review.orderId">📦 Bestellung #{{ review.orderId }}</span>
            </div>

            <!-- Actions -->
            <div class="review-actions">
              <button *ngIf="!review.isApproved" class="btn btn-success btn-sm" (click)="approveReview(review)">
                ✅ Freigeben
              </button>
              <button class="btn btn-danger-outline btn-sm" (click)="deleteReview(review)">
                🗑️ Löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Pagination ─── -->
      <div class="pagination" *ngIf="totalPages > 1">
        <button class="btn btn-outline btn-sm" [disabled]="currentPage === 0" (click)="loadPage(currentPage - 1)">
          ← {{ 'common.previous' | translate }}
        </button>
        <div class="page-numbers">
          <button *ngFor="let p of getPageNumbers()" class="page-btn" [class.active]="p === currentPage" (click)="loadPage(p)">
            {{ p + 1 }}
          </button>
        </div>
        <button class="btn btn-outline btn-sm" [disabled]="currentPage >= totalPages - 1" (click)="loadPage(currentPage + 1)">
          {{ 'common.next' | translate }} →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .reviews-page { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }

    /* ─── Stats ─── */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
    .stat-card {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 1rem 1.25rem; background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .stat-card.warn { border-left-color: #f59e0b; }
    .stat-card.success { border-left-color: #10b981; }
    .stat-card.accent { border-left-color: #f59e0b; }
    .stat-icon { font-size: 1.5rem; }
    .stat-data { display: flex; flex-direction: column; }
    .stat-num { font-size: 1.5rem; font-weight: 700; color: #1f2937; }
    .stat-label { font-size: 0.75rem; color: #6b7280; }

    /* ─── Rating Distribution ─── */
    .rating-distribution {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem;
      margin-bottom: 1.5rem; max-width: 400px;
    }
    .dist-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem; }
    .dist-label { font-size: 0.8rem; font-weight: 600; color: #6b7280; width: 35px; text-align: right; }
    .dist-bar { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
    .dist-fill { height: 100%; background: #f59e0b; border-radius: 4px; transition: width 0.4s; }
    .dist-count { font-size: 0.75rem; color: #9ca3af; width: 25px; }

    /* ─── Toolbar ─── */
    .toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; align-items: center; }
    .filter-group { display: flex; gap: 0.35rem; }
    .filter-btn {
      padding: 0.45rem 0.9rem; border: 1px solid #e5e7eb; background: white; border-radius: 8px;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #6b7280;
    }
    .filter-btn:hover { border-color: #667eea; color: #667eea; }
    .filter-btn.active { background: #667eea; color: white; border-color: #667eea; }
    .filter-btn.pending.active { background: #f59e0b; border-color: #f59e0b; }
    .filter-btn.approved.active { background: #10b981; border-color: #10b981; }
    .search-box { flex: 1; min-width: 200px; }
    .search-box input {
      width: 100%; padding: 0.5rem 0.85rem; border: 1px solid #e5e7eb; border-radius: 8px;
      font-size: 0.85rem; box-sizing: border-box;
    }
    .search-box input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .sort-box select {
      padding: 0.5rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 8px;
      font-size: 0.82rem; background: white;
    }

    /* ─── Loading / Empty ─── */
    .loading-box { display: flex; align-items: center; gap: 1rem; justify-content: center; padding: 3rem; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 3rem 2rem; background: white; border: 2px dashed #e5e7eb; border-radius: 12px; }
    .empty-icon { font-size: 3rem; }
    .empty-state h3 { margin: 0.75rem 0 0.3rem; }
    .empty-state p { color: #6b7280; }

    /* ─── Batch Bar ─── */
    .batch-bar {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; background: #667eea0a; border: 1px solid #667eea30;
      border-radius: 10px; margin-bottom: 1rem;
    }
    .batch-count { font-size: 0.85rem; font-weight: 600; color: #667eea; }

    /* ─── Review Cards ─── */
    .reviews-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .review-card {
      display: flex; gap: 0.85rem; background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem; transition: all 0.2s;
    }
    .review-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .review-card.pending { border-left: 4px solid #f59e0b; }
    .review-select { display: flex; align-items: flex-start; padding-top: 0.15rem; }
    .review-select input { width: 18px; height: 18px; cursor: pointer; accent-color: #667eea; }
    .review-body { flex: 1; min-width: 0; }
    .review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem; }
    .reviewer-info { display: flex; align-items: center; gap: 0.65rem; }
    .reviewer-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
    }
    .reviewer-name { font-size: 0.9rem; color: #1f2937; display: block; }
    .review-date { font-size: 0.72rem; color: #9ca3af; }
    .review-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .status-badge {
      padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
    }
    .status-badge.approved { background: #dcfce7; color: #166534; }
    .status-badge.pending-badge { background: #fef3c7; color: #92400e; }
    .verified-badge {
      padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600;
      background: #dbeafe; color: #1e40af;
    }

    .review-rating { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
    .stars-display { letter-spacing: 2px; }
    .star { color: #d1d5db; font-size: 1rem; }
    .star.filled { color: #f59e0b; }
    .product-ref { font-size: 0.72rem; color: #9ca3af; background: #f3f4f6; padding: 0.15rem 0.5rem; border-radius: 4px; }

    .review-title { margin: 0 0 0.3rem; font-size: 0.95rem; font-weight: 600; color: #1f2937; }
    .review-comment { margin: 0 0 0.6rem; font-size: 0.85rem; color: #4b5563; line-height: 1.5; }

    .review-meta-row { display: flex; gap: 1rem; font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.65rem; }
    .helpful { color: #10b981; }

    .review-actions { display: flex; gap: 0.4rem; justify-content: flex-end; }

    /* ─── Buttons ─── */
    .btn { padding: 0.45rem 0.85rem; border: none; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; }
    .btn-sm { padding: 0.35rem 0.7rem; font-size: 0.78rem; }
    .btn-success { background: #10b981; color: white; }
    .btn-success:hover { background: #059669; }
    .btn-danger-outline { border: 1.5px solid #ef4444; background: none; color: #ef4444; }
    .btn-danger-outline:hover { background: #ef4444; color: white; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-outline { border: 1.5px solid #667eea; background: none; color: #667eea; }
    .btn-outline:hover { background: #667eea; color: white; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ─── Pagination ─── */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; }
    .page-numbers { display: flex; gap: 0.25rem; }
    .page-btn {
      width: 32px; height: 32px; border: 1px solid #e5e7eb; background: white; border-radius: 6px;
      font-size: 0.82rem; cursor: pointer; transition: all 0.2s;
    }
    .page-btn:hover { border-color: #667eea; }
    .page-btn.active { background: #667eea; color: white; border-color: #667eea; }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .reviews-page { padding: 1rem; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .toolbar { flex-direction: column; }
      .filter-group { flex-wrap: wrap; }
      .review-card { flex-direction: column; }
      .review-header { flex-direction: column; }
      .review-actions { justify-content: flex-start; }
    }
  `]
})
export class StoreReviewsManagerComponent implements OnInit, OnDestroy {
  storeId!: number;
  reviews: ProductReview[] = [];
  filteredReviews: ProductReview[] = [];
  filter: 'all' | 'pending' | 'approved' = 'all';
  searchTerm = '';
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest';
  loading = false;
  currentPage = 0;
  totalPages = 1;
  totalReviews = 0;
  pendingReviews = 0;
  approvedReviews = 0;
  averageRating = 0;
  selectedIds = new Set<number>();
  headerActions: HeaderAction[] = [];

  breadcrumbItems: BreadcrumbItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reviewService: ProductReviewService
  ) {}

  ngOnInit(): void {
    // Store-ID 3-stufig extrahieren
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }

    if (id && !isNaN(Number(id))) {
      this.storeId = Number(id);
      this.breadcrumbItems = [
        { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
        { label: 'Shop', route: `/stores/${this.storeId}`, icon: '🏪' },
        { label: 'reviews.customerReviews', icon: '⭐' }
      ];
      this.loadReviews();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(): void {
    this.loading = true;
    this.reviewService.getStoreReviews(this.storeId, this.currentPage, 20).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.reviews = response.content || response || [];
        this.totalPages = response.totalPages || 1;
        this.updateStats();
        this.applyFilter();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading reviews:', err);
        this.reviews = [];
        this.filteredReviews = [];
        this.loading = false;
      }
    });
  }

  updateStats(): void {
    this.totalReviews = this.reviews.length;
    this.pendingReviews = this.reviews.filter(r => !r.isApproved).length;
    this.approvedReviews = this.reviews.filter(r => r.isApproved).length;
    this.averageRating = this.reviews.length > 0
      ? this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length
      : 0;
  }

  setFilter(filter: 'all' | 'pending' | 'approved'): void {
    this.filter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    let result = [...this.reviews];

    // Status-Filter
    if (this.filter === 'pending') result = result.filter(r => !r.isApproved);
    else if (this.filter === 'approved') result = result.filter(r => r.isApproved);

    // Textsuche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.customerName || '').toLowerCase().includes(term) ||
        (r.title || '').toLowerCase().includes(term) ||
        (r.comment || '').toLowerCase().includes(term)
      );
    }

    // Sortierung
    switch (this.sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'highest': result.sort((a, b) => b.rating - a.rating); break;
      case 'lowest': result.sort((a, b) => a.rating - b.rating); break;
    }

    this.filteredReviews = result;
  }

  approveReview(review: ProductReview): void {
    this.reviewService.approveReview(this.storeId, review.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        review.isApproved = true;
        this.updateStats();
        this.applyFilter();
      },
      error: (err: any) => console.error('Error approving review:', err)
    });
  }

  deleteReview(review: ProductReview): void {
    if (!confirm(`Bewertung von "${review.customerName}" wirklich löschen?`)) return;
    this.reviewService.deleteReview(this.storeId, review.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== review.id);
        this.selectedIds.delete(review.id);
        this.updateStats();
        this.applyFilter();
      },
      error: (err: any) => console.error('Error deleting review:', err)
    });
  }

  // ─── Batch-Aktionen ───
  toggleSelect(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  batchApprove(): void {
    const toApprove = this.reviews.filter(r => this.selectedIds.has(r.id) && !r.isApproved);
    toApprove.forEach(review => {
      this.reviewService.approveReview(this.storeId, review.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        review.isApproved = true;
        this.updateStats();
        this.applyFilter();
      });
    });
    this.selectedIds.clear();
  }

  batchDelete(): void {
    if (!confirm(`${this.selectedIds.size} Bewertungen wirklich löschen?`)) return;
    this.selectedIds.forEach(id => {
      this.reviewService.deleteReview(this.storeId, id).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.reviews = this.reviews.filter(r => r.id !== id);
        this.updateStats();
        this.applyFilter();
      });
    });
    this.selectedIds.clear();
  }

  // ─── Helpers ───
  getInitials(name: string): string {
    return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getStarCount(star: number): number {
    return this.reviews.filter(r => r.rating === star).length;
  }

  getStarPercent(star: number): number {
    return this.reviews.length > 0 ? (this.getStarCount(star) / this.reviews.length) * 100 : 0;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const max = Math.min(this.totalPages, 7);
    const start = Math.max(0, this.currentPage - 3);
    for (let i = start; i < start + max && i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadReviews();
  }
}


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductReviewService, ProductReview } from '@app/core/services/product-review.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-store-reviews-manager',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="reviews-manager">
      <div class="header">
        <h1>{{ 'reviews.customerReviews' | translate }}</h1>
        <div class="stats">
          <div class="stat-card">
            <span class="stat-number">{{ totalReviews }}</span>
            <span class="stat-label">{{ 'reviews.totalReviews' | translate }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ pendingReviews }}</span>
            <span class="stat-label">{{ 'reviews.pendingApproval' | translate }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">{{ approvedReviews }}</span>
            <span class="stat-label">{{ 'reviews.approved' | translate }}</span>
          </div>
        </div>
      </div>

      <div class="filters">
        <button 
          class="filter-btn" 
          [class.active]="filter === 'all'" 
          (click)="setFilter('all')">
          {{ 'common.all' | translate }}
        </button>
        <button 
          class="filter-btn" 
          [class.active]="filter === 'pending'" 
          (click)="setFilter('pending')">
          {{ 'reviews.pending' | translate }}
        </button>
        <button 
          class="filter-btn" 
          [class.active]="filter === 'approved'" 
          (click)="setFilter('approved')">
          {{ 'reviews.approved' | translate }}
        </button>
      </div>

      <div class="reviews-list">
        <div class="loading" *ngIf="loading">{{ 'common.loading' | translate }}...</div>

        <div class="no-reviews" *ngIf="!loading && filteredReviews.length === 0">
          <p>{{ 'reviews.noReviews' | translate }}</p>
        </div>

        <div class="review-card" *ngFor="let review of filteredReviews">
          <div class="review-header">
            <div class="product-info">
              <span class="product-id">Product #{{ review.productId }}</span>
            </div>
            <div class="review-status">
              <span class="badge" [class.approved]="review.isApproved" [class.pending]="!review.isApproved">
                {{ review.isApproved ? ('reviews.approved' | translate) : ('reviews.pending' | translate) }}
              </span>
              <span class="verified-badge" *ngIf="review.isVerifiedPurchase">
                ✓ {{ 'reviews.verifiedPurchase' | translate }}
              </span>
            </div>
          </div>

          <div class="review-content">
            <div class="review-meta">
              <div class="rating">
                <span *ngFor="let star of [1,2,3,4,5]" class="star" 
                      [class.filled]="star <= review.rating">★</span>
              </div>
              <span class="customer-name">{{ review.customerName }}</span>
              <span class="review-date">{{ review.createdAt | date:'medium' }}</span>
            </div>

            <h4 class="review-title" *ngIf="review.title">{{ review.title }}</h4>
            <p class="review-comment">{{ review.comment }}</p>

            <div class="review-stats">
              <span>👍 {{ review.helpfulCount }}</span>
              <span>👎 {{ review.notHelpfulCount }}</span>
            </div>
          </div>

          <div class="review-actions">
            <button 
              *ngIf="!review.isApproved" 
              class="btn btn-success"
              (click)="approveReview(review)">
              {{ 'reviews.approve' | translate }}
            </button>
            <button 
              class="btn btn-danger"
              (click)="deleteReview(review)">
              {{ 'common.delete' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="totalPages > 1">
        <button 
          class="btn" 
          [disabled]="currentPage === 0"
          (click)="loadPage(currentPage - 1)">
          {{ 'common.previous' | translate }}
        </button>
        <span class="page-info">
          {{ 'common.page' | translate }} {{ currentPage + 1 }} / {{ totalPages }}
        </span>
        <button 
          class="btn" 
          [disabled]="currentPage >= totalPages - 1"
          (click)="loadPage(currentPage + 1)">
          {{ 'common.next' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .reviews-manager {
      padding: 2rem;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header h1 {
      margin-bottom: 1rem;
    }

    .stats {
      display: flex;
      gap: 1rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #007bff;
    }

    .stat-label {
      color: #666;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .filter-btn {
      padding: 0.7rem 1.5rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: #f5f5f5;
    }

    .filter-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .loading, .no-reviews {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .review-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .product-info {
      font-weight: 600;
      color: #333;
    }

    .review-status {
      display: flex;
      gap: 0.5rem;
    }

    .badge {
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .badge.approved {
      background: #d4edda;
      color: #155724;
    }

    .badge.pending {
      background: #fff3cd;
      color: #856404;
    }

    .verified-badge {
      background: #4caf50;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.85rem;
    }

    .review-content {
      margin-bottom: 1rem;
    }

    .review-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .rating {
      color: #ffa500;
    }

    .star {
      color: #ddd;
    }

    .star.filled {
      color: #ffa500;
    }

    .customer-name {
      font-weight: 600;
    }

    .review-date {
      color: #666;
      font-size: 0.9rem;
    }

    .review-title {
      margin: 0.5rem 0;
      font-size: 1.1rem;
    }

    .review-comment {
      color: #444;
      line-height: 1.6;
      margin: 1rem 0;
    }

    .review-stats {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #666;
    }

    .review-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
    }

    .page-info {
      color: #666;
    }
  `]
})
export class StoreReviewsManagerComponent implements OnInit {
  storeId!: number;
  reviews: ProductReview[] = [];
  filteredReviews: ProductReview[] = [];
  filter: 'all' | 'pending' | 'approved' = 'all';
  loading = false;
  currentPage = 0;
  totalPages = 1;
  totalReviews = 0;
  pendingReviews = 0;
  approvedReviews = 0;

  constructor(
    private route: ActivatedRoute,
    private reviewService: ProductReviewService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['id'] || +params['storeId'];
      if (this.storeId) {
        this.loadReviews();
      }
    });
  }

  loadReviews(): void {
    this.loading = true;
    this.reviewService.getStoreReviews(this.storeId, this.currentPage, 20).subscribe({
      next: (response: any) => {
        this.reviews = response.content || response;
        this.totalPages = response.totalPages || 1;
        this.updateStats();
        this.applyFilter();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading reviews:', err);
        this.loading = false;
      }
    });
  }

  updateStats(): void {
    this.totalReviews = this.reviews.length;
    this.pendingReviews = this.reviews.filter(r => !r.isApproved).length;
    this.approvedReviews = this.reviews.filter(r => r.isApproved).length;
  }

  setFilter(filter: 'all' | 'pending' | 'approved'): void {
    this.filter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    switch (this.filter) {
      case 'pending':
        this.filteredReviews = this.reviews.filter(r => !r.isApproved);
        break;
      case 'approved':
        this.filteredReviews = this.reviews.filter(r => r.isApproved);
        break;
      default:
        this.filteredReviews = this.reviews;
    }
  }

  approveReview(review: ProductReview): void {
    if (confirm('Approve this review?')) {
      this.reviewService.approveReview(this.storeId, review.id).subscribe({
        next: () => {
          review.isApproved = true;
          this.updateStats();
          this.applyFilter();
        },
        error: (err: any) => console.error('Error approving review:', err)
      });
    }
  }

  deleteReview(review: ProductReview): void {
    if (confirm('Delete this review? This action cannot be undone.')) {
      this.reviewService.deleteReview(this.storeId, review.id).subscribe({
        next: () => {
          this.reviews = this.reviews.filter(r => r.id !== review.id);
          this.updateStats();
          this.applyFilter();
        },
        error: (err: any) => console.error('Error deleting review:', err)
      });
    }
  }

  loadPage(page: number): void {
    this.currentPage = page;
    this.loadReviews();
  }
}


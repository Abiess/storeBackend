import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductReviewService, ProductReview, CreateReviewRequest } from '@app/core/services/product-review.service';
import { AuthService } from '@app/core/services/auth.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="reviews-container">
      <!-- Rating Summary -->
      <div class="rating-summary" *ngIf="stats">
        <div class="overall-rating">
          <div class="rating-number">{{ stats.averageRating | number:'1.1-1' }}</div>
          <div class="stars">
            <span *ngFor="let star of [1,2,3,4,5]" class="star" 
                  [class.filled]="star <= stats.averageRating">★</span>
          </div>
          <div class="review-count">{{ stats.totalApprovedReviews }} {{ 'reviews.reviews' | translate }}</div>
        </div>

        <div class="rating-distribution">
          <div class="rating-bar" *ngFor="let i of [5,4,3,2,1]">
            <span class="rating-label">{{ i }} ★</span>
            <div class="bar-container">
              <div class="bar-fill" 
                   [style.width.%]="getPercentage(i)"></div>
            </div>
            <span class="rating-count">{{ getRatingCount(i) }}</span>
          </div>
        </div>
      </div>

      <!-- Write Review Button -->
      <div class="write-review-section" *ngIf="!showReviewForm">
        <button class="btn btn-primary" (click)="toggleReviewForm()" *ngIf="isLoggedIn">
          {{ 'reviews.writeReview' | translate }}
        </button>
        <p class="login-hint" *ngIf="!isLoggedIn">
          {{ 'reviews.loginToReview' | translate }}
        </p>
      </div>

      <!-- Review Form -->
      <div class="review-form" *ngIf="showReviewForm">
        <h3>{{ 'reviews.writeYourReview' | translate }}</h3>
        <form [formGroup]="reviewForm" (ngSubmit)="submitReview()">
          <!-- Star Rating Input -->
          <div class="form-group">
            <label>{{ 'reviews.yourRating' | translate }}</label>
            <div class="star-input">
              <span *ngFor="let star of [1,2,3,4,5]" 
                    class="star clickable"
                    [class.filled]="star <= selectedRating"
                    (click)="setRating(star)"
                    (mouseenter)="hoverRating = star"
                    (mouseleave)="hoverRating = 0">★</span>
            </div>
            <div class="error" *ngIf="reviewForm.get('rating')?.invalid && reviewForm.get('rating')?.touched">
              {{ 'reviews.ratingRequired' | translate }}
            </div>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label for="title">{{ 'reviews.title' | translate }}</label>
            <input id="title" type="text" formControlName="title" 
                   [placeholder]="'reviews.titlePlaceholder' | translate">
          </div>

          <!-- Comment -->
          <div class="form-group">
            <label for="comment">{{ 'reviews.yourReview' | translate }}</label>
            <textarea id="comment" formControlName="comment" rows="5"
                      [placeholder]="'reviews.commentPlaceholder' | translate"></textarea>
            <div class="error" *ngIf="reviewForm.get('comment')?.invalid && reviewForm.get('comment')?.touched">
              {{ 'reviews.commentRequired' | translate }}
            </div>
          </div>

          <!-- Error/Success Messages -->
          <div class="alert alert-error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>

          <!-- Buttons -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="cancelReview()">
              {{ 'common.cancel' | translate }}
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="reviewForm.invalid || submitting">
              {{ submitting ? ('common.submitting' | translate) : ('reviews.submitReview' | translate) }}
            </button>
          </div>
        </form>
      </div>

      <!-- Reviews List -->
      <div class="reviews-list">
        <h3>{{ 'reviews.customerReviews' | translate }}</h3>
        
        <div class="no-reviews" *ngIf="reviews.length === 0">
          <p>{{ 'reviews.noReviews' | translate }}</p>
        </div>

        <div class="review-item" *ngFor="let review of reviews">
          <div class="review-header">
            <div class="reviewer-info">
              <span class="reviewer-name">{{ review.customerName }}</span>
              <span class="verified-badge" *ngIf="review.isVerifiedPurchase">
                ✓ {{ 'reviews.verifiedPurchase' | translate }}
              </span>
            </div>
            <div class="review-date">{{ review.createdAt | date:'shortDate' }}</div>
          </div>

          <div class="review-rating">
            <span *ngFor="let star of [1,2,3,4,5]" class="star" 
                  [class.filled]="star <= review.rating">★</span>
          </div>

          <h4 class="review-title" *ngIf="review.title">{{ review.title }}</h4>
          <p class="review-comment">{{ review.comment }}</p>

          <!-- Helpful Voting -->
          <div class="review-actions">
            <span class="helpful-text">{{ 'reviews.wasHelpful' | translate }}</span>
            <button class="btn-vote" 
                    [disabled]="review.currentUserVoted"
                    (click)="voteHelpful(review, true)">
              👍 {{ 'reviews.yes' | translate }} ({{ review.helpfulCount }})
            </button>
            <button class="btn-vote" 
                    [disabled]="review.currentUserVoted"
                    (click)="voteHelpful(review, false)">
              👎 {{ 'reviews.no' | translate }} ({{ review.notHelpfulCount }})
            </button>
            <span class="voted-indicator" *ngIf="review.currentUserVoted">
              {{ 'reviews.youVoted' | translate }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reviews-container {
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .rating-summary {
      display: flex;
      gap: 3rem;
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .overall-rating {
      text-align: center;
    }

    .rating-number {
      font-size: 3rem;
      font-weight: bold;
      color: #333;
    }

    .stars {
      font-size: 1.5rem;
      color: #ffa500;
    }

    .star {
      color: #ddd;
    }

    .star.filled {
      color: #ffa500;
    }

    .star.clickable {
      cursor: pointer;
      transition: transform 0.2s;
    }

    .star.clickable:hover {
      transform: scale(1.2);
    }

    .review-count {
      margin-top: 0.5rem;
      color: #666;
    }

    .rating-distribution {
      flex: 1;
    }

    .rating-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .rating-label {
      width: 40px;
      color: #666;
    }

    .bar-container {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: #ffa500;
      transition: width 0.3s;
    }

    .rating-count {
      width: 40px;
      text-align: right;
      color: #666;
      font-size: 0.9rem;
    }

    .write-review-section {
      margin: 2rem 0;
      text-align: center;
    }

    .login-hint {
      color: #666;
      margin-top: 1rem;
    }

    .review-form {
      background: #f9f9f9;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .star-input {
      font-size: 2rem;
      margin: 0.5rem 0;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .reviews-list {
      margin-top: 2rem;
    }

    .no-reviews {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .review-item {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .review-item:last-child {
      border-bottom: none;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .reviewer-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .reviewer-name {
      font-weight: 600;
    }

    .verified-badge {
      background: #4caf50;
      color: white;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }

    .review-date {
      color: #666;
      font-size: 0.9rem;
    }

    .review-rating {
      margin-bottom: 0.5rem;
    }

    .review-title {
      font-size: 1.1rem;
      margin: 0.5rem 0;
    }

    .review-comment {
      color: #444;
      line-height: 1.6;
      margin: 1rem 0;
    }

    .review-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .helpful-text {
      color: #666;
      font-size: 0.9rem;
    }

    .btn-vote {
      background: white;
      border: 1px solid #ddd;
      padding: 0.4rem 1rem;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-vote:hover:not(:disabled) {
      background: #f5f5f5;
      border-color: #999;
    }

    .btn-vote:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .voted-indicator {
      color: #4caf50;
      font-size: 0.9rem;
    }

    .btn {
      padding: 0.7rem 1.5rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.7rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
    }

    .form-group textarea {
      resize: vertical;
      font-family: inherit;
    }

    .error {
      color: #dc3545;
      font-size: 0.9rem;
      margin-top: 0.3rem;
    }

    .alert {
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
  `]
})
export class ProductReviewsComponent implements OnInit {
  @Input() productId!: number;

  reviews: ProductReview[] = [];
  stats: any = null;
  showReviewForm = false;
  reviewForm: FormGroup;
  selectedRating = 0;
  hoverRating = 0;
  isLoggedIn = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private reviewService: ProductReviewService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1)]],
      title: [''],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadReviews();
    this.loadStats();
  }

  loadReviews(): void {
    this.reviewService.getProductReviews(this.productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
      },
      error: (err) => console.error('Error loading reviews:', err)
    });
  }

  loadStats(): void {
    this.reviewService.getProductReviewStats(this.productId).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (err) => console.error('Error loading stats:', err)
    });
  }

  setRating(rating: number): void {
    this.selectedRating = rating;
    this.reviewForm.patchValue({ rating });
  }

  toggleReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    if (!this.showReviewForm) {
      this.resetForm();
    }
  }

  submitReview(): void {
    if (this.reviewForm.invalid) return;

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: CreateReviewRequest = {
      productId: this.productId,
      rating: this.reviewForm.value.rating,
      title: this.reviewForm.value.title,
      comment: this.reviewForm.value.comment
    };

    this.reviewService.createReview(request).subscribe({
      next: () => {
        this.successMessage = 'Thank you! Your review has been submitted and is pending approval.';
        this.resetForm();
        this.showReviewForm = false;
        this.submitting = false;
        setTimeout(() => {
          this.loadReviews();
          this.loadStats();
        }, 1000);
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to submit review. Please try again.';
        this.submitting = false;
      }
    });
  }

  cancelReview(): void {
    this.showReviewForm = false;
    this.resetForm();
  }

  resetForm(): void {
    this.reviewForm.reset();
    this.selectedRating = 0;
    this.errorMessage = '';
    this.successMessage = '';
  }

  voteHelpful(review: ProductReview, helpful: boolean): void {
    if (!this.isLoggedIn) {
      this.errorMessage = 'Please login to vote on reviews';
      return;
    }

    this.reviewService.voteReview(review.id, helpful).subscribe({
      next: () => {
        this.loadReviews();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Failed to vote';
      }
    });
  }

  getPercentage(rating: number): number {
    if (!this.stats || this.stats.totalApprovedReviews === 0) return 0;
    const count = this.getRatingCount(rating);
    return (count / this.stats.totalApprovedReviews) * 100;
  }

  getRatingCount(rating: number): number {
    if (!this.stats) return 0;
    switch (rating) {
      case 5: return this.stats.fiveStarCount || 0;
      case 4: return this.stats.fourStarCount || 0;
      case 3: return this.stats.threeStarCount || 0;
      case 2: return this.stats.twoStarCount || 0;
      case 1: return this.stats.oneStarCount || 0;
      default: return 0;
    }
  }
}


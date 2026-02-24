import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ProductReview {
  id: number;
  productId: number;
  customerId: number;
  customerName: string;
  orderId?: number;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  currentUserVoted?: boolean;
  currentUserVotedHelpful?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductReviewStats {
  productId: number;
  averageRating: number;
  totalReviews: number;
  totalApprovedReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  recentReviews: ProductReview[];
}

export interface CreateReviewRequest {
  productId: number;
  orderId?: number;
  rating: number;
  title?: string;
  comment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductReviewService {
  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all approved reviews for a product (PUBLIC)
   */
  getProductReviews(productId: number): Observable<ProductReview[]> {
    return this.http.get<ProductReview[]>(`${this.baseUrl}/products/${productId}/reviews`);
  }

  /**
   * Get product review statistics (PUBLIC)
   */
  getProductReviewStats(productId: number): Observable<ProductReviewStats> {
    return this.http.get<ProductReviewStats>(`${this.baseUrl}/products/${productId}/reviews/stats`);
  }

  /**
   * Create a review (AUTHENTICATED)
   */
  createReview(request: CreateReviewRequest): Observable<ProductReview> {
    return this.http.post<ProductReview>(
      `${this.baseUrl}/products/${request.productId}/reviews`,
      request
    );
  }

  /**
   * Get current user's reviews (AUTHENTICATED)
   */
  getMyReviews(): Observable<ProductReview[]> {
    return this.http.get<ProductReview[]>(`${this.baseUrl}/customer/reviews`);
  }

  /**
   * Vote on a review (AUTHENTICATED)
   */
  voteReview(reviewId: number, helpful: boolean): Observable<ProductReview> {
    return this.http.post<ProductReview>(
      `${this.baseUrl}/reviews/${reviewId}/vote`,
      null,
      { params: { helpful: helpful.toString() } }
    );
  }

  /**
   * Get all reviews for store products (STORE OWNER)
   */
  getStoreReviews(storeId: number, page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get(`${this.baseUrl}/stores/${storeId}/reviews`, { params });
  }

  /**
   * Approve a review (STORE OWNER)
   */
  approveReview(storeId: number, reviewId: number): Observable<ProductReview> {
    return this.http.put<ProductReview>(
      `${this.baseUrl}/stores/${storeId}/reviews/${reviewId}/approve`,
      null
    );
  }

  /**
   * Delete a review (STORE OWNER)
   */
  deleteReview(storeId: number, reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/stores/${storeId}/reviews/${reviewId}`);
  }

  /**
   * Get pending reviews (ADMIN)
   */
  getPendingReviews(page: number = 0, size: number = 20): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get(`${this.baseUrl}/admin/reviews/pending`, { params });
  }
}


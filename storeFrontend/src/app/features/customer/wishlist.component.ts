import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WishlistService, Wishlist, WishlistItem } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wishlist">
      <div class="header">
        <h2>💝 Meine Wunschliste</h2>
        <div class="header-actions">
          <button class="btn btn-share" (click)="shareWishlist()" *ngIf="wishlist">
            🔗 Teilen
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Lädt...</div>

      <div class="wishlist-grid" *ngIf="!loading && wishlist && wishlist.items.length > 0; else emptyWishlist">
        <div class="wishlist-item" *ngFor="let item of wishlist.items">
          <div class="item-image-container">
            <img [src]="item.productImageUrl || '/assets/placeholder.png'" 
                 [alt]="item.productTitle" 
                 class="item-image"
                 onerror="this.src='/assets/placeholder.png'">
            <span class="priority-badge" [class]="'priority-' + item.priority.toLowerCase()">
              {{ getPriorityLabel(item.priority) }}
            </span>
          </div>
          <div class="item-details">
            <h3>{{ item.productTitle }}</h3>
            <p class="item-price">{{ item.productPrice | currency:'EUR' }}</p>
            <p class="stock-status" [class.out-of-stock]="!item.inStock">
              {{ item.inStock ? '✓ Auf Lager' : '✗ Nicht verfügbar' }}
            </p>
            <p class="item-note" *ngIf="item.note">
              <em>"{{ item.note }}"</em>
            </p>
            <p class="added-date">Hinzugefügt: {{ item.addedAt | date:'dd.MM.yyyy' }}</p>
          </div>
          <div class="item-actions">
            <button class="btn btn-primary" *ngIf="item.inStock" [routerLink]="['/storefront/product', item.productId]">
              🛒 Zum Produkt
            </button>
            <button class="btn btn-secondary" (click)="removeFromWishlist(item.id)">
              🗑️ Entfernen
            </button>
          </div>
        </div>
      </div>

      <ng-template #emptyWishlist>
        <div class="empty-message" *ngIf="!loading">
          <div class="empty-icon">💝</div>
          <h3>Ihre Wunschliste ist leer</h3>
          <p>Fügen Sie Produkte hinzu, um sie später zu kaufen!</p>
          <button class="btn btn-primary" routerLink="/storefront">
            Produkte entdecken
          </button>
        </div>
      </ng-template>

      <!-- Share Modal -->
      <div class="share-modal" *ngIf="showShareModal">
        <div class="modal-content">
          <h3>🔗 Wunschliste teilen</h3>
          <p>Teilen Sie Ihre Wunschliste mit Freunden und Familie!</p>
          <div class="share-link" *ngIf="shareToken">
            <input type="text" [value]="getShareUrl()" readonly #shareInput>
            <button class="btn btn-primary" (click)="copyShareLink(shareInput)">
              📋 Kopieren
            </button>
          </div>
          <div class="share-info">
            <p>✓ Wunschliste ist jetzt öffentlich</p>
            <p>✓ Andere können sehen, was Sie sich wünschen</p>
            <p>✓ Niemand kann Ihre Liste bearbeiten</p>
          </div>
          <button class="btn btn-secondary" (click)="showShareModal = false">
            Schließen
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wishlist {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header h2 {
      margin: 0;
      font-size: 2rem;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }
    .wishlist-grid {
      display: grid;
      gap: 1.5rem;
    }
    .wishlist-item {
      display: grid;
      grid-template-columns: 200px 1fr auto;
      gap: 1.5rem;
      padding: 1.5rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.3s;
    }
    .wishlist-item:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
    }
    .item-image-container {
      position: relative;
    }
    .item-image {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
    }
    .priority-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .priority-high {
      background: #fee2e2;
      color: #dc2626;
    }
    .priority-medium {
      background: #fef3c7;
      color: #d97706;
    }
    .priority-low {
      background: #e0e7ff;
      color: #4f46e5;
    }
    .item-details {
      flex: 1;
    }
    .item-details h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1.25rem;
    }
    .item-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2563eb;
      margin: 0.5rem 0;
    }
    .stock-status {
      color: #059669;
      font-weight: 600;
      margin: 0.5rem 0;
    }
    .stock-status.out-of-stock {
      color: #dc2626;
    }
    .item-note {
      color: #6b7280;
      font-style: italic;
      margin: 0.5rem 0;
    }
    .added-date {
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0.5rem 0;
    }
    .item-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-share {
      background: #8b5cf6;
      color: white;
    }
    .empty-message {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }
    .empty-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
    }
    .empty-message h3 {
      font-size: 1.5rem;
      margin: 1rem 0;
      color: #374151;
    }
    .loading {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
      font-size: 1.125rem;
    }
    .share-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
    }
    .modal-content h3 {
      margin: 0 0 1rem 0;
    }
    .share-link {
      display: flex;
      gap: 0.5rem;
      margin: 1.5rem 0;
    }
    .share-link input {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.875rem;
    }
    .share-info {
      background: #f0fdf4;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    .share-info p {
      margin: 0.5rem 0;
      color: #059669;
    }
    @media (max-width: 768px) {
      .wishlist-item {
        grid-template-columns: 1fr;
      }
      .item-actions {
        flex-direction: row;
      }
    }
  `]
})
export class WishlistComponent implements OnInit {
  wishlist: Wishlist | null = null;
  loading = false;
  showShareModal = false;
  shareToken: string | null = null;
  storeId = 1; // TODO: Get from context/route

  constructor(private wishlistService: WishlistService) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.loading = true;
    this.wishlistService.getDefaultWishlist(this.storeId).subscribe({
      next: (wishlist) => {
        this.wishlist = wishlist;
        this.shareToken = wishlist.shareToken || null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Wunschliste:', error);
        this.loading = false;
      }
    });
  }

  removeFromWishlist(itemId: number): void {
    if (!this.wishlist) return;

    if (confirm('Möchten Sie dieses Produkt aus Ihrer Wunschliste entfernen?')) {
      this.wishlistService.removeFromWishlist(this.wishlist.id, itemId).subscribe({
        next: () => this.loadWishlist(),
        error: (error) => console.error('Fehler beim Entfernen:', error)
      });
    }
  }

  shareWishlist(): void {
    if (!this.wishlist) return;

    this.wishlistService.shareWishlist(this.wishlist.id, true).subscribe({
      next: (response) => {
        this.shareToken = response.shareToken;
        this.showShareModal = true;
      },
      error: (error) => console.error('Fehler beim Teilen:', error)
    });
  }

  getShareUrl(): string {
    return `${window.location.origin}/storefront/wishlist/shared/${this.shareToken}`;
  }

  copyShareLink(input: HTMLInputElement): void {
    input.select();
    document.execCommand('copy');
    alert('Link wurde in die Zwischenablage kopiert!');
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'HIGH': '⭐⭐⭐',
      'MEDIUM': '⭐⭐',
      'LOW': '⭐'
    };
    return labels[priority] || priority;
  }
}

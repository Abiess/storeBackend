import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
}

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="wishlist">
      <h2>Meine Wunschliste</h2>
      <div class="wishlist-grid" *ngIf="items.length > 0; else emptyWishlist">
        <div class="wishlist-item" *ngFor="let item of items">
          <img [src]="item.imageUrl" [alt]="item.name" class="item-image">
          <div class="item-details">
            <h3>{{item.name}}</h3>
            <p class="item-price">{{item.price | currency:'EUR'}}</p>
            <p class="stock-status" [class.out-of-stock]="!item.inStock">
              {{item.inStock ? 'Auf Lager' : 'Nicht verfügbar'}}
            </p>
          </div>
          <div class="item-actions">
            <button class="btn btn-primary" *ngIf="item.inStock" (click)="addToCart(item)">
              In den Warenkorb
            </button>
            <button class="btn btn-secondary" (click)="removeFromWishlist(item.id)">
              Entfernen
            </button>
          </div>
        </div>
      </div>
      <ng-template #emptyWishlist>
        <p class="empty-message">Ihre Wunschliste ist leer.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .wishlist {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .wishlist-grid {
      display: grid;
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .wishlist-item {
      display: grid;
      grid-template-columns: 150px 1fr auto;
      gap: 1.5rem;
      padding: 1.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .item-image {
      width: 150px;
      height: 150px;
      object-fit: cover;
      border-radius: 4px;
    }
    .item-details h3 {
      margin: 0 0 0.5rem 0;
    }
    .item-price {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0.5rem 0;
    }
    .stock-status {
      color: #059669;
      font-weight: 500;
    }
    .stock-status.out-of-stock {
      color: #dc2626;
    }
    .item-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .empty-message {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
  `]
})
export class WishlistComponent implements OnInit {
  items: WishlistItem[] = [];

  ngOnInit() {
    this.loadWishlist();
  }

  loadWishlist() {
    // TODO: Load from service
    this.items = [];
  }

  addToCart(item: WishlistItem) {
    // TODO: Implement add to cart
    console.log('Add to cart:', item);
  }

  removeFromWishlist(id: number) {
    // TODO: Implement remove from wishlist
    this.items = this.items.filter(item => item.id !== id);
  }
}


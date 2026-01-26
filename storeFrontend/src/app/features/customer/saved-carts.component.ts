import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SavedCart {
  id: number;
  name: string;
  createdDate: Date;
  itemCount: number;
  total: number;
}

@Component({
  selector: 'app-saved-carts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="saved-carts">
      <h2>Gespeicherte Warenkörbe</h2>
      <div class="carts-list" *ngIf="carts.length > 0; else emptyCarts">
        <div class="cart-card" *ngFor="let cart of carts">
          <div class="cart-header">
            <h3>{{cart.name}}</h3>
            <span class="cart-date">{{cart.createdDate | date:'dd.MM.yyyy'}}</span>
          </div>
          <div class="cart-info">
            <p>{{cart.itemCount}} Artikel</p>
            <p class="cart-total">{{cart.total | currency:'EUR'}}</p>
          </div>
          <div class="cart-actions">
            <button class="btn btn-primary" (click)="restoreCart(cart.id)">
              Wiederherstellen
            </button>
            <button class="btn btn-secondary" (click)="deleteCart(cart.id)">
              Löschen
            </button>
          </div>
        </div>
      </div>
      <ng-template #emptyCarts>
        <p class="empty-message">Sie haben keine gespeicherten Warenkörbe.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .saved-carts {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .carts-list {
      display: grid;
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .cart-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .cart-header h3 {
      margin: 0;
    }
    .cart-date {
      color: #666;
      font-size: 0.9rem;
    }
    .cart-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1rem;
      color: #666;
    }
    .cart-total {
      font-weight: 600;
      color: #000;
    }
    .cart-actions {
      display: flex;
      gap: 1rem;
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
export class SavedCartsComponent implements OnInit {
  carts: SavedCart[] = [];

  ngOnInit() {
    this.loadSavedCarts();
  }

  loadSavedCarts() {
    // TODO: Load from service
    this.carts = [];
  }

  restoreCart(id: number) {
    // TODO: Implement restore cart
    console.log('Restore cart:', id);
  }

  deleteCart(id: number) {
    // TODO: Implement delete cart
    this.carts = this.carts.filter(cart => cart.id !== id);
  }
}

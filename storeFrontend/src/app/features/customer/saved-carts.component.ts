import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SavedCartService, SavedCart } from '../../core/services/saved-cart.service';

@Component({
  selector: 'app-saved-carts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="saved-carts">
      <div class="header">
        <h2>🛒 Gespeicherte Warenkörbe</h2>
      </div>

      <div *ngIf="loading" class="loading">Lädt...</div>

      <div class="carts-list" *ngIf="!loading && carts.length > 0; else emptyCarts">
        <div class="cart-card" *ngFor="let cart of carts" [class.expired]="cart.isExpired">
          <div class="cart-header">
            <div>
              <h3>{{ cart.name }}</h3>
              <span class="cart-description" *ngIf="cart.description">{{ cart.description }}</span>
            </div>
            <span class="expired-badge" *ngIf="cart.isExpired">⚠️ Abgelaufen</span>
          </div>
          
          <div class="cart-meta">
            <div class="meta-item">
              <span class="meta-label">Erstellt:</span>
              <span class="meta-value">{{ cart.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
            </div>
            <div class="meta-item" *ngIf="cart.expiresAt">
              <span class="meta-label">Läuft ab:</span>
              <span class="meta-value" [class.expired-text]="cart.isExpired">
                {{ cart.expiresAt | date:'dd.MM.yyyy' }}
              </span>
            </div>
          </div>

          <div class="cart-summary">
            <div class="summary-item">
              <span class="summary-icon">📦</span>
              <span class="summary-text">{{ cart.itemCount }} Artikel</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">💰</span>
              <span class="summary-text total">{{ cart.totalAmount | currency:'EUR' }}</span>
            </div>
          </div>

          <div class="cart-items-preview" *ngIf="cart.items.length > 0">
            <div class="preview-items">
              <div class="preview-item" *ngFor="let item of cart.items.slice(0, 3)">
                <img [src]="item.productImageUrl || '/assets/placeholder.png'" 
                     [alt]="item.productTitle"
                     onerror="this.src='/assets/placeholder.png'">
                <div class="preview-details">
                  <span class="preview-title">{{ item.productTitle }}</span>
                  <span class="preview-quantity">{{ item.quantity }}x {{ item.priceSnapshot | currency:'EUR' }}</span>
                </div>
              </div>
              <div class="preview-more" *ngIf="cart.items.length > 3">
                +{{ cart.items.length - 3 }} weitere Artikel
              </div>
            </div>
          </div>

          <div class="cart-actions">
            <button class="btn btn-primary" 
                    (click)="restoreCart(cart.id)" 
                    [disabled]="cart.isExpired">
              🔄 Wiederherstellen
            </button>
            <button class="btn btn-secondary" (click)="viewDetails(cart)">
              👁️ Details
            </button>
            <button class="btn btn-delete" (click)="deleteCart(cart.id)">
              🗑️ Löschen
            </button>
          </div>
        </div>
      </div>

      <ng-template #emptyCarts>
        <div class="empty-message" *ngIf="!loading">
          <div class="empty-icon">🛒</div>
          <h3>Keine gespeicherten Warenkörbe</h3>
          <p>Speichern Sie Ihren Warenkorb für später!</p>
          <div class="info-box">
            <h4>💡 Wann ist das nützlich?</h4>
            <ul>
              <li>Sie möchten später weiter einkaufen</li>
              <li>Sie vergleichen verschiedene Produktkombinationen</li>
              <li>Sie erstellen Geschenklisten für verschiedene Anlässe</li>
            </ul>
          </div>
        </div>
      </ng-template>

      <!-- Details Modal -->
      <div class="details-modal" *ngIf="selectedCart">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ selectedCart.name }}</h3>
            <button class="btn-close" (click)="selectedCart = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-item" *ngFor="let item of selectedCart.items">
              <img [src]="item.productImageUrl || '/assets/placeholder.png'" 
                   [alt]="item.productTitle"
                   onerror="this.src='/assets/placeholder.png'">
              <div class="detail-info">
                <h4>{{ item.productTitle }}</h4>
                <p>Menge: {{ item.quantity }}</p>
                <p class="price">{{ item.priceSnapshot | currency:'EUR' }} / Stück</p>
                <p class="subtotal">Gesamt: {{ (item.priceSnapshot * item.quantity) | currency:'EUR' }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <div class="total-amount">
              <span>Gesamtsumme:</span>
              <span class="total-value">{{ selectedCart.totalAmount | currency:'EUR' }}</span>
            </div>
            <button class="btn btn-primary" (click)="restoreCart(selectedCart.id)">
              🔄 Warenkorb wiederherstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .saved-carts {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header h2 {
      margin: 0 0 2rem 0;
      font-size: 2rem;
    }
    .carts-list {
      display: grid;
      gap: 1.5rem;
    }
    .cart-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s;
      background: white;
    }
    .cart-card:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
    }
    .cart-card.expired {
      border-color: #fca5a5;
      background: #fef2f2;
    }
    .cart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .cart-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }
    .cart-description {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .expired-badge {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .cart-meta {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .meta-label {
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      font-weight: 600;
    }
    .meta-value {
      color: #374151;
      font-weight: 500;
    }
    .expired-text {
      color: #dc2626;
    }
    .cart-summary {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .summary-icon {
      font-size: 1.5rem;
    }
    .summary-text {
      font-weight: 600;
      color: #374151;
    }
    .summary-text.total {
      font-size: 1.25rem;
      color: #2563eb;
    }
    .cart-items-preview {
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
    }
    .preview-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .preview-item {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .preview-item img {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 6px;
    }
    .preview-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .preview-title {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }
    .preview-quantity {
      color: #6b7280;
      font-size: 0.813rem;
    }
    .preview-more {
      color: #6b7280;
      font-size: 0.875rem;
      padding: 0.5rem;
      text-align: center;
      font-weight: 500;
    }
    .cart-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-delete {
      background: #ef4444;
      color: white;
    }
    .empty-message {
      text-align: center;
      padding: 4rem 2rem;
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
    .info-box {
      max-width: 500px;
      margin: 2rem auto;
      padding: 1.5rem;
      background: #eff6ff;
      border-radius: 12px;
      text-align: left;
    }
    .info-box h4 {
      margin: 0 0 1rem 0;
      color: #1e40af;
    }
    .info-box ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #374151;
    }
    .info-box li {
      margin: 0.5rem 0;
    }
    .loading {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
      font-size: 1.125rem;
    }
    .details-modal {
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
      padding: 1rem;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #e5e7eb;
    }
    .modal-header h3 {
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
      padding: 0.5rem;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }
    .detail-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-item:last-child {
      border-bottom: none;
    }
    .detail-item img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
    }
    .detail-info {
      flex: 1;
    }
    .detail-info h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
    }
    .detail-info p {
      margin: 0.25rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .detail-info .price {
      font-weight: 600;
      color: #374151;
    }
    .detail-info .subtotal {
      font-weight: 700;
      color: #2563eb;
      font-size: 1rem;
    }
    .modal-footer {
      padding: 1.5rem;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .total-amount {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .total-amount span:first-child {
      font-size: 0.875rem;
      color: #6b7280;
    }
    .total-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2563eb;
    }
    @media (max-width: 768px) {
      .cart-meta {
        flex-direction: column;
        gap: 0.5rem;
      }
      .cart-summary {
        flex-direction: column;
        gap: 0.5rem;
      }
      .cart-actions {
        flex-direction: column;
      }
      .cart-actions .btn {
        width: 100%;
      }
    }
  `]
})
export class SavedCartsComponent implements OnInit {
  carts: SavedCart[] = [];
  loading = false;
  selectedCart: SavedCart | null = null;
  storeId = 1; // TODO: Get from context/route

  constructor(private savedCartService: SavedCartService) {}

  ngOnInit(): void {
    this.loadSavedCarts();
  }

  loadSavedCarts(): void {
    this.loading = true;
    this.savedCartService.getSavedCarts(this.storeId).subscribe({
      next: (carts) => {
        this.carts = carts;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der gespeicherten Warenkörbe:', error);
        this.loading = false;
      }
    });
  }

  restoreCart(id: number): void {
    if (confirm('Möchten Sie diesen Warenkorb wiederherstellen? Ihr aktueller Warenkorb wird ersetzt.')) {
      this.savedCartService.restoreSavedCart(id).subscribe({
        next: () => {
          alert('Warenkorb wurde erfolgreich wiederhergestellt!');
          this.selectedCart = null;
        },
        error: (error) => {
          console.error('Fehler beim Wiederherstellen:', error);
          alert('Fehler beim Wiederherstellen des Warenkorbs.');
        }
      });
    }
  }

  deleteCart(id: number): void {
    if (confirm('Möchten Sie diesen gespeicherten Warenkorb wirklich löschen?')) {
      this.savedCartService.deleteSavedCart(id).subscribe({
        next: () => this.loadSavedCarts(),
        error: (error) => console.error('Fehler beim Löschen:', error)
      });
    }
  }

  viewDetails(cart: SavedCart): void {
    this.selectedCart = cart;
  }
}

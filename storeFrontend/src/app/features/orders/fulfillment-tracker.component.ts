import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DropshippingService } from '@app/core/services/dropshipping.service';
import { CJIntegrationService } from '@app/core/services/cj-integration.service';
import {
  OrderItemWithDropshipping,
  FulfillmentStatus,
  getFulfillmentStatusLabel,
  getFulfillmentStatusColor
} from '@app/core/models/dropshipping.model';

@Component({
  selector: 'app-fulfillment-tracker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <div class="fulfillment-tracker" *ngIf="items.length > 0">
      <h3>📦 Dropshipping Fulfillment</h3>
      
      <!-- Summary -->
      <div class="summary-cards">
        <div class="summary-card">
          <span class="label">Total Items:</span>
          <span class="value">{{ items.length }}</span>
        </div>
        <div class="summary-card">
          <span class="label">Dropshipping:</span>
          <span class="value">{{ dropshippingItemsCount }}</span>
        </div>
        <div class="summary-card warning" *ngIf="pendingItemsCount > 0">
          <span class="label">⚠️ Ausstehend:</span>
          <span class="value">{{ pendingItemsCount }}</span>
        </div>
      </div>

      <!-- Items List -->
      <div class="items-list">
        <div 
          *ngFor="let item of items" 
          class="item-card"
          [class.dropshipping]="item.dropshippingSource"
          [class.needs-action]="item.fulfillmentStatus === 'PENDING' && item.dropshippingSource"
        >
          <!-- Item Info -->
          <div class="item-header">
            <div class="item-info">
              <h4>{{ item.name }}</h4>
              <span class="variant-title" *ngIf="item.variantTitle">{{ item.variantTitle }}</span>
              <span class="quantity">Menge: {{ item.quantity }}x</span>
            </div>
            
            <div class="item-price">
              <span class="price">{{ item.price | number:'1.2-2' }} €</span>
              <span class="total">Total: {{ item.total | number:'1.2-2' }} €</span>
            </div>
          </div>

          <!-- Dropshipping Info -->
          <div class="dropshipping-info" *ngIf="item.dropshippingSource">
            <div class="info-badge">🚚 Dropshipping</div>
            
            <!-- Supplier Link & Margin -->
            <div class="supplier-section">
              <div class="supplier-link">
                <strong>Supplier:</strong>
                <a [href]="item.dropshippingSource.supplierUrl" target="_blank" class="link-button">
                  {{ item.dropshippingSource.supplierName || 'Link öffnen' }} 🔗
                </a>
                
                <!-- CJ Badge -->
                <span *ngIf="item.dropshippingSource.supplierType === 'CJ'" class="cj-badge">
                  🤖 CJ API
                </span>
              </div>
              
              <div class="margin-display">
                <span class="purchase">Einkauf: {{ item.dropshippingSource.purchasePrice | number:'1.2-2' }} €</span>
                <span class="profit" [class.negative]="(item.price - (item.dropshippingSource.purchasePrice || 0)) < 0">
                  Gewinn: {{ (item.price - (item.dropshippingSource.purchasePrice || 0)) | number:'1.2-2' }} €
                </span>
                <span class="margin-badge" [class.good]="(item.dropshippingSource.marginPercentage || 0) > 0.3">
                  Marge: {{ ((item.dropshippingSource.marginPercentage || 0) * 100) | number:'1.1-1' }}%
                </span>
              </div>

              <!-- CJ Auto-Order Button -->
              <div class="cj-order-section" 
                   *ngIf="item.dropshippingSource.supplierType === 'CJ' && item.fulfillmentStatus === 'PENDING'">
                <button 
                  class="btn-cj-order"
                  (click)="placeCJOrder(item)"
                  [disabled]="placingCJOrders.has(item.id)"
                >
                  <span *ngIf="!placingCJOrders.has(item.id)">🤖 Place CJ Order</span>
                  <span *ngIf="placingCJOrders.has(item.id)">⏳ Ordering...</span>
                </button>
                <small class="help-text">Automatically order from CJ Dropshipping</small>
              </div>
            </div>

            <!-- Fulfillment Controls -->
            <div class="fulfillment-controls">
              <div class="status-row">
                <label>Status:</label>
                <select 
                  [(ngModel)]="item.fulfillmentStatus"
                  (change)="onStatusChange(item)"
                  class="status-select"
                  [class]="'status-' + item.fulfillmentStatus?.toLowerCase()"
                >
                  <option value="PENDING">⏳ Ausstehend</option>
                  <option value="ORDERED">📦 Bestellt</option>
                  <option value="SHIPPED">🚚 Versendet</option>
                  <option value="DELIVERED">✅ Geliefert</option>
                  <option value="CANCELLED">❌ Storniert</option>
                </select>
              </div>

              <!-- Supplier Order ID -->
              <div class="field-row" *ngIf="item.fulfillmentStatus !== 'PENDING'">
                <label>Supplier Order ID:</label>
                <input 
                  type="text"
                  [(ngModel)]="item.supplierOrderId"
                  placeholder="z.B. ALI-2024-12345"
                  class="input-sm"
                />
              </div>

              <!-- Tracking Info -->
              <div class="tracking-row" *ngIf="item.fulfillmentStatus === 'SHIPPED' || item.fulfillmentStatus === 'DELIVERED'">
                <div class="field-row">
                  <label>Tracking:</label>
                  <input 
                    type="text"
                    [(ngModel)]="item.trackingNumber"
                    placeholder="1Z999AA10123456784"
                    class="input-sm"
                  />
                </div>
                
                <div class="field-row">
                  <label>Carrier:</label>
                  <input 
                    type="text"
                    [(ngModel)]="item.carrier"
                    placeholder="z.B. DHL, China Post"
                    class="input-sm"
                  />
                </div>
              </div>

              <!-- Notes -->
              <div class="field-row">
                <label>Notizen:</label>
                <textarea 
                  [(ngModel)]="item.notes"
                  rows="2"
                  placeholder="Interne Notizen zum Fulfillment..."
                  class="textarea-sm"
                ></textarea>
              </div>

              <!-- Save Button -->
              <button 
                class="btn-save-fulfillment"
                (click)="saveFulfillment(item)"
                [disabled]="updatingItems.has(item.id)"
              >
                {{ updatingItems.has(item.id) ? '💾 Speichere...' : '💾 Fulfillment speichern' }}
              </button>
            </div>
          </div>

          <!-- Regular Item (no dropshipping) -->
          <div class="regular-item-info" *ngIf="!item.dropshippingSource">
            <span class="info-text">Normales Item (kein Dropshipping)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fulfillment-tracker {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-top: 2rem;
    }

    h3 {
      margin: 0 0 1.5rem;
      color: #333;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px solid #dee2e6;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .summary-card.warning {
      background: #fff3cd;
      border-color: #ffc107;
    }

    .summary-card .label {
      font-size: 0.875rem;
      color: #666;
    }

    .summary-card .value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
    }

    /* Items List */
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .item-card {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      background: #fafafa;
    }

    .item-card.dropshipping {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .item-card.needs-action {
      border-color: #ffc107;
      background: #fffbf0;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .item-info h4 {
      margin: 0 0 0.5rem;
      color: #333;
    }

    .variant-title {
      color: #666;
      font-size: 0.875rem;
      margin-right: 1rem;
    }

    .quantity {
      color: #888;
      font-size: 0.875rem;
    }

    .item-price {
      text-align: right;
    }

    .price {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
    }

    .total {
      font-size: 0.875rem;
      color: #666;
    }

    /* Dropshipping Section */
    .dropshipping-info {
      margin-top: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #ddd;
    }

    .info-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #667eea;
      color: white;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .supplier-section {
      margin-bottom: 1.5rem;
    }

    .supplier-link {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .link-button {
      padding: 0.5rem 1rem;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .link-button:hover {
      background: #5568d3;
    }

    .cj-badge {
      padding: 0.25rem 0.75rem;
      background: #10b981;
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .cj-order-section {
      margin-top: 1rem;
      padding: 1rem;
      background: #ecfdf5;
      border: 2px dashed #10b981;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn-cj-order {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cj-order:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-cj-order:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .help-text {
      color: #059669;
      font-size: 0.8rem;
    }

    .margin-display {
      display: flex;
      gap: 1.5rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      flex-wrap: wrap;
    }

    .margin-display span {
      font-size: 0.875rem;
    }

    .purchase {
      color: #666;
    }

    .profit {
      font-weight: 600;
      color: #4caf50;
    }

    .profit.negative {
      color: #f44336;
    }

    .margin-badge {
      padding: 0.25rem 0.75rem;
      background: #4caf50;
      color: white;
      border-radius: 20px;
      font-weight: 600;
    }

    .margin-badge.good {
      background: #2e7d32;
    }

    /* Fulfillment Controls */
    .fulfillment-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-row, .field-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      align-items: center;
      gap: 1rem;
    }

    .tracking-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      font-weight: 600;
      color: #555;
      font-size: 0.875rem;
    }

    .status-select {
      padding: 0.5rem;
      border: 2px solid #dee2e6;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .status-select.status-pending { border-color: #ffc107; color: #856404; }
    .status-select.status-ordered { border-color: #17a2b8; color: #0c5460; }
    .status-select.status-shipped { border-color: #667eea; color: #3949ab; }
    .status-select.status-delivered { border-color: #4caf50; color: #2e7d32; }
    .status-select.status-cancelled { border-color: #f44336; color: #c62828; }

    .input-sm, .textarea-sm {
      padding: 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 0.875rem;
      width: 100%;
    }

    .textarea-sm {
      resize: vertical;
      font-family: inherit;
    }

    .btn-save-fulfillment {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      align-self: flex-start;
    }

    .btn-save-fulfillment:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-save-fulfillment:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .regular-item-info {
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .info-text {
      color: #666;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .status-row, .field-row {
        grid-template-columns: 1fr;
      }

      .tracking-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FulfillmentTrackerComponent implements OnInit {
  @Input() orderId!: number;

  items: OrderItemWithDropshipping[] = [];
  updatingItems = new Set<number>();
  placingCJOrders = new Set<number>();

  constructor(
    private dropshippingService: DropshippingService,
    private cjIntegrationService: CJIntegrationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    if (!this.orderId) return;

    this.dropshippingService.getOrderItemsWithDropshipping(this.orderId).subscribe({
      next: (items) => {
        this.items = items;
      },
      error: (err) => {
        console.error('Error loading order items with dropshipping:', err);

        // Wenn 403/401 → wahrscheinlich kein ROLE_RESELLER, ignorieren
        if (err.status !== 403 && err.status !== 401) {
          this.snackBar.open(
            'Fehler beim Laden der Fulfillment-Daten',
            'OK',
            { duration: 5000 }
          );
        }
      }
    });
  }

  get dropshippingItemsCount(): number {
    return this.items.filter(item => item.dropshippingSource).length;
  }

  get pendingItemsCount(): number {
    return this.items.filter(item =>
      item.dropshippingSource && item.fulfillmentStatus === FulfillmentStatus.PENDING
    ).length;
  }

  onStatusChange(item: OrderItemWithDropshipping) {
    // Auto-save bei Status-Änderung
    this.saveFulfillment(item);
  }

  saveFulfillment(item: OrderItemWithDropshipping) {
    if (this.updatingItems.has(item.id)) return;

    this.updatingItems.add(item.id);

    const updateData = {
      status: item.fulfillmentStatus,
      supplierOrderId: item.supplierOrderId,
      trackingNumber: item.trackingNumber,
      carrier: item.carrier,
      notes: item.notes
    };

    this.dropshippingService.updateFulfillment(item.id, updateData).subscribe({
      next: () => {
        this.snackBar.open('Fulfillment aktualisiert', 'OK', { duration: 2000 });
        this.updatingItems.delete(item.id);
      },
      error: (err) => {
        console.error('Error updating fulfillment:', err);
        this.snackBar.open(
          'Fehler: ' + (err.error?.message || 'Unbekannter Fehler'),
          'OK',
          { duration: 5000 }
        );
        this.updatingItems.delete(item.id);
      }
    });
  }

  placeCJOrder(item: OrderItemWithDropshipping) {
    if (!confirm('🤖 Automatisch bei CJ bestellen?\n\nDies wird die Bestellung direkt an CJ senden.')) {
      return;
    }

    this.placingCJOrders.add(item.id);

    // TODO: Shipping Info aus Order laden (für jetzt: Mock)
    const orderRequest = {
      shippingFirstName: 'Test',
      shippingLastName: 'Customer',
      shippingAddress: '123 Main St',
      shippingCity: 'Berlin',
      shippingPostalCode: '10115',
      shippingCountryCode: 'DE',
      shippingPhone: '+49123456789'
    };

    this.cjIntegrationService.placeOrder(item.id, orderRequest).subscribe({
      next: (response) => {
        this.placingCJOrders.delete(item.id);

        if (response.success) {
          this.snackBar.open(
            `✅ CJ Order placed: ${response.cjOrderId}`,
            'OK',
            { duration: 5000 }
          );

          // Reload items to show updated status
          this.loadItems();
        } else {
          this.snackBar.open(
            `❌ CJ Order failed: ${response.message}`,
            'OK',
            { duration: 7000 }
          );
        }
      },
      error: (err) => {
        console.error('Error placing CJ order:', err);
        this.placingCJOrders.delete(item.id);
        this.snackBar.open(
          'Fehler beim CJ Order: ' + (err.error?.message || 'Unbekannter Fehler'),
          'OK',
          { duration: 7000 }
        );
      }
    });
  }

  getStatusLabel(status: FulfillmentStatus): string {
    return getFulfillmentStatusLabel(status);
  }

  getStatusColor(status: FulfillmentStatus): string {
    return getFulfillmentStatusColor(status);
  }
}


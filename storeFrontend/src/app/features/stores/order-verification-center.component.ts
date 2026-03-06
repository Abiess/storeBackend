import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { ToastService } from '../../core/services/toast.service';
import { OrderVerificationCounterService } from '../../core/services/order-verification-counter.service';

@Component({
  selector: 'app-order-verification-center',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent],
  template: `
    <app-store-navigation [storeId]="storeId" currentPage="COD Verifizierung"></app-store-navigation>
    
    <div class="verification-center">
      <div class="header">
        <h1>📞 COD Bestellungen Verifizierung</h1>
        <button class="btn-refresh" (click)="loadOrders()" [disabled]="loading">
          🔄 Aktualisieren
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" *ngIf="!loading">
        <div class="stat-card warning">
          <div class="stat-value">{{ unverifiedOrders.length }}</div>
          <div class="stat-label">Unbestätigte COD</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">{{ getTodayCount() }}</div>
          <div class="stat-label">Heute</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ getPendingCount() }}</div>
          <div class="stat-label">Ausstehend</div>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-bar">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (input)="applyFilters()"
          placeholder="🔍 Suche nach Bestellnummer, Kunde, Email..."
          class="search-input">
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Lade Bestellungen...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error && !loading" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button class="btn-retry" (click)="loadOrders()">Erneut versuchen</button>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && filteredOrders.length === 0" class="empty-state">
        <div class="empty-icon">✅</div>
        <h2>Keine unbestätigten COD Bestellungen</h2>
        <p>Alle Nachnahme-Bestellungen wurden verifiziert.</p>
      </div>

      <!-- Desktop Table -->
      <div class="table-container desktop-only" *ngIf="!loading && !error && filteredOrders.length > 0">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Bestellung</th>
              <th>Kunde</th>
              <th>Telefon</th>
              <th>Betrag</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of filteredOrders" class="order-row" (click)="viewOrder(order.id)">
              <td>
                <div class="order-number">{{ order.orderNumber }}</div>
                <div class="order-status">
                  <span class="status-badge" [class]="'status-' + order.status.toLowerCase()">
                    {{ order.status }}
                  </span>
                </div>
              </td>
              <td>
                <div class="customer-name">{{ order.customerName }}</div>
                <div class="customer-email">{{ order.customerEmail }}</div>
              </td>
              <td>
                <div class="phone-number">{{ getPhone(order) || 'Keine Angabe' }}</div>
              </td>
              <td>
                <div class="order-total">{{ order.totalAmount | number:'1.2-2' }} €</div>
              </td>
              <td>
                <div class="order-date">{{ order.createdAt | date:'dd.MM.yyyy' }}</div>
                <div class="order-time">{{ order.createdAt | date:'HH:mm' }}</div>
              </td>
              <td (click)="$event.stopPropagation()" class="actions-cell">
                <div class="action-buttons">
                  <a [href]="'tel:' + getPhone(order)" class="btn-action btn-call" title="Anrufen" *ngIf="getPhone(order)">
                    📞
                  </a>
                  <a [href]="getWhatsAppLink(order)" target="_blank" class="btn-action btn-whatsapp" title="WhatsApp" *ngIf="getPhone(order)">
                    💬
                  </a>
                  <button class="btn-action btn-verify" (click)="openVerifyModal(order)" title="Verifizieren">
                    ✅
                  </button>
                  <button class="btn-action btn-reject" (click)="openRejectModal(order)" title="Ablehnen">
                    ❌
                  </button>
                  <button class="btn-action btn-note" (click)="openNoteModal(order)" title="Notiz">
                    📝
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="cards-container mobile-only" *ngIf="!loading && !error && filteredOrders.length > 0">
        <div *ngFor="let order of filteredOrders" class="order-card" (click)="viewOrder(order.id)">
          <div class="card-header">
            <div class="order-number">{{ order.orderNumber }}</div>
            <span class="status-badge" [class]="'status-' + order.status.toLowerCase()">
              {{ order.status }}
            </span>
          </div>

          <div class="card-body">
            <div class="card-row">
              <span class="label">Kunde:</span>
              <span class="value">{{ order.customerName }}</span>
            </div>
            <div class="card-row">
              <span class="label">Email:</span>
              <span class="value">{{ order.customerEmail }}</span>
            </div>
            <div class="card-row">
              <span class="label">Telefon:</span>
              <span class="value">{{ getPhone(order) || 'Keine Angabe' }}</span>
            </div>
            <div class="card-row">
              <span class="label">Betrag:</span>
              <span class="value bold">{{ (order.totalAmount || 0) | number:'1.2-2' }} €</span>
            </div>
            <div class="card-row">
              <span class="label">Erstellt:</span>
              <span class="value">{{ (order.createdAt || null) | date:'dd.MM.yyyy HH:mm' }}</span>
            </div>
          </div>

          <div class="card-actions" (click)="$event.stopPropagation()">
            <a [href]="'tel:' + getPhone(order)" class="btn-action-mobile btn-call" *ngIf="getPhone(order)">
              📞 Anrufen
            </a>
            <a [href]="getWhatsAppLink(order)" target="_blank" class="btn-action-mobile btn-whatsapp" *ngIf="getPhone(order)">
              💬 WhatsApp
            </a>
            <button class="btn-action-mobile btn-verify" (click)="openVerifyModal(order)">
              ✅ Verifizieren
            </button>
            <button class="btn-action-mobile btn-reject" (click)="openRejectModal(order)">
              ❌ Ablehnen
            </button>
          </div>
        </div>
      </div>

      <!-- Verification/Reject Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ modalType === 'verify' ? '✅ COD Verifizierung' : modalType === 'reject' ? '❌ Bestellung ablehnen' : '📝 Notiz hinzufügen' }}</h2>
            <button class="btn-close" (click)="closeModal()">×</button>
          </div>

          <div class="modal-body">
            <div class="order-info">
              <div class="info-row">
                <span class="label">Bestellung:</span>
                <span class="value">{{ selectedOrder?.orderNumber }}</span>
              </div>
              <div class="info-row">
                <span class="label">Kunde:</span>
                <span class="value">{{ selectedOrder?.customerName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Telefon:</span>
                <span class="value">{{ getPhone(selectedOrder!) || 'Keine Angabe' }}</span>
              </div>
            </div>

            <div class="modal-form" *ngIf="modalType !== 'note'">
              <div class="checkboxes">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="verificationChecks.phoneReached">
                  <span>Telefon erreicht</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="verificationChecks.addressConfirmed">
                  <span>Adresse bestätigt</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="verificationChecks.deliveryTimeConfirmed">
                  <span>Lieferzeit bestätigt</span>
                </label>
              </div>
            </div>

            <div class="modal-form">
              <label class="textarea-label">Notiz (optional)</label>
              <textarea
                [(ngModel)]="modalNote"
                class="modal-textarea"
                rows="4"
                placeholder="Zusätzliche Informationen..."></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModal()" [disabled]="modalProcessing">
              Abbrechen
            </button>
            <button
              class="btn-primary"
              [class.loading]="modalProcessing"
              (click)="handleModalSubmit()"
              [disabled]="modalProcessing">
              <span *ngIf="!modalProcessing">
                {{ modalType === 'verify' ? 'Bestätigen & als CONFIRMED setzen' : modalType === 'reject' ? 'Ablehnen & CANCELLED setzen' : 'Notiz speichern' }}
              </span>
              <span *ngIf="modalProcessing">Wird verarbeitet...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verification-center {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #1a202c;
      margin: 0;
    }

    .btn-refresh {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Stats Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #e2e8f0;
    }

    .stat-card.warning {
      border-left-color: #f59e0b;
    }

    .stat-card.info {
      border-left-color: #3b82f6;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Search Bar */
    .search-bar {
      margin-bottom: 24px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 15px;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: #667eea;
    }

    /* Loading, Error, Empty States */
    .loading-state,
    .error-state,
    .empty-state {
      background: white;
      border-radius: 12px;
      padding: 60px 40px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-icon,
    .empty-icon {
      font-size: 60px;
      margin-bottom: 20px;
    }

    .btn-retry {
      margin-top: 20px;
      padding: 10px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    /* Desktop Table */
    .desktop-only {
      display: block;
    }

    .mobile-only {
      display: none;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table thead {
      background: #f7fafc;
    }

    .orders-table th {
      padding: 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #4a5568;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }

    .orders-table td {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .order-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .order-row:hover {
      background: #f7fafc;
    }

    .order-number {
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 4px;
    }

    .order-status {
      margin-top: 4px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-confirmed {
      background: #dbeafe;
      color: #1e40af;
    }

    .customer-name {
      font-weight: 500;
      color: #1a202c;
      margin-bottom: 2px;
    }

    .customer-email {
      font-size: 13px;
      color: #718096;
    }

    .phone-number {
      font-family: monospace;
      color: #2d3748;
    }

    .order-total {
      font-weight: 600;
      color: #1a202c;
    }

    .order-date {
      font-weight: 500;
      color: #2d3748;
    }

    .order-time {
      font-size: 13px;
      color: #718096;
      margin-top: 2px;
    }

    .actions-cell {
      padding: 8px 16px !important;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 18px;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
    }

    .btn-call {
      background: #10b981;
      color: white;
    }

    .btn-call:hover {
      background: #059669;
      transform: scale(1.05);
    }

    .btn-whatsapp {
      background: #25d366;
      color: white;
    }

    .btn-whatsapp:hover {
      background: #1ebe57;
      transform: scale(1.05);
    }

    .btn-verify {
      background: #10b981;
      color: white;
    }

    .btn-verify:hover {
      background: #059669;
      transform: scale(1.05);
    }

    .btn-reject {
      background: #ef4444;
      color: white;
    }

    .btn-reject:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    .btn-note {
      background: #3b82f6;
      color: white;
    }

    .btn-note:hover {
      background: #2563eb;
      transform: scale(1.05);
    }

    .no-phone {
      font-size: 12px;
      color: #a0aec0;
      font-style: italic;
    }

    /* Mobile Cards */
    .cards-container {
      display: grid;
      gap: 16px;
    }

    .order-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: box-shadow 0.2s;
    }

    .order-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .card-body {
      margin-bottom: 12px;
    }

    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .card-row .label {
      color: #718096;
      font-weight: 500;
    }

    .card-row .value {
      color: #2d3748;
    }

    .card-row .value.bold {
      font-weight: 600;
      color: #1a202c;
    }

    .card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .btn-action-mobile {
      padding: 10px;
      border-radius: 8px;
      text-decoration: none;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      border: none;
      cursor: pointer;
      color: white;
    }

    .btn-action-mobile.btn-call {
      background: #10b981;
    }

    .btn-action-mobile.btn-whatsapp {
      background: #25d366;
    }

    .btn-action-mobile.btn-verify {
      background: #10b981;
      grid-column: 1 / -1;
    }

    .btn-action-mobile.btn-reject {
      background: #ef4444;
      grid-column: 1 / -1;
    }

    /* Modal Styles */
    .modal-overlay {
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
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a202c;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 32px;
      color: #a0aec0;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: color 0.2s;
    }

    .btn-close:hover {
      color: #4a5568;
    }

    .modal-body {
      padding: 24px;
    }

    .order-info {
      background: #f7fafc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row .label {
      font-weight: 500;
      color: #718096;
    }

    .info-row .value {
      color: #2d3748;
      font-weight: 500;
    }

    .modal-form {
      margin-bottom: 20px;
    }

    .checkboxes {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .checkbox-label:hover {
      background: #f7fafc;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checkbox-label span {
      font-size: 15px;
      color: #2d3748;
    }

    .textarea-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 8px;
    }

    .modal-textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      transition: border-color 0.2s;
    }

    .modal-textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .btn-secondary,
    .btn-primary {
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #4a5568;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #cbd5e0;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-primary:disabled,
    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary.loading {
      position: relative;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .verification-center {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .header h1 {
        font-size: 24px;
      }

      .btn-refresh {
        width: 100%;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .desktop-only {
        display: none;
      }

      .mobile-only {
        display: block;
      }

      .modal-content {
        max-width: 95vw;
        margin: 20px;
      }

      .modal-footer {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class OrderVerificationCenterComponent implements OnInit, OnDestroy {
  storeId!: number;
  allOrders: Order[] = [];
  unverifiedOrders: Order[] = [];
  filteredOrders: Order[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';

  // Modal State
  showModal = false;
  modalType: 'verify' | 'reject' | 'note' = 'verify';
  selectedOrder: Order | null = null;
  modalNote = '';
  modalProcessing = false;
  verificationChecks = {
    phoneReached: true,
    addressConfirmed: false,
    deliveryTimeConfirmed: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private toastService: ToastService,
    private counterService: OrderVerificationCounterService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    console.log('✅ Order Verification Center loaded for store:', this.storeId);
    this.loadOrders();

    // Start auto-refresh polling (60 seconds)
    this.counterService.startPolling(this.storeId, 60000);
  }

  ngOnDestroy(): void {
    // Stop polling when component is destroyed
    this.counterService.stopPolling();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    this.orderService.getStoreOrders(this.storeId).subscribe({
      next: (orders) => {
        console.log('📦 Loaded orders:', orders.length);
        this.allOrders = orders;

        // Filter: COD orders that are not phone verified
        this.unverifiedOrders = orders.filter(order =>
          order.paymentMethod === 'CASH_ON_DELIVERY' &&
          !order.phoneVerified
        );

        console.log('📞 Unverified COD orders:', this.unverifiedOrders.length);
        this.filteredOrders = [...this.unverifiedOrders];

        // Update counter badge
        this.counterService.setCount(this.unverifiedOrders.length);

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading orders:', err);
        this.error = 'Fehler beim Laden der Bestellungen. Bitte versuchen Sie es erneut.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.unverifiedOrders];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(term) ||
        order.customerEmail?.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term)
      );
    }

    this.filteredOrders = filtered;
  }

  getPhone(order: Order): string {
    // Try to extract phone from shippingAddress
    if (order.shippingAddress && typeof order.shippingAddress === 'object') {
      return (order.shippingAddress as any).phone || '';
    }
    return '';
  }

  getWhatsAppLink(order: Order): string {
    const phone = this.getPhone(order);
    if (!phone) return '#';

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Add country code if not present (assume Morocco +212 for this context)
    const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone : `+212${cleanPhone}`;

    return `https://wa.me/${phoneWithCode.replace('+', '')}`;
  }

  getTodayCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.unverifiedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }).length;
  }

  getPendingCount(): number {
    return this.unverifiedOrders.filter(order => order.status === 'PENDING').length;
  }

  viewOrder(orderId: number): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'orders', orderId]);
  }

  // Modal Actions
  openVerifyModal(order: Order): void {
    this.selectedOrder = order;
    this.modalType = 'verify';
    this.modalNote = '';
    this.verificationChecks = {
      phoneReached: true,
      addressConfirmed: false,
      deliveryTimeConfirmed: false
    };
    this.showModal = true;
  }

  openRejectModal(order: Order): void {
    this.selectedOrder = order;
    this.modalType = 'reject';
    this.modalNote = '';
    this.verificationChecks = {
      phoneReached: false,
      addressConfirmed: false,
      deliveryTimeConfirmed: false
    };
    this.showModal = true;
  }

  openNoteModal(order: Order): void {
    this.selectedOrder = order;
    this.modalType = 'note';
    this.modalNote = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.modalProcessing) return;
    this.showModal = false;
    this.selectedOrder = null;
    this.modalNote = '';
  }

  handleModalSubmit(): void {
    if (!this.selectedOrder) return;

    if (this.modalType === 'verify') {
      this.verifyOrder();
    } else if (this.modalType === 'reject') {
      this.rejectOrder();
    } else if (this.modalType === 'note') {
      this.addNote();
    }
  }

  verifyOrder(): void {
    if (!this.selectedOrder) return;

    this.modalProcessing = true;

    // Build composite note
    const checks = [];
    if (this.verificationChecks.phoneReached) checks.push('Telefon erreicht ✅');
    if (this.verificationChecks.addressConfirmed) checks.push('Adresse ✅');
    if (this.verificationChecks.deliveryTimeConfirmed) checks.push('Lieferzeit ✅');

    const compositeNote = `COD Verification: ${checks.join(', ')}${this.modalNote ? '. Notiz: ' + this.modalNote : ''}`;

    // Update status to CONFIRMED with note
    this.orderService.updateOrderStatus(
      this.storeId,
      this.selectedOrder.id,
      OrderStatus.CONFIRMED,
      compositeNote
    ).subscribe({
      next: (updatedOrder) => {
        console.log('✅ Order verified:', updatedOrder);
        this.toastService.success(`Bestellung ${this.selectedOrder?.orderNumber} wurde verifiziert und auf CONFIRMED gesetzt.`);

        // Remove from unverified list
        this.removeOrderFromList(this.selectedOrder!.id);

        // Decrement counter badge
        this.counterService.decrement();

        this.modalProcessing = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('❌ Error verifying order:', err);
        this.toastService.error('Fehler beim Verifizieren der Bestellung. Bitte versuchen Sie es erneut.');
        this.modalProcessing = false;
      }
    });
  }

  rejectOrder(): void {
    if (!this.selectedOrder) return;

    this.modalProcessing = true;

    const rejectNote = `COD Rejected${this.modalNote ? ': ' + this.modalNote : ''}`;

    // Update status to CANCELLED with note
    this.orderService.updateOrderStatus(
      this.storeId,
      this.selectedOrder.id,
      OrderStatus.CANCELLED,
      rejectNote
    ).subscribe({
      next: (updatedOrder) => {
        console.log('❌ Order rejected:', updatedOrder);
        this.toastService.warning(`Bestellung ${this.selectedOrder?.orderNumber} wurde abgelehnt und auf CANCELLED gesetzt.`);

        // Remove from unverified list
        this.removeOrderFromList(this.selectedOrder!.id);

        // Decrement counter badge
        this.counterService.decrement();

        this.modalProcessing = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('❌ Error rejecting order:', err);
        this.toastService.error('Fehler beim Ablehnen der Bestellung. Bitte versuchen Sie es erneut.');
        this.modalProcessing = false;
      }
    });
  }

  addNote(): void {
    if (!this.selectedOrder || !this.modalNote.trim()) {
      this.toastService.warning('Bitte geben Sie eine Notiz ein.');
      return;
    }

    this.modalProcessing = true;

    this.orderService.addOrderNote(
      this.storeId,
      this.selectedOrder.id,
      this.modalNote
    ).subscribe({
      next: () => {
        console.log('📝 Note added');
        this.toastService.success('Notiz wurde erfolgreich hinzugefügt.');
        this.modalProcessing = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('❌ Error adding note:', err);
        this.toastService.error('Fehler beim Hinzufügen der Notiz.');
        this.modalProcessing = false;
      }
    });
  }

  removeOrderFromList(orderId: number): void {
    // Remove from unverified orders
    this.unverifiedOrders = this.unverifiedOrders.filter(o => o.id !== orderId);

    // Re-apply filters
    this.applyFilters();

    console.log('🔄 Order removed from list. Remaining:', this.unverifiedOrders.length);
  }
}


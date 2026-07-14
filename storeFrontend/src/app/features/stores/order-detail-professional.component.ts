import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { DhlService, DhlValidateRequest } from '../../core/services/dhl.service';
import { StoreService } from '../../core/services/store.service';
import { Order, OrderStatus, OrderStatusHistory, OrderItem, Address, Store } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { toDate } from '../../core/utils/date.utils';

@Component({
  selector: 'app-order-detail-professional',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent],
  templateUrl: './order-detail-professional.component.html',
  styleUrls: ['./order-detail-professional.component.scss']
})
export class OrderDetailProfessionalComponent implements OnInit {
  storeId!: number;
  orderId!: number;
  order: Order | null = null;
  storeData: Store | null = null;  // ← Store-Daten für Preview
  orderItems: OrderItem[] = [];
  orderHistory: OrderStatusHistory[] = [];
  loading = false;
  error: string | null = null;

  // Status Change
  selectedStatus: OrderStatus | '' = '';
  statusChangeNote = '';
  changingStatus = false;

  // Tracking
  trackingCarrier = '';
  trackingNumber = '';
  trackingUrl = '';
  savingTracking = false;

  // Notes
  newNote = '';
  addingNote = false;

  // DHL Dialog
  showDhlDialog = false;
  dhlDialogMode: 'validate' | 'label' = 'validate';
  dhlProcessing = false;
  dhlSuccess = false;
  dhlError: string | null = null;
  dhlResult: string | null = null;
  showLabelConfirm = false;  // Zusätzlicher Confirm vor Live Label
  showPreview = false;  // DHL-Style Preview nach Validate SUCCESS
  dhlValidateResponse: any = null;  // Speichere Validate Response für Preview
  
  // DHL Paketdaten (editierbar in Dialog, in kg/cm)
  dhlWeightKg: number = 1;
  dhlLengthCm: number = 30;
  dhlWidthCm: number = 20;
  dhlHeightCm: number = 15;

  // Available statuses
  availableStatuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private dhlService: DhlService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id'));
    this.orderId = Number(this.route.snapshot.paramMap.get('orderId'));

    if (!this.storeId || !this.orderId) {
      this.error = 'Ungültige Store ID oder Order ID';
      return;
    }

    this.loadOrderDetails();
  }

  loadOrderDetails(): void {
    this.loading = true;
    this.error = null;

    // Load order details
    this.orderService.getOrder(this.storeId, this.orderId).subscribe({
      next: (response: any) => {
        this.order = response.order;
        this.orderItems = response.items || [];

        // Pre-fill tracking if exists
        if (this.order) {
          this.trackingCarrier = this.order.trackingCarrier || '';
          this.trackingNumber = this.order.trackingNumber || '';
          this.trackingUrl = this.order.trackingUrl || '';
          this.selectedStatus = this.order.status;
        }

        this.loadOrderHistory();
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.error = 'Fehler beim Laden der Bestellung';
        this.loading = false;
      }
    });
  }

  loadOrderHistory(): void {
    this.orderService.getOrderHistory(this.storeId, this.orderId).subscribe({
      next: (history) => {
        this.orderHistory = history;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading history:', err);
        this.loading = false;
      }
    });
  }

  // Status Change
  changeOrderStatus(): void {
    if (!this.selectedStatus || this.selectedStatus === this.order?.status) {
      return;
    }

    this.changingStatus = true;

    this.orderService.updateOrderStatus(
      this.storeId,
      this.orderId,
      this.selectedStatus as OrderStatus,
      this.statusChangeNote || undefined
    ).subscribe({
      next: () => {
        this.changingStatus = false;
        this.statusChangeNote = '';
        this.loadOrderDetails();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        alert('Fehler beim Aktualisieren des Status');
        this.changingStatus = false;
      }
    });
  }

  // Tracking
  saveTracking(): void {
    if (!this.trackingCarrier || !this.trackingNumber) {
      alert('Bitte Carrier und Tracking-Nummer eingeben');
      return;
    }

    this.savingTracking = true;

    this.orderService.updateOrderTracking(
      this.storeId,
      this.orderId,
      this.trackingCarrier,
      this.trackingNumber,
      this.trackingUrl || undefined
    ).subscribe({
      next: () => {
        this.savingTracking = false;
        this.loadOrderDetails();
        alert('Tracking gespeichert');
      },
      error: (err) => {
        console.error('Error saving tracking:', err);
        alert('Fehler beim Speichern');
        this.savingTracking = false;
      }
    });
  }

  // Notes
  addNote(): void {
    if (!this.newNote.trim()) {
      return;
    }

    this.addingNote = true;

    this.orderService.addOrderNote(this.storeId, this.orderId, this.newNote).subscribe({
      next: () => {
        this.addingNote = false;
        this.newNote = '';
        this.loadOrderHistory();
      },
      error: (err) => {
        console.error('Error adding note:', err);
        alert('Fehler beim Hinzufügen der Notiz');
        this.addingNote = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // DHL SHIPMENT METHODS
  // ══════════════════════════════════════════════════════════════

  openDhlValidateDialog(): void {
    this.dhlDialogMode = 'validate';
    this.initDhlDialogData();
    this.loadStoreDataForDhl();
    this.showDhlDialog = true;
  }

  openDhlLabelDialog(): void {
    this.dhlDialogMode = 'label';
    this.initDhlDialogData();
    this.loadStoreDataForDhl();
    this.showDhlDialog = true;
  }

  private loadStoreDataForDhl(): void {
    if (!this.storeData) {
      this.storeService.getStoreById(this.storeId).subscribe({
        next: (store) => {
          this.storeData = store;
        },
        error: (err) => {
          console.error('Error loading store data for DHL preview:', err);
          // Fallback: Lade Store.name aus order.storeId wenn Store-Objekt nicht verfügbar
        }
      });
    }
  }

  closeDhlDialog(): void {
    this.showDhlDialog = false;
    this.dhlSuccess = false;
    this.dhlError = null;
    this.dhlResult = null;
    this.dhlProcessing = false;
    this.showLabelConfirm = false;
    this.showPreview = false;  // ← Reset Preview
    this.dhlValidateResponse = null;  // ← Reset Response
  }

  private initDhlDialogData(): void {
    // Initialize with Order Package Data (if set) or fallback to defaults
    if (this.order?.packageWeightGrams && this.order.packageWeightGrams > 0) {
      this.dhlWeightKg = this.order.packageWeightGrams / 1000;
    } else {
      this.dhlWeightKg = 1; // Default 1kg
    }

    if (this.order?.packageLengthMm && this.order.packageLengthMm > 0) {
      this.dhlLengthCm = this.order.packageLengthMm / 10;
      this.dhlWidthCm = (this.order.packageWidthMm || 200) / 10;
      this.dhlHeightCm = (this.order.packageHeightMm || 150) / 10;
    } else {
      // Defaults from store settings (assume 30x20x15 cm)
      this.dhlLengthCm = 30;
      this.dhlWidthCm = 20;
      this.dhlHeightCm = 15;
    }
  }

  confirmDhlAction(): void {
    if (this.dhlDialogMode === 'validate') {
      this.executeDhlValidate();
    } else {
      // Für Live Label: Zusätzlicher Confirm-Schritt
      if (!this.showLabelConfirm) {
        this.showLabelConfirm = true;  // Zeige finale Kostenwarnung
      } else {
        this.executeDhlCreateLabel();  // User hat bestätigt
      }
    }
  }

  cancelLabelConfirm(): void {
    this.showLabelConfirm = false;
  }

  private executeDhlValidate(): void {
    this.dhlProcessing = true;
    this.dhlError = null;
    this.dhlSuccess = false;
    this.showPreview = false;

    const request: DhlValidateRequest = {
      packageWeightGrams: Math.round(this.dhlWeightKg * 1000),
      packageLengthMm: Math.round(this.dhlLengthCm * 10),
      packageWidthMm: Math.round(this.dhlWidthCm * 10),
      packageHeightMm: Math.round(this.dhlHeightCm * 10)
    };

    this.dhlService.validateShipment(this.storeId, this.orderId, request).subscribe({
      next: (response) => {
        this.dhlProcessing = false;
        if (response.success && response.validation === 'SUCCESS') {
          this.dhlSuccess = true;
          this.showPreview = true;  // ← Zeige DHL-Style Preview
          this.dhlValidateResponse = response;  // ← Speichere Response für Preview
          // Order neu laden, damit gespeicherte Paketdaten sichtbar sind
          this.loadOrderDetails();
        } else if (response.validation === 'VALIDATION_FAILED') {
          this.dhlError = 'DHL Validation fehlgeschlagen: ' + (response.validationMessages?.map(m => m.validationMessage).join(', ') || 'Unbekannter Fehler');
        } else {
          this.dhlError = response.message || 'Unbekannter Fehler';
        }
      },
      error: (err) => {
        console.error('DHL Validate Error:', err);
        this.dhlProcessing = false;
        this.dhlError = err.error?.message || 'DHL Validierung fehlgeschlagen. Bitte prüfe die Sendungsdaten.';
      }
    });
  }

  private executeDhlCreateLabel(): void {
    this.dhlProcessing = true;
    this.dhlError = null;
    this.dhlSuccess = false;

    const request: DhlValidateRequest = {
      packageWeightGrams: Math.round(this.dhlWeightKg * 1000),
      packageLengthMm: Math.round(this.dhlLengthCm * 10),
      packageWidthMm: Math.round(this.dhlWidthCm * 10),
      packageHeightMm: Math.round(this.dhlHeightCm * 10)
    };

    this.dhlService.createLabel(this.storeId, this.orderId, request).subscribe({
      next: (response) => {
        this.dhlProcessing = false;
        if (response.success && response.labelUrl) {
          this.dhlSuccess = true;
          this.dhlResult = `DHL Label erfolgreich erstellt! Shipment No: ${response.shipmentNo || 'N/A'}`;
          // Reload order to update tracking
          this.loadOrderDetails();
        } else {
          this.dhlError = response.message || 'DHL Label Erstellung fehlgeschlagen.';
        }
      },
      error: (err) => {
        console.error('DHL Label Error:', err);
        this.dhlProcessing = false;
        this.dhlError = err.error?.message || 'DHL Label Erstellung fehlgeschlagen.';
      }
    });
  }

  // Utilities
  // Helper to get shipping address as Address object (or null)
  get shippingAddress(): Address | null {
    if (this.order && typeof this.order.shippingAddress === 'object' && this.order.shippingAddress !== null) {
      return this.order.shippingAddress as Address;
    }
    return null;
  }

  // Helper method to check if shippingAddress is an Address object (not string)
  isAddressObject(address: Address | string | undefined): address is Address {
    return typeof address === 'object' && address !== null;
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Ausstehend',
      [OrderStatus.CONFIRMED]: 'Bestätigt',
      [OrderStatus.PROCESSING]: 'In Bearbeitung',
      [OrderStatus.SHIPPED]: 'Versandt',
      [OrderStatus.DELIVERED]: 'Zugestellt',
      [OrderStatus.CANCELLED]: 'Storniert',
      [OrderStatus.REFUNDED]: 'Erstattet'
    };
    return labels[status] || status;
  }

  getStatusClass(status: OrderStatus): string {
    return `status-${status.toLowerCase()}`;
  }

  getAddress(address: Address | string | undefined): Address | null {
    if (!address) return null;
    if (typeof address === 'string') {
      try {
        return JSON.parse(address);
      } catch {
        return null;
      }
    }
    return address;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'orders']);
  }

  formatTimestamp(timestamp: string | Date): string {
    const date = toDate(timestamp);
    if (!date) return '-';
    return date.toLocaleString('de-DE');
  }

  /** Konvertiert Backend-Datum sicher zu Date-Objekt für Pipe-Usage */
  toDateObject(value: string | Date | undefined | null): Date | null {
    return toDate(value);
  }
}


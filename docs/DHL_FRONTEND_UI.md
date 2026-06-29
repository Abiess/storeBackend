# DHL Frontend UI - Implementation Guide

## 🎯 Ziel
Order Details Komponente um DHL Shipping Label Funktionalität erweitern.

---

## 📁 1. DHL Service erstellen

**Path:** `storeFrontend/src/app/core/services/dhl.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface DhlValidationResult {
  orderId: number;
  validation: string;
  shipmentNo: string;
  routingCode: string;
  refNo: string;
  validationMessages?: any[];
  status?: {
    statusCode: number;
    statusText: string;
    sstatus: string;
  };
}

export interface DhlLabelResult extends DhlValidationResult {
  labelUrl?: string;
  labelBase64?: string;
  trackingUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DhlService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/dhl`;

  /**
   * DHL Health Check
   * GET /api/admin/dhl/health
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * DHL Config (ohne Secrets)
   * GET /api/admin/dhl/config
   */
  getConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`);
  }

  /**
   * Validate DHL Shipment (ohne Label)
   * POST /api/admin/orders/{orderId}/dhl/validate
   */
  validateShipment(orderId: number): Observable<DhlValidationResult> {
    return this.http.post<DhlValidationResult>(
      `${this.apiUrl}/orders/${orderId}/validate`,
      {}
    );
  }

  /**
   * Create DHL Label + speichern in MinIO
   * POST /api/admin/orders/{orderId}/dhl/label
   * 
   * TODO: Phase 4/5 - noch nicht implementiert!
   */
  createLabel(orderId: number): Observable<DhlLabelResult> {
    return this.http.post<DhlLabelResult>(
      `${this.apiUrl}/orders/${orderId}/label`,
      {}
    );
  }
}
```

---

## 📁 2. Order Details Komponente erweitern

**Path:** `storeFrontend/src/app/features/orders/order-details/order-details.component.ts`

### TypeScript ergänzen:

```typescript
import { DhlService, DhlValidationResult } from '@app/core/services/dhl.service';

export class OrderDetailsComponent implements OnInit {
  private dhlService = inject(DhlService);
  
  // DHL State
  dhlEnabled = false;
  dhlValidating = false;
  dhlCreatingLabel = false;
  dhlValidationResult: DhlValidationResult | null = null;
  dhlError: string | null = null;

  ngOnInit() {
    // ... existing code ...
    
    // Check if DHL is enabled
    this.dhlService.getConfig().subscribe({
      next: (config) => {
        this.dhlEnabled = config.enabled === true;
      },
      error: () => {
        this.dhlEnabled = false;
      }
    });
  }

  /**
   * DHL Shipment validieren (kein Label)
   */
  validateDhlShipment() {
    if (!this.order?.id) return;
    
    this.dhlValidating = true;
    this.dhlError = null;
    this.dhlValidationResult = null;
    
    this.dhlService.validateShipment(this.order.id).subscribe({
      next: (result) => {
        this.dhlValidating = false;
        this.dhlValidationResult = result;
        
        if (result.validation === 'SUCCESS') {
          this.snackBar.open(
            this.translate.instant('orders.dhl_validation_success'),
            this.translate.instant('common.close'),
            { duration: 3000 }
          );
        }
      },
      error: (error) => {
        this.dhlValidating = false;
        
        if (error.status === 403) {
          this.dhlError = this.translate.instant('orders.dhl_access_denied');
        } else if (error.error?.message) {
          this.dhlError = error.error.message;
        } else {
          this.dhlError = this.translate.instant('orders.dhl_validation_error');
        }
        
        this.snackBar.open(this.dhlError, this.translate.instant('common.close'), {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * DHL Label erstellen (TODO: Phase 4/5)
   */
  createDhlLabel() {
    if (!this.order?.id) return;
    
    this.dhlCreatingLabel = true;
    this.dhlError = null;
    
    // TODO: Implementieren in Phase 4
    this.snackBar.open(
      'DHL Label Erstellung noch nicht implementiert (Phase 4)',
      this.translate.instant('common.close'),
      { duration: 3000 }
    );
    this.dhlCreatingLabel = false;
  }
}
```

---

## 📁 3. HTML Template erweitern

**Path:** `storeFrontend/src/app/features/orders/order-details/order-details.component.html`

Füge nach der Shipping Address Section ein:

```html
<!-- ========================== DHL SHIPPING SECTION ========================== -->
<mat-card *ngIf="dhlEnabled && order" class="dhl-section">
  <mat-card-header>
    <mat-card-title>
      <mat-icon>local_shipping</mat-icon>
      {{ 'orders.dhl_shipping' | translate }}
    </mat-card-title>
  </mat-card-header>

  <mat-card-content>
    <!-- DHL Validation Result -->
    <div *ngIf="dhlValidationResult" class="dhl-result success">
      <mat-icon>check_circle</mat-icon>
      <div class="dhl-result-content">
        <strong>{{ 'orders.dhl_validated' | translate }}</strong>
        <div class="dhl-details">
          <span><strong>Shipment No:</strong> {{ dhlValidationResult.shipmentNo }}</span>
          <span><strong>Routing Code:</strong> {{ dhlValidationResult.routingCode }}</span>
          <span><strong>Ref No:</strong> {{ dhlValidationResult.refNo }}</span>
        </div>
      </div>
    </div>

    <!-- DHL Error -->
    <div *ngIf="dhlError" class="dhl-result error">
      <mat-icon>error</mat-icon>
      <span>{{ dhlError }}</span>
    </div>

    <!-- Action Buttons -->
    <div class="dhl-actions">
      <button 
        mat-raised-button 
        color="accent"
        [disabled]="dhlValidating || dhlCreatingLabel"
        (click)="validateDhlShipment()">
        <mat-icon>verified</mat-icon>
        {{ dhlValidating ? ('orders.dhl_validating' | translate) : ('orders.dhl_validate' | translate) }}
      </button>

      <button 
        mat-raised-button 
        color="primary"
        [disabled]="dhlCreatingLabel || dhlValidating || !dhlValidationResult"
        (click)="createDhlLabel()">
        <mat-icon>label</mat-icon>
        {{ dhlCreatingLabel ? ('orders.dhl_creating_label' | translate) : ('orders.dhl_create_label' | translate) }}
      </button>

      <!-- Existing Tracking (falls schon ein Label erstellt wurde) -->
      <a 
        *ngIf="order.trackingNumber && order.trackingCarrier === 'DHL'"
        mat-raised-button
        [href]="order.trackingUrl"
        target="_blank">
        <mat-icon>open_in_new</mat-icon>
        {{ 'orders.track_shipment' | translate }}
      </a>
    </div>
  </mat-card-content>
</mat-card>
```

---

## 📁 4. SCSS Styling

**Path:** `storeFrontend/src/app/features/orders/order-details/order-details.component.scss`

```scss
.dhl-section {
  margin-top: 1.5rem;
  
  mat-card-header {
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }

  .dhl-result {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;

    &.success {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    &.error {
      background-color: #ffebee;
      color: #c62828;
    }

    mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .dhl-result-content {
      flex: 1;
      
      .dhl-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-top: 0.5rem;
        font-size: 0.9rem;
      }
    }
  }

  .dhl-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;

    button, a {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
}
```

---

## 📁 5. i18n Translation Keys

**Path:** `storeFrontend/src/assets/i18n/de.json`

```json
{
  "orders": {
    "dhl_shipping": "DHL Versand",
    "dhl_validate": "Sendung validieren",
    "dhl_validating": "Validiere...",
    "dhl_validated": "Sendung erfolgreich validiert",
    "dhl_create_label": "Label erstellen",
    "dhl_creating_label": "Erstelle Label...",
    "dhl_validation_success": "DHL Sendung erfolgreich validiert",
    "dhl_validation_error": "Fehler beim Validieren der DHL Sendung",
    "dhl_access_denied": "Zugriff verweigert. Diese Bestellung gehört nicht zu Ihrem Store.",
    "track_shipment": "Sendung verfolgen"
  }
}
```

**Path:** `storeFrontend/src/assets/i18n/en.json`

```json
{
  "orders": {
    "dhl_shipping": "DHL Shipping",
    "dhl_validate": "Validate Shipment",
    "dhl_validating": "Validating...",
    "dhl_validated": "Shipment successfully validated",
    "dhl_create_label": "Create Label",
    "dhl_creating_label": "Creating Label...",
    "dhl_validation_success": "DHL shipment successfully validated",
    "dhl_validation_error": "Error validating DHL shipment",
    "dhl_access_denied": "Access denied. This order does not belong to your store.",
    "track_shipment": "Track Shipment"
  }
}
```

**Path:** `storeFrontend/src/assets/i18n/ar.json`

```json
{
  "orders": {
    "dhl_shipping": "شحن DHL",
    "dhl_validate": "التحقق من الشحنة",
    "dhl_validating": "جار التحقق...",
    "dhl_validated": "تم التحقق من الشحنة بنجاح",
    "dhl_create_label": "إنشاء ملصق",
    "dhl_creating_label": "جار إنشاء الملصق...",
    "dhl_validation_success": "تم التحقق من شحنة DHL بنجاح",
    "dhl_validation_error": "خطأ في التحقق من شحنة DHL",
    "dhl_access_denied": "تم رفض الوصول. هذا الطلب لا ينتمي إلى متجرك.",
    "track_shipment": "تتبع الشحنة"
  }
}
```

---

## ✅ Testen

1. **Backend starten** mit `DHL_ENABLED=true`
2. **Frontend starten** mit `npm start`
3. **Als Store Owner einloggen**
4. **Order Details öffnen**
5. **"Sendung validieren" klicken**
   - Sollte DHL API aufrufen
   - Sollte Shipment No + Routing Code anzeigen
6. **"Label erstellen" klicken** (noch nicht implementiert)
   - Sollte Hinweis zeigen: "Phase 4"

---

## 🔄 Phase 4/5 Erweiterung

Wenn Label Creation implementiert ist:

1. **createLabel()** Methode aktivieren
2. **Label PDF Download** Button hinzufügen
3. **Tracking URL** automatisch anzeigen
4. **Order Status** auf "Shipped" setzen
5. **Email Benachrichtigung** an Kunden (optional)

---

**Stand:** UI Guide für Phase 3 erstellt ✅  
**Getestet:** Noch nicht (storeFrontend nicht im Workspace)  
**Nächste Schritte:** Label Creation (Phase 4) + MinIO (Phase 5)

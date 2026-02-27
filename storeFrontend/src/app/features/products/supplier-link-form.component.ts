import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DropshippingService } from '@app/core/services/dropshipping.service';
import { DropshippingSource, calculateMargin, formatMargin } from '@app/core/models/dropshipping.model';

@Component({
  selector: 'app-supplier-link-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEdit ? '🔗 Supplier-Link bearbeiten' : '🔗 Supplier-Link hinzufügen' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="supplier-form">
        <!-- Supplier Type -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Supplier Type</mat-label>
          <select matNativeControl formControlName="supplierType" (change)="onSupplierTypeChange()">
            <option value="MANUAL">🔗 Manual (Link-based)</option>
            <option value="CJ">🤖 CJ Dropshipping (API)</option>
          </select>
          <mat-hint>Choose how you want to fulfill orders</mat-hint>
        </mat-form-field>

        <!-- Supplier URL -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Supplier URL *</mat-label>
          <input matInput formControlName="supplierUrl" 
                 placeholder="https://www.alibaba.com/product/123456">
          <mat-hint>Link zum Produkt beim Supplier</mat-hint>
          <mat-error *ngIf="form.get('supplierUrl')?.hasError('required')">
            URL ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('supplierUrl')?.hasError('pattern')">
            Ungültige URL (muss http:// oder https:// sein)
          </mat-error>
        </mat-form-field>

        <!-- CJ Fields (nur wenn CJ ausgewählt) -->
        <div *ngIf="form.get('supplierType')?.value === 'CJ'" class="cj-fields">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>CJ Product ID</mat-label>
            <input matInput formControlName="cjProductId" 
                   placeholder="CJ-PROD-12345">
            <mat-hint>Product ID from CJ platform</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>CJ Variant ID</mat-label>
            <input matInput formControlName="cjVariantId" 
                   placeholder="CJ-VAR-67890">
            <mat-hint>Variant/SKU ID from CJ platform</mat-hint>
          </mat-form-field>

          <div class="alert alert-info">
            ℹ️ <strong>CJ Integration:</strong> Bestellungen können automatisch über die CJ API platziert werden.
            Stelle sicher, dass dein Store mit CJ verbunden ist.
          </div>
        </div>

        <!-- Supplier Name (optional) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Supplier Name</mat-label>
          <input matInput formControlName="supplierName" 
                 placeholder="z.B. Alibaba Fashion Co.">
          <mat-hint>Optional: Name des Suppliers für bessere Übersicht</mat-hint>
        </mat-form-field>

        <!-- Purchase Price -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Einkaufspreis *</mat-label>
          <input matInput type="number" step="0.01" formControlName="purchasePrice" 
                 placeholder="8.50">
          <span matPrefix>€&nbsp;</span>
          <mat-hint>Preis beim Supplier (inkl. Versand wenn möglich)</mat-hint>
          <mat-error *ngIf="form.get('purchasePrice')?.hasError('required')">
            Einkaufspreis ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('purchasePrice')?.hasError('min')">
            Preis muss >= 0 sein
          </mat-error>
        </mat-form-field>

        <!-- Margin Calculation Display -->
        <div class="margin-display" *ngIf="variantPrice && form.get('purchasePrice')?.value">
          <div class="margin-card" [class.profitable]="isMarginProfitable()">
            <div class="margin-row">
              <span class="label">Verkaufspreis:</span>
              <span class="value">{{ variantPrice | number:'1.2-2' }} €</span>
            </div>
            <div class="margin-row">
              <span class="label">Einkaufspreis:</span>
              <span class="value">{{ form.get('purchasePrice')?.value | number:'1.2-2' }} €</span>
            </div>
            <div class="margin-row profit">
              <span class="label">Gewinn:</span>
              <span class="value">{{ calculateProfit() | number:'1.2-2' }} €</span>
            </div>
            <div class="margin-row main">
              <span class="label">Marge:</span>
              <span class="value large">{{ getMarginPercentage() }}</span>
            </div>
          </div>
          
          <div class="warning" *ngIf="!isMarginProfitable()">
            ⚠️ Achtung: Einkaufspreis ist höher als Verkaufspreis!
          </div>
        </div>

        <!-- Estimated Shipping Days -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Geschätzte Lieferzeit</mat-label>
          <input matInput type="number" formControlName="estimatedShippingDays" 
                 placeholder="14">
          <span matSuffix>&nbsp;Tage</span>
          <mat-hint>Wie lange dauert die Lieferung vom Supplier?</mat-hint>
        </mat-form-field>

        <!-- Supplier SKU (optional) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Supplier SKU</mat-label>
          <input matInput formControlName="supplierSku" 
                 placeholder="z.B. ALI-TS-RED-M">
          <mat-hint>SKU beim Supplier (falls abweichend)</mat-hint>
        </mat-form-field>

        <!-- Notes -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notizen</mat-label>
          <textarea matInput formControlName="notes" rows="4"
                    placeholder="z.B. Mindestbestellmenge: 10 Stück, Zahlungsmethode: PayPal"></textarea>
          <mat-hint>Interne Notizen für den Bestellprozess</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="warn" *ngIf="isEdit" (click)="onDelete()"
              [disabled]="saving">
        Löschen
      </button>
      <button mat-raised-button color="primary" (click)="onSave()" 
              [disabled]="form.invalid || saving">
        {{ saving ? 'Speichere...' : 'Speichern' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .supplier-form {
      padding: 1rem 0;
      min-width: 500px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .margin-display {
      margin: 1.5rem 0;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .margin-card {
      background: white;
      padding: 1rem;
      border-radius: 6px;
      border: 2px solid #ddd;
    }

    .margin-card.profitable {
      border-color: #4caf50;
      background: #f1f8f4;
    }

    .margin-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .margin-row:last-child {
      border-bottom: none;
    }

    .margin-row.profit {
      font-weight: 600;
      color: #4caf50;
    }

    .margin-row.main {
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 2px solid #ddd;
    }

    .margin-row .label {
      color: #666;
    }

    .margin-row .value {
      font-weight: 600;
      color: #333;
    }

    .margin-row .value.large {
      font-size: 1.5rem;
      color: #4caf50;
    }

    .cj-fields {
      padding: 1rem;
      background: #f0fdf4;
      border: 2px solid #10b981;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .alert-info {
      padding: 0.75rem;
      background: #e0f2fe;
      border: 1px solid #0ea5e9;
      border-radius: 4px;
      color: #075985;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .warning {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      color: #856404;
      font-size: 0.875rem;
    }

    .cj-fields {
      padding: 1rem;
      background: #f0fdf4;
      border: 2px solid #10b981;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .alert-info {
      padding: 0.75rem;
      background: #e0f2fe;
      border: 1px solid #0ea5e9;
      border-radius: 4px;
      color: #075985;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    mat-dialog-actions {
      padding: 1rem;
      gap: 0.5rem;
    }
  `]
})
export class SupplierLinkFormComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit = false;

  variantId!: number;
  variantPrice!: number;
  existingSource?: DropshippingSource;

  constructor(
    private fb: FormBuilder,
    private dropshippingService: DropshippingService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<SupplierLinkFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      variantId: number;
      variantPrice: number;
      existingSource?: DropshippingSource;
    }
  ) {}

  ngOnInit() {
    this.variantId = this.data.variantId;
    this.variantPrice = this.data.variantPrice;
    this.existingSource = this.data.existingSource;
    this.isEdit = !!this.existingSource;

    this.initForm();
  }

  initForm() {
    const urlPattern = /^https?:\/\/.+/;

    this.form = this.fb.group({
      supplierType: [this.existingSource?.supplierType || 'MANUAL'],
      supplierUrl: [
        this.existingSource?.supplierUrl || '',
        [Validators.required, Validators.pattern(urlPattern)]
      ],
      supplierName: [this.existingSource?.supplierName || ''],
      purchasePrice: [
        this.existingSource?.purchasePrice || null,
        [Validators.required, Validators.min(0)]
      ],
      estimatedShippingDays: [
        this.existingSource?.estimatedShippingDays || null,
        [Validators.min(0)]
      ],
      supplierSku: [this.existingSource?.supplierSku || ''],
      cjProductId: [this.existingSource?.cjProductId || ''],
      cjVariantId: [this.existingSource?.cjVariantId || ''],
      notes: [this.existingSource?.notes || '']
    });
  }

  onSupplierTypeChange() {
    const type = this.form.get('supplierType')?.value;

    if (type === 'CJ') {
      // CJ: IDs sind wichtig
      this.form.get('cjProductId')?.setValidators([Validators.required]);
      this.form.get('cjVariantId')?.setValidators([Validators.required]);
    } else {
      // MANUAL: IDs nicht nötig
      this.form.get('cjProductId')?.clearValidators();
      this.form.get('cjVariantId')?.clearValidators();
    }

    this.form.get('cjProductId')?.updateValueAndValidity();
    this.form.get('cjVariantId')?.updateValueAndValidity();
  }

  calculateProfit(): number {
    const purchasePrice = this.form.get('purchasePrice')?.value || 0;
    return this.variantPrice - purchasePrice;
  }

  getMarginPercentage(): string {
    const purchasePrice = this.form.get('purchasePrice')?.value || 0;
    if (this.variantPrice === 0) return '0%';

    const margin = (this.variantPrice - purchasePrice) / this.variantPrice;
    return formatMargin(margin);
  }

  isMarginProfitable(): boolean {
    const purchasePrice = this.form.get('purchasePrice')?.value || 0;
    return this.variantPrice > purchasePrice;
  }

  onSave() {
    if (this.form.invalid) return;

    this.saving = true;
    const data = this.form.value;

    const request$ = this.isEdit
      ? this.dropshippingService.updateSupplierLink(this.variantId, data)
      : this.dropshippingService.saveSupplierLink(this.variantId, data);

    request$.subscribe({
      next: (result) => {
        this.snackBar.open(
          this.isEdit ? 'Supplier-Link aktualisiert' : 'Supplier-Link hinzugefügt',
          'OK',
          { duration: 3000 }
        );
        this.dialogRef.close(result);
      },
      error: (err) => {
        console.error('Error saving supplier link:', err);
        this.snackBar.open(
          'Fehler: ' + (err.error?.message || 'Unbekannter Fehler'),
          'OK',
          { duration: 5000 }
        );
        this.saving = false;
      }
    });
  }

  onDelete() {
    if (!confirm('Supplier-Link wirklich löschen?')) return;

    this.saving = true;
    this.dropshippingService.deleteSupplierLink(this.variantId).subscribe({
      next: () => {
        this.snackBar.open('Supplier-Link gelöscht', 'OK', { duration: 3000 });
        this.dialogRef.close('deleted');
      },
      error: (err) => {
        console.error('Error deleting supplier link:', err);
        this.snackBar.open('Fehler beim Löschen', 'OK', { duration: 5000 });
        this.saving = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}


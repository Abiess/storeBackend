import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceLine, UpdateLineRequest } from '@app/core/models/invoice-line.model';
import { SupplierInvoiceService } from '@app/core/services/supplier-invoice.service';

@Component({
    selector: 'app-invoice-line-edit-form',
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="edit-form" *ngIf="editForm">
      <form [formGroup]="editForm" (ngSubmit)="onSave()">
        <div class="form-row">
          <div class="form-field">
            <label>Art.-Nr.</label>
            <input formControlName="supplierArticleNumber" />
          </div>
          <div class="form-field flex-2">
            <label>Beschreibung</label>
            <input formControlName="description" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-field">
            <label>Menge</label>
            <input type="number" step="0.001" formControlName="quantity" />
          </div>
          <div class="form-field">
            <label>Einheit</label>
            <input formControlName="unit" />
          </div>
          <div class="form-field">
            <label>VPE</label>
            <input type="number" step="0.01" formControlName="packagingUnit" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-field">
            <label>Einkaufspreis</label>
            <input type="number" step="0.0001" formControlName="unitPrice" />
          </div>
          <div class="form-field">
            <label>Gesamt</label>
            <input type="number" step="0.0001" formControlName="lineTotal" />
          </div>
          <div class="form-field">
            <label>MwSt. %</label>
            <input type="number" step="0.01" formControlName="taxRate" />
          </div>
          <div class="form-field">
            <label>Rabatt %</label>
            <input type="number" step="0.01" formControlName="discount" />
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="onCancel()" [disabled]="loading">
            Abbrechen
          </button>
          <button type="submit" class="btn-save" [disabled]="loading || !editForm.valid">
            {{ loading ? 'Speichern...' : 'Speichern' }}
          </button>
        </div>
        
        <div class="error-message" *ngIf="error">
          {{ error }}
        </div>
      </form>
    </div>
  `,
    styles: [`
    .edit-form { padding: 1rem; background: #f5f5f5; border-radius: 0.5rem; margin-top: 0.5rem; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .form-field { flex: 1; }
    .form-field.flex-2 { flex: 2; }
    .form-field label { display: block; font-size: 0.875rem; color: #666; margin-bottom: 0.25rem; }
    .form-field input { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .btn-cancel, .btn-save { padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 600; cursor: pointer; border: none; }
    .btn-cancel { background: #eee; color: #333; }
    .btn-save { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-message { color: #d32f2f; font-size: 0.875rem; margin-top: 0.5rem; }
  `]
})
export class InvoiceLineEditFormComponent implements OnInit {
  @Input() line!: InvoiceLine;
  @Input() storeId!: number;
  @Input() documentId!: number;
  @Output() saved = new EventEmitter<InvoiceLine>();
  @Output() cancelled = new EventEmitter<void>();
  
  editForm!: FormGroup;
  loading = false;
  error: string | null = null;
  
  constructor(
    private fb: FormBuilder,
    private invoiceService: SupplierInvoiceService
  ) {}
  
  ngOnInit() {
    this.editForm = this.fb.group({
      supplierArticleNumber: [this.line.supplierArticleNumber],
      description: [this.line.description],
      quantity: [this.line.quantity, [Validators.min(0)]],
      unit: [this.line.unit],
      packagingUnit: [this.line.packagingUnit, [Validators.min(0)]],
      unitPrice: [this.line.unitPrice, [Validators.min(0)]],
      lineTotal: [this.line.lineTotal, [Validators.min(0)]],
      taxRate: [this.line.taxRate, [Validators.min(0), Validators.max(100)]],
      discount: [this.line.discount, [Validators.min(0), Validators.max(100)]]
    });
  }
  
  onSave() {
    if (this.editForm.invalid) return;
    
    this.loading = true;
    this.error = null;
    
    const request: UpdateLineRequest = this.editForm.value;
    
    this.invoiceService.updateInvoiceLine(this.storeId, this.documentId, this.line.id, request)
      .subscribe({
        next: (updated: InvoiceLine) => {
          this.loading = false;
          this.saved.emit(updated);
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.error?.message || 'Position konnte nicht gespeichert werden.';
        }
      });
  }
  
  onCancel() {
    this.cancelled.emit();
  }
}

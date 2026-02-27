import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '@app/core/services/product.service';
import { DropshippingService } from '@app/core/services/dropshipping.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ProductVariant } from '@app/core/models';
import { DropshippingSource, formatMargin } from '@app/core/models/dropshipping.model';
import { SupplierLinkFormComponent } from './supplier-link-form.component';

interface ProductOption {
  id?: number;
  name: string;
  values: string[];
  sortOrder: number;
}


@Component({
  selector: 'app-product-variants-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MatDialogModule],
  template: `
    <div class="variants-manager">
      <h2>🎨 {{ 'product.variants.title' | translate }}</h2>
      
      <!-- Schritt 1: Product Options definieren -->
      <div class="section">
        <h3>1️⃣ {{ 'product.variants.defineOptions' | translate }}</h3>
        <p class="hint">{{ 'product.variants.optionsHint' | translate }}</p>
        
        <div class="options-list">
          <div *ngFor="let option of options; let i = index" class="option-card">
            <div class="option-header">
              <input 
                type="text" 
                [(ngModel)]="option.name" 
                [placeholder]="'product.variants.optionName' | translate"
                class="option-name-input"
              />
              <button type="button" class="btn-icon-danger" (click)="removeOption(i)">🗑️</button>
            </div>
            
            <div class="option-values">
              <div *ngFor="let value of option.values; let j = index" class="value-chip">
                <input 
                  type="text" 
                  [(ngModel)]="option.values[j]"
                  class="value-input"
                />
                <button type="button" class="btn-chip-remove" (click)="removeValue(i, j)">×</button>
              </div>
              <button type="button" class="btn-add-value" (click)="addValue(i)">
                + {{ 'product.variants.addValue' | translate }}
              </button>
            </div>
          </div>
          
          <button type="button" class="btn-add-option" (click)="addOption()">
            + {{ 'product.variants.addOption' | translate }}
          </button>
        </div>
      </div>

      <!-- Schritt 2: Varianten generieren oder manuell bearbeiten -->
      <div class="section">
        <h3>2️⃣ {{ 'product.variants.generateTitle' | translate }}</h3>
        
        <div class="generate-controls">
          <div class="form-group">
            <label>{{ 'product.variants.basePrice' | translate }}</label>
            <input 
              type="number" 
              [(ngModel)]="basePrice" 
              step="0.01" 
              min="0"
              placeholder="0.00"
              class="price-input"
            />
          </div>
          
          <div class="form-group">
            <label>{{ 'product.variants.baseStock' | translate }}</label>
            <input 
              type="number" 
              [(ngModel)]="baseStock" 
              min="0"
              placeholder="0"
              class="stock-input"
            />
          </div>
          
          <button 
            type="button" 
            class="btn-generate" 
            (click)="generateVariants()"
            [disabled]="!canGenerate() || generating"
          >
            ⚡ {{ generating ? ('common.generating' | translate) : ('product.variants.generate' | translate) }}
          </button>
        </div>
        
        <div class="combinations-preview" *ngIf="options.length > 0">
          <p class="preview-text">
            {{ 'product.variants.willGenerate' | translate }} 
            <strong>{{ calculateCombinationsCount() }}</strong> 
            {{ 'product.variants.variants' | translate }}
          </p>
        </div>
      </div>

      <!-- Schritt 3: Generierte Varianten anzeigen und bearbeiten -->
      <div class="section" *ngIf="variants.length > 0">
        <h3>3️⃣ {{ 'product.variants.generatedVariants' | translate }} ({{ variants.length }})</h3>
        
        <div class="variants-grid">
          <div *ngFor="let variant of variants; let i = index" class="variant-card">
            <div class="variant-header">
              <div class="variant-card">
                <span *ngFor="let attr of getAttributesArray(variant.attributes || {})" class="attribute-badge">
                  {{ attr.key }}: {{ attr.value }}
                </span>
              </div>
              <button 
                type="button" 
                class="btn-icon-danger" 
                (click)="removeVariant(i)"
                [title]="'common.delete' | translate"
              >
                🗑️
              </button>
            </div>
            
            <div class="variant-fields">
              <div class="field">
                <label>SKU</label>
                <input 
                  type="text" 
                  [(ngModel)]="variant.sku"
                  class="input-sm"
                />
              </div>
              
              <div class="field">
                <label>{{ 'product.price' | translate }} (€)</label>
                <input 
                  type="number" 
                  [(ngModel)]="variant.price"
                  step="0.01"
                  min="0"
                  class="input-sm"
                />
              </div>
              
              <div class="field">
                <label>{{ 'product.variants.stock' | translate }}</label>
                <input 
                  type="number" 
                  [(ngModel)]="variant.stockQuantity"
                  min="0"
                  class="input-sm"
                />
              </div>
              
              <!-- DROPSHIPPING: Supplier Link Button -->
              <div class="field dropshipping-field">
                <label>🚚 Dropshipping</label>
                <button 
                  type="button" 
                  class="btn-supplier-link"
                  [class.has-link]="hasSupplierLink(variant)"
                  (click)="openSupplierLinkDialog(variant)"
                >
                  {{ hasSupplierLink(variant) ? '✓ Link bearbeiten' : '+ Link hinzufügen' }}
                </button>
                <div class="margin-info" *ngIf="getSupplierLink(variant) as source">
                  <small>Marge: {{ formatMargin(source.marginPercentage || 0) }}</small>
                </div>
              </div>
            </div>
            
            <div class="variant-status">
              <span class="stock-badge" [class.in-stock]="variant.stockQuantity > 0" [class.out-of-stock]="variant.stockQuantity === 0">
                {{ variant.stockQuantity > 0 ? ('product.variants.inStock' | translate) : ('product.variants.outOfStock' | translate) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="save-section">
          <button 
            type="button" 
            class="btn-save-variants" 
            (click)="saveAllVariants()"
            [disabled]="saving"
          >
            💾 {{ saving ? ('common.saving' | translate) : ('product.variants.saveAll' | translate) }}
          </button>
        </div>
      </div>

      <div class="success-message" *ngIf="successMessage">
        ✅ {{ successMessage }}
      </div>
      <div class="error-message" *ngIf="errorMessage">
        ❌ {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .variants-manager {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h2 {
      margin: 0 0 2rem;
      color: #333;
      font-size: 1.5rem;
    }

    h3 {
      margin: 0 0 1rem;
      color: #444;
      font-size: 1.125rem;
    }

    .section {
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .section:last-of-type {
      border-bottom: none;
    }

    .hint {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    /* Options Styling */
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .option-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .option-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .option-name-input {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
    }

    .option-name-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .option-values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .value-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
    }

    .value-input {
      border: none;
      background: transparent;
      font-size: 0.875rem;
      width: 100px;
    }

    .value-input:focus {
      outline: none;
    }

    .btn-chip-remove {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }

    .btn-chip-remove:hover {
      background: #c82333;
    }

    .btn-add-value {
      background: white;
      border: 2px dashed #667eea;
      color: #667eea;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-add-value:hover {
      background: #f5f7ff;
      border-color: #764ba2;
      color: #764ba2;
    }

    .btn-add-option {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.875rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s;
      width: 100%;
    }

    .btn-add-option:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-icon-danger {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .btn-icon-danger:hover {
      background: #c82333;
    }

    /* Generate Controls */
    .generate-controls {
      display: grid;
      grid-template-columns: 1fr 1fr 2fr;
      gap: 1rem;
      align-items: end;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #444;
    }

    .price-input,
    .stock-input {
      padding: 0.75rem;
      border: 2px solid #dee2e6;
      border-radius: 8px;
      font-size: 1rem;
    }

    .price-input:focus,
    .stock-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-generate {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-generate:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .btn-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .combinations-preview {
      background: #e7f3ff;
      border-left: 4px solid #0066cc;
      padding: 1rem;
      border-radius: 8px;
    }

    .preview-text {
      margin: 0;
      color: #0066cc;
      font-size: 0.875rem;
    }

    .preview-text strong {
      font-size: 1.125rem;
    }

    /* Variants Grid */
    .variants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .variant-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.3s;
    }

    .variant-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
    }

    .variant-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .variant-attributes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      flex: 1;
    }

    .attribute-badge {
      background: white;
      border: 1px solid #667eea;
      color: #667eea;
      padding: 0.375rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
    }

    .attribute-badge strong {
      color: #764ba2;
    }

    .variant-fields {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
    }

    .input-sm {
      padding: 0.5rem;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .input-sm:focus {
      outline: none;
      border-color: #667eea;
    }

    .variant-status {
      display: flex;
      justify-content: flex-end;
    }

    .stock-badge {
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .stock-badge.in-stock {
      background: #d4edda;
      color: #155724;
    }

    .stock-badge.out-of-stock {
      background: #f8d7da;
      color: #721c24;
    }

    .save-section {
      display: flex;
      justify-content: center;
      margin-top: 2rem;
    }

    .btn-save-variants {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 1rem 3rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s;
    }

    .btn-save-variants:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .btn-save-variants:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    .error-message {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    /* Dropshipping Supplier Link Styles */
    .dropshipping-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn-supplier-link {
      padding: 0.5rem 1rem;
      border: 2px dashed #ccc;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-supplier-link:hover {
      border-color: #667eea;
      background: #f0f4ff;
    }

    .btn-supplier-link.has-link {
      border-style: solid;
      border-color: #4caf50;
      background: #f1f8f4;
      color: #2e7d32;
    }

    .margin-info {
      font-size: 0.75rem;
      color: #4caf50;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .generate-controls {
        grid-template-columns: 1fr;
      }

      .variants-grid {
        grid-template-columns: 1fr;
      }

      .variant-fields {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductVariantsManagerComponent implements OnInit {
  @Input() productId!: number;
  @Input() storeId!: number;

  options: ProductOption[] = [];
  variants: ProductVariant[] = [];

  // Dropshipping: Cache für Supplier-Links
  supplierLinks = new Map<number, DropshippingSource>();

  basePrice: number = 0;
  baseStock: number = 0;

  generating = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private dropshippingService: DropshippingService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadExistingData();
    this.loadSupplierLinks();
  }

  loadExistingData() {
    // Lade existierende Options und Varianten
    if (this.productId && this.storeId) {
      this.productService.getProductOptions(this.storeId, this.productId).subscribe({
        next: (options) => {
          this.options = options;
        },
        error: (err) => console.error('Error loading options:', err)
      });

      this.productService.getProductVariants(this.storeId, this.productId).subscribe({
        next: (variants) => {
          this.variants = variants;
        },
        error: (err) => console.error('Error loading variants:', err)
      });
    }
  }

  addOption() {
    this.options.push({
      name: '',
      values: [''],
      sortOrder: this.options.length
    });
  }

  removeOption(index: number) {
    this.options.splice(index, 1);
  }

  addValue(optionIndex: number) {
    this.options[optionIndex].values.push('');
  }

  removeValue(optionIndex: number, valueIndex: number) {
    this.options[optionIndex].values.splice(valueIndex, 1);
  }

  canGenerate(): boolean {
    if (this.options.length === 0) return false;

    for (const option of this.options) {
      if (!option.name || option.name.trim() === '') return false;
      if (option.values.length === 0) return false;
      for (const value of option.values) {
        if (!value || value.trim() === '') return false;
      }
    }

    return this.basePrice > 0;
  }

  calculateCombinationsCount(): number {
    if (this.options.length === 0) return 0;

    let count = 1;
    for (const option of this.options) {
      count *= option.values.filter(v => v && v.trim() !== '').length;
    }
    return count;
  }

  generateVariants() {
    if (!this.canGenerate()) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      return;
    }

    this.generating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = {
      productId: this.productId,
      basePrice: this.basePrice,
      baseStock: this.baseStock,
      options: this.options
    };

    this.productService.generateVariants(this.storeId, this.productId, request).subscribe({
      next: (variants) => {
        this.variants = variants;
        this.successMessage = `${variants.length} Varianten erfolgreich generiert!`;
        this.generating = false;

        // Speichere auch die Options
        this.saveOptions();
      },
      error: (err) => {
        console.error('Error generating variants:', err);
        this.errorMessage = 'Fehler beim Generieren der Varianten: ' + (err.error?.message || err.message);
        this.generating = false;
      }
    });
  }

  saveOptions() {
    // Speichere oder aktualisiere jede Option
    this.options.forEach((option, index) => {
      option.sortOrder = index;

      if (option.id) {
        // Update existing
        this.productService.updateProductOption(this.storeId, this.productId, option.id, option).subscribe({
          error: (err) => console.error('Error updating option:', err)
        });
      } else {
        // Create new
        this.productService.createProductOption(this.storeId, this.productId, option).subscribe({
          next: (created) => {
            option.id = created.id;
          },
          error: (err) => console.error('Error creating option:', err)
        });
      }
    });
  }

  saveAllVariants() {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updates = this.variants.map((variant) => {
      if (variant.id) {
        return this.productService.updateProductVariant(
          this.storeId,
          this.productId,
          variant.id,
          variant
        );
      } else {
        return this.productService.createProductVariant(
          this.storeId,
          this.productId,
          variant
        );
      }
    });

    // Warte auf alle Updates
    Promise.all(updates.map(obs => obs.toPromise()))
      .then(() => {
        this.successMessage = 'Alle Varianten erfolgreich gespeichert!';
        this.saving = false;
        setTimeout(() => this.successMessage = '', 3000);
      })
      .catch((err) => {
        console.error('Error saving variants:', err);
        this.errorMessage = 'Fehler beim Speichern der Varianten: ' + (err.error?.message || err.message);
        this.saving = false;
      });
  }

  removeVariant(index: number) {
    const variant = this.variants[index];

    if (variant.id) {
      // Lösche vom Server
      this.productService.deleteProductVariant(this.storeId, this.productId, variant.id).subscribe({
        next: () => {
          this.variants.splice(index, 1);
          this.successMessage = 'Variante gelöscht!';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => {
          console.error('Error deleting variant:', err);
          this.errorMessage = 'Fehler beim Löschen: ' + (err.error?.message || err.message);
        }
      });
    } else {
      // Nur lokal entfernen
      this.variants.splice(index, 1);
    }
  }

  getAttributesArray(attributes: { [key: string]: string } | undefined): Array<{ key: string, value: string }> {
    return Object.entries(attributes || {}).map(([key, value]) => ({ key, value }));
  }

  // ==================================================================================
  // DROPSHIPPING METHODS
  // ==================================================================================

  /**
   * Lädt Supplier-Links für alle Varianten
   */
  loadSupplierLinks() {
    if (!this.productId) return;

    this.dropshippingService.getSupplierLinksForProduct(this.productId).subscribe({
      next: (sources) => {
        // Cache in Map für schnellen Zugriff
        sources.forEach(source => {
          if (source.variantId) {
            this.supplierLinks.set(source.variantId, source);
          }
        });
      },
      error: (err) => {
        // Kein Fehler anzeigen - 404 ist normal wenn keine Links vorhanden
        if (err.status !== 404) {
          console.error('Error loading supplier links:', err);
        }
      }
    });
  }

  /**
   * Prüft ob Variant einen Supplier-Link hat
   */
  hasSupplierLink(variant: ProductVariant): boolean {
    return variant.id ? this.supplierLinks.has(variant.id) : false;
  }

  /**
   * Holt Supplier-Link für Variant
   */
  getSupplierLink(variant: ProductVariant): DropshippingSource | undefined {
    return variant.id ? this.supplierLinks.get(variant.id) : undefined;
  }

  /**
   * Öffnet Supplier-Link Dialog
   */
  openSupplierLinkDialog(variant: ProductVariant) {
    if (!variant.id) {
      alert('Bitte speichere die Variante zuerst, bevor du einen Supplier-Link hinzufügst.');
      return;
    }

    const existingSource = this.getSupplierLink(variant);

    const dialogRef = this.dialog.open(SupplierLinkFormComponent, {
      width: '600px',
      data: {
        variantId: variant.id,
        variantPrice: variant.price,
        existingSource: existingSource
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'deleted') {
        // Entferne aus Cache
        if (variant.id) {
          this.supplierLinks.delete(variant.id);
        }
        this.successMessage = 'Supplier-Link gelöscht';
        setTimeout(() => this.successMessage = '', 3000);
      } else if (result) {
        // Update Cache
        if (variant.id) {
          this.supplierLinks.set(variant.id, result);
        }
        this.successMessage = 'Supplier-Link gespeichert';
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }

  /**
   * Formatiert Marge für Anzeige
   */
  formatMargin(margin: number): string {
    return formatMargin(margin);
  }
}


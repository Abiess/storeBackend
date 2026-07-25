import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InvoiceLine, LineSummary } from '@app/core/models/invoice-line.model';
import { SupplierInvoiceService, InvoiceParseResult } from '@app/core/services/supplier-invoice.service';
import { ProductService } from '@app/core/services/product.service';
import { InvoiceLineStatusBadgeComponent } from './invoice-line-status-badge.component';
import { InvoiceLineSummaryComponent } from './invoice-line-summary.component';
import { InvoiceLineEditFormComponent } from './invoice-line-edit-form.component';

interface ProductSummary {
  id: number;
  title: string;
  sku?: string;
  price?: number;
}

type FilterType = 'ALL' | 'REVIEW' | 'UNMAPPED' | 'MAPPED';

@Component({
  selector: 'app-invoice-lines-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    InvoiceLineStatusBadgeComponent,
    InvoiceLineSummaryComponent,
    InvoiceLineEditFormComponent
  ],
  template: `
    <div class="invoice-lines-section" *ngIf="lines.length > 0">
      <h3>Erkannte Positionen ({{ lines.length }})</h3>
      
      <app-invoice-line-summary
        [summary]="summary"
        [loading]="bulkLoading"
        (bulkConfirm)="onBulkConfirm()">
      </app-invoice-line-summary>
      
      <div class="filter-tabs">
        <button 
          *ngFor="let f of filters"
          [class.active]="currentFilter === f.type"
          (click)="currentFilter = f.type">
          {{ f.label }} ({{ getFilteredCount(f.type) }})
        </button>
      </div>
      
      <!-- Desktop Table -->
      <div class="lines-table desktop-only">
        <table>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Art.-Nr.</th>
              <th>Beschreibung</th>
              <th>Menge</th>
              <th>Einheit</th>
              <th>VPE</th>
              <th>Preis</th>
              <th>Gesamt</th>
              <th>MwSt.</th>
              <th>Produkt</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let line of filteredLines">
              <tr [class.editing]="editingLineId === line.id">
                <td>{{ line.positionNumber }}</td>
                <td>{{ line.supplierArticleNumber || '-' }}</td>
                <td>
                  {{ line.description || '-' }}
                  <div class="warnings" *ngIf="line.warnings.length > 0">
                    <small *ngFor="let w of line.warnings">⚠️ {{ w }}</small>
                  </div>
                </td>
                <td>{{ line.quantity | number:'1.0-3' }}</td>
                <td>{{ line.unit }}</td>
                <td>{{ line.packagingUnit | number:'1.0-2' }}</td>
                <td>{{ line.unitPrice | number:'1.2-4' }} €</td>
                <td>{{ line.lineTotal | number:'1.2-2' }} €</td>
                <td>{{ line.taxRate }}%</td>
                <td>
                  <div *ngIf="line.mappingSource === 'LEARNED_MAPPING'" class="learned-hint">
                    ✨ Aus früherer Zuordnung
                  </div>
                  <div *ngIf="line.suggestedProductId" class="product-name">
                    {{ getProductName(line.suggestedProductId) }}
                  </div>
                  <button 
                    *ngIf="!assigningProductLineId || assigningProductLineId !== line.id"
                    class="btn-sm"
                    (click)="startProductAssignment(line)">
                    {{ line.suggestedProductId ? 'Ändern' : 'Zuordnen' }}
                  </button>
                </td>
                <td>
                  <app-invoice-line-status-badge [status]="line.status" />
                </td>
                <td>
                  <button 
                    *ngIf="editingLineId !== line.id"
                    class="btn-sm"
                    (click)="startEdit(line)">
                    Bearbeiten
                  </button>
                </td>
              </tr>
              
              <!-- Edit Form Row -->
              <tr *ngIf="editingLineId === line.id">
                <td colspan="12">
                  <app-invoice-line-edit-form
                    [line]="line"
                    [storeId]="storeId"
                    [documentId]="documentId"
                    (saved)="onLineSaved($event)"
                    (cancelled)="cancelEdit()">
                  </app-invoice-line-edit-form>
                </td>
              </tr>
              
              <!-- Product Assignment Row -->
              <tr *ngIf="assigningProductLineId === line.id">
                <td colspan="12">
                  <div class="product-assignment">
                    <h4>Produkt zuordnen für Position {{ line.positionNumber }}</h4>
                    
                    <div class="search-box">
                      <input 
                        type="text"
                        [(ngModel)]="productSearchQuery"
                        (ngModelChange)="onProductSearch($event)"
                        placeholder="Produkt suchen (Name, SKU, EAN)..."
                        autofocus />
                    </div>
                    
                    <div class="product-results" *ngIf="productResults.length > 0">
                      <div 
                        *ngFor="let product of productResults"
                        class="product-item"
                        [class.selected]="selectedProductId === product.id"
                        (click)="selectedProductId = product.id">
                        <div class="product-info">
                          <strong>{{ product.title }}</strong>
                          <small *ngIf="product.sku">SKU: {{ product.sku }}</small>
                          <small *ngIf="product.price">{{ product.price | number:'1.2-2' }} €</small>
                        </div>
                        <div class="checkmark" *ngIf="selectedProductId === product.id">✓</div>
                      </div>
                    </div>
                    
                    <div class="remember-checkbox">
                      <label>
                        <input type="checkbox" [(ngModel)]="rememberMapping" />
                        Dieses Produkt für zukünftige Rechnungen merken
                      </label>
                    </div>
                    
                    <div class="assignment-actions">
                      <button class="btn-cancel" (click)="cancelProductAssignment()">
                        Abbrechen
                      </button>
                      <button 
                        class="btn-assign"
                        [disabled]="!selectedProductId || assigningProduct"
                        (click)="confirmProductAssignment()">
                        {{ assigningProduct ? 'Zuordnen...' : 'Produkt zuordnen' }}
                      </button>
                    </div>
                    
                    <div class="error-message" *ngIf="assignmentError">
                      {{ assignmentError }}
                    </div>
                  </div>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
      
      <!-- Mobile Cards -->
      <div class="lines-cards mobile-only">
        <div *ngFor="let line of filteredLines" class="line-card">
          <div class="card-header">
            <span class="position-number">Pos. {{ line.positionNumber }}</span>
            <app-invoice-line-status-badge [status]="line.status" />
          </div>
          
          <div class="card-body">
            <div class="field">
              <label>Art.-Nr.:</label>
              <span>{{ line.supplierArticleNumber || '-' }}</span>
            </div>
            <div class="field">
              <label>Beschreibung:</label>
              <span>{{ line.description || '-' }}</span>
            </div>
            <div class="field">
              <label>Menge:</label>
              <span>{{ line.quantity }} {{ line.unit }} (VPE: {{ line.packagingUnit }})</span>
            </div>
            <div class="field">
              <label>Preis:</label>
              <span>{{ line.unitPrice | number:'1.2-4' }} € → {{ line.lineTotal | number:'1.2-2' }} €</span>
            </div>
            <div class="field">
              <label>MwSt.:</label>
              <span>{{ line.taxRate }}%</span>
            </div>
            
            <div class="warnings" *ngIf="line.warnings.length > 0">
              <small *ngFor="let w of line.warnings">⚠️ {{ w }}</small>
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-sm" (click)="startEdit(line)">Bearbeiten</button>
            <button class="btn-sm" (click)="startProductAssignment(line)">
              {{ line.suggestedProductId ? 'Produkt ändern' : 'Produkt zuordnen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invoice-lines-section.component.scss']
})
export class InvoiceLinesSectionComponent implements OnInit, OnChanges {
  @Input() storeId!: number;
  @Input() documentId!: number;
  @Input() lines: InvoiceLine[] = [];
  @Input() summary: LineSummary = { detected: 0, confirmed: 0, mapped: 0, needsReview: 0 };
  
  currentFilter: FilterType = 'ALL';
  filters = [
    { type: 'ALL' as FilterType, label: 'Alle' },
    { type: 'REVIEW' as FilterType, label: 'Bitte prüfen' },
    { type: 'UNMAPPED' as FilterType, label: 'Nicht zugeordnet' },
    { type: 'MAPPED' as FilterType, label: 'Zugeordnet' }
  ];
  
  editingLineId: number | null = null;
  assigningProductLineId: number | null = null;
  selectedProductId: number | null = null;
  productSearchQuery = '';
  productResults: ProductSummary[] = [];
  rememberMapping = true;
  assigningProduct = false;
  assignmentError: string | null = null;
  bulkLoading = false;
  
  productsCache: Map<number, ProductSummary> = new Map();
  
  constructor(
    private invoiceService: SupplierInvoiceService,
    private productService: ProductService
  ) {}
  
  ngOnInit() {
    this.loadSuggestedProducts();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['lines']) {
      this.loadSuggestedProducts();
    }
  }
  
  get filteredLines(): InvoiceLine[] {
    switch (this.currentFilter) {
      case 'REVIEW':
        return this.lines.filter(l => l.status === 'REVIEW_REQUIRED' || l.status === 'UNREVIEWED');
      case 'UNMAPPED':
        return this.lines.filter(l => l.status !== 'MAPPED');
      case 'MAPPED':
        return this.lines.filter(l => l.status === 'MAPPED');
      default:
        return this.lines;
    }
  }
  
  getFilteredCount(type: FilterType): number {
    switch (type) {
      case 'REVIEW': return this.lines.filter(l => l.status === 'REVIEW_REQUIRED' || l.status === 'UNREVIEWED').length;
      case 'UNMAPPED': return this.lines.filter(l => l.status !== 'MAPPED').length;
      case 'MAPPED': return this.lines.filter(l => l.status === 'MAPPED').length;
      default: return this.lines.length;
    }
  }
  
  loadSuggestedProducts() {
    const productIds = this.lines
      .map(l => l.suggestedProductId)
      .filter((id): id is number => id !== null && !this.productsCache.has(id));
    
    if (productIds.length > 0) {
      // Load products - using existing product service
      productIds.forEach(id => {
        this.productService.getProduct(id, this.storeId).subscribe({
          next: (product: any) => {
            this.productsCache.set(id, {
              id: product.id,
              title: product.title,
              sku: product.sku,
              price: product.price
            });
          },
          error: () => {}
        });
      });
    }
  }
  
  getProductName(productId: number): string {
    return this.productsCache.get(productId)?.title || 'Produkt laden...';
  }
  
  startEdit(line: InvoiceLine) {
    this.editingLineId = line.id;
    this.assigningProductLineId = null;
  }
  
  cancelEdit() {
    this.editingLineId = null;
  }
  
  onLineSaved(updated: InvoiceLine) {
    const index = this.lines.findIndex(l => l.id === updated.id);
    if (index !== -1) {
      this.lines[index] = updated;
      this.summary = this.calculateSummary();
    }
    this.editingLineId = null;
  }
  
  startProductAssignment(line: InvoiceLine) {
    this.assigningProductLineId = line.id;
    this.editingLineId = null;
    this.selectedProductId = line.suggestedProductId;
    this.productSearchQuery = '';
    this.productResults = [];
    this.assignmentError = null;
  }
  
  cancelProductAssignment() {
    this.assigningProductLineId = null;
    this.selectedProductId = null;
    this.productSearchQuery = '';
    this.productResults = [];
  }
  
  onProductSearch(query: string) {
    if (query.length < 2) {
      this.productResults = [];
      return;
    }
    
    // Search products using existing service
    this.productService.searchProducts(this.storeId, query).subscribe({
      next: (results: any) => {
        this.productResults = results.map((p: any) => ({
          id: p.id,
          title: p.title,
          sku: p.sku,
          price: p.price
        }));
      },
      error: () => {
        this.productResults = [];
      }
    });
  }
  
  confirmProductAssignment() {
    if (!this.selectedProductId || !this.assigningProductLineId) return;
    
    this.assigningProduct = true;
    this.assignmentError = null;
    
    this.invoiceService.assignProductMapping(
      this.storeId,
      this.documentId,
      this.assigningProductLineId,
      { productId: this.selectedProductId, rememberForFuture: this.rememberMapping }
    ).subscribe({
      next: (updated) => {
        const index = this.lines.findIndex(l => l.id === updated.id);
        if (index !== -1) {
          this.lines[index] = updated;
          this.summary = this.calculateSummary();
        }
        this.assigningProduct = false;
        this.cancelProductAssignment();
      },
      error: (err) => {
        this.assigningProduct = false;
        this.assignmentError = err.error?.message || 'Zuordnung fehlgeschlagen.';
      }
    });
  }
  
  onBulkConfirm() {
    const lineIds = this.lines
      .filter(l => l.warnings.length === 0 && l.status !== 'MAPPED' && l.status !== 'CONFIRMED')
      .map(l => l.id);
    
    if (lineIds.length === 0) {
      return;
    }
    
    this.bulkLoading = true;
    
    this.invoiceService.bulkConfirmLines(this.storeId, this.documentId, {
      lineIds,
      onlyWithoutWarnings: true
    }).subscribe({
      next: (result) => {
        // Reload parse result to get updated lines
        this.invoiceService.getParseResult(this.storeId, this.documentId).subscribe({
          next: (parseResult) => {
            if (parseResult.lines) {
              this.lines = parseResult.lines;
              this.summary = parseResult.lineSummary || this.calculateSummary();
            }
            this.bulkLoading = false;
            alert(`${result.confirmed} Positionen bestätigt, ${result.skipped} übersprungen.`);
          },
          error: () => {
            this.bulkLoading = false;
          }
        });
      },
      error: () => {
        this.bulkLoading = false;
        alert('Bulk-Bestätigung fehlgeschlagen.');
      }
    });
  }
  
  private calculateSummary(): LineSummary {
    return {
      detected: this.lines.length,
      confirmed: this.lines.filter(l => l.status === 'CONFIRMED').length,
      mapped: this.lines.filter(l => l.status === 'MAPPED').length,
      needsReview: this.lines.filter(l => l.status === 'UNREVIEWED' || l.status === 'REVIEW_REQUIRED').length
    };
  }
}

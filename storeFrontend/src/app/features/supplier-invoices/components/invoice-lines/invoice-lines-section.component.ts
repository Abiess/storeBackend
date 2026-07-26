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
  stockQuantity?: number;
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
      
      <!-- Import Selection Counter -->
      <div class="import-selection-info" *ngIf="selectedForImport.size > 0">
        <strong>{{ selectedForImport.size }} von {{ lines.length }} Positionen ausgewählt</strong>
      </div>
      
      <app-invoice-line-summary
        [summary]="summary"
        [loading]="bulkLoading"
        (bulkConfirm)="onBulkConfirm()">
      </app-invoice-line-summary>
      
      <div class="actions-bar">
        <button class="btn-add" (click)="startCreateLine()">+ Position hinzufügen</button>
      </div>
      
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
              <th><input type="checkbox" disabled title="Alle auswählen" /></th>
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
                <td>
                  <input 
                    type="checkbox" 
                    [checked]="selectedForImport.has(line.id)"
                    (change)="toggleImportSelection(line.id)"
                    title="Für Import auswählen" />
                </td>
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
                    class="btn-sm btn-edit"
                    (click)="startEdit(line)">
                    Bearbeiten
                  </button>
                  <button 
                    class="btn-sm btn-delete"
                    (click)="deleteLine(line)">
                    Löschen
                  </button>
                  <button 
                    class="btn-sm btn-split"
                    (click)="startSplitLine(line)">
                    Aufteilen
                  </button>
                  <button 
                    *ngIf="canMergeWithNext(line)"
                    class="btn-sm btn-merge"
                    (click)="mergeWithNext(line)">
                    Zusammenführen
                  </button>
                </td>
              </tr>
              
              <!-- Edit Form Row -->
              <tr *ngIf="editingLineId === line.id">
                <td colspan="13">
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
                <td colspan="13">
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
                          <small *ngIf="product.price">Preis: {{ product.price | number:'1.2-2' }} €</small>
                          <small *ngIf="product.stockQuantity !== undefined">Bestand: {{ product.stockQuantity }}</small>
                        </div>
                        <div class="checkmark" *ngIf="selectedProductId === product.id">✓</div>
                      </div>
                    </div>
                    
                    <div class="no-results" *ngIf="productSearchQuery.length >= 2 && productResults.length === 0">
                      <p>Kein passendes Produkt gefunden.</p>
                      <small>Suche nach: Produktname, SKU</small>
                    </div>
                    
                    <div class="selected-product-summary" *ngIf="selectedProductId">
                      <h5>Ausgewähltes Produkt</h5>
                      <div class="summary-grid">
                        <div class="summary-item">
                          <label>Produktname:</label>
                          <span>{{ getSelectedProduct()?.title }}</span>
                        </div>
                        <div class="summary-item" *ngIf="getSelectedProduct()?.sku">
                          <label>SKU:</label>
                          <span>{{ getSelectedProduct()?.sku }}</span>
                        </div>
                        <div class="summary-item" *ngIf="getSelectedProduct()?.stockQuantity !== undefined">
                          <label>Aktueller Bestand:</label>
                          <span>{{ getSelectedProduct()?.stockQuantity }}</span>
                        </div>
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
            <button class="btn-sm" (click)="toggleImportSelection(line.id)">
              {{ selectedForImport.has(line.id) ? '✓ Ausgewählt' : 'Auswählen' }}
            </button>
            <button class="btn-sm" (click)="startEdit(line)">Bearbeiten</button>
            <button class="btn-sm" (click)="startProductAssignment(line)">
              {{ line.suggestedProductId ? 'Produkt ändern' : 'Produkt zuordnen' }}
            </button>
            <button class="btn-sm btn-delete" (click)="deleteLine(line)">Löschen</button>
            <button class="btn-sm btn-split" (click)="startSplitLine(line)">Aufteilen</button>
            <button *ngIf="canMergeWithNext(line)" class="btn-sm btn-merge" (click)="mergeWithNext(line)">
              Zusammenführen
            </button>
          </div>
        </div>
      </div>
      
      <!-- Create Line Dialog -->
      <div class="modal-overlay" *ngIf="creatingNewLine" (click)="cancelCreateLine()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Neue Position hinzufügen</h3>
          <div class="form-group">
            <label>Lieferanten-Art.-Nr. *</label>
            <input type="text" [(ngModel)]="newLineData.supplierArticleNumber" />
          </div>
          <div class="form-group">
            <label>Beschreibung *</label>
            <textarea rows="3" [(ngModel)]="newLineData.description"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Menge</label>
              <input type="number" step="0.001" [(ngModel)]="newLineData.quantity" />
            </div>
            <div class="form-group">
              <label>Einheit</label>
              <input type="text" [(ngModel)]="newLineData.unit" />
            </div>
            <div class="form-group">
              <label>VPE</label>
              <input type="number" step="0.01" [(ngModel)]="newLineData.packagingUnit" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Einkaufspreis (€)</label>
              <input type="number" step="0.0001" [(ngModel)]="newLineData.unitPrice" />
            </div>
            <div class="form-group">
              <label>Gesamt (€)</label>
              <input type="number" step="0.01" [(ngModel)]="newLineData.lineTotal" />
            </div>
            <div class="form-group">
              <label>MwSt. (%)</label>
              <input type="number" step="1" [(ngModel)]="newLineData.taxRate" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="cancelCreateLine()">Abbrechen</button>
            <button class="btn-confirm" (click)="confirmCreateLine()">Hinzufügen</button>
          </div>
        </div>
      </div>
      
      <!-- Split Line Dialog -->
      <div class="modal-overlay" *ngIf="splitDialogLine" (click)="cancelSplitLine()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Position {{ splitDialogLine?.positionNumber }} aufteilen</h3>
          <div class="split-preview">
            <div class="original-text">
              <strong>Original:</strong>
              <p>{{ splitDialogLine?.description }}</p>
            </div>
            <div class="form-group">
              <label>Trennposition (Zeichen-Index):</label>
              <input 
                type="range" 
                [min]="1" 
                [max]="(splitDialogLine?.description?.length || 1) - 1"
                [(ngModel)]="splitPosition" />
              <span>{{ splitPosition }}</span>
            </div>
            <div class="split-parts">
              <div class="part-a">
                <strong>Teil A:</strong>
                <p>{{ (splitDialogLine?.description || '').substring(0, splitPosition) }}</p>
              </div>
              <div class="part-b">
                <strong>Teil B:</strong>
                <p>{{ (splitDialogLine?.description || '').substring(splitPosition) }}</p>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="cancelSplitLine()">Abbrechen</button>
            <button class="btn-confirm" (click)="confirmSplitLine()">Aufteilen</button>
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
  
  // Phase 3B-2: Line management state
  creatingNewLine = false;
  newLineData: any = {};
  splitDialogLine: InvoiceLine | null = null;
  splitPosition = 0;
  
  // Import selection
  selectedForImport = new Set<number>();
  
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
      // Load products - using existing product service (storeId, productId)
      productIds.forEach(id => {
        this.productService.getProduct(this.storeId, id).subscribe({
          next: (product: any) => {
            this.productsCache.set(id, {
              id: product.id,
              title: product.title,
              sku: product.sku,
              price: product.price,
              stockQuantity: product.stockQuantity
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
  
  getSelectedProduct(): ProductSummary | null {
    if (!this.selectedProductId) return null;
    return this.productResults.find(p => p.id === this.selectedProductId) || null;
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
      next: (results: any[]) => {
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
      next: (updated: InvoiceLine) => {
        const index = this.lines.findIndex(l => l.id === updated.id);
        if (index !== -1) {
          this.lines[index] = updated;
          this.summary = this.calculateSummary();
        }
        this.assigningProduct = false;
        this.cancelProductAssignment();
        alert('Produkt erfolgreich zugeordnet.');
      },
      error: (err: any) => {
        this.assigningProduct = false;
        
        // User-friendly error messages
        if (err.status === 404) {
          this.assignmentError = 'Position wurde nicht gefunden.';
        } else if (err.status === 403) {
          this.assignmentError = 'Produkt gehört nicht zu diesem Store.';
        } else if (err.error?.message) {
          this.assignmentError = err.error.message;
        } else {
          this.assignmentError = 'Produkt konnte nicht zugeordnet werden.';
        }
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
      next: (result: any) => {
        // Reload parse result to get updated lines
        this.invoiceService.getParseResult(this.storeId, this.documentId).subscribe({
          next: (parseResult: any) => {
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
  
  // Phase 3B-2: Manual line management
  toggleImportSelection(lineId: number) {
    if (this.selectedForImport.has(lineId)) {
      this.selectedForImport.delete(lineId);
    } else {
      this.selectedForImport.add(lineId);
    }
  }
  
  startCreateLine() {
    this.newLineData = {
      supplierArticleNumber: '',
      description: '',
      quantity: null,
      unit: 'Stk',
      packagingUnit: null,
      unitPrice: null,
      lineTotal: null,
      taxRate: 19
    };
    this.creatingNewLine = true;
  }
  
  cancelCreateLine() {
    this.creatingNewLine = false;
    this.newLineData = {};
  }
  
  confirmCreateLine() {
    if (!this.newLineData.supplierArticleNumber || !this.newLineData.description) {
      alert('Artikelnummer und Beschreibung sind Pflichtfelder.');
      return;
    }
    
    this.invoiceService.createInvoiceLine(this.storeId, this.documentId, this.newLineData).subscribe({
      next: (created: InvoiceLine) => {
        this.lines.push(created);
        this.lines.sort((a, b) => a.positionNumber - b.positionNumber);
        this.summary = this.calculateSummary();
        this.creatingNewLine = false;
        this.newLineData = {};
        alert('Position erfolgreich hinzugefügt.');
      },
      error: (err: any) => {
        alert(err.error?.message || 'Fehler beim Hinzufügen der Position.');
      }
    });
  }
  
  deleteLine(line: InvoiceLine) {
    if (!confirm(`Position ${line.positionNumber} wirklich löschen?\n\nDas zugeordnete Store-Produkt wird nicht gelöscht.`)) {
      return;
    }
    
    this.invoiceService.deleteInvoiceLine(this.storeId, this.documentId, line.id).subscribe({
      next: () => {
        const index = this.lines.findIndex(l => l.id === line.id);
        if (index !== -1) {
          this.lines.splice(index, 1);
        }
        this.selectedForImport.delete(line.id);
        this.summary = this.calculateSummary();
        alert('Position gelöscht.');
      },
      error: (err: any) => {
        alert(err.error?.message || 'Fehler beim Löschen.');
      }
    });
  }
  
  startSplitLine(line: InvoiceLine) {
    this.splitDialogLine = line;
    this.splitPosition = Math.floor((line.description?.length || 0) / 2);
  }
  
  cancelSplitLine() {
    this.splitDialogLine = null;
    this.splitPosition = 0;
  }
  
  confirmSplitLine() {
    if (!this.splitDialogLine) return;
    
    const desc = this.splitDialogLine.description || '';
    if (this.splitPosition <= 0 || this.splitPosition >= desc.length) {
      alert('Ungültige Trennposition.');
      return;
    }
    
    this.invoiceService.splitInvoiceLine(
      this.storeId,
      this.documentId,
      this.splitDialogLine.id,
      { splitPosition: this.splitPosition }
    ).subscribe({
      next: (result: InvoiceLine[]) => {
        // Replace old line with two new lines
        const index = this.lines.findIndex(l => l.id === this.splitDialogLine!.id);
        if (index !== -1) {
          this.lines.splice(index, 1, ...result);
        }
        this.summary = this.calculateSummary();
        this.cancelSplitLine();
        alert(`Position aufgeteilt in ${result.length} Positionen.`);
      },
      error: (err: any) => {
        alert(err.error?.message || 'Fehler beim Aufteilen.');
      }
    });
  }
  
  canMergeWithNext(line: InvoiceLine): boolean {
    const index = this.lines.findIndex(l => l.id === line.id);
    return index !== -1 && index < this.lines.length - 1;
  }
  
  mergeWithNext(line: InvoiceLine) {
    const index = this.lines.findIndex(l => l.id === line.id);
    if (index === -1 || index >= this.lines.length - 1) return;
    
    const nextLine = this.lines[index + 1];
    const desc1 = line.description || '';
    const desc2 = nextLine.description || '';
    
    if (!confirm(`Position ${line.positionNumber} mit Position ${nextLine.positionNumber} zusammenführen?\n\n"${desc1}"\n\n+\n\n"${desc2}"`)) {
      return;
    }
    
    this.invoiceService.mergeInvoiceLineWithNext(this.storeId, this.documentId, line.id).subscribe({
      next: (merged: InvoiceLine) => {
        // Remove next line, update current
        this.lines.splice(index, 2, merged);
        this.selectedForImport.delete(nextLine.id);
        this.summary = this.calculateSummary();
        alert('Positionen zusammengeführt.');
      },
      error: (err: any) => {
        alert(err.error?.message || 'Fehler beim Zusammenführen.');
      }
    });
  }
}

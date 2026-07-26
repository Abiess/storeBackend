import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

import { SupplierInvoiceService, InvoiceParseResult, InvoiceLine, LineSummary } from '@app/core/services/supplier-invoice.service';
import { InvoiceLineStatusBadgeComponent } from '../../components/invoice-lines/invoice-line-status-badge.component';

type FilterType = 'ALL' | 'REVIEW' | 'UNMAPPED' | 'MAPPED';

@Component({
  selector: 'app-invoice-lines-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    LucideAngularModule,
    InvoiceLineStatusBadgeComponent
  ],
  templateUrl: './invoice-lines-page.component.html',
  styleUrls: ['./invoice-lines-page.component.scss']
})
export class InvoiceLinesPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  storeId!: number;
  documentId!: number;
  document: any = null; // Will hold document details (supplier, invoice number)
  
  loading = true;
  lines: InvoiceLine[] = [];
  summary: LineSummary = { detected: 0, confirmed: 0, mapped: 0, needsReview: 0 };
  
  currentFilter: FilterType = 'ALL';
  searchQuery = '';
  selectedForImport = new Set<number>();
  
  // Drawer/Dialog state
  editingLine: InvoiceLine | null = null;
  rememberCorrection = false; // Phase 3B-3: Learn from correction checkbox
  mappingLine: InvoiceLine | null = null;
  splitDialogLine: InvoiceLine | null = null;
  splitPosition = 0;
  creatingNewLine = false;
  newLineData: any = {};
  
  filters = [
    { type: 'ALL' as FilterType, label: 'INVOICE_LINES.FILTERS.ALL' },
    { type: 'REVIEW' as FilterType, label: 'INVOICE_LINES.FILTERS.REVIEW' },
    { type: 'UNMAPPED' as FilterType, label: 'INVOICE_LINES.FILTERS.UNMAPPED' },
    { type: 'MAPPED' as FilterType, label: 'INVOICE_LINES.FILTERS.MAPPED' }
  ];
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: SupplierInvoiceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}
  
  ngOnInit() {
    // Extract storeId from route (3-level fallback)
    let id = this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) id = match[1];
    }
    
    this.storeId = id ? parseInt(id, 10) : 0;
    this.documentId = parseInt(this.route.snapshot.paramMap.get('documentId') || '0', 10);
    
    if (!this.storeId || !this.documentId) {
      this.snackBar.open('Ungültige Parameter', 'OK', { duration: 3000 });
      this.router.navigate(['/stores', this.storeId, 'supplier-invoices']);
      return;
    }
    
    this.loadLines();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadLines() {
    this.loading = true;
    this.invoiceService.getParseResult(this.storeId, this.documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: InvoiceParseResult) => {
          this.lines = result.lines || [];
          this.summary = result.lineSummary || this.calculateSummary();
          // Store document context for header
          if (result.fields) {
            this.document = {
              supplierName: result.fields.supplierName || '',
              invoiceNumber: result.fields.invoiceNumber || ''
            };
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.snackBar.open(err.error?.message || 'Fehler beim Laden', 'OK', { duration: 3000 });
          this.loading = false;
        }
      });
  }
  
  get filteredLines(): InvoiceLine[] {
    let result = this.lines;
    
    // Filter by type
    switch (this.currentFilter) {
      case 'REVIEW':
        result = result.filter(l => l.status === 'REVIEW_REQUIRED' || l.status === 'UNREVIEWED');
        break;
      case 'UNMAPPED':
        result = result.filter(l => l.status !== 'MAPPED');
        break;
      case 'MAPPED':
        result = result.filter(l => l.status === 'MAPPED');
        break;
    }
    
    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l =>
        l.supplierArticleNumber?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }
  
  getFilteredCount(filter: FilterType): number {
    switch (filter) {
      case 'ALL': return this.lines.length;
      case 'REVIEW': return this.summary.needsReview;
      case 'UNMAPPED': return this.summary.detected - this.summary.mapped;
      case 'MAPPED': return this.summary.mapped;
      default: return 0;
    }
  }

  get hasConfirmedLines(): boolean {
    return this.lines.some(line =>
      line.status === 'CONFIRMED' || line.status === 'MAPPED'
    );
  }

  openImportPreview(): void {
    this.router.navigate(['/stores', this.storeId, 'supplier-invoices', this.documentId, 'import-preview']);
  }
  
  toggleImportSelection(lineId: number) {
    if (this.selectedForImport.has(lineId)) {
      this.selectedForImport.delete(lineId);
    } else {
      this.selectedForImport.add(lineId);
    }
  }
  
  toggleAllSelection() {
    if (this.selectedForImport.size === this.filteredLines.length) {
      this.selectedForImport.clear();
    } else {
      this.filteredLines.forEach(l => this.selectedForImport.add(l.id));
    }
  }
  
  // CRUD operations
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
      this.snackBar.open('Artikelnummer und Beschreibung sind Pflichtfelder.', 'OK', { duration: 3000 });
      return;
    }
    
    this.invoiceService.createInvoiceLine(this.storeId, this.documentId, this.newLineData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created: InvoiceLine) => {
          this.lines.push(created);
          this.lines.sort((a, b) => a.positionNumber - b.positionNumber);
          this.summary = this.calculateSummary();
          this.creatingNewLine = false;
          this.newLineData = {};
          this.snackBar.open('Position hinzugefügt', 'OK', { duration: 2000 });
        },
        error: (err: any) => {
          this.snackBar.open(err.error?.message || 'Fehler beim Hinzufügen', 'OK', { duration: 3000 });
        }
      });
  }
  
  startEditLine(line: InvoiceLine) {
    this.editingLine = { ...line };
    this.rememberCorrection = false; // Reset checkbox
  }
  
  cancelEditLine() {
    this.editingLine = null;
    this.rememberCorrection = false;
  }
  
  canRememberCorrection(line: InvoiceLine): boolean {
    // Can only learn if supplier article number is present
    return !!(line && line.supplierArticleNumber && line.supplierArticleNumber.trim());
  }
  
  saveEditLine() {
    if (!this.editingLine) return;
    
    const updates = {
      supplierArticleNumber: this.editingLine.supplierArticleNumber,
      description: this.editingLine.description,
      quantity: this.editingLine.quantity,
      unit: this.editingLine.unit,
      packagingUnit: this.editingLine.packagingUnit,
      unitPrice: this.editingLine.unitPrice,
      lineTotal: this.editingLine.lineTotal,
      taxRate: this.editingLine.taxRate,
      discount: this.editingLine.discount,
      rememberCorrection: this.rememberCorrection // Phase 3B-3
    };
    
    this.invoiceService.updateInvoiceLine(this.storeId, this.documentId, this.editingLine.id, updates)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated: InvoiceLine) => {
          const index = this.lines.findIndex(l => l.id === updated.id);
          if (index !== -1) {
            this.lines[index] = updated;
          }
          this.summary = this.calculateSummary();
          this.editingLine = null;
          
          // Toast with i18n
          const savedMsg = this.translate.instant('INVOICE_LINES.EDIT.SAVED');
          const learnedMsg = this.rememberCorrection 
            ? ' ' + this.translate.instant('INVOICE_LINES.EDIT.SAVED_AND_LEARNED')
            : '';
          this.snackBar.open(savedMsg + learnedMsg, 'OK', { duration: 4000 });
          this.rememberCorrection = false;
        },
        error: (err: any) => {
          this.snackBar.open(err.error?.message || 'Fehler beim Speichern', 'OK', { duration: 3000 });
        }
      });
  }
  
  deleteLine(line: InvoiceLine) {
    if (!confirm(`Position ${line.positionNumber} wirklich löschen?\n\nDas zugeordnete Store-Produkt wird nicht gelöscht.`)) {
      return;
    }
    
    this.invoiceService.deleteInvoiceLine(this.storeId, this.documentId, line.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const index = this.lines.findIndex(l => l.id === line.id);
          if (index !== -1) {
            this.lines.splice(index, 1);
          }
          this.selectedForImport.delete(line.id);
          this.summary = this.calculateSummary();
          this.snackBar.open('Position gelöscht', 'OK', { duration: 2000 });
        },
        error: (err: any) => {
          this.snackBar.open(err.error?.message || 'Fehler beim Löschen', 'OK', { duration: 3000 });
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
      this.snackBar.open('Ungültige Trennposition', 'OK', { duration: 3000 });
      return;
    }
    
    this.invoiceService.splitInvoiceLine(
      this.storeId,
      this.documentId,
      this.splitDialogLine.id,
      { splitPosition: this.splitPosition }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result: InvoiceLine[]) => {
        const index = this.lines.findIndex(l => l.id === this.splitDialogLine!.id);
        if (index !== -1) {
          this.lines.splice(index, 1, ...result);
        }
        this.summary = this.calculateSummary();
        this.cancelSplitLine();
        this.snackBar.open(`Aufgeteilt in ${result.length} Positionen`, 'OK', { duration: 2000 });
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.message || 'Fehler beim Aufteilen', 'OK', { duration: 3000 });
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
    
    if (!confirm(`Positionen ${line.positionNumber} und ${nextLine.positionNumber} zusammenführen?\n\n"${desc1}"\n\n+\n\n"${desc2}"`)) {
      return;
    }
    
    this.invoiceService.mergeInvoiceLineWithNext(this.storeId, this.documentId, line.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (merged: InvoiceLine) => {
          this.lines.splice(index, 2, merged);
          this.selectedForImport.delete(nextLine.id);
          this.summary = this.calculateSummary();
          this.snackBar.open('Positionen zusammengeführt', 'OK', { duration: 2000 });
        },
        error: (err: any) => {
          this.snackBar.open(err.error?.message || 'Fehler beim Zusammenführen', 'OK', { duration: 3000 });
        }
      });
  }
  
  bulkConfirm() {
    const lineIds = this.lines
      .filter(l => l.warnings.length === 0 && l.status !== 'MAPPED' && l.status !== 'CONFIRMED')
      .map(l => l.id);
    
    if (lineIds.length === 0) {
      this.snackBar.open('Keine Positionen zum Bestätigen', 'OK', { duration: 2000 });
      return;
    }
    
    this.invoiceService.bulkConfirmLines(this.storeId, this.documentId, {
      lineIds,
      onlyWithoutWarnings: true
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result: any) => {
        this.loadLines();
        this.snackBar.open(`${result.confirmed} Positionen bestätigt, ${result.skipped} übersprungen`, 'OK', { duration: 3000 });
      },
      error: (err: any) => {
        this.snackBar.open(err.error?.message || 'Fehler bei Bulk-Bestätigung', 'OK', { duration: 3000 });
      }
    });
  }
  
  getWarningMessage(line: InvoiceLine): string {
    if (line.warnings.length === 0) return '';
    
    // Kategorisiere Felder nach Status
    const missingFields: string[] = [];
    const uncertainFields: string[] = [];
    
    // MISSING: Wirklich null oder leer
    if (!line.quantity) {
      missingFields.push('Menge');
    }
    if (!line.unit) {
      missingFields.push('Einheit');
    }
    if (!line.packagingUnit) {
      missingFields.push('VPE');
    }
    if (!line.unitPrice) {
      missingFields.push('Einkaufspreis');
    }
    if (!line.lineTotal) {
      missingFields.push('Gesamtbetrag');
    }
    
    // UNCERTAIN: Wert vorhanden, aber unsicher
    // Wenn line.warnings existieren UND Felder vorhanden sind, dann sind sie unsicher
    const hasWarnings = line.warnings.length > 0;
    
    if (hasWarnings) {
      // Prüfe ob Beschreibung ungewöhnliche Zahlen enthält (UNASSIGNED_OCR_VALUES)
      const descHasNumbers = line.description && /\d+[.,]\d+|\d+\s*[xX]\s*\d+/.test(line.description);
      
      // Wenn Felder vorhanden sind aber Warnings existieren, sind sie unsicher
      if (line.quantity && line.warnings.some(w => w.toLowerCase().includes('numeric') || w.includes('missing'))) {
        uncertainFields.push('Menge');
      }
      if (line.packagingUnit && line.warnings.some(w => w.toLowerCase().includes('numeric') || w.includes('missing'))) {
        uncertainFields.push('VPE');
      }
      if (line.lineTotal && line.warnings.some(w => w.toLowerCase().includes('numeric') || w.includes('missing'))) {
        uncertainFields.push('Gesamtbetrag');
      }
    }
    
    // Prüfe Gesamtbetrag-Abweichung (Plausibilitätsprüfung)
    const hasMismatch = line.warnings.some(w => w.includes('mismatch') || w.toLowerCase().includes('expected'));
    
    // Prüfe UNASSIGNED_OCR_VALUES
    const hasUnassignedNumbers = line.description && /[\d.,]+\s*[)\]}\|]+\s*[\d.,]+/.test(line.description);
    
    // Erstelle verständliche Meldung
    const parts: string[] = [];
    
    // Teil 1: Fehlende Felder
    if (missingFields.length > 0) {
      if (missingFields.length === 1) {
        parts.push(`${missingFields[0]} fehlt`);
      } else if (missingFields.length === 2) {
        parts.push(`${missingFields.join(' und ')} fehlen`);
      } else {
        const last = missingFields.pop();
        parts.push(`${missingFields.join(', ')} und ${last} fehlen`);
      }
    }
    
    // Teil 2: Unsichere Felder
    if (uncertainFields.length > 0) {
      if (uncertainFields.length === 1) {
        parts.push(`${uncertainFields[0]} bitte prüfen`);
      } else if (uncertainFields.length === 2) {
        parts.push(`${uncertainFields.join(' und ')} bitte prüfen`);
      } else {
        const last = uncertainFields.pop();
        parts.push(`${uncertainFields.join(', ')} und ${last} bitte prüfen`);
      }
    }
    
    // Teil 3: Plausibilitätswarnung
    if (hasMismatch) {
      parts.push(this.translate.instant('INVOICE_LINES.WARNINGS.LINE_TOTAL_MISMATCH'));
    }
    
    // Teil 4: UNASSIGNED_OCR_VALUES
    if (hasUnassignedNumbers && !hasMismatch) {
      parts.push(this.translate.instant('INVOICE_LINES.WARNINGS.UNASSIGNED_OCR_VALUES'));
    }
    
    // Kombiniere Teile
    if (parts.length === 0) {
      // Fallback für unbekannte Warnungen
      return line.warnings.length === 1 
        ? '1 Angabe fehlt' 
        : `${line.warnings.length} Angaben fehlen`;
    }
    
    return parts.join('. ') + '.';
  }
  
  translateWarning(warning: string): string {
    // Map backend warnings to i18n keys
    if (warning.includes('Missing') && warning.includes('numeric field')) {
      return 'INVOICE_LINES.WARNINGS.MISSING_NUMERIC_FIELDS';
    }
    if (warning.includes('mismatch')) {
      return 'INVOICE_LINES.WARNINGS.LINE_TOTAL_MISMATCH';
    }
    if (warning.includes('not recognized')) {
      return 'INVOICE_LINES.WARNINGS.ARTICLE_NUMBER_MISSING';
    }
    return warning; // Fallback
  }
  
  private calculateSummary(): LineSummary {
    return {
      detected: this.lines.length,
      confirmed: this.lines.filter(l => l.status === 'CONFIRMED').length,
      mapped: this.lines.filter(l => l.status === 'MAPPED').length,
      needsReview: this.lines.filter(l => l.status === 'UNREVIEWED' || l.status === 'REVIEW_REQUIRED').length
    };
  }
  
  // Field validation helpers for drawer
  getFieldStatus(line: InvoiceLine, fieldName: 'unit' | 'packagingUnit' | 'quantity' | 'unitPrice' | 'lineTotal'): 'missing' | 'uncertain' | 'valid' {
    if (!line) return 'valid';
    
    const value = line[fieldName];
    const warnings = line.warnings || [];
    
    // Check if field is truly missing (null or empty)
    if (value === null || value === undefined || value === '') {
      const missingCode = this.getMissingCode(fieldName);
      if (warnings.includes(missingCode)) {
        return 'missing';
      }
    }
    
    // Check if field is uncertain (present but flagged)
    const uncertainCode = this.getUncertainCode(fieldName);
    if (warnings.includes(uncertainCode)) {
      return 'uncertain';
    }
    
    // Check if LINE_TOTAL_MISMATCH affects this field
    if (warnings.includes('LINE_TOTAL_MISMATCH')) {
      if (['quantity', 'packagingUnit', 'unitPrice', 'lineTotal'].includes(fieldName)) {
        return 'uncertain';
      }
    }
    
    return 'valid';
  }
  
  private getMissingCode(fieldName: string): string {
    const map: Record<string, string> = {
      'unit': 'MISSING_UNIT',
      'packagingUnit': 'MISSING_PACKAGING_UNIT',
      'quantity': 'MISSING_QUANTITY',
      'unitPrice': 'MISSING_PURCHASE_PRICE',
      'lineTotal': 'MISSING_LINE_TOTAL'
    };
    return map[fieldName] || '';
  }
  
  private getUncertainCode(fieldName: string): string {
    const map: Record<string, string> = {
      'quantity': 'UNCERTAIN_QUANTITY',
      'packagingUnit': 'UNCERTAIN_PACKAGING_UNIT',
      'unitPrice': 'UNCERTAIN_PURCHASE_PRICE',
      'lineTotal': 'UNCERTAIN_LINE_TOTAL'
    };
    return map[fieldName] || '';
  }
  
  getFieldWarning(line: InvoiceLine, fieldName: 'unit' | 'packagingUnit' | 'quantity' | 'unitPrice' | 'lineTotal'): string {
    const status = this.getFieldStatus(line, fieldName);
    if (status === 'missing') {
      const labels: Record<string, string> = {
        'unit': 'Einheit wurde nicht erkannt.',
        'packagingUnit': 'VPE wurde nicht erkannt.',
        'quantity': 'Menge wurde nicht erkannt.',
        'unitPrice': 'Einkaufspreis wurde nicht erkannt.',
        'lineTotal': 'Gesamtbetrag wurde nicht erkannt.'
      };
      return labels[fieldName] || '';
    }
    if (status === 'uncertain') {
      const labels: Record<string, string> = {
        'unit': 'Einheit bitte prüfen.',
        'packagingUnit': 'VPE wurde möglicherweise falsch erkannt.',
        'quantity': 'Menge wurde möglicherweise falsch erkannt.',
        'unitPrice': 'Einkaufspreis bitte prüfen.',
        'lineTotal': 'Gesamtbetrag bitte prüfen.'
      };
      return labels[fieldName] || '';
    }
    return '';
  }
  
  backToDocument() {
    this.router.navigate(['/stores', this.storeId, 'supplier-invoices']);
  }
}

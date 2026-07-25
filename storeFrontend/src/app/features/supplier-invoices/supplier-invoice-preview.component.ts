import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SupplierInvoiceService, SupplierInvoiceDocument, SupplierInvoiceOcrResult, InvoiceParseResult, ParsedInvoiceFields } from '../../core/services/supplier-invoice.service';
import { Subject, takeUntil, finalize } from 'rxjs';

interface DialogData {
  storeId: number;
  document: SupplierInvoiceDocument;
  ocrResult?: SupplierInvoiceOcrResult;  // deprecated, use parseResult
  parseResult?: InvoiceParseResult;
}

@Component({
  selector: 'app-supplier-invoice-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    TranslateModule,
    LucideAngularModule
  ],
  templateUrl: './supplier-invoice-preview.component.html',
  styleUrls: ['./supplier-invoice-preview.component.scss']
})
export class SupplierInvoicePreviewComponent implements OnInit, OnDestroy {
  loading = true;
  error = false;
  errorMessage = '';
  
  isPdf = false;
  isImage = false;
  
  // For images
  imageUrl: string | null = null;
  imageZoom = 1;
  imageRotation = 0;
  
  // For PDFs
  pdfUrl: SafeResourceUrl | null = null;
  currentPage = 1;
  totalPages = 1;
  pdfZoom = 100;
  
  // For OCR Results
  hasOcrResult = false;
  showOcrPanel = false;
  ocrResult: SupplierInvoiceOcrResult | null = null;
  
  // For Parsed Fields
  parseResult: InvoiceParseResult | null = null;
  parsedFields: ParsedInvoiceFields | null = null;
  parsing = false;
  showRawText = false;
  
  // Phase 3A: Learning System
  originalSupplierName = '';
  editedSupplierName = '';
  rememberSupplierCorrection = true;
  isSavingSupplierCorrection = false;
  fieldSources: { [key: string]: string } = {};
  
  private blobUrl: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<SupplierInvoicePreviewComponent>,
    private supplierInvoiceService: SupplierInvoiceService,
    private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.isPdf = this.supplierInvoiceService.isPdf(this.data.document.mimeType);
    this.isImage = this.supplierInvoiceService.isImage(this.data.document.mimeType);
    this.totalPages = this.data.document.pageCount || 1;
    
    // Check if parse result was passed (new behavior)
    if (this.data.parseResult) {
      this.parseResult = this.data.parseResult;
      this.parsedFields = this.parseResult.fields ? {
        supplierName: this.parseResult.fields.supplierName || null,
        invoiceNumber: this.parseResult.fields.invoiceNumber || null,
        invoiceDate: this.parseResult.fields.invoiceDate || null,
        deliveryDate: this.parseResult.fields.deliveryDate || null,
        netAmount: this.parseResult.fields.netAmount || null,
        taxAmount: this.parseResult.fields.taxAmount || null,
        grossAmount: this.parseResult.fields.grossAmount || null,
        currency: this.parseResult.fields.currency || null
      } : null;
      this.showOcrPanel = true;
    }
    // Legacy: Check if OCR result was passed (deprecated)
    else if (this.data.ocrResult) {
      this.ocrResult = this.data.ocrResult;
      this.hasOcrResult = true;
      this.showOcrPanel = true;
    }
    
    this.loadDocument();
    this.loadCachedParseResult();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocument(): void {
    this.loading = true;
    this.error = false;

    this.supplierInvoiceService.downloadDocument(this.data.storeId, this.data.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.blobUrl = URL.createObjectURL(blob);
          
          if (this.isPdf) {
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
          } else if (this.isImage) {
            this.imageUrl = this.blobUrl;
          }
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load document:', err);
          this.error = true;
          this.loading = false;
          this.handleError(err);
        }
      });
  }

  // Image zoom controls
  zoomIn(): void {
    if (this.imageZoom < 3) {
      this.imageZoom += 0.25;
    }
  }

  zoomOut(): void {
    if (this.imageZoom > 0.5) {
      this.imageZoom -= 0.25;
    }
  }

  resetZoom(): void {
    this.imageZoom = 1;
    this.imageRotation = 0;
  }

  rotateRight(): void {
    this.imageRotation = (this.imageRotation + 90) % 360;
  }

  rotateLeft(): void {
    this.imageRotation = (this.imageRotation - 90) % 360;
    if (this.imageRotation < 0) this.imageRotation += 360;
  }

  // PDF zoom controls
  pdfZoomIn(): void {
    if (this.pdfZoom < 200) {
      this.pdfZoom += 25;
    }
  }

  pdfZoomOut(): void {
    if (this.pdfZoom > 50) {
      this.pdfZoom -= 25;
    }
  }

  pdfResetZoom(): void {
    this.pdfZoom = 100;
  }

  // PDF page navigation
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Download original file
  downloadOriginal(): void {
    if (!this.blobUrl) return;

    const link = document.createElement('a');
    link.href = this.blobUrl;
    link.download = this.data.document.originalFilename;
    link.click();
  }

  close(): void {
    this.dialogRef.close();
  }

  private revokeObjectUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  private handleError(error: any): void {
    let message = 'SUPPLIER_INVOICES.ERRORS.PREVIEW_FAILED';

    if (error.status === 401) {
      message = 'SUPPLIER_INVOICES.ERRORS.UNAUTHORIZED';
    } else if (error.status === 403) {
      message = 'SUPPLIER_INVOICES.ERRORS.FORBIDDEN';
    } else if (error.status === 404) {
      message = 'SUPPLIER_INVOICES.ERRORS.NOT_FOUND';
    }

    this.errorMessage = this.translate.instant(message);
    
    this.snackBar.open(
      this.errorMessage,
      this.translate.instant('COMMON.CLOSE'),
      { duration: 5000, panelClass: ['error-snackbar'] }
    );
  }

  getImageTransform(): string {
    return `scale(${this.imageZoom}) rotate(${this.imageRotation}deg)`;
  }

  // OCR Panel toggle
  toggleOcrPanel(): void {
    this.showOcrPanel = !this.showOcrPanel;
  }

  // Format OCR duration
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // Get status badge class
  getOcrStatusClass(): string {
    if (!this.ocrResult) return '';
    
    switch (this.ocrResult.status) {
      case 'TEXT_EXTRACTED':
      case 'OCR_COMPLETED':
        return 'status-active';
      case 'FAILED':
        return 'status-inactive';
      default:
        return '';
    }
  }

  // Copy OCR text to clipboard
  copyOcrText(): void {
    const textToCopy = this.parseResult?.rawText || this.ocrResult?.rawText;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.snackBar.open(
        this.translate.instant('SUPPLIER_INVOICES.OCR.TEXT_COPIED'),
        this.translate.instant('COMMON.CLOSE'),
        { duration: 2000 }
      );
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  // Load cached parse result if available
  loadCachedParseResult(): void {
    this.supplierInvoiceService.getParseResult(this.data.storeId, this.data.document.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('GET /parse-result response:', result);
          this.applyParseResult(result);
        },
        error: (err) => {
          // 404 is expected when no cached result exists yet
          if (err.status !== 404) {
            console.error('Failed to load parse result:', err);
          }
        }
      });
  }

  // Parse invoice with field extraction
  parseInvoice(force: boolean = false): void {
    this.parsing = true;
    
    this.supplierInvoiceService.parseInvoice(this.data.storeId, this.data.document.id, 6, force)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('POST /parse response:', result);
          this.applyParseResult(result);
          this.parsing = false;
          
          const hasAnyField = Object.values(this.parsedFields || {}).some(v => v !== null && v !== '');
          const message = hasAnyField
            ? 'Rechnung erfolgreich ausgelesen'
            : 'Text wurde erkannt, Rechnungsfelder konnten jedoch nicht zugeordnet werden';
          
          this.snackBar.open(
            message,
            this.translate.instant('COMMON.CLOSE'),
            { duration: 3000 }
          );
        },
        error: (err) => {
          console.error('Parse failed:', err);
          this.parsing = false;
          this.snackBar.open(
            'Fehler beim Auslesen der Rechnung',
            this.translate.instant('COMMON.CLOSE'),
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      });
  }
  
  // Central method to apply parse result (used by both GET and POST)
  private applyParseResult(result: InvoiceParseResult): void {
    console.log('applyParseResult called with:', result);
    console.log('result.fields:', result.fields);
    
    this.parseResult = result;
    this.fieldSources = result.fieldSources || {};
    
    // Extract fields with proper fallback
    const fields = result.fields;
    
    this.parsedFields = {
      supplierName: fields?.supplierName ?? null,
      invoiceNumber: fields?.invoiceNumber ?? null,
      invoiceDate: fields?.invoiceDate ?? null,
      deliveryDate: fields?.deliveryDate ?? null,
      netAmount: fields?.netAmount ?? null,
      taxAmount: fields?.taxAmount ?? null,
      grossAmount: fields?.grossAmount ?? null,
      currency: fields?.currency ?? null
    };
    
    // Phase 3A: Track original supplier name for learning system
    this.originalSupplierName = fields?.supplierName || '';
    this.editedSupplierName = fields?.supplierName || '';
    
    console.log('parsedFields after mapping:', this.parsedFields);
    
    this.hasOcrResult = true;
    this.showOcrPanel = true;
  }
  
  // Reparse with force=true
  reparseInvoice(): void {
    this.parseInvoice(true);
  }

  // Get confidence class for field styling
  getConfidenceClass(fieldName: string): string {
    if (!this.parseResult?.confidence) return '';
    const confidence = this.parseResult.confidence[fieldName];
    
    if (!confidence || confidence === 0) return 'confidence-none';
    if (confidence < 1.0) return 'confidence-low';
    return '';
  }

  // Get confidence percentage for display
  getConfidencePercent(fieldName: string): number {
    if (!this.parseResult?.confidence) return 0;
    return Math.round((this.parseResult.confidence[fieldName] || 0) * 100);
  }

  // Toggle raw text visibility
  toggleRawText(): void {
    this.showRawText = !this.showRawText;
  }
  
  // Phase 3A: Learning System Helpers
  
  get supplierNameWasChanged(): boolean {
    const original = this.normalizeForComparison(this.originalSupplierName);
    const edited = this.normalizeForComparison(this.editedSupplierName);
    return original !== edited && edited.trim().length > 0;
  }
  
  private normalizeForComparison(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  
  getFieldSourceLabel(fieldName: string): string {
    const source = this.fieldSources[fieldName];
    if (!source) {
      return '';
    }
    
    const key = `SUPPLIER_INVOICES.SOURCES.${source}`;
    return this.translate.instant(key);
  }
  
  confirmSupplierCorrection(): void {
    if (!this.supplierNameWasChanged || this.isSavingSupplierCorrection || !this.data.document?.id) {
      return;
    }
    
    // Trim values
    const rawValue = this.originalSupplierName.trim();
    const correctedValue = this.editedSupplierName.trim();
    
    if (!rawValue || !correctedValue) {
      return;
    }
    
    this.isSavingSupplierCorrection = true;
    
    this.supplierInvoiceService
      .confirmSupplierNameCorrection(
        this.data.storeId,
        this.data.document.id,
        {
          rawValue,
          correctedValue,
          rememberForFuture: this.rememberSupplierCorrection
        }
      )
      .pipe(finalize(() => {
        this.isSavingSupplierCorrection = false;
      }))
      .subscribe({
        next: (response) => {
          // Update tracking
          this.originalSupplierName = correctedValue;
          this.fieldSources = {
            ...this.fieldSources,
            supplierName: 'USER_EDITED'
          };
          
          // Success message
          const message = this.rememberSupplierCorrection
            ? this.translate.instant('SUPPLIER_INVOICES.LEARNING.CORRECTION_SAVED_AND_REMEMBERED')
            : this.translate.instant('SUPPLIER_INVOICES.LEARNING.CORRECTION_SAVED');
          
          this.snackBar.open(message, '', { duration: 4000 });
        },
        error: (error) => this.handleCorrectionError(error)
      });
  }
  
  private handleCorrectionError(error: any): void {
    let message: string;
    
    if (error.status === 409) {
      message = this.translate.instant('SUPPLIER_INVOICES.ERRORS.CONFLICTING_CORRECTION');
    } else {
      message = this.translate.instant('SUPPLIER_INVOICES.ERRORS.CORRECTION_FAILED');
    }
    
    this.snackBar.open(message, '', { duration: 5000 });
  }
}

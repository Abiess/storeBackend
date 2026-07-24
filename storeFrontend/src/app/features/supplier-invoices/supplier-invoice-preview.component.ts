import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SupplierInvoiceService, SupplierInvoiceDocument, SupplierInvoiceOcrResult } from '../../core/services/supplier-invoice.service';
import { Subject, takeUntil } from 'rxjs';

interface DialogData {
  storeId: number;
  document: SupplierInvoiceDocument;
  ocrResult?: SupplierInvoiceOcrResult;
}

@Component({
  selector: 'app-supplier-invoice-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDialogModule,
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
    
    // Check if OCR result was passed
    if (this.data.ocrResult) {
      this.ocrResult = this.data.ocrResult;
      this.hasOcrResult = true;
      this.showOcrPanel = true;
    }
    
    this.loadDocument();
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
    if (!this.ocrResult?.rawText) return;

    navigator.clipboard.writeText(this.ocrResult.rawText).then(() => {
      this.snackBar.open(
        this.translate.instant('SUPPLIER_INVOICES.OCR.TEXT_COPIED'),
        this.translate.instant('COMMON.CLOSE'),
        { duration: 2000 }
      );
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SupplierInvoiceService, SupplierInvoiceDocument } from '../../core/services/supplier-invoice.service';
import { Subject, takeUntil } from 'rxjs';
import { SupplierInvoicePreviewComponent } from './supplier-invoice-preview.component';

@Component({
  selector: 'app-supplier-invoices',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './supplier-invoices.component.html',
  styleUrls: ['./supplier-invoices.component.scss']
})
export class SupplierInvoicesComponent implements OnInit, OnDestroy {
  storeId!: number;
  documents: SupplierInvoiceDocument[] = [];
  loading = false;
  uploading = false;
  uploadProgress = 0;
  dragOver = false;

  private destroy$ = new Subject<void>();

  displayedColumns = ['icon', 'filename', 'type', 'size', 'pages', 'date', 'status', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplierInvoiceService: SupplierInvoiceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.extractStoreId();
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractStoreId(): void {
    // 3-tier extraction pattern
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) id = match[1];
    }

    if (!id) {
      this.showError('SUPPLIER_INVOICES.ERRORS.NO_STORE_ID');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.storeId = parseInt(id, 10);
  }

  loadDocuments(): void {
    this.loading = true;
    this.supplierInvoiceService.getDocuments(this.storeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs) => {
          this.documents = docs.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load documents:', err);
          this.handleError(err);
          this.loading = false;
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  private uploadFile(file: File): void {
    // Validate
    const validationError = this.supplierInvoiceService.validateFile(file);
    if (validationError) {
      this.showError(validationError);
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    this.supplierInvoiceService.uploadDocument(this.storeId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if ('progress' in result) {
            this.uploadProgress = result.progress;
          } else {
            // Upload complete
            this.uploading = false;
            this.uploadProgress = 0;
            this.showSuccess('SUPPLIER_INVOICES.MESSAGES.UPLOAD_SUCCESS');
            this.loadDocuments(); // Refresh list
          }
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.uploading = false;
          this.uploadProgress = 0;
          this.handleError(err);
        }
      });
  }

  openPreview(doc: SupplierInvoiceDocument): void {
    this.dialog.open(SupplierInvoicePreviewComponent, {
      data: { storeId: this.storeId, document: doc },
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'supplier-invoice-preview-dialog'
    });
  }

  confirmDelete(doc: SupplierInvoiceDocument): void {
    const confirmed = confirm(
      this.translate.instant('SUPPLIER_INVOICES.MESSAGES.CONFIRM_DELETE', { filename: doc.originalFilename })
    );
    
    if (confirmed) {
      this.deleteDocument(doc);
    }
  }

  private deleteDocument(doc: SupplierInvoiceDocument): void {
    this.supplierInvoiceService.deleteDocument(this.storeId, doc.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('SUPPLIER_INVOICES.MESSAGES.DELETE_SUCCESS');
          this.loadDocuments(); // Refresh list
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.handleError(err);
        }
      });
  }

  formatFileSize(bytes: number): string {
    return this.supplierInvoiceService.formatFileSize(bytes);
  }

  getFileIcon(mimeType: string): string {
    return this.supplierInvoiceService.getFileIcon(mimeType);
  }

  getFileTypeLabel(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'image/jpeg') return 'JPEG';
    if (mimeType === 'image/png') return 'PNG';
    if (mimeType === 'image/webp') return 'WEBP';
    return mimeType;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'UPLOADED': return 'status-active';
      case 'PREVIEW_READY': return 'status-active';
      case 'FAILED': return 'status-inactive';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    return `SUPPLIER_INVOICES.STATUS.${status}`;
  }

  private handleError(error: any): void {
    let message = 'SUPPLIER_INVOICES.ERRORS.UNKNOWN';

    if (error.status === 401) {
      message = 'SUPPLIER_INVOICES.ERRORS.UNAUTHORIZED';
    } else if (error.status === 403) {
      message = 'SUPPLIER_INVOICES.ERRORS.FORBIDDEN';
    } else if (error.status === 404) {
      message = 'SUPPLIER_INVOICES.ERRORS.NOT_FOUND';
    } else if (error.status === 413) {
      message = 'SUPPLIER_INVOICES.ERRORS.FILE_TOO_LARGE';
    } else if (error.status === 415) {
      message = 'SUPPLIER_INVOICES.ERRORS.INVALID_FILE_TYPE';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    this.showError(message);
  }

  private showError(messageKey: string): void {
    this.snackBar.open(
      this.translate.instant(messageKey),
      this.translate.instant('COMMON.CLOSE'),
      { duration: 5000, panelClass: ['error-snackbar'] }
    );
  }

  private showSuccess(messageKey: string): void {
    this.snackBar.open(
      this.translate.instant(messageKey),
      this.translate.instant('COMMON.CLOSE'),
      { duration: 3000, panelClass: ['success-snackbar'] }
    );
  }
}

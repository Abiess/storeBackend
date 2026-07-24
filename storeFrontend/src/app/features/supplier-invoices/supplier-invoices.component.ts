import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SupplierInvoiceService, SupplierInvoiceDocument } from '../../core/services/supplier-invoice.service';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '../../shared/components/responsive-data-list/responsive-data-list.component';
import { Subject, takeUntil } from 'rxjs';
import { SupplierInvoiceUploadDialogComponent } from './supplier-invoice-upload-dialog.component';
import { SupplierInvoicePreviewComponent } from './supplier-invoice-preview.component';
import { toDate, getLocaleForLanguage } from '../../core/utils/date.utils';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-supplier-invoices',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
    LucideAngularModule,
    ResponsiveDataListComponent
  ],
  template: `
    <div class="page-container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1>{{ 'SUPPLIER_INVOICES.TITLE' | translate }}</h1>
          <p class="subtitle">{{ 'SUPPLIER_INVOICES.SUBTITLE' | translate }}</p>
        </div>
        <button mat-raised-button color="primary" (click)="openUploadDialog()">
          <lucide-icon name="upload" [size]="18"></lucide-icon>
          {{ 'SUPPLIER_INVOICES.UPLOAD.BUTTON' | translate }}
        </button>
      </div>

      <!-- Responsive Data List -->
      <app-responsive-data-list
        [items]="documents"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [searchable]="true"
        [searchPlaceholder]="'SUPPLIER_INVOICES.SEARCH_PLACEHOLDER' | translate"
        [emptyMessage]="'SUPPLIER_INVOICES.LIST.EMPTY_MESSAGE' | translate"
        [emptyIcon]="'📦'"
        [rowClickable]="true"
        (rowClick)="openPreview($event)">
      </app-responsive-data-list>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;

      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 500;
        color: #333;
      }

      .subtitle {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      button {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;

        button {
          width: 100%;
          justify-content: center;
        }
      }
    }
  `]
})
export class SupplierInvoicesComponent implements OnInit, OnDestroy {
  storeId!: number;
  documents: SupplierInvoiceDocument[] = [];
  loading = false;

  columns: ColumnConfig[] = [];
  actions: ActionConfig[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplierInvoiceService: SupplierInvoiceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.extractStoreId();
    this.setupColumns();
    this.setupActions();
    this.loadDocuments();

    // Subscribe to language changes to update columns and actions dynamically
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.setupColumns();
        this.setupActions();
      });
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

  private setupColumns(): void {
    // Get current locale from central mapping
    const currentLang = this.translate.currentLang || this.translate.defaultLang || 'de';
    const locale = getLocaleForLanguage(currentLang);

    this.columns = [
      {
        key: 'mimeType',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.TYPE'),
        type: 'custom',
        width: '60px',
        mobileLabel: this.translate.instant('SUPPLIER_INVOICES.LIST.TYPE'),
        formatFn: (value) => this.supplierInvoiceService.getFileIcon(value)
      },
      {
        key: 'originalFilename',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.FILENAME'),
        type: 'text',
        mobileLabel: this.translate.instant('SUPPLIER_INVOICES.LIST.FILENAME')
      },
      {
        key: 'mimeType',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.TYPE'),
        type: 'custom',
        hideOnMobile: true,
        formatFn: (value) => this.getFileTypeLabel(value)
      },
      {
        key: 'fileSize',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.SIZE'),
        type: 'custom',
        mobileLabel: this.translate.instant('SUPPLIER_INVOICES.LIST.SIZE'),
        formatFn: (value) => this.supplierInvoiceService.formatFileSize(value)
      },
      {
        key: 'pageCount',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.PAGES'),
        type: 'number',
        hideOnMobile: true
      },
      {
        key: 'createdAt',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.DATE'),
        type: 'text',
        mobileLabel: this.translate.instant('SUPPLIER_INVOICES.LIST.DATE'),
        formatFn: (value) => {
          const d = toDate(value);
          return d ? d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        }
      },
      {
        key: 'uploadStatus',
        label: this.translate.instant('SUPPLIER_INVOICES.LIST.STATUS'),
        type: 'badge',
        mobileLabel: this.translate.instant('SUPPLIER_INVOICES.LIST.STATUS'),
        formatFn: (value) => this.translate.instant(`SUPPLIER_INVOICES.STATUS.${value}`),
        badgeClass: (value) => this.getStatusClass(value)
      }
    ];
  }

  private setupActions(): void {
    this.actions = [
      {
        icon: '👁️',
        label: this.translate.instant('SUPPLIER_INVOICES.ACTIONS.VIEW'),
        handler: (doc) => this.openPreview(doc)
      },
      {
        icon: '📝',
        label: this.translate.instant('SUPPLIER_INVOICES.ACTIONS.READ_OCR'),
        handler: (doc) => this.runOcr(doc)
      },
      {
        icon: '🗑️',
        label: this.translate.instant('SUPPLIER_INVOICES.ACTIONS.DELETE'),
        class: 'danger',
        handler: (doc) => this.confirmDelete(doc)
      }
    ];
  }

  loadDocuments(): void {
    this.loading = true;
    this.supplierInvoiceService.getDocuments(this.storeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs) => {
          this.documents = docs.sort((a, b) => {
            const dateA = toDate(a.createdAt);
            const dateB = toDate(b.createdAt);
            return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
          });
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load documents:', err);
          this.handleError(err);
          this.loading = false;
        }
      });
  }

  openUploadDialog(): void {
    const dialogRef = this.dialog.open(SupplierInvoiceUploadDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { storeId: this.storeId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.loadDocuments();
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
          this.loadDocuments();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.handleError(err);
        }
      });
  }

  runOcr(doc: SupplierInvoiceDocument): void {
    const loadingMessage = this.snackBar.open(
      this.translate.instant('SUPPLIER_INVOICES.OCR.RUNNING'),
      '',
      { duration: 0 }
    );

    this.supplierInvoiceService.runOcr(this.storeId, doc.id, 6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          loadingMessage.dismiss();
          
          if (result.status === 'OCR_COMPLETED' || result.status === 'TEXT_EXTRACTED') {
            // Show OCR result in preview dialog
            this.dialog.open(SupplierInvoicePreviewComponent, {
              data: { 
                storeId: this.storeId, 
                document: doc,
                ocrResult: result
              },
              width: '90vw',
              maxWidth: '1200px',
              height: '90vh',
              panelClass: 'supplier-invoice-preview-dialog'
            });
          } else {
            this.showError('SUPPLIER_INVOICES.OCR.FAILED');
          }
        },
        error: (err) => {
          loadingMessage.dismiss();
          console.error('OCR failed:', err);
          this.handleOcrError(err);
        }
      });
  }

  private handleOcrError(error: any): void {
    let message = 'SUPPLIER_INVOICES.OCR.FAILED';

    if (error.status === 400) {
      message = 'SUPPLIER_INVOICES.ERRORS.BAD_REQUEST';
    } else if (error.status === 401) {
      message = 'SUPPLIER_INVOICES.ERRORS.UNAUTHORIZED';
    } else if (error.status === 403) {
      message = 'SUPPLIER_INVOICES.ERRORS.FORBIDDEN';
    } else if (error.status === 404) {
      message = 'SUPPLIER_INVOICES.ERRORS.NOT_FOUND';
    } else if (error.status === 415) {
      message = 'SUPPLIER_INVOICES.OCR.UNSUPPORTED_TYPE';
    } else if (error.status === 422) {
      message = 'SUPPLIER_INVOICES.OCR.FAILED';
    } else if (error.status === 503) {
      message = 'SUPPLIER_INVOICES.OCR.TESSERACT_UNAVAILABLE';
    } else if (error.status === 500) {
      message = 'SUPPLIER_INVOICES.OCR.READ_ERROR';
    }

    this.showError(message);
  }

  private getFileTypeLabel(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType === 'image/jpeg') return 'JPEG';
    if (mimeType === 'image/png') return 'PNG';
    if (mimeType === 'image/webp') return 'WEBP';
    return mimeType;
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'UPLOADED': return 'status-active';
      case 'PREVIEW_READY': return 'status-active';
      case 'FAILED': return 'status-inactive';
      default: return '';
    }
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

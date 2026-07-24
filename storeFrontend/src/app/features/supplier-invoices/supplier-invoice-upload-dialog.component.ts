import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SupplierInvoiceService, SupplierInvoiceDocument } from '../../core/services/supplier-invoice.service';
import { Subject, takeUntil } from 'rxjs';

interface DialogData {
  storeId: number;
}

@Component({
  selector: 'app-supplier-invoice-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatDialogModule,
    TranslateModule,
    LucideAngularModule
  ],
  template: `
    <div class="upload-dialog">
      <h2 mat-dialog-title>
        <lucide-icon name="upload" [size]="20"></lucide-icon>
        {{ 'SUPPLIER_INVOICES.UPLOAD.TITLE' | translate }}
      </h2>

      <mat-dialog-content>
        <div class="dropzone"
             [class.drag-over]="dragOver"
             [class.uploading]="uploading"
             (drop)="onDrop($event)"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)">
          
          <lucide-icon name="cloud-upload" [size]="48" class="upload-icon"></lucide-icon>
          
          <p class="primary-text">{{ 'SUPPLIER_INVOICES.UPLOAD.DRAG_DROP' | translate }}</p>
          <p class="secondary-text">{{ 'SUPPLIER_INVOICES.UPLOAD.OR' | translate }}</p>
          
          <button mat-raised-button color="primary" (click)="fileInput.click()" [disabled]="uploading">
            {{ 'SUPPLIER_INVOICES.UPLOAD.SELECT_FILE' | translate }}
          </button>
          
          <input 
            #fileInput 
            type="file" 
            accept="application/pdf,image/jpeg,image/png,image/webp"
            (change)="onFileSelected($event)"
            style="display: none;">
          
          <p class="hint-text">
            {{ 'SUPPLIER_INVOICES.UPLOAD.ALLOWED_TYPES' | translate }}: PDF, JPEG, PNG, WEBP<br>
            {{ 'SUPPLIER_INVOICES.UPLOAD.MAX_SIZE' | translate }}: 10 MB
          </p>

          <div *ngIf="uploading" class="upload-progress">
            <p>{{ 'SUPPLIER_INVOICES.UPLOAD.UPLOADING' | translate }}</p>
            <mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>
            <p class="progress-text">{{ uploadProgress }}%</p>
          </div>

          <div *ngIf="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">
          {{ 'COMMON.CANCEL' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .upload-dialog {
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }
    }

    .dropzone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      transition: all 0.3s ease;
      background: #fafafa;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      &.drag-over {
        border-color: #667eea;
        background: #f0f4ff;
        
        .upload-icon {
          color: #667eea;
          transform: scale(1.1);
        }
      }

      &.uploading {
        border-color: #667eea;
        background: #f0f4ff;
      }

      .upload-icon {
        color: #999;
        margin-bottom: 16px;
        transition: all 0.3s ease;
      }

      .primary-text {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin: 0 0 8px 0;
      }

      .secondary-text {
        font-size: 14px;
        color: #666;
        margin: 0 0 16px 0;
      }

      button {
        margin: 16px 0;
      }

      .hint-text {
        font-size: 12px;
        color: #999;
        margin: 16px 0 0 0;
        line-height: 1.6;
      }

      .upload-progress {
        width: 100%;
        margin-top: 16px;

        p {
          margin: 8px 0;
          color: #666;
        }

        mat-progress-bar {
          margin: 8px 0;
        }

        .progress-text {
          font-weight: 500;
          color: #667eea;
        }
      }

      .error-message {
        margin-top: 16px;
        padding: 12px;
        background: #ffebee;
        color: #c62828;
        border-radius: 4px;
        font-size: 14px;
      }
    }
  `]
})
export class SupplierInvoiceUploadDialogComponent {
  uploading = false;
  uploadProgress = 0;
  dragOver = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<SupplierInvoiceUploadDialogComponent>,
    private supplierInvoiceService: SupplierInvoiceService,
    private translate: TranslateService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.error = null;

    // Validate
    const validationError = this.supplierInvoiceService.validateFile(file);
    if (validationError) {
      this.error = this.translate.instant(validationError);
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    this.supplierInvoiceService.uploadDocument(this.data.storeId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if ('progress' in result) {
            this.uploadProgress = result.progress;
          } else {
            // Upload complete
            this.uploading = false;
            this.uploadProgress = 0;
            this.dialogRef.close('success');
          }
        },
        error: (err) => {
          console.error('Upload failed:', err);
          this.uploading = false;
          this.uploadProgress = 0;
          this.error = this.translate.instant('SUPPLIER_INVOICES.ERRORS.UPLOAD_FAILED');
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

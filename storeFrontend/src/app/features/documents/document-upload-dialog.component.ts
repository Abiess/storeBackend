import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { DocumentsService, DOCUMENT_CATEGORIES } from '@app/core/services/documents.service';

export interface DocumentUploadDialogData {
  /** 'camera' -> Datei-Input öffnet direkt die Rückkamera (capture=environment, Mobile),
   *  'file' -> normaler Datei-/PDF-Picker. Kein eigener Kamera-Service nötig: das native
   *  `<input type="file" capture>` deckt Capacitor/WebView + mobile Browser bereits ab. */
  mode: 'camera' | 'file';
}

/**
 * DOCUMENTS-App (Phase 1): Foto/Datei-Upload-Dialog.
 *
 * Bewusst KEIN neuer, paralleler Mobile-Camera-Service: `capture="environment"`
 * auf dem nativen `<input type="file">` reicht (Web + Capacitor-WebView), analog
 * zum bereits vorhandenen Dropzone-Muster in `SupplierInvoiceUploadDialogComponent`.
 */
@Component({
  selector: 'app-document-upload-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatProgressBarModule, TranslatePipe],
  template: `
    <div class="doc-upload-dialog">
      <h2 mat-dialog-title>
        {{ (data.mode === 'camera' ? 'documents.actions.takePhoto' : 'documents.actions.uploadFile') | translate }}
      </h2>

      <mat-dialog-content>
        <div class="dropzone" [class.uploading]="uploading" *ngIf="!selectedFile">
          <button mat-raised-button color="primary" (click)="fileInput.click()" [disabled]="uploading">
            {{ (data.mode === 'camera' ? 'documents.actions.takePhoto' : 'documents.actions.uploadFile') | translate }}
          </button>
          <input
            #fileInput
            type="file"
            [attr.accept]="data.mode === 'camera' ? 'image/*' : 'application/pdf,image/jpeg,image/png,image/webp'"
            [attr.capture]="data.mode === 'camera' ? 'environment' : null"
            (change)="onFileSelected($event)"
            style="display: none;">
        </div>

        <div class="doc-form" *ngIf="selectedFile">
          <p class="file-name">📄 {{ selectedFile.name }}</p>

          <label>{{ 'documents.form.title' | translate }} *</label>
          <input class="form-input" type="text" [(ngModel)]="title" name="title" required>

          <label>{{ 'documents.form.category' | translate }}</label>
          <select class="form-input" [(ngModel)]="category" name="category">
            <option [ngValue]="null">{{ 'documents.form.chooseCategory' | translate }}</option>
            <option *ngFor="let c of categories" [value]="c">{{ ('documents.categories.' + c) | translate }}</option>
          </select>

          <label>{{ 'documents.form.note' | translate }}</label>
          <textarea class="form-input" rows="2" [(ngModel)]="note" name="note"></textarea>

          <div class="date-row">
            <div>
              <label>{{ 'documents.form.documentDate' | translate }}</label>
              <input class="form-input" type="date" [(ngModel)]="documentDate" name="documentDate">
            </div>
            <div>
              <label>{{ 'documents.form.expiryDate' | translate }}</label>
              <input class="form-input" type="date" [(ngModel)]="expiryDate" name="expiryDate">
            </div>
          </div>

          <div *ngIf="uploading" class="upload-progress">
            <mat-progress-bar mode="determinate" [value]="uploadProgress"></mat-progress-bar>
          </div>

          <div *ngIf="error" class="error-message">{{ error }}</div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()" [disabled]="uploading">{{ 'documents.actions.cancel' | translate }}</button>
        <button mat-raised-button color="primary" *ngIf="selectedFile" (click)="submit()" [disabled]="uploading || !title">
          {{ 'documents.actions.save' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .doc-upload-dialog { min-width: 280px; }
    .dropzone { display: flex; justify-content: center; padding: 32px 0; }
    .doc-form { display: flex; flex-direction: column; gap: 4px; }
    .file-name { font-weight: 500; margin-bottom: 8px; word-break: break-all; }
    label { font-size: 12px; color: #666; margin-top: 8px; }
    .form-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box; }
    .date-row { display: flex; gap: 12px; }
    .date-row > div { flex: 1; }
    .upload-progress { margin-top: 12px; }
    .error-message { margin-top: 12px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 14px; }
  `]
})
export class DocumentUploadDialogComponent implements OnDestroy {
  readonly categories = DOCUMENT_CATEGORIES;

  selectedFile: File | null = null;
  title = '';
  category: string | null = null;
  note = '';
  documentDate: string | null = null;
  expiryDate: string | null = null;

  uploading = false;
  uploadProgress = 0;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DocumentUploadDialogData,
    private dialogRef: MatDialogRef<DocumentUploadDialogComponent>,
    private documentsService: DocumentsService,
    private translationService: TranslationService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validationError = this.documentsService.validateFile(file);
      if (validationError) {
        this.error = this.translationService.translate(validationError);
        return;
      }
      this.error = null;
      this.selectedFile = file;
      if (!this.title) {
        this.title = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  submit(): void {
    if (!this.selectedFile || !this.title) {
      return;
    }
    this.uploading = true;
    this.uploadProgress = 0;
    this.error = null;

    this.documentsService.uploadNew(this.selectedFile, {
      title: this.title,
      category: this.category,
      note: this.note || null,
      documentDate: this.documentDate || null,
      expiryDate: this.expiryDate || null
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        if ('progress' in result) {
          this.uploadProgress = result.progress;
        } else {
          this.uploading = false;
          this.dialogRef.close(result);
        }
      },
      error: () => {
        this.uploading = false;
        this.error = this.translationService.translate('documents.errors.uploadFailed');
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

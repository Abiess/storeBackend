import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { DocumentsService, DOCUMENT_CATEGORIES } from '@app/core/services/documents.service';

export interface DocumentUploadDialogData {
  /** 'camera' -> Fallback-Input mit accept="image/*" UND capture="environment" (Rückkamera
   *  direkt, kein Auswahl-Dialog) - der primäre Trigger ist aber `documents.component.ts`
   *  (`takePhoto()`/`cameraFileInput`), dieser Dialog-Input greift nur als Retry.
   *  'file' -> normaler Datei-/PDF-Picker ohne capture. */
  mode: 'camera' | 'file';
  /** Bereits ausgewählte (und materialisierte) Datei, z.B. wenn der Hauptbutton "Fotografieren"
   *  die Kamera DIREKT geöffnet hat (siehe DocumentsComponent.takePhoto()) - kein zweiter Klick
   *  auf einen Button INNERHALB des Dialogs mehr nötig. Wenn gesetzt, zeigt der Dialog sofort
   *  das Metadaten-Formular statt der Dropzone. */
  file?: File;
}

/**
 * DOCUMENTS-App (Phase 1): Foto/Datei-Upload-Dialog.
 *
 * Zwei Capture-Pfade, je nach Aufrufer:
 * - 'file' (Hauptbutton "Datei hochladen"): generischer `<input type="file">` OHNE
 *   `capture`-Attribut - Browser/OS zeigen den normalen Datei-/Foto-Auswahl-Dialog.
 *   Identisch zum app-weit bewährten Muster von `ImageUploadComponent`.
 * - 'camera' (Hauptbutton "Fotografieren"): der PRIMÄRE Trigger ist das dedizierte,
 *   versteckte `<input #cameraFileInput capture="environment">` in
 *   `documents.component.html` (per `takePhoto()` direkt angeklickt, noch bevor dieser
 *   Dialog überhaupt geöffnet wird) - damit öffnet iPhone/Android möglichst direkt die
 *   Rückkamera statt eines Zwischen-Auswahl-Dialogs. Der Datei-Input HIER IM Dialog ist
 *   nur ein Fallback/Retry (falls `applyFile()` beim preselektierten File fehlschlägt,
 *   z.B. Validierung) und spiegelt im 'camera'-Modus dasselbe `capture="environment"`.
 *
 * Root Cause der früheren iPhone-500er (`MissingServletRequestPartException`) war NICHT
 * das `capture`-Attribut selbst, sondern dass das Kamera-`<input>` per `*ngIf` aus dem DOM
 * verschwand, während der User noch das Metadaten-Formular ausfüllte - der zugrunde
 * liegende iOS/WKWebView-Blob eines frisch aufgenommenen Fotos kann dabei ephemer werden
 * und beim späteren Multipart-Encoding stillschweigend fehlen. Der Fix ist daher NICHT das
 * Entfernen von `capture`, sondern die sofortige Materialisierung der Datei via
 * `DocumentsService.materializeFile()` (liest `file.arrayBuffer()` SOFORT bei Auswahl und
 * baut ein neues, speicherresidentes `File`) - passiert für BEIDE Pfade (Haupt-Input in
 * `documents.component.ts` UND diesen Fallback-Input hier), bevor irgendein DOM-Element
 * verschwinden oder Zeit vergehen kann.
 *
 * `CameraAdapter`/`WebCameraAdapter` (core/services/camera-adapter.ts) ist NICHT geeignet:
 * er liefert nur einen rohen `MediaStream` fürs Live-Barcode-Scanning, keinen File/Blob.
 *
 * Kein eigener Kamera-Service nötig. Die Datei wird unverändert 1:1 an `DocumentsService`
 * weitergereicht (siehe submit()).
 */
@Component({
  selector: 'app-document-upload-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslatePipe],
  template: `
    <div class="doc-upload-dialog">
      <h2 mat-dialog-title>
        {{ (data.mode === 'camera' ? 'documents.actions.takePhoto' : 'documents.actions.uploadFile') | translate }}
      </h2>

      <mat-dialog-content>
        <div class="dropzone" [class.uploading]="uploading" *ngIf="!selectedFile">
          <mat-icon class="dropzone-icon">{{ data.mode === 'camera' ? 'photo_camera' : 'upload_file' }}</mat-icon>
          <button mat-raised-button color="primary" (click)="fileInput.click()" [disabled]="uploading">
            {{ (data.mode === 'camera' ? 'documents.actions.takePhoto' : 'documents.actions.uploadFile') | translate }}
          </button>
          <p class="dropzone-hint" *ngIf="data.mode === 'file'">PDF, JPG, PNG, WEBP · max. 15 MB</p>
          <input
            #fileInput
            type="file"
            [attr.accept]="data.mode === 'camera' ? 'image/*' : 'application/pdf,image/jpeg,image/png,image/webp'"
            [attr.capture]="data.mode === 'camera' ? 'environment' : null"
            (change)="onFileSelected($event)"
            style="display: none;">
        </div>

        <div class="doc-form" *ngIf="selectedFile">
          <p class="file-name"><mat-icon class="file-icon">description</mat-icon> {{ selectedFile.name }}</p>

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
    .dropzone {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; padding: 32px 16px; border-radius: 16px;
      background: rgba(102, 126, 234, 0.04); border: 1px dashed rgba(102, 126, 234, 0.25);
    }
    .dropzone-icon { font-size: 40px; width: 40px; height: 40px; color: #764ba2; opacity: 0.7; }
    .dropzone-hint { margin: 0; font-size: 12px; color: #6b7280; }
    .doc-form { display: flex; flex-direction: column; gap: 4px; }
    .file-name { display: flex; align-items: center; gap: 6px; font-weight: 500; margin-bottom: 8px; word-break: break-all; }
    .file-icon { color: #667eea; }
    label { font-size: 12px; color: #666; margin-top: 8px; }
    .form-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box; }
    .date-row { display: flex; gap: 12px; }
    .date-row > div { flex: 1; }
    .upload-progress { margin-top: 12px; }
    .error-message { margin-top: 12px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 14px; }
  `]
})
export class DocumentUploadDialogComponent implements OnInit, OnDestroy {
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

  ngOnInit(): void {
    // Kamera-Quick-Action hat die Datei bereits ausgewählt+materialisiert (siehe
    // DocumentsComponent.onCameraFileSelected) -> direkt ins Metadaten-Formular, kein
    // zweiter "Fotografieren"-Klick innerhalb des Dialogs mehr nötig.
    if (this.data.file) {
      this.applyFile(this.data.file);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * iOS/WKWebView-Root-Cause (siehe MissingServletRequestPartException in Production):
   * Der frisch fotografierte Kamera-Blob ist auf iOS an die Input-/Capture-Session gebunden
   * (ephemer), anders als Galerie-Bilder (persistenter Photos-Asset) oder Desktop-Dateien
   * (FS-backed). Sobald `selectedFile` gesetzt wird, entfernt `*ngIf="!selectedFile"` das
   * `<input #fileInput>` aus dem DOM - während der Nutzer danach noch das Metadaten-Formular
   * ausfüllt (mehrere Sekunden). In dieser Zeitspanne kann der ursprüngliche Blob auf iOS
   * ungültig werden; Safari lässt den nicht mehr lesbaren "file"-Part beim Multipart-Encoding
   * dann still fallen, statt einen Fehler zu werfen.
   * Fix: Bytes SOFORT bei Auswahl in den Speicher lesen (`DocumentsService.materializeFile()`)
   * und daraus ein neues, ausschließlich speicherresidentes File bauen.
   */
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const stableFile = await this.documentsService.materializeFile(file);
      this.applyFile(stableFile);
    }
  }

  /** Gemeinsame Validierung + Übernahme, egal ob die Datei aus dem Dialog-internen Picker
   *  (onFileSelected) oder bereits vorab von der Kamera-Quick-Action kommt (data.file). */
  private applyFile(file: File): void {
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

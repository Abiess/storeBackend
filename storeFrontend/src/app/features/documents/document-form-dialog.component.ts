import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { DocumentDTO, DOCUMENT_CATEGORIES } from '@app/core/services/documents.service';

export interface DocumentFormDialogData {
  /** Vorbelegung für "Bearbeiten" (Titel/Kategorie/Notiz/Daten ändern, nur Owner). Leer = "Manuell anlegen". */
  document?: DocumentDTO;
}

export interface DocumentFormResult {
  title: string;
  category: string | null;
  note: string | null;
  documentDate: string | null;
  expiryDate: string | null;
}

/**
 * DOCUMENTS-App (Phase 1): manuelles Anlegen ("Dokument darf auch ohne Datei
 * existieren") UND Bearbeiten der Metadaten (Titel/Kategorie/Notiz/Datum/
 * Ablaufdatum) eines bestehenden Dokuments – ein Dialog für beide Fälle,
 * unterschieden über `data.document`.
 */
@Component({
  selector: 'app-document-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="doc-form-dialog">
      <h2 mat-dialog-title>
        {{ (data.document ? 'documents.actions.edit' : 'documents.actions.createManual') | translate }}
      </h2>

      <mat-dialog-content>
        <label>{{ 'documents.form.title' | translate }} *</label>
        <input class="form-input" type="text" [(ngModel)]="title" name="title" required>

        <label>{{ 'documents.form.category' | translate }}</label>
        <select class="form-input" [(ngModel)]="category" name="category">
          <option [ngValue]="null">{{ 'documents.form.chooseCategory' | translate }}</option>
          <option *ngFor="let c of categories" [value]="c">{{ ('documents.categories.' + c) | translate }}</option>
        </select>

        <label>{{ 'documents.form.note' | translate }}</label>
        <textarea class="form-input" rows="3" [(ngModel)]="note" name="note"></textarea>

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

        <div *ngIf="error" class="error-message">{{ error | translate }}</div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">{{ 'documents.actions.cancel' | translate }}</button>
        <button mat-raised-button color="primary" (click)="submit()">{{ 'documents.actions.save' | translate }}</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .doc-form-dialog { min-width: 280px; }
    label { display: block; font-size: 12px; color: #666; margin-top: 8px; }
    .form-input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; width: 100%; box-sizing: border-box; margin-top: 4px; }
    .date-row { display: flex; gap: 12px; }
    .date-row > div { flex: 1; }
    .error-message { margin-top: 12px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 14px; }
  `]
})
export class DocumentFormDialogComponent {
  readonly categories = DOCUMENT_CATEGORIES;

  title: string;
  category: string | null;
  note: string;
  documentDate: string | null;
  expiryDate: string | null;
  error: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DocumentFormDialogData,
    private dialogRef: MatDialogRef<DocumentFormDialogComponent>
  ) {
    const doc = data.document;
    this.title = doc?.title ?? '';
    this.category = doc?.category ?? null;
    this.note = doc?.note ?? '';
    this.documentDate = doc?.documentDate ?? null;
    this.expiryDate = doc?.expiryDate ?? null;
  }

  submit(): void {
    if (!this.title.trim()) {
      this.error = 'documents.errors.titleRequired';
      return;
    }
    const result: DocumentFormResult = {
      title: this.title.trim(),
      category: this.category,
      note: this.note?.trim() || null,
      documentDate: this.documentDate || null,
      expiryDate: this.expiryDate || null
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

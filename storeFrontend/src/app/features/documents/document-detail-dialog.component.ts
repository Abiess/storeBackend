import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { DocumentDTO, DocumentsService } from '@app/core/services/documents.service';

export interface DocumentDetailDialogData {
  document: DocumentDTO;
  /** false für Tab "Mit mir geteilt": Bearbeiten/Teilen/Löschen sind reine Owner-Aktionen. */
  isOwner: boolean;
}

/**
 * Dialog-Ergebnis: der aufrufende `DocumentsComponent` führt die eigentliche
 * Aktion (Edit-/Share-Dialog öffnen, Löschen inkl. Bestätigung) aus – dieser
 * Dialog selbst löst nur die Absicht aus (keine doppelte Lösch-/Edit-Logik).
 */
export type DocumentDetailDialogResult = 'edit' | 'share' | 'delete' | undefined;

/**
 * DOCUMENTS-App (Phase 1): Detailansicht eines Dokuments.
 *
 * Geteilte User (isOwner=false) sehen nur "Anzeigen"/"Datei öffnen" – kein
 * Löschen, kein Bearbeiten, kein Teilen (serverseitig ohnehin über
 * Owner-or-Shared + 403 durchgesetzt, hier nur zusätzlich UI-seitig
 * ausgeblendet).
 */
@Component({
  selector: 'app-document-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <div class="doc-detail-dialog">
      <h2 mat-dialog-title>{{ data.document.title }}</h2>

      <mat-dialog-content>
        <div class="doc-badges">
          <span class="badge" *ngIf="data.document.category">{{ ('documents.categories.' + data.document.category) | translate }}</span>
          <span class="badge badge-shared" *ngIf="!data.isOwner">{{ 'documents.tabs.shared' | translate }}</span>
        </div>

        <p class="doc-note" *ngIf="data.document.note">{{ data.document.note }}</p>

        <div class="doc-meta">
          <div *ngIf="data.document.documentDate">
            <span class="meta-label">{{ 'documents.form.documentDate' | translate }}</span>
            <span>{{ data.document.documentDate }}</span>
          </div>
          <div *ngIf="data.document.expiryDate">
            <span class="meta-label">{{ 'documents.form.expiryDate' | translate }}</span>
            <span>{{ data.document.expiryDate }}</span>
          </div>
        </div>

        <div class="doc-file" *ngIf="data.document.hasFile">
          <button mat-raised-button color="primary" (click)="openFile()" [disabled]="downloading">
            <mat-icon>description</mat-icon>
            {{ 'documents.actions.download' | translate }}
          </button>
          <span class="file-name" *ngIf="data.document.originalFilename">{{ data.document.originalFilename }}</span>
        </div>
        <p class="hint" *ngIf="!data.document.hasFile">{{ 'documents.detail.noFile' | translate }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button color="warn" *ngIf="data.isOwner" (click)="dialogRef.close('delete')">
          {{ 'documents.actions.delete' | translate }}
        </button>
        <button mat-button *ngIf="data.isOwner" (click)="dialogRef.close('share')">
          {{ 'documents.actions.share' | translate }}
        </button>
        <button mat-button *ngIf="data.isOwner" (click)="dialogRef.close('edit')">
          {{ 'documents.actions.edit' | translate }}
        </button>
        <button mat-raised-button (click)="dialogRef.close()">{{ 'documents.actions.close' | translate }}</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .doc-detail-dialog { min-width: 300px; max-width: 480px; }
    .doc-badges { display: flex; gap: 8px; margin-bottom: 8px; }
    .badge { background: #ede9fe; color: #6d28d9; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .badge-shared { background: #e0f2fe; color: #0369a1; }
    .doc-note { color: #444; white-space: pre-wrap; }
    .doc-meta { display: flex; gap: 24px; margin: 12px 0; font-size: 14px; }
    .meta-label { display: block; font-size: 11px; color: #999; }
    .doc-file { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
    .file-name { color: #666; font-size: 13px; word-break: break-all; }
    .hint { color: #999; font-size: 14px; }
  `]
})
export class DocumentDetailDialogComponent {
  downloading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DocumentDetailDialogData,
    public dialogRef: MatDialogRef<DocumentDetailDialogComponent, DocumentDetailDialogResult>,
    private documentsService: DocumentsService
  ) {}

  openFile(): void {
    this.downloading = true;
    this.documentsService.downloadBlob(this.data.document.id).subscribe({
      next: (blob) => {
        this.downloading = false;
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Blob-URL nach kurzer Verzögerung freigeben (dem neuen Tab genug Zeit zum Laden geben).
        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      },
      error: () => {
        this.downloading = false;
      }
    });
  }
}

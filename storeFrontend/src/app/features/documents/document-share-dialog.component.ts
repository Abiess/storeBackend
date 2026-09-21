import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { DocumentShareDTO, DocumentsService } from '@app/core/services/documents.service';

export interface DocumentShareDialogData {
  documentId: number;
  documentTitle: string;
}

/**
 * DOCUMENTS-App (Phase 1): Teilen mit einem bestehenden markt.ma-User (per
 * E-Mail, kein öffentlicher Share-Link, siehe `UserRepository#findByEmail`
 * im Backend). MVP-Permission ist immer VIEW. Owner kann Freigaben hier auch
 * wieder entfernen.
 */
@Component({
  selector: 'app-document-share-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <div class="doc-share-dialog">
      <h2 mat-dialog-title>{{ 'documents.share.dialogTitle' | translate }}</h2>
      <p class="doc-title">{{ data.documentTitle }}</p>

      <mat-dialog-content>
        <label>{{ 'documents.share.emailLabel' | translate }}</label>
        <div class="share-input-row">
          <input class="form-input" type="email" [(ngModel)]="email" name="email" (keydown.enter)="addShare()">
          <button mat-raised-button color="primary" (click)="addShare()" [disabled]="submitting || !email">
            {{ 'documents.share.shareButton' | translate }}
          </button>
        </div>
        <p class="hint">{{ 'documents.share.permissionInfo' | translate }}</p>
        <div *ngIf="error" class="error-message">{{ error }}</div>

        <h3>{{ 'documents.share.sharedWith' | translate }}</h3>
        <p class="hint" *ngIf="!loading && shares.length === 0">{{ 'documents.share.noShares' | translate }}</p>
        <ul class="share-list">
          <li *ngFor="let s of shares">
            <span>{{ s.sharedWithUserEmail }}</span>
            <button mat-button color="warn" (click)="removeShare(s)">
              <mat-icon>close</mat-icon>
            </button>
          </li>
        </ul>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">{{ 'documents.actions.close' | translate }}</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .doc-share-dialog { min-width: 300px; }
    .doc-title { color: #666; margin: -8px 0 8px; }
    label { display: block; font-size: 12px; color: #666; }
    .share-input-row { display: flex; gap: 8px; align-items: center; }
    .form-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
    .hint { font-size: 12px; color: #999; margin: 6px 0 0; }
    .error-message { margin-top: 8px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 14px; }
    h3 { font-size: 14px; margin: 20px 0 8px; color: #333; }
    .share-list { list-style: none; padding: 0; margin: 0; }
    .share-list li { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  `]
})
export class DocumentShareDialogComponent implements OnInit {
  email = '';
  shares: DocumentShareDTO[] = [];
  loading = true;
  submitting = false;
  error: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DocumentShareDialogData,
    private dialogRef: MatDialogRef<DocumentShareDialogComponent>,
    private documentsService: DocumentsService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadShares();
  }

  private loadShares(): void {
    this.loading = true;
    this.documentsService.listShares(this.data.documentId).subscribe({
      next: (shares) => {
        this.shares = shares;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  addShare(): void {
    if (!this.email) {
      return;
    }
    this.submitting = true;
    this.error = null;
    this.documentsService.share(this.data.documentId, this.email.trim()).subscribe({
      next: () => {
        this.submitting = false;
        this.email = '';
        this.loadShares();
      },
      error: (err) => {
        this.submitting = false;
        const key = err?.status === 404
          ? 'documents.errors.userNotFound'
          : 'documents.errors.shareFailed';
        this.error = this.translationService.translate(key);
      }
    });
  }

  removeShare(share: DocumentShareDTO): void {
    this.documentsService.unshare(this.data.documentId, share.id).subscribe({
      next: () => this.loadShares()
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

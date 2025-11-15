import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SeoApiService, RedirectRuleDTO } from '../../../core/services/seo-api.service';

@Component({
  selector: 'app-redirect-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Redirect bearbeiten' : 'Neuer Redirect' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quellpfad</mat-label>
          <input matInput formControlName="sourcePath" 
                 placeholder="/alter-pfad"
                 data-testid="redirect-source-path">
          <mat-error *ngIf="form.get('sourcePath')?.hasError('required')">
            Quellpfad ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('sourcePath')?.hasError('pattern')">
            Muss mit "/" beginnen (außer bei Regex)
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ziel-URL</mat-label>
          <input matInput formControlName="targetUrl" 
                 placeholder="/neuer-pfad oder https://..."
                 data-testid="redirect-target-url">
          <mat-error>Ziel-URL ist erforderlich</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>HTTP Code</mat-label>
          <mat-select formControlName="httpCode" data-testid="redirect-http-code">
            <mat-option [value]="301">301 - Permanent</mat-option>
            <mat-option [value]="302">302 - Temporary</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Priorität</mat-label>
          <input matInput type="number" formControlName="priority" data-testid="redirect-priority">
          <mat-hint>Niedrigere Werte = höhere Priorität</mat-hint>
        </mat-form-field>

        <mat-checkbox formControlName="isRegex" data-testid="redirect-is-regex">
          Als Regex-Pattern behandeln
        </mat-checkbox>

        <mat-checkbox formControlName="isActive" data-testid="redirect-is-active">
          Aktiv
        </mat-checkbox>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kommentar (optional)</mat-label>
          <textarea matInput formControlName="comment" 
                    rows="2"
                    data-testid="redirect-comment"></textarea>
        </mat-form-field>

        <!-- Regex test helper -->
        <div *ngIf="form.get('isRegex')?.value" class="regex-tester">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Test-Pfad (Regex-Prüfung)</mat-label>
            <input matInput [(ngModel)]="testPath" 
                   [ngModelOptions]="{standalone: true}"
                   placeholder="/test/123"
                   data-testid="redirect-test-path">
          </mat-form-field>
          <div class="test-result" *ngIf="testPath">
            <strong>Match:</strong> {{ testRegex() ? '✅ Ja' : '❌ Nein' }}
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close data-testid="redirect-cancel">Abbrechen</button>
      <button mat-raised-button color="primary" 
              (click)="onSave()" 
              [disabled]="form.invalid || saving"
              data-testid="redirect-save">
        {{ saving ? 'Speichern...' : 'Speichern' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    mat-checkbox {
      display: block;
      margin-bottom: 16px;
    }
    .regex-tester {
      margin-top: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      .test-result {
        margin-top: 8px;
        font-size: 14px;
      }
    }
  `]
})
export class RedirectDialogComponent {
  form: FormGroup;
  isEdit = false;
  saving = false;
  testPath = '';

  constructor(
    private fb: FormBuilder,
    private seoApi: SeoApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<RedirectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { storeId: number; redirect?: RedirectRuleDTO }
  ) {
    this.isEdit = !!data.redirect;
    this.form = this.fb.group({
      sourcePath: [data.redirect?.sourcePath || '', Validators.required],
      targetUrl: [data.redirect?.targetUrl || '', Validators.required],
      httpCode: [data.redirect?.httpCode || 301, Validators.required],
      priority: [data.redirect?.priority || 100, Validators.required],
      isRegex: [data.redirect?.isRegex || false],
      isActive: [data.redirect?.isActive ?? true],
      comment: [data.redirect?.comment || '']
    });
  }

  testRegex(): boolean {
    try {
      const pattern = new RegExp(this.form.value.sourcePath);
      return pattern.test(this.testPath);
    } catch {
      return false;
    }
  }

  onSave(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const redirect: RedirectRuleDTO = {
      ...this.form.value,
      storeId: this.data.storeId
    };

    const request = this.isEdit
      ? this.seoApi.updateRedirectRule(this.data.storeId, redirect)
      : this.seoApi.createRedirectRule(this.data.storeId, redirect);

    request.subscribe({
      next: () => {
        this.snackBar.open('✅ Redirect gespeichert', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        console.error('Failed to save redirect', err);
        this.snackBar.open('❌ Fehler: ' + (err.error?.message || 'Unbekannter Fehler'), 'OK', { duration: 4000 });
        this.saving = false;
      }
    });
  }
}


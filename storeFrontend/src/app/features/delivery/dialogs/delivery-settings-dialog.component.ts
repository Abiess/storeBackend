import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { DeliverySettings, CreateDeliverySettingsRequest } from '../../../core/models/delivery.model';

@Component({
  selector: 'app-delivery-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Liefereinstellungen {{ data ? 'bearbeiten' : 'erstellen' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="form-row">
          <mat-checkbox formControlName="enabled">
            Lieferung aktiviert
          </mat-checkbox>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Standard-Anbieter (optional)</mat-label>
          <input matInput formControlName="defaultProvider" placeholder="DHL, UPS, etc.">
        </mat-form-field>

        <div class="form-row-split">
          <mat-form-field appearance="outline">
            <mat-label>Min. Lieferzeit (Tage)</mat-label>
            <input matInput type="number" formControlName="estimatedMinDays" min="0">
            <mat-error *ngIf="form.get('estimatedMinDays')?.hasError('min')">
              Muss mindestens 0 sein
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Max. Lieferzeit (Tage)</mat-label>
            <input matInput type="number" formControlName="estimatedMaxDays" min="0">
            <mat-error *ngIf="form.get('estimatedMaxDays')?.hasError('min')">
              Muss mindestens 0 sein
            </mat-error>
            <mat-error *ngIf="form.hasError('maxLessThanMin')">
              Muss größer als Min. sein
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row-split">
          <mat-form-field appearance="outline">
            <mat-label>Kostenloser Versand ab (optional)</mat-label>
            <input matInput type="number" formControlName="freeShippingThreshold" min="0" step="0.01">
            <mat-error *ngIf="form.get('freeShippingThreshold')?.hasError('min')">
              Muss mindestens 0 sein
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Währung</mat-label>
            <input matInput formControlName="currency" placeholder="EUR">
            <mat-error *ngIf="form.get('currency')?.hasError('maxlength')">
              Maximal 3 Zeichen
            </mat-error>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" [disabled]="!form.valid || submitting" (click)="onSubmit()">
        {{ submitting ? 'Speichern...' : 'Speichern' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      padding: 20px 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      margin-bottom: 20px;
    }

    .form-row-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class DeliverySettingsDialogComponent implements OnInit {
  form: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeliverySettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeliverySettings | null
  ) {
    this.form = this.fb.group({
      enabled: [true, Validators.required],
      defaultProvider: [''],
      estimatedMinDays: [null, [Validators.min(0)]],
      estimatedMaxDays: [null, [Validators.min(0)]],
      freeShippingThreshold: [null, [Validators.min(0)]],
      currency: ['EUR', [Validators.maxLength(3)]]
    }, { validators: this.deliveryTimeValidator });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        enabled: this.data.enabled,
        defaultProvider: this.data.defaultProvider || '',
        estimatedMinDays: this.data.estimatedMinDays,
        estimatedMaxDays: this.data.estimatedMaxDays,
        freeShippingThreshold: this.data.freeShippingThreshold,
        currency: this.data.currency || 'EUR'
      });
    }
  }

  deliveryTimeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const min = group.get('estimatedMinDays')?.value;
    const max = group.get('estimatedMaxDays')?.value;

    if (min !== null && max !== null && min > max) {
      return { maxLessThanMin: true };
    }
    return null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid && !this.submitting) {
      this.submitting = true;
      const formValue = this.form.value;

      const request: CreateDeliverySettingsRequest = {
        enabled: formValue.enabled,
        defaultProvider: formValue.defaultProvider || undefined,
        estimatedMinDays: formValue.estimatedMinDays || undefined,
        estimatedMaxDays: formValue.estimatedMaxDays || undefined,
        freeShippingThreshold: formValue.freeShippingThreshold || undefined,
        currency: formValue.currency || undefined
      };

      this.dialogRef.close(request);
    }
  }
}


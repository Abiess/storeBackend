import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { DeliveryZone, CreateDeliveryZoneRequest } from '../../../core/models/delivery.model';

@Component({
  selector: 'app-delivery-zone-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Versandzone bearbeiten' : 'Neue Versandzone' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name" placeholder="z.B. Deutschland">
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Name ist erforderlich
          </mat-error>
        </mat-form-field>

        <div class="form-section">
          <label class="section-label">Länder *</label>
          <div class="countries-input">
            <mat-form-field appearance="outline" class="country-input">
              <mat-label>Ländercode hinzufügen</mat-label>
              <input matInput #countryInput (keyup.enter)="addCountry(countryInput.value); countryInput.value = ''"
                     placeholder="z.B. DE, AT, CH">
              <mat-hint>ISO-2 Ländercodes (z.B. DE, AT, CH)</mat-hint>
            </mat-form-field>
            <button mat-icon-button type="button" (click)="addCountry(countryInput.value); countryInput.value = ''">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          
          <mat-chip-set *ngIf="countries.length > 0" class="countries-chips">
            <mat-chip *ngFor="let country of countries; let i = index" 
                      (removed)="removeCountry(i)">
              {{ country }}
              <button matChipRemove>
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip>
          </mat-chip-set>
          
          <div *ngIf="form.hasError('countriesRequired') && form.touched" class="error-message">
            Mindestens ein Land ist erforderlich
          </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Versandkosten (EUR) *</mat-label>
          <input matInput type="number" formControlName="shippingCost" min="0" step="0.01">
          <mat-error *ngIf="form.get('shippingCost')?.hasError('required')">
            Versandkosten sind erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('shippingCost')?.hasError('min')">
            Muss mindestens 0 sein
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kostenloser Versand ab (EUR, optional)</mat-label>
          <input matInput type="number" formControlName="freeShippingThreshold" min="0" step="0.01">
          <mat-error *ngIf="form.get('freeShippingThreshold')?.hasError('min')">
            Muss mindestens 0 sein
          </mat-error>
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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Priorität *</mat-label>
          <input matInput type="number" formControlName="priority" min="1">
          <mat-hint>Niedrigere Werte = höhere Priorität</mat-hint>
          <mat-error *ngIf="form.get('priority')?.hasError('required')">
            Priorität ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('priority')?.hasError('min')">
            Muss mindestens 1 sein
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-checkbox formControlName="enabled">
            Zone aktiviert
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" [disabled]="!isFormValid() || submitting" (click)="onSubmit()">
        {{ submitting ? 'Speichern...' : 'Speichern' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 550px;
      padding: 20px 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-section {
      margin-bottom: 20px;
    }

    .section-label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      color: rgba(0, 0, 0, 0.87);
    }

    .countries-input {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .country-input {
      flex: 1;
    }

    .countries-chips {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .error-message {
      color: #f44336;
      font-size: 12px;
      margin-top: 4px;
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
export class DeliveryZoneDialogComponent implements OnInit {
  form: FormGroup;
  countries: string[] = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeliveryZoneDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeliveryZone | null
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      shippingCost: [0, [Validators.required, Validators.min(0)]],
      freeShippingThreshold: [null, [Validators.min(0)]],
      estimatedMinDays: [null, [Validators.min(0)]],
      estimatedMaxDays: [null, [Validators.min(0)]],
      priority: [100, [Validators.required, Validators.min(1)]],
      enabled: [true, Validators.required]
    }, { validators: this.deliveryTimeValidator });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        shippingCost: this.data.shippingCost,
        freeShippingThreshold: this.data.freeShippingThreshold,
        estimatedMinDays: this.data.estimatedMinDays,
        estimatedMaxDays: this.data.estimatedMaxDays,
        priority: this.data.priority,
        enabled: this.data.enabled
      });
      this.countries = [...this.data.countries];
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

  addCountry(value: string): void {
    const country = value.trim().toUpperCase();
    if (country && !this.countries.includes(country) && country.length === 2) {
      this.countries.push(country);
      this.form.updateValueAndValidity();
    }
  }

  removeCountry(index: number): void {
    this.countries.splice(index, 1);
    this.form.updateValueAndValidity();
  }

  isFormValid(): boolean {
    return this.form.valid && this.countries.length > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.isFormValid() && !this.submitting) {
      this.submitting = true;
      const formValue = this.form.value;

      const request: CreateDeliveryZoneRequest = {
        name: formValue.name,
        countries: this.countries,
        shippingCost: formValue.shippingCost,
        freeShippingThreshold: formValue.freeShippingThreshold || undefined,
        estimatedMinDays: formValue.estimatedMinDays || undefined,
        estimatedMaxDays: formValue.estimatedMaxDays || undefined,
        priority: formValue.priority,
        enabled: formValue.enabled
      };

      this.dialogRef.close(request);
    }
  }
}


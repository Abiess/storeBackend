import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { DeliveryProvider, CreateDeliveryProviderRequest } from '../../../core/models/delivery.model';

@Component({
  selector: 'app-delivery-provider-dialog',
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
    <h2 mat-dialog-title>{{ data ? 'Lieferanbieter bearbeiten' : 'Neuer Lieferanbieter' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name" placeholder="z.B. DHL Express">
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Name ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Code *</mat-label>
          <input matInput formControlName="code" placeholder="z.B. dhl-express">
          <mat-hint>Eindeutiger Bezeichner (nur Kleinbuchstaben und Bindestriche)</mat-hint>
          <mat-error *ngIf="form.get('code')?.hasError('required')">
            Code ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('code')?.hasError('pattern')">
            Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-checkbox formControlName="enabled">
            Anbieter aktiviert
          </mat-checkbox>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>API Key (optional)</mat-label>
          <input matInput formControlName="apiKey" type="password">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>API Secret (optional)</mat-label>
          <input matInput formControlName="apiSecret" type="password">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tracking-URL Template (optional)</mat-label>
          <input matInput formControlName="trackingUrlTemplate" 
                 placeholder="https://tracking.dhl.com/TRACKING_NUMBER_HERE">
          <mat-hint>Verwenden Sie TRACKING_NUMBER_HERE als Platzhalter für die Tracking-Nummer</mat-hint>
        </mat-form-field>

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
      max-height: 70vh;
      overflow-y: auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      margin-bottom: 20px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class DeliveryProviderDialogComponent implements OnInit {
  form: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DeliveryProviderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeliveryProvider | null
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      enabled: [true, Validators.required],
      apiKey: [''],
      apiSecret: [''],
      trackingUrlTemplate: [''],
      priority: [100, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        code: this.data.code,
        enabled: this.data.enabled,
        apiKey: this.data.apiKey || '',
        apiSecret: this.data.apiSecret || '',
        trackingUrlTemplate: this.data.trackingUrlTemplate || '',
        priority: this.data.priority
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.valid && !this.submitting) {
      this.submitting = true;
      const formValue = this.form.value;

      const request: CreateDeliveryProviderRequest = {
        name: formValue.name,
        code: formValue.code,
        enabled: formValue.enabled,
        apiKey: formValue.apiKey || undefined,
        apiSecret: formValue.apiSecret || undefined,
        trackingUrlTemplate: formValue.trackingUrlTemplate || undefined,
        priority: formValue.priority
      };

      this.dialogRef.close(request);
    }
  }
}

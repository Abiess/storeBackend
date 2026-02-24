import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService, CustomerProfile } from '../../core/services/customer-profile.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

@Component({
  selector: 'app-customer-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="profile-edit">
      <h2>{{ 'profile.profileData' | translate }}</h2>
      <p class="description">{{ 'profile.managePersonalInfo' | translate }}</p>

      <form (ngSubmit)="saveProfile()" #profileForm="ngForm">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">{{ 'checkout.firstName' | translate }}</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              [(ngModel)]="editProfile.firstName"
              [placeholder]="'profile.firstNamePlaceholder' | translate"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="lastName">{{ 'checkout.lastName' | translate }}</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              [(ngModel)]="editProfile.lastName"
              [placeholder]="'profile.lastNamePlaceholder' | translate"
              class="form-control"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="email">{{ 'checkout.email' | translate }}</label>
          <input
            type="email"
            id="email"
            name="email"
            [(ngModel)]="editProfile.email"
            readonly
            class="form-control"
            disabled
          />
          <small class="form-hint">{{ 'profile.emailReadonly' | translate }}</small>
        </div>

        <div class="form-group">
          <label for="phone">{{ 'checkout.phone' | translate }}</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            [(ngModel)]="editProfile.phone"
            placeholder="+49 123 456789"
            class="form-control"
          />
        </div>

        <div *ngIf="successMessage" class="alert alert-success">
          ✅ {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          ❌ {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="saving">
            <span *ngIf="!saving">💾 {{ 'common.saveChanges' | translate }}</span>
            <span *ngIf="saving">⏳ {{ 'common.saving' | translate }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .profile-edit {
      max-width: 600px;
    }

    .description {
      color: #666;
      margin-bottom: 30px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 15px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-control:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      margin-top: 6px;
      font-size: 13px;
      color: #999;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
    }

    .form-actions {
      margin-top: 30px;
    }

    @media (max-width: 576px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CustomerProfileEditComponent implements OnInit, OnChanges {
  @Input() profile: CustomerProfile | null = null;
  @Output() profileUpdated = new EventEmitter<CustomerProfile>();

  editProfile: Partial<CustomerProfile> = {};
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private customerService: CustomerProfileService) {}

  ngOnInit(): void {
    if (this.profile) {
      this.editProfile = { ...this.profile };
    }
  }

  ngOnChanges(): void {
    if (this.profile) {
      this.editProfile = { ...this.profile };
    }
  }

  saveProfile(): void {
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.customerService.updateProfile(this.editProfile).subscribe({
      next: (updatedProfile) => {
        this.saving = false;
        this.successMessage = 'Profil erfolgreich aktualisiert!';
        this.profileUpdated.emit(updatedProfile);

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error.error?.message || 'Fehler beim Speichern der Profildaten';
        console.error('❌ Fehler beim Speichern:', error);
      }
    });
  }
}


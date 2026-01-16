import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService, CustomerProfile } from '../../core/services/customer-profile.service';

@Component({
  selector: 'app-customer-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-edit">
      <h2>Profildaten</h2>
      <p class="description">Verwalten Sie Ihre persönlichen Informationen</p>

      <form (ngSubmit)="saveProfile()" #profileForm="ngForm">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">Vorname</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              [(ngModel)]="editProfile.firstName"
              placeholder="Ihr Vorname"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="lastName">Nachname</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              [(ngModel)]="editProfile.lastName"
              placeholder="Ihr Nachname"
              class="form-control"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="email">E-Mail-Adresse</label>
          <input
            type="email"
            id="email"
            name="email"
            [(ngModel)]="editProfile.email"
            readonly
            class="form-control"
            disabled
          />
          <small class="form-hint">Die E-Mail-Adresse kann nicht geändert werden</small>
        </div>

        <div class="form-group">
          <label for="phone">Telefonnummer (optional)</label>
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
            <span *ngIf="!saving">💾 Änderungen speichern</span>
            <span *ngIf="saving">⏳ Wird gespeichert...</span>
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


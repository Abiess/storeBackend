import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerProfileService, CustomerProfile, Address } from '../../core/services/customer-profile.service';

@Component({
  selector: 'app-customer-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="addresses-container">
      <h2>Meine Adressen</h2>
      <p class="description">Verwalten Sie Ihre Liefer- und Rechnungsadressen</p>

      <!-- Lieferadresse -->
      <div class="address-section">
        <div class="section-header">
          <h3>📦 Lieferadresse</h3>
          <button 
            type="button" 
            class="btn-edit"
            *ngIf="!editingShipping"
            (click)="startEditShipping()">
            ✏️ Bearbeiten
          </button>
        </div>

        <div *ngIf="!editingShipping && profile?.defaultShippingAddress" class="address-display">
          <p><strong>{{ profile?.defaultShippingAddress?.firstName }} {{ profile?.defaultShippingAddress?.lastName }}</strong></p>
          <p>{{ profile?.defaultShippingAddress?.address1 }}</p>
          <p *ngIf="profile?.defaultShippingAddress?.address2">{{ profile?.defaultShippingAddress?.address2 }}</p>
          <p>{{ profile?.defaultShippingAddress?.postalCode }} {{ profile?.defaultShippingAddress?.city }}</p>
          <p>{{ profile?.defaultShippingAddress?.country }}</p>
          <p *ngIf="profile?.defaultShippingAddress?.phone">Tel: {{ profile?.defaultShippingAddress?.phone }}</p>
        </div>

        <div *ngIf="!editingShipping && !profile?.defaultShippingAddress" class="no-address">
          <p>Keine Lieferadresse hinterlegt</p>
          <button type="button" class="btn-secondary" (click)="startEditShipping()">
            ➕ Adresse hinzufügen
          </button>
        </div>

        <form *ngIf="editingShipping" (ngSubmit)="saveShippingAddress()" #shippingForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label>Vorname *</label>
              <input
                type="text"
                name="shippingFirstName"
                [(ngModel)]="shippingAddress.firstName"
                required
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Nachname *</label>
              <input
                type="text"
                name="shippingLastName"
                [(ngModel)]="shippingAddress.lastName"
                required
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Straße und Hausnummer *</label>
            <input
              type="text"
              name="shippingAddress1"
              [(ngModel)]="shippingAddress.address1"
              required
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Adresszusatz (optional)</label>
            <input
              type="text"
              name="shippingAddress2"
              [(ngModel)]="shippingAddress.address2"
              class="form-control"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>PLZ *</label>
              <input
                type="text"
                name="shippingPostalCode"
                [(ngModel)]="shippingAddress.postalCode"
                required
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Stadt *</label>
              <input
                type="text"
                name="shippingCity"
                [(ngModel)]="shippingAddress.city"
                required
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Land *</label>
            <select
              name="shippingCountry"
              [(ngModel)]="shippingAddress.country"
              required
              class="form-control"
            >
              <option value="Deutschland">Deutschland</option>
              <option value="Österreich">Österreich</option>
              <option value="Schweiz">Schweiz</option>
              <option value="Niederlande">Niederlande</option>
              <option value="Belgien">Belgien</option>
              <option value="Frankreich">Frankreich</option>
            </select>
          </div>

          <div class="form-group">
            <label>Telefon (optional)</label>
            <input
              type="tel"
              name="shippingPhone"
              [(ngModel)]="shippingAddress.phone"
              class="form-control"
            />
          </div>

          <div *ngIf="shippingError" class="alert alert-error">
            ❌ {{ shippingError }}
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="!shippingForm.valid || savingShipping">
              <span *ngIf="!savingShipping">💾 Speichern</span>
              <span *ngIf="savingShipping">⏳ Wird gespeichert...</span>
            </button>
            <button type="button" class="btn-secondary" (click)="cancelEditShipping()">
              Abbrechen
            </button>
          </div>
        </form>
      </div>

      <!-- Rechnungsadresse -->
      <div class="address-section">
        <div class="section-header">
          <h3>📄 Rechnungsadresse</h3>
          <button 
            type="button" 
            class="btn-edit"
            *ngIf="!editingBilling"
            (click)="startEditBilling()">
            ✏️ Bearbeiten
          </button>
        </div>

        <div class="copy-address" *ngIf="editingBilling">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="useSameAddress"
              (change)="onUseSameAddressChange()"
            />
            <span>Rechnungsadresse entspricht Lieferadresse</span>
          </label>
        </div>

        <div *ngIf="!editingBilling && profile?.defaultBillingAddress" class="address-display">
          <p><strong>{{ profile?.defaultBillingAddress?.firstName }} {{ profile?.defaultBillingAddress?.lastName }}</strong></p>
          <p>{{ profile?.defaultBillingAddress?.address1 }}</p>
          <p *ngIf="profile?.defaultBillingAddress?.address2">{{ profile?.defaultBillingAddress?.address2 }}</p>
          <p>{{ profile?.defaultBillingAddress?.postalCode }} {{ profile?.defaultBillingAddress?.city }}</p>
          <p>{{ profile?.defaultBillingAddress?.country }}</p>
        </div>

        <div *ngIf="!editingBilling && !profile?.defaultBillingAddress" class="no-address">
          <p>Keine Rechnungsadresse hinterlegt</p>
          <button type="button" class="btn-secondary" (click)="startEditBilling()">
            ➕ Adresse hinzufügen
          </button>
        </div>

        <form *ngIf="editingBilling && !useSameAddress" (ngSubmit)="saveBillingAddress()" #billingForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label>Vorname *</label>
              <input
                type="text"
                name="billingFirstName"
                [(ngModel)]="billingAddress.firstName"
                required
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Nachname *</label>
              <input
                type="text"
                name="billingLastName"
                [(ngModel)]="billingAddress.lastName"
                required
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Straße und Hausnummer *</label>
            <input
              type="text"
              name="billingAddress1"
              [(ngModel)]="billingAddress.address1"
              required
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label>Adresszusatz (optional)</label>
            <input
              type="text"
              name="billingAddress2"
              [(ngModel)]="billingAddress.address2"
              class="form-control"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>PLZ *</label>
              <input
                type="text"
                name="billingPostalCode"
                [(ngModel)]="billingAddress.postalCode"
                required
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Stadt *</label>
              <input
                type="text"
                name="billingCity"
                [(ngModel)]="billingAddress.city"
                required
                class="form-control"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Land *</label>
            <select
              name="billingCountry"
              [(ngModel)]="billingAddress.country"
              required
              class="form-control"
            >
              <option value="Deutschland">Deutschland</option>
              <option value="Österreich">Österreich</option>
              <option value="Schweiz">Schweiz</option>
              <option value="Niederlande">Niederlande</option>
              <option value="Belgien">Belgien</option>
              <option value="Frankreich">Frankreich</option>
            </select>
          </div>

          <div *ngIf="billingError" class="alert alert-error">
            ❌ {{ billingError }}
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="!billingForm.valid || savingBilling">
              <span *ngIf="!savingBilling">💾 Speichern</span>
              <span *ngIf="savingBilling">⏳ Wird gespeichert...</span>
            </button>
            <button type="button" class="btn-secondary" (click)="cancelEditBilling()">
              Abbrechen
            </button>
          </div>
        </form>

        <div *ngIf="editingBilling && useSameAddress" class="form-actions">
          <button type="button" class="btn-primary" (click)="saveBillingAddress()" [disabled]="savingBilling">
            <span *ngIf="!savingBilling">💾 Speichern</span>
            <span *ngIf="savingBilling">⏳ Wird gespeichert...</span>
          </button>
          <button type="button" class="btn-secondary" (click)="cancelEditBilling()">
            Abbrechen
          </button>
        </div>
      </div>

      <div *ngIf="successMessage" class="alert alert-success">
        ✅ {{ successMessage }}
      </div>
    </div>
  `,
  styles: [`
    .addresses-container {
      max-width: 800px;
    }

    .description {
      color: #666;
      margin-bottom: 30px;
    }

    .address-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h3 {
      margin: 0;
      color: #333;
    }

    .btn-edit {
      padding: 8px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    .btn-edit:hover {
      background: #5568d3;
    }

    .address-display {
      background: white;
      padding: 20px;
      border-radius: 8px;
      line-height: 1.6;
    }

    .address-display p {
      margin: 4px 0;
      color: #333;
    }

    .no-address {
      text-align: center;
      padding: 30px;
      color: #666;
    }

    .copy-address {
      margin-bottom: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 15px;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
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
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    @media (max-width: 576px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }
  `]
})
export class CustomerAddressesComponent {
  @Input() profile: CustomerProfile | null = null;
  @Output() addressUpdated = new EventEmitter<void>();

  editingShipping = false;
  editingBilling = false;
  useSameAddress = false;

  shippingAddress: Address = this.getEmptyAddress();
  billingAddress: Address = this.getEmptyAddress();

  savingShipping = false;
  savingBilling = false;
  shippingError = '';
  billingError = '';
  successMessage = '';

  constructor(private customerService: CustomerProfileService) {}

  getEmptyAddress(): Address {
    return {
      firstName: '',
      lastName: '',
      address1: '',
      address2: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
      phone: ''
    };
  }

  startEditShipping(): void {
    this.editingShipping = true;
    this.shippingAddress = this.profile?.defaultShippingAddress
      ? { ...this.profile.defaultShippingAddress }
      : this.getEmptyAddress();
  }

  cancelEditShipping(): void {
    this.editingShipping = false;
    this.shippingError = '';
  }

  saveShippingAddress(): void {
    this.savingShipping = true;
    this.shippingError = '';

    // FIXED: Sende als SaveAddressRequest Objekt
    this.customerService.saveAddress({
      shippingAddress: this.shippingAddress
    }).subscribe({
      next: () => {
        this.savingShipping = false;
        this.editingShipping = false;
        this.successMessage = 'Lieferadresse erfolgreich gespeichert!';
        this.addressUpdated.emit();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.savingShipping = false;
        this.shippingError = error.error?.message || 'Fehler beim Speichern der Lieferadresse';
      }
    });
  }

  startEditBilling(): void {
    this.editingBilling = true;
    this.billingAddress = this.profile?.defaultBillingAddress
      ? { ...this.profile.defaultBillingAddress }
      : this.getEmptyAddress();
  }

  cancelEditBilling(): void {
    this.editingBilling = false;
    this.useSameAddress = false;
    this.billingError = '';
  }

  onUseSameAddressChange(): void {
    if (this.useSameAddress && this.profile?.defaultShippingAddress) {
      this.billingAddress = { ...this.profile.defaultShippingAddress };
    }
  }

  saveBillingAddress(): void {
    if (this.useSameAddress && this.profile?.defaultShippingAddress) {
      this.billingAddress = { ...this.profile.defaultShippingAddress };
    }

    this.savingBilling = true;
    this.billingError = '';

    // FIXED: Sende als SaveAddressRequest Objekt
    this.customerService.saveAddress({
      billingAddress: this.billingAddress
    }).subscribe({
      next: () => {
        this.savingBilling = false;
        this.editingBilling = false;
        this.useSameAddress = false;
        this.successMessage = 'Rechnungsadresse erfolgreich gespeichert!';
        this.addressUpdated.emit();

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.savingBilling = false;
        this.billingError = error.error?.message || 'Fehler beim Speichern der Rechnungsadresse';
      }
    });
  }
}

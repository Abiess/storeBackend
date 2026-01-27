import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressBookService, CustomerAddress } from '../../core/services/address-book.service';

@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="address-book">
      <div class="header">
        <h2>Adressbuch</h2>
        <button class="btn btn-primary" (click)="showAddressForm = true">
          <i class="icon-plus"></i> Neue Adresse hinzufügen
        </button>
      </div>

     
      <div class="address-form-modal" *ngIf="showAddressForm">
        <div class="modal-content">
          <h3>{{ editingAddress ? 'Adresse bearbeiten' : 'Neue Adresse' }}</h3>
          <form (ngSubmit)="saveAddress()">
            <div class="form-row">
              <div class="form-group">
                <label>Adresstyp *</label>
                <select [(ngModel)]="currentAddress.addressType" name="addressType" required>
                  <option value="SHIPPING">Lieferadresse</option>
                  <option value="BILLING">Rechnungsadresse</option>
                  <option value="BOTH">Beides</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Vorname *</label>
                <input type="text" [(ngModel)]="currentAddress.firstName" name="firstName" required>
              </div>
              <div class="form-group">
                <label>Nachname *</label>
                <input type="text" [(ngModel)]="currentAddress.lastName" name="lastName" required>
              </div>
            </div>
            <div class="form-group">
              <label>Firma</label>
              <input type="text" [(ngModel)]="currentAddress.company" name="company">
            </div>
            <div class="form-group">
              <label>Straße und Hausnummer *</label>
              <input type="text" [(ngModel)]="currentAddress.street" name="street" required>
            </div>
            <div class="form-group">
              <label>Adresszusatz</label>
              <input type="text" [(ngModel)]="currentAddress.street2" name="street2">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>PLZ *</label>
                <input type="text" [(ngModel)]="currentAddress.postalCode" name="postalCode" required>
              </div>
              <div class="form-group">
                <label>Stadt *</label>
                <input type="text" [(ngModel)]="currentAddress.city" name="city" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Bundesland</label>
                <input type="text" [(ngModel)]="currentAddress.stateProvince" name="stateProvince">
              </div>
              <div class="form-group">
                <label>Land *</label>
                <input type="text" [(ngModel)]="currentAddress.country" name="country" value="DE" required>
              </div>
            </div>
            <div class="form-group">
              <label>Telefon</label>
              <input type="tel" [(ngModel)]="currentAddress.phone" name="phone">
            </div>
            <div class="form-group checkbox">
              <label>
                <input type="checkbox" [(ngModel)]="currentAddress.isDefault" name="isDefault">
                Als Standard-Adresse festlegen
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Abbrechen</button>
              <button type="submit" class="btn btn-primary">Speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Adressen-Liste -->
      <div class="addresses-grid" *ngIf="addresses.length > 0 && !loading; else noAddresses">
        <div class="address-card" *ngFor="let address of addresses">
          <div class="address-type">
            <span class="type-badge">{{ getAddressTypeLabel(address.addressType) }}</span>
            <span class="default-badge" *ngIf="address.isDefault">★ Standard</span>
          </div>
          <div class="address-details">
            <p><strong>{{ address.firstName }} {{ address.lastName }}</strong></p>
            <p *ngIf="address.company">{{ address.company }}</p>
            <p>{{ address.street }}</p>
            <p *ngIf="address.street2">{{ address.street2 }}</p>
            <p>{{ address.postalCode }} {{ address.city }}</p>
            <p *ngIf="address.stateProvince">{{ address.stateProvince }}</p>
            <p>{{ address.country }}</p>
            <p *ngIf="address.phone">📞 {{ address.phone }}</p>
          </div>
          <div class="address-actions">
            <button class="btn btn-small btn-edit" (click)="editAddress(address)">
              ✏️ Bearbeiten
            </button>
            <button class="btn btn-small btn-default" *ngIf="!address.isDefault" (click)="setDefault(address.id!)">
              ⭐ Als Standard
            </button>
            <button class="btn btn-small btn-delete" (click)="deleteAddress(address.id!)">
              🗑️ Löschen
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="loading">Lädt...</div>

      <ng-template #noAddresses>
        <div class="empty-message" *ngIf="!loading">
          <p>Sie haben noch keine Adressen gespeichert.</p>
          <button class="btn btn-primary" (click)="showAddressForm = true">Erste Adresse hinzufügen</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .address-book {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .addresses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .address-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s;
    }
    .address-card:hover {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
    }
    .address-type {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .type-badge {
      background: #f3f4f6;
      color: #374151;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .default-badge {
      background: #059669;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .address-details {
      margin-bottom: 1.5rem;
      color: #374151;
      line-height: 1.6;
    }
    .address-details p {
      margin: 0.25rem 0;
    }
    .address-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .btn:hover {
      transform: translateY(-1px);
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.813rem;
    }
    .btn-edit {
      background: #3b82f6;
      color: white;
    }
    .btn-default {
      background: #fbbf24;
      color: #78350f;
    }
    .btn-delete {
      background: #ef4444;
      color: white;
    }
    .address-form-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-group.checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .form-group.checkbox input {
      width: auto;
    }
    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      justify-content: flex-end;
    }
    .empty-message {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }
    .loading {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }
  `]
})
export class AddressBookComponent implements OnInit {
  addresses: CustomerAddress[] = [];
  loading = false;
  showAddressForm = false;
  editingAddress: CustomerAddress | null = null;
  currentAddress: CustomerAddress = this.getEmptyAddress();

  constructor(private addressService: AddressBookService) {}

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses(): void {
    this.loading = true;
    this.addressService.getAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Adressen:', error);
        this.loading = false;
      }
    });
  }

  saveAddress(): void {
    if (this.editingAddress && this.editingAddress.id) {
      this.addressService.updateAddress(this.editingAddress.id, this.currentAddress).subscribe({
        next: () => {
          this.loadAddresses();
          this.cancelEdit();
        },
        error: (error) => console.error('Fehler beim Aktualisieren:', error)
      });
    } else {
      this.addressService.createAddress(this.currentAddress).subscribe({
        next: () => {
          this.loadAddresses();
          this.cancelEdit();
        },
        error: (error) => console.error('Fehler beim Erstellen:', error)
      });
    }
  }

  editAddress(address: CustomerAddress): void {
    this.editingAddress = address;
    this.currentAddress = { ...address };
    this.showAddressForm = true;
  }

  deleteAddress(id: number): void {
    if (confirm('Möchten Sie diese Adresse wirklich löschen?')) {
      this.addressService.deleteAddress(id).subscribe({
        next: () => this.loadAddresses(),
        error: (error) => console.error('Fehler beim Löschen:', error)
      });
    }
  }

  setDefault(id: number): void {
    this.addressService.setAsDefault(id).subscribe({
      next: () => this.loadAddresses(),
      error: (error) => console.error('Fehler beim Setzen als Standard:', error)
    });
  }

  cancelEdit(): void {
    this.showAddressForm = false;
    this.editingAddress = null;
    this.currentAddress = this.getEmptyAddress();
  }

  getAddressTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'SHIPPING': 'Lieferadresse',
      'BILLING': 'Rechnungsadresse',
      'BOTH': 'Liefer- & Rechnungsadresse'
    };
    return labels[type] || type;
  }

  private getEmptyAddress(): CustomerAddress {
    return {
      addressType: 'SHIPPING',
      firstName: '',
      lastName: '',
      street: '',
      city: '',
      postalCode: '',
      country: 'DE',
      isDefault: false
    };
  }
}

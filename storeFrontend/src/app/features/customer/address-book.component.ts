import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Address {
  id: number;
  type: 'billing' | 'shipping';
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="address-book">
      <div class="header">
        <h2>Adressbuch</h2>
        <button class="btn btn-primary" (click)="addNewAddress()">
          Neue Adresse hinzufügen
        </button>
      </div>
      <div class="addresses-grid" *ngIf="addresses.length > 0; else noAddresses">
        <div class="address-card" *ngFor="let address of addresses">
          <div class="address-type">
            {{address.type === 'billing' ? 'Rechnungsadresse' : 'Lieferadresse'}}
            <span class="default-badge" *ngIf="address.isDefault">Standard</span>
          </div>
          <div class="address-details">
            <p><strong>{{address.firstName}} {{address.lastName}}</strong></p>
            <p>{{address.street}}</p>
            <p>{{address.postalCode}} {{address.city}}</p>
            <p>{{address.country}}</p>
          </div>
          <div class="address-actions">
            <button class="btn btn-small" (click)="editAddress(address.id)">
              Bearbeiten
            </button>
            <button class="btn btn-small" (click)="deleteAddress(address.id)">
              Löschen
            </button>
            <button class="btn btn-small" *ngIf="!address.isDefault" (click)="setDefault(address.id)">
              Als Standard festlegen
            </button>
          </div>
        </div>
      </div>
      <ng-template #noAddresses>
        <p class="empty-message">Sie haben noch keine Adressen gespeichert.</p>
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
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .address-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .address-type {
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .default-badge {
      background: #059669;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .address-details {
      margin-bottom: 1rem;
      color: #374151;
    }
    .address-details p {
      margin: 0.25rem 0;
    }
    .address-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
    .btn-small {
      background: #e5e7eb;
      color: #374151;
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
    .empty-message {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
  `]
})
export class AddressBookComponent implements OnInit {
  addresses: Address[] = [];

  ngOnInit() {
    this.loadAddresses();
  }

  loadAddresses() {
    // TODO: Load from service
    this.addresses = [];
  }

  addNewAddress() {
    // TODO: Open dialog/form to add new address
    console.log('Add new address');
  }

  editAddress(id: number) {
    // TODO: Open dialog/form to edit address
    console.log('Edit address:', id);
  }

  deleteAddress(id: number) {
    // TODO: Implement delete address
    this.addresses = this.addresses.filter(addr => addr.id !== id);
  }

  setDefault(id: number) {
    // TODO: Set address as default
    this.addresses = this.addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }));
  }
}


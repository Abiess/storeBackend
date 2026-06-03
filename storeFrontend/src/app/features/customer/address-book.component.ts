import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AddressBookService, CustomerAddress } from '@app/core/services/address-book.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="address-page">
      <!-- Header -->
      <div class="page-top">
        <a routerLink="/customer" class="back-link">← Mein Konto</a>
        <h1>📍 Adressbuch</h1>
        <p class="subtitle">Ihre gespeicherten Liefer- und Rechnungsadressen</p>
      </div>

      <!-- Add Button -->
      @if (!showForm) {
        <button class="btn btn-primary btn-add" (click)="openAddForm()">
          + Neue Adresse hinzufügen
        </button>
      }

      <!-- Add / Edit Form -->
      @if (showForm) {
        <div class="form-card">
          <div class="form-card-header">
            <h2>{{ editingAddress ? 'Adresse bearbeiten' : 'Neue Adresse' }}</h2>
            <button class="close-form" (click)="cancelEdit()">✕</button>
          </div>

          <form (ngSubmit)="saveAddress()" #addrForm="ngForm" class="addr-form">
            <!-- Typ -->
            <div class="form-row">
              <div class="form-group">
                <label>Adresstyp *</label>
                <select [(ngModel)]="currentAddress.addressType" name="addressType" required class="form-control">
                  <option value="SHIPPING">🚚 Lieferadresse</option>
                  <option value="BILLING">💳 Rechnungsadresse</option>
                  <option value="BOTH">📦 Beides</option>
                </select>
              </div>
              <div class="form-group form-group--check">
                <label class="check-label">
                  <input type="checkbox" [(ngModel)]="currentAddress.isDefault" name="isDefault">
                  <span>Als Standardadresse festlegen</span>
                </label>
              </div>
            </div>

            <!-- Name -->
            <div class="form-row">
              <div class="form-group">
                <label>Vorname *</label>
                <input type="text" [(ngModel)]="currentAddress.firstName" name="firstName"
                       placeholder="Max" required class="form-control">
              </div>
              <div class="form-group">
                <label>Nachname *</label>
                <input type="text" [(ngModel)]="currentAddress.lastName" name="lastName"
                       placeholder="Mustermann" required class="form-control">
              </div>
            </div>

            <!-- Firma -->
            <div class="form-group">
              <label>Firma (optional)</label>
              <input type="text" [(ngModel)]="currentAddress.company" name="company"
                     placeholder="Musterfirma GmbH" class="form-control">
            </div>

            <!-- Straße -->
            <div class="form-group">
              <label>Straße und Hausnummer *</label>
              <input type="text" [(ngModel)]="currentAddress.street" name="street"
                     placeholder="Musterstraße 12" required class="form-control">
            </div>

            <!-- Adresszusatz -->
            <div class="form-group">
              <label>Adresszusatz</label>
              <input type="text" [(ngModel)]="currentAddress.street2" name="street2"
                     placeholder="Wohnung, Etage, c/o..." class="form-control">
            </div>

            <!-- PLZ / Stadt -->
            <div class="form-row">
              <div class="form-group">
                <label>PLZ *</label>
                <input type="text" [(ngModel)]="currentAddress.postalCode" name="postalCode"
                       placeholder="12345" required class="form-control" maxlength="10">
              </div>
              <div class="form-group">
                <label>Stadt *</label>
                <input type="text" [(ngModel)]="currentAddress.city" name="city"
                       placeholder="Berlin" required class="form-control">
              </div>
            </div>

            <!-- Bundesland / Land -->
            <div class="form-row">
              <div class="form-group">
                <label>Bundesland</label>
                <input type="text" [(ngModel)]="currentAddress.stateProvince" name="state"
                       placeholder="Bayern" class="form-control">
              </div>
              <div class="form-group">
                <label>Land *</label>
                <select [(ngModel)]="currentAddress.country" name="country" required class="form-control">
                  <option value="DE">🇩🇪 Deutschland</option>
                  <option value="AT">🇦🇹 Österreich</option>
                  <option value="CH">🇨🇭 Schweiz</option>
                  <option value="MA">🇲🇦 Marokko</option>
                  <option value="FR">🇫🇷 Frankreich</option>
                  <option value="NL">🇳🇱 Niederlande</option>
                  <option value="BE">🇧🇪 Belgien</option>
                </select>
              </div>
            </div>

            <!-- Telefon -->
            <div class="form-group">
              <label>Telefon</label>
              <input type="tel" [(ngModel)]="currentAddress.phone" name="phone"
                     placeholder="+49 123 456789" class="form-control">
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Abbrechen</button>
              <button type="submit" class="btn btn-primary" [disabled]="!addrForm.valid || saving">
                {{ saving ? 'Wird gespeichert...' : (editingAddress ? '✓ Aktualisieren' : '+ Hinzufügen') }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Loading -->
      @if (loading) {
        <div class="loading-grid">
          @for (i of [1,2]; track i) {
            <div class="skeleton-card"></div>
          }
        </div>
      }

      <!-- Addresses Grid -->
      @if (!loading && addresses.length > 0) {
        <div class="addresses-grid">
          @for (address of addresses; track address.id) {
            <div class="address-card" [class.address-card--default]="address.isDefault">
              <div class="card-header">
                <div class="card-badges">
                  <span class="type-badge" [class]="'type-' + address.addressType.toLowerCase()">
                    {{ getTypeIcon(address.addressType) }} {{ getAddressTypeLabel(address.addressType) }}
                  </span>
                  @if (address.isDefault) {
                    <span class="default-badge">★ Standard</span>
                  }
                </div>
                <div class="card-actions">
                  <button class="icon-btn" (click)="editAddress(address)" title="Bearbeiten">✏️</button>
                  <button class="icon-btn icon-btn--danger" (click)="deleteAddress(address)" title="Löschen">🗑️</button>
                </div>
              </div>

              <div class="card-body">
                <div class="addr-name">
                  <strong>{{ address.firstName }} {{ address.lastName }}</strong>
                  @if (address.company) {
                    <span class="company">{{ address.company }}</span>
                  }
                </div>
                <div class="addr-lines">
                  <p>{{ address.street }}</p>
                  @if (address.street2) { <p>{{ address.street2 }}</p> }
                  <p>{{ address.postalCode }} {{ address.city }}</p>
                  @if (address.stateProvince) { <p>{{ address.stateProvince }}</p> }
                  <p>{{ getCountryName(address.country) }}</p>
                  @if (address.phone) { <p>📞 {{ address.phone }}</p> }
                </div>
              </div>

              @if (!address.isDefault) {
                <div class="card-footer">
                  <button class="btn-set-default" (click)="setDefault(address)">
                    Als Standard festlegen
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && addresses.length === 0 && !showForm) {
        <div class="empty-state">
          <div class="empty-icon">📍</div>
          <h3>Noch keine Adressen gespeichert</h3>
          <p>Fügen Sie eine Lieferadresse hinzu, um beim Checkout Zeit zu sparen.</p>
          <button class="btn btn-primary" (click)="openAddForm()">+ Erste Adresse hinzufügen</button>
        </div>
      }

      <!-- Toast -->
      @if (toast) {
        <div class="toast" [class.toast--success]="toast.type === 'success'" [class.toast--error]="toast.type === 'error'">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .address-page { padding: 2rem; max-width: 1000px; margin: 0 auto; min-height: 100vh; }

    .page-top { margin-bottom: 1.5rem; }
    .back-link { color: #667eea; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
    .back-link:hover { text-decoration: underline; }
    .page-top h1 { margin: 0.75rem 0 0.25rem; font-size: 1.75rem; font-weight: 800; color: #1f2937; }
    .subtitle { margin: 0; color: #6b7280; }

    .btn-add { margin-bottom: 1.5rem; }

    /* Form Card */
    .form-card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 2rem; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .form-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.75rem; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #667eea08, #764ba208); }
    .form-card-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
    .close-form { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #6b7280; padding: 0.25rem; }

    .addr-form { padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.8rem; font-weight: 600; color: #374151; }
    .form-control { padding: 0.65rem 0.9rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; transition: all 0.2s; background: white; }
    .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .form-group--check { justify-content: flex-end; }
    .check-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; color: #374151; font-weight: 500; }
    .check-label input { width: 18px; height: 18px; accent-color: #667eea; }

    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 0.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }

    /* Buttons */
    .btn { padding: 0.65rem 1.5rem; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.35); }
    .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }

    /* Loading */
    .loading-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .skeleton-card { height: 200px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Addresses Grid */
    .addresses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .address-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.2s; }
    .address-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .address-card--default { border-color: #667eea; border-width: 2px; }

    .card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.875rem 1.25rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .card-badges { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .type-badge { padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .type-shipping { background: #d1fae5; color: #065f46; }
    .type-billing { background: #dbeafe; color: #1e40af; }
    .type-both { background: #ede9fe; color: #5b21b6; }
    .default-badge { background: #fef3c7; color: #92400e; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
    .card-actions { display: flex; gap: 0.5rem; }
    .icon-btn { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; border-radius: 4px; transition: background 0.2s; }
    .icon-btn:hover { background: #f3f4f6; }
    .icon-btn--danger:hover { background: #fee2e2; }

    .card-body { padding: 1.25rem; }
    .addr-name strong { font-size: 1rem; color: #1f2937; display: block; }
    .company { font-size: 0.85rem; color: #6b7280; display: block; margin-top: 0.2rem; }
    .addr-lines { margin-top: 0.75rem; }
    .addr-lines p { margin: 0.2rem 0; font-size: 0.875rem; color: #374151; }

    .card-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #f3f4f6; }
    .btn-set-default { background: none; border: none; color: #667eea; cursor: pointer; font-size: 0.8rem; font-weight: 600; padding: 0; }
    .btn-set-default:hover { text-decoration: underline; }

    /* Empty */
    .empty-state { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
    .empty-state h3 { margin: 0 0 0.5rem; color: #1f2937; }
    .empty-state p { color: #6b7280; margin: 0 0 1.5rem; }

    /* Toast */
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; z-index: 9999; animation: slideIn 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .toast--success { background: #10b981; color: white; }
    .toast--error { background: #ef4444; color: white; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    @media (max-width: 768px) {
      .address-page { padding: 1rem; }
      .form-row { grid-template-columns: 1fr; }
      .addresses-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AddressBookComponent implements OnInit {
  addresses: CustomerAddress[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingAddress: CustomerAddress | null = null;

  currentAddress: CustomerAddress = this.emptyAddress();
  toast: { message: string; type: 'success' | 'error' } | null = null;

  constructor(
    private addressService: AddressBookService
  ) {}

  ngOnInit(): void {
    this.loadAddresses();
  }

  private emptyAddress(): CustomerAddress {
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

  loadAddresses(): void {
    this.loading = true;
    this.addressService.getAddresses()
      .pipe(catchError(() => of([])))
      .subscribe(list => {
        this.addresses = list;
        this.loading = false;
      });
  }

  openAddForm(): void {
    this.editingAddress = null;
    this.currentAddress = this.emptyAddress();
    this.showForm = true;
  }

  editAddress(address: CustomerAddress): void {
    this.editingAddress = address;
    this.currentAddress = { ...address };
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingAddress = null;
    this.currentAddress = this.emptyAddress();
  }

  saveAddress(): void {
    this.saving = true;
    const obs = this.editingAddress && this.editingAddress.id
      ? this.addressService.updateAddress(this.editingAddress.id, this.currentAddress)
      : this.addressService.createAddress(this.currentAddress);

    obs.pipe(catchError(() => {
      this.showToast('Fehler beim Speichern der Adresse', 'error');
      this.saving = false;
      return of(null);
    })).subscribe(saved => {
      if (saved) {
        this.loadAddresses();
        this.cancelEdit();
        this.showToast(this.editingAddress ? 'Adresse aktualisiert' : 'Adresse hinzugefügt', 'success');
      }
      this.saving = false;
    });
  }

  deleteAddress(address: CustomerAddress): void {
    if (!address.id || !confirm('Adresse wirklich löschen?')) return;
    this.addressService.deleteAddress(address.id)
      .pipe(catchError(() => {
        this.showToast('Fehler beim Löschen', 'error');
        return of(null);
      }))
      .subscribe(() => {
        this.addresses = this.addresses.filter(a => a.id !== address.id);
        this.showToast('Adresse gelöscht', 'success');
      });
  }

  setDefault(address: CustomerAddress): void {
    if (!address.id) return;
    this.addressService.setAsDefault(address.id)
      .pipe(catchError(() => {
        this.showToast('Fehler', 'error');
        return of(null);
      }))
      .subscribe(() => {
        this.addresses = this.addresses.map(a => ({ ...a, isDefault: a.id === address.id }));
        this.showToast('Standardadresse gesetzt', 'success');
      });
  }

  getAddressTypeLabel(type: string): string {
    const map: Record<string, string> = { SHIPPING: 'Lieferadresse', BILLING: 'Rechnungsadresse', BOTH: 'Liefer- & Rechnungsadresse' };
    return map[type] ?? type;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = { SHIPPING: '🚚', BILLING: '💳', BOTH: '📦' };
    return map[type] ?? '📍';
  }

  getCountryName(code: string): string {
    const map: Record<string, string> = {
      DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz',
      MA: 'Marokko', FR: 'Frankreich', NL: 'Niederlande', BE: 'Belgien'
    };
    return map[code] ?? code;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => this.toast = null, 3500);
  }
}

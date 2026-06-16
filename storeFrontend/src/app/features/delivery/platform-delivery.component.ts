import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminSidebarComponent } from '@app/shared/components/admin-sidebar/admin-sidebar.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { ToastService } from '@app/core/services/toast.service';
import {
  ResponsiveDataListComponent,
  ColumnConfig,
  ActionConfig
} from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import {
  PlatformDeliveryService,
  GlobalDeliveryOption
} from '@app/core/services/platform-delivery.service';

@Component({
  selector: 'app-platform-delivery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSidebarComponent,
    PageHeaderComponent,
    ResponsiveDataListComponent
  ],
  template: `
    <app-admin-sidebar></app-admin-sidebar>

    <div class="platform-delivery-page">
      <app-page-header
        title="🚚 Lieferoptionen verwalten"
        subtitle="Plattformweite Lieferoptionen – automatisch in allen Storefronts angezeigt"
        [showBackButton]="false"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Info-Banner -->
      <div class="info-banner">
        <span class="info-icon">💡</span>
        <div class="info-text">
          <strong>Wie es funktioniert:</strong>
          Hier definierst du die Lieferoptionen, die Kunden im Checkout aller Stores sehen.
          Store-Manager sehen diese Einstellungen nicht und können sie nicht ändern.
          Aktive Optionen erscheinen sofort im Storefront.
        </div>
      </div>

      <!-- Daten-Liste -->
      <app-responsive-data-list
        [items]="options"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [rowClickable]="false"
        emptyIcon="🚚"
        emptyMessage="Noch keine Lieferoptionen. Füge jetzt die erste hinzu!"
        searchPlaceholder="Lieferoption suchen..."
      ></app-responsive-data-list>

      <!-- Formular-Modal -->
      <div *ngIf="showForm" class="modal-overlay" (click)="closeForm()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingOption ? '✏️ Lieferoption bearbeiten' : '➕ Neue Lieferoption' }}</h3>
            <button class="btn-close" (click)="closeForm()">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>Name <span class="req">*</span></label>
                <input type="text" [(ngModel)]="form.name" placeholder="z.B. Standard Lieferung" />
              </div>
              <div class="form-group">
                <label>Typ <span class="req">*</span></label>
                <select [(ngModel)]="form.deliveryType">
                  <option value="PICKUP">📦 Abholung (PICKUP)</option>
                  <option value="STANDARD">🚚 Standard (STANDARD)</option>
                  <option value="EXPRESS">⚡ Express (EXPRESS)</option>
                  <option value="SAME_DAY">🔥 Same Day (SAME_DAY)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Beschreibung</label>
              <textarea [(ngModel)]="form.description" rows="2"
                placeholder="Kurze Beschreibung für den Kunden"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Preis (MAD) <span class="req">*</span></label>
                <input type="number" [(ngModel)]="form.price" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div class="form-group">
                <label>Icon / Emoji</label>
                <input type="text" [(ngModel)]="form.icon" placeholder="🚚" maxlength="4" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Lieferzeit min. (Tage)</label>
                <input type="number" [(ngModel)]="form.etaMinDays" min="0" placeholder="1" />
              </div>
              <div class="form-group">
                <label>Lieferzeit max. (Tage)</label>
                <input type="number" [(ngModel)]="form.etaMaxDays" min="0" placeholder="3" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Reihenfolge</label>
                <input type="number" [(ngModel)]="form.sortOrder" min="0" placeholder="100" />
              </div>
              <div class="form-group toggle-group">
                <label>Aktiv (im Storefront sichtbar)</label>
                <label class="toggle">
                  <input type="checkbox" [(ngModel)]="form.isActive" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeForm()">Abbrechen</button>
            <button class="btn btn-primary" (click)="saveOption()" [disabled]="saving">
              {{ saving ? '⏳ Speichern...' : (editingOption ? '💾 Aktualisieren' : '➕ Erstellen') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .platform-delivery-page {
      margin-left: 260px;
      padding: 24px;
      min-height: 100vh;
      background: #f8f9fa;
    }

    @media (max-width: 1024px) {
      .platform-delivery-page { margin-left: 0; }
    }

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: linear-gradient(135deg, #667eea15, #764ba215);
      border: 1px solid #667eea40;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .info-icon { font-size: 22px; flex-shrink: 0; }
    .info-text { font-size: 14px; color: #444; line-height: 1.5; }
    .info-text strong { color: #667eea; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card {
      background: white; border-radius: 16px; width: 560px; max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #eee;
    }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .btn-close {
      background: none; border: none; font-size: 18px; cursor: pointer;
      color: #888; line-height: 1;
      &:hover { color: #333; }
    }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .modal-footer {
      padding: 16px 24px; border-top: 1px solid #eee;
      display: flex; justify-content: flex-end; gap: 10px;
    }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 500; color: #555; }
    .req { color: #e74c3c; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; outline: none;
      &:focus { border-color: #667eea; box-shadow: 0 0 0 3px #667eea20; }
    }

    .toggle-group { align-items: flex-start; }
    .toggle { display: flex; align-items: center; cursor: pointer; position: relative; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .slider {
      width: 44px; height: 24px; background: #ccc; border-radius: 24px;
      position: relative; transition: background .2s;
      &::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 20px; height: 20px; background: white; border-radius: 50%;
        transition: transform .2s;
      }
    }
    .toggle input:checked + .slider { background: #667eea; }
    .toggle input:checked + .slider::after { transform: translateX(20px); }

    .btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
    .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline { background: white; border: 1px solid #ddd; color: #555; }
  `]
})
export class PlatformDeliveryComponent implements OnInit, OnDestroy {

  options: GlobalDeliveryOption[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingOption: GlobalDeliveryOption | null = null;

  form: GlobalDeliveryOption = this.emptyForm();

  headerActions: HeaderAction[] = [
    {
      label: '➕ Neue Lieferoption',
      class: 'btn-primary',
      onClick: () => this.openCreate()
    }
  ];

  columns: ColumnConfig[] = [
    { key: 'icon', label: '', type: 'text', width: '40px' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'deliveryType', label: 'Typ', type: 'badge',
      badgeClass: (v) => v === 'EXPRESS' ? 'status-processing' : v === 'SAME_DAY' ? 'status-active' : 'status-draft' },
    { key: 'price', label: 'Preis', type: 'currency' },
    { key: 'etaMinDays', label: 'Min-Tage', type: 'number', hideOnMobile: true },
    { key: 'etaMaxDays', label: 'Max-Tage', type: 'number', hideOnMobile: true },
    { key: 'sortOrder', label: 'Reihenfolge', type: 'number', hideOnMobile: true },
    {
      key: 'isActive', label: 'Status', type: 'badge',
      badgeClass: (v) => v ? 'status-active' : 'status-inactive',
      formatFn: (v) => v ? 'Aktiv' : 'Inaktiv'
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (item) => this.openEdit(item)
    },
    {
      icon: '🗑️',
      label: 'Löschen',
      class: 'danger',
      handler: (item) => this.deleteOption(item)
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private deliveryService: PlatformDeliveryService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.deliveryService.getAllOptions().pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.options = data; this.loading = false; },
        error: () => { this.toast.error('Fehler beim Laden der Lieferoptionen'); this.loading = false; }
      });
  }

  openCreate(): void {
    this.editingOption = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(option: GlobalDeliveryOption): void {
    this.editingOption = option;
    this.form = { ...option };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingOption = null;
    this.form = this.emptyForm();
  }

  saveOption(): void {
    if (!this.form.name?.trim() || this.form.price == null) {
      this.toast.error('Name und Preis sind Pflichtfelder');
      return;
    }
    this.saving = true;

    const obs = this.editingOption?.id
      ? this.deliveryService.updateOption(this.editingOption.id, this.form)
      : this.deliveryService.createOption(this.form);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success(this.editingOption ? 'Lieferoption aktualisiert!' : 'Lieferoption erstellt!');
        this.saving = false;
        this.closeForm();
        this.load();
      },
      error: () => {
        this.toast.error('Fehler beim Speichern');
        this.saving = false;
      }
    });
  }

  deleteOption(option: GlobalDeliveryOption): void {
    if (!confirm(`Lieferoption "${option.name}" wirklich löschen?`)) return;
    this.deliveryService.deleteOption(option.id!).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toast.success('Lieferoption gelöscht'); this.load(); },
        error: () => this.toast.error('Fehler beim Löschen')
      });
  }

  private emptyForm(): GlobalDeliveryOption {
    return {
      name: '',
      description: '',
      deliveryType: 'STANDARD',
      price: 0,
      etaMinDays: 1,
      etaMaxDays: 3,
      icon: '🚚',
      isActive: true,
      sortOrder: 100
    };
  }
}


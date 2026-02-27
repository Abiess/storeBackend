import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Store } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { StoreSliderEditorComponent } from './components/store-slider-editor.component';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StoreNavigationComponent, TranslatePipe, StoreSliderEditorComponent],
  template: `
    <div class="store-settings-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [storeId]="storeId" 
        [currentPage]="'navigation.settings' | translate">
      </app-store-navigation>

      <div class="settings-content" *ngIf="store">
        <h1>{{ 'navigation.settings' | translate }}</h1>
        
        <div class="settings-tabs">
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'general'"
            (click)="activeTab = 'general'">
            {{ 'settings.general' | translate }}
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'slider'"
            (click)="activeTab = 'slider'">
            🎬 Slider
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'branding'"
            (click)="activeTab = 'branding'">
            {{ 'settings.branding' | translate }}
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'domain'"
            (click)="activeTab = 'domain'">
            {{ 'settings.domain' | translate }}
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'advanced'"
            (click)="activeTab = 'advanced'">
            {{ 'settings.advanced' | translate }}
          </button>
        </div>

        <!-- General Settings -->
        <div class="tab-content" *ngIf="activeTab === 'general'">
          <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
            <div class="form-group">
              <label for="name">Store Name</label>
              <input 
                id="name"
                type="text" 
                formControlName="name" 
                class="form-control"
                placeholder="Mein Store">
            </div>

            <div class="form-group">
              <label for="slug">Store Slug</label>
              <input 
                id="slug"
                type="text" 
                formControlName="slug" 
                class="form-control"
                placeholder="mein-store">
              <small class="form-text">Ihre Store-URL: {{ settingsForm.get('slug')?.value }}.markt.ma</small>
            </div>

            <div class="form-group">
              <label for="description">Beschreibung</label>
              <textarea 
                id="description"
                formControlName="description" 
                class="form-control"
                rows="4"
                placeholder="Beschreiben Sie Ihren Store..."></textarea>
            </div>

            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" formControlName="status" class="form-control">
                <option value="ACTIVE">Aktiv</option>
                <option value="INACTIVE">Inaktiv</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="!settingsForm.valid || saving">
                {{ saving ? 'Speichern...' : 'Einstellungen speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Slider Settings -->
        <div class="tab-content" *ngIf="activeTab === 'slider'">
          <app-store-slider-editor [storeId]="storeId"></app-store-slider-editor>
        </div>

        <!-- Branding Settings -->
        <div class="tab-content" *ngIf="activeTab === 'branding'">
          <form [formGroup]="brandingForm" (ngSubmit)="saveBranding()">
            <div class="form-group">
              <label for="logoUrl">Logo URL</label>
              <input
                id="logoUrl"
                type="text"
                formControlName="logoUrl"
                class="form-control"
                placeholder="https://...">
              <small class="form-text">URL zu Ihrem Store-Logo</small>
            </div>

            <div class="form-group">
              <label for="bannerUrl">Banner URL</label>
              <input
                id="bannerUrl"
                type="text"
                formControlName="bannerUrl"
                class="form-control"
                placeholder="https://...">
              <small class="form-text">URL zu Ihrem Store-Banner</small>
            </div>

            <div class="logo-preview" *ngIf="brandingForm.get('logoUrl')?.value">
              <h4>Logo Vorschau</h4>
              <img [src]="brandingForm.get('logoUrl')?.value" alt="Logo Preview" class="preview-image">
            </div>

            <div class="banner-preview" *ngIf="brandingForm.get('bannerUrl')?.value">
              <h4>Banner Vorschau</h4>
              <img [src]="brandingForm.get('bannerUrl')?.value" alt="Banner Preview" class="preview-banner">
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" [disabled]="!brandingForm.valid || saving">
                {{ saving ? 'Speichern...' : 'Branding speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Domain Settings -->
        <div class="tab-content" *ngIf="activeTab === 'domain'">
          <div class="domain-info">
            <h3>Domain Verwaltung</h3>
            <p>Ihre Store-Domain: <strong>{{ store.slug }}.markt.ma</strong></p>
            <button class="btn btn-secondary" (click)="manageDomains()">
              Domains verwalten
            </button>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div class="tab-content" *ngIf="activeTab === 'advanced'">
          <div class="danger-zone">
            <h3>⚠️ Gefahrenzone</h3>
            <p class="warning-text">Diese Aktionen können nicht rückgängig gemacht werden.</p>

            <div class="danger-action">
              <div class="danger-info">
                <h4>Store löschen</h4>
                <p>Löscht den Store permanent inklusive aller Produkte, Bestellungen und Einstellungen.</p>
              </div>
              <button class="btn btn-danger" (click)="showDeleteModal = true">
                🗑️ Store löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal (Shopify-Style) -->
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="showDeleteModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>⚠️ Store wirklich löschen?</h2>
            <button class="modal-close" (click)="showDeleteModal = false">✕</button>
          </div>

          <div class="modal-body">
            <div class="warning-box">
              <strong>🚨 WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden!</strong>
            </div>

            <p>Folgendes wird <strong>permanent gelöscht</strong>:</p>
            <ul class="deletion-list">
              <li>✓ Alle Produkte und Varianten</li>
              <li>✓ Alle Bestellungen und Kundendaten</li>
              <li>✓ Alle Kategorien und Medien</li>
              <li>✓ Alle Domains und Einstellungen</li>
              <li>✓ Der gesamte Store</li>
            </ul>

            <div class="confirmation-section">
              <label for="confirmInput">
                Geben Sie "<strong>{{ store?.name }}</strong>" ein, um zu bestätigen:
              </label>
              <input
                id="confirmInput"
                type="text"
                [(ngModel)]="deleteConfirmation"
                class="form-control confirmation-input"
                placeholder="Store-Name eingeben"
                [class.error]="deleteConfirmation && deleteConfirmation !== store?.name"
              />
              <small class="helper-text" *ngIf="deleteConfirmation && deleteConfirmation !== store?.name">
                ❌ Der Name stimmt nicht überein
              </small>
              <small class="helper-text success" *ngIf="deleteConfirmation === store?.name">
                ✅ Name korrekt
              </small>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showDeleteModal = false; deleteConfirmation = ''">
              Abbrechen
            </button>
            <button 
              class="btn btn-danger"
              [disabled]="deleteConfirmation !== store?.name || deleting"
              (click)="executeDeleteStore()">
              {{ deleting ? '🗑️ Lösche...' : '🗑️ Endgültig löschen' }}
            </button>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Lade Store-Einstellungen...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .store-settings-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .settings-header {
      margin-bottom: 2rem;
    }

    .back-button {
      background: none;
      border: none;
      color: #007bff;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0;
    }

    .back-button:hover {
      text-decoration: underline;
    }

    h1 {
      font-size: 2rem;
      margin: 0;
    }

    .settings-tabs {
      display: flex;
      gap: 1rem;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 2rem;
    }

    .tab-button {
      background: none;
      border: none;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      cursor: pointer;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;
    }

    .tab-button:hover {
      color: #007bff;
    }

    .tab-button.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .tab-content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .form-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }

    .form-actions {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .logo-preview, .banner-preview {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .logo-preview h4, .banner-preview h4 {
      margin: 0 0 1rem;
      font-size: 1rem;
      color: #666;
    }

    .preview-image {
      max-width: 200px;
      height: auto;
      border-radius: 4px;
    }

    .preview-banner {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }

    .domain-info {
      text-align: center;
      padding: 2rem;
    }

    .domain-info h3 {
      margin: 0 0 1rem;
    }

    .domain-info p {
      margin: 0 0 2rem;
      font-size: 1.1rem;
    }

    .danger-zone {
      padding: 2rem;
      border: 2px solid #fc8181;
      border-radius: 8px;
      background: #fff5f5;
    }

    .danger-zone h3 {
      margin: 0 0 0.5rem;
      color: #c53030;
    }

    .warning-text {
      color: #c53030;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .danger-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: white;
      border-radius: 6px;
      border: 1px solid #fed7d7;
      margin-top: 1rem;
    }

    .danger-info h4 {
      margin: 0 0 0.5rem 0;
      color: #2d3748;
    }

    .danger-info p {
      margin: 0;
      color: #718096;
      font-size: 0.875rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from { 
        transform: translateY(50px);
        opacity: 0;
      }
      to { 
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 {
      margin: 0;
      color: #c53030;
      font-size: 1.5rem;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #718096;
      padding: 0.25rem 0.5rem;
      transition: color 0.2s;
    }

    .modal-close:hover {
      color: #2d3748;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .warning-box {
      background: #fff5f5;
      border-left: 4px solid #fc8181;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 4px;
      color: #c53030;
    }

    .deletion-list {
      background: #f7fafc;
      padding: 1rem 1rem 1rem 2rem;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .deletion-list li {
      padding: 0.5rem 0;
      color: #2d3748;
    }

    .confirmation-section {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #f7fafc;
      border-radius: 8px;
    }

    .confirmation-section label {
      display: block;
      margin-bottom: 0.75rem;
      color: #2d3748;
      font-weight: 600;
    }

    .confirmation-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #cbd5e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .confirmation-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .confirmation-input.error {
      border-color: #fc8181;
    }

    .helper-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #fc8181;
    }

    .helper-text.success {
      color: #48bb78;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f7fafc;
      border-radius: 0 0 12px 12px;
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #dc3545;
    }
  `]
})
export class StoreSettingsComponent implements OnInit {
  storeId!: number;
  store: Store | null = null;
  loading = false;
  saving = false;
  deleting = false;
  error: string | null = null;
  activeTab: 'general' | 'slider' | 'branding' | 'domain' | 'advanced' = 'general';

  showDeleteModal = false;
  deleteConfirmation = '';

  settingsForm: FormGroup;
  brandingForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private fb: FormBuilder
  ) {
    this.settingsForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      description: [''],
      status: ['ACTIVE']
    });

    this.brandingForm = this.fb.group({
      logoUrl: [''],
      bannerUrl: ['']
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      this.storeId = storeIdParam ? Number(storeIdParam) : 0;

      if (!this.storeId || isNaN(this.storeId)) {
        console.error('❌ Ungültige Store-ID:', storeIdParam);
        this.router.navigate(['/dashboard']);
        return;
      }

      console.log('✅ Store-ID geladen:', this.storeId);
      this.loadStore();
    });
  }

  loadStore(): void {
    this.loading = true;
    this.error = null;

    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        this.store = store;
        this.settingsForm.patchValue({
          name: store.name,
          slug: store.slug,
          description: store.description,
          status: store.status
        });
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Store-Einstellungen';
        this.loading = false;
        console.error('Error loading store:', error);
      }
    });
  }

  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.saving = true;
      this.error = null;

      this.storeService.updateStore(this.storeId, this.settingsForm.value).subscribe({
        next: () => {
          this.saving = false;
          alert('Einstellungen erfolgreich gespeichert!');
          this.loadStore();
        },
        error: (error) => {
          this.error = 'Fehler beim Speichern der Einstellungen';
          this.saving = false;
          console.error('Error saving settings:', error);
        }
      });
    }
  }

  saveBranding(): void {
    if (this.brandingForm.valid) {
      this.saving = true;
      this.error = null;

      // TODO: Implement branding update API call
      setTimeout(() => {
        this.saving = false;
        alert('Branding erfolgreich gespeichert!');
      }, 1000);
    }
  }

  manageDomains(): void {
    this.router.navigate(['/stores', this.storeId, 'domains']);
  }

  executeDeleteStore(): void {
    if (this.deleteConfirmation !== this.store?.name) {
      return;
    }

    this.deleting = true;
    this.error = null;

    this.storeService.deleteStore(this.storeId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteModal = false;
        alert('✅ Store erfolgreich gelöscht!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.deleting = false;
        this.error = error.error?.message || 'Fehler beim Löschen des Stores';
        console.error('❌ Error deleting store:', error);
        alert('❌ Fehler: ' + this.error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }
}

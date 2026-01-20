import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Store } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StoreNavigationComponent, TranslatePipe],
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
            <p>Diese Aktionen können nicht rückgängig gemacht werden.</p>

            <button class="btn btn-danger" (click)="confirmDeleteStore()">
              Store löschen
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
      text-align: center;
      padding: 2rem;
      border: 2px solid #dc3545;
      border-radius: 8px;
      background: #fff5f5;
    }

    .danger-zone h3 {
      margin: 0 0 1rem;
      color: #dc3545;
    }

    .danger-zone p {
      margin: 0 0 2rem;
      color: #666;
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
  error: string | null = null;
  activeTab: 'general' | 'branding' | 'domain' | 'advanced' = 'general';

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
    alert('Domain-Verwaltung wird noch implementiert');
  }

  confirmDeleteStore(): void {
    if (confirm('Sind Sie sicher, dass Sie diesen Store löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      this.deleteStore();
    }
  }

  deleteStore(): void {
    this.storeService.deleteStore(this.storeId).subscribe({
      next: () => {
        alert('Store erfolgreich gelöscht');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.error = 'Fehler beim Löschen des Stores';
        console.error('Error deleting store:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }
}

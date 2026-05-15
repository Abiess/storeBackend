import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { StoreService } from '../../core/services/store.service';
import { Store } from '../../core/models';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { StoreSliderEditorComponent } from './components/store-slider-editor.component';
import { BrandingEditorComponent } from './branding-editor.component';

/**
 * Wiederverwendbares Settings-Tab Interface.
 * `visible` → false = ausgeblendet
 * `beta` → true = nur für Beta-User sichtbar
 */
export interface SettingsTab {
  id: string;
  icon: string;
  labelKey: string;
  visible?: boolean;
  beta?: boolean;
}

@Component({
  selector: 'app-store-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StoreNavigationComponent, TranslatePipe, StoreSliderEditorComponent, BrandingEditorComponent],
  template: `
    <div class="store-settings-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [currentPage]="'navigation.settings' | translate">
      </app-store-navigation>

      <div class="settings-content" *ngIf="store">
        <h1 class="settings-title">{{ 'navigation.settings' | translate }}</h1>
        
        <!-- Wiederverwendbare Tab-Leiste (analog app-productnavigation-bar) -->
        <nav class="settings-tabs" role="tablist">
          <button 
            *ngFor="let tab of visibleTabs"
            class="settings-tab"
            role="tab"
            [class.active]="activeTab === tab.id"
            [attr.aria-selected]="activeTab === tab.id"
            (click)="activeTab = tab.id">
            <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.labelKey | translate }}</span>
            <span class="beta-badge" *ngIf="tab.beta">Beta</span>
            <span class="tab-indicator"></span>
          </button>
        </nav>

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

            <!-- ─── WhatsApp-Einstellungen ─── -->
            <div class="whatsapp-section">
              <h3 class="section-title">
                <span class="section-icon">📱</span>
                {{ 'settings.whatsapp.title' | translate }}
              </h3>

              <div class="form-group">
                <label for="whatsappNumber">{{ 'settings.whatsapp.number' | translate }}</label>
                <input
                  id="whatsappNumber"
                  type="tel"
                  formControlName="whatsappNumber"
                  class="form-control"
                  [placeholder]="'settings.whatsapp.numberPlaceholder' | translate"
                  maxlength="20">
                <small class="form-text">{{ 'settings.whatsapp.numberHint' | translate }}</small>
              </div>

              <div class="form-group">
                <label for="greetingMessage">{{ 'settings.whatsapp.greetingMessage' | translate }}</label>
                <textarea
                  id="greetingMessage"
                  formControlName="greetingMessage"
                  class="form-control"
                  rows="3"
                  [placeholder]="'settings.whatsapp.greetingMessagePlaceholder' | translate"
                  maxlength="500"></textarea>
                <small class="form-text">{{ 'settings.whatsapp.greetingMessageHint' | translate }}</small>
              </div>
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
          <app-store-slider-editor></app-store-slider-editor>
        </div>

        <!-- Branding Settings -->
        <!-- Branding Settings -->
        <div class="tab-content" *ngIf="activeTab === 'branding'">
          <app-branding-editor></app-branding-editor>
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

    .settings-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 1.5rem 0;
    }

    /* ─── Modern Tab Bar (analog productnavigation-bar) ─── */
    .settings-tabs {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 6px 0;
      margin-bottom: 1.5rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 12px 12px 0 0;
    }
    .settings-tabs::-webkit-scrollbar { display: none; }

    .settings-tab {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      background: transparent;
      border-radius: 10px;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      min-height: 44px;
      transition: color 0.2s ease, background 0.2s ease, transform 0.15s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .settings-tab:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.07);
    }

    .settings-tab:active {
      transform: scale(0.97);
    }

    .settings-tab.active {
      color: #667eea;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.08);
    }

    .settings-tab.active .tab-icon {
      transform: scale(1.12);
    }

    .settings-tab.active .tab-indicator {
      opacity: 1;
      transform: scaleX(1);
    }

    .tab-icon {
      font-size: 1.125rem;
      line-height: 1;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      flex-shrink: 0;
    }

    .tab-label {
      font-size: 0.8125rem;
      letter-spacing: 0.01em;
    }

    .tab-indicator {
      position: absolute;
      bottom: -6px;
      left: 16px;
      right: 16px;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      opacity: 0;
      transform: scaleX(0);
      transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .beta-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      line-height: 1.2;
      animation: pulse-beta 2.5s ease-in-out infinite;
    }

    @keyframes pulse-beta {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }

    .settings-tab:focus-visible {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    @media (max-width: 767px) {
      .settings-tabs { gap: 1px; }
      .settings-tab { padding: 8px 10px; gap: 6px; }
      .tab-label { font-size: 0.75rem; }
    }

    @media (max-width: 479px) {
      .tab-label { display: none; }
      .settings-tab { padding: 10px; }
      .tab-icon { font-size: 1.25rem; }
    }

    /* ─── Tab Content ─── */
    .tab-content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.03);
      border: 1px solid #f1f5f9;
      animation: fadeInContent 0.25s ease;
    }

    @keyframes fadeInContent {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
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
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
    }

    .form-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #64748b;
    }

    .form-actions {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.45);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
    }

    .domain-info {
      text-align: center;
      padding: 2rem;
    }

    .domain-info h3 {
      margin: 0 0 1rem;
      color: #111827;
    }

    .domain-info p {
      margin: 0 0 2rem;
      font-size: 1.1rem;
      color: #475569;
    }

    .danger-zone {
      padding: 2rem;
      border: 2px solid #fca5a5;
      border-radius: 12px;
      background: #fef2f2;
    }

    .danger-zone h3 {
      margin: 0 0 0.5rem;
      color: #b91c1c;
    }

    .warning-text {
      color: #b91c1c;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .danger-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #fecaca;
      margin-top: 1rem;
    }

    .danger-info h4 {
      margin: 0 0 0.5rem 0;
      color: #111827;
    }

    .danger-info p {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
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
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .modal-header h2 {
      margin: 0;
      color: #b91c1c;
      font-size: 1.4rem;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #64748b;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .modal-close:hover {
      background: #f1f5f9;
      color: #111827;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .warning-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 0 8px 8px 0;
      color: #b91c1c;
    }

    .deletion-list {
      background: #f8fafc;
      padding: 1rem 1rem 1rem 2rem;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .deletion-list li {
      padding: 0.5rem 0;
      color: #334155;
    }

    .confirmation-section {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #f8fafc;
      border-radius: 10px;
    }

    .confirmation-section label {
      display: block;
      margin-bottom: 0.75rem;
      color: #111827;
      font-weight: 600;
    }

    .confirmation-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .confirmation-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .confirmation-input.error {
      border-color: #fca5a5;
    }

    .helper-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: #ef4444;
    }

    .helper-text.success {
      color: #10b981;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      border-radius: 0 0 16px 16px;
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .spinner {
      border: 3px solid #f1f5f9;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #b91c1c;
    }

    /* RTL Support */
    :host-context([dir="rtl"]) .settings-tabs {
      direction: rtl;
    }
    :host-context([dir="rtl"]) .tab-indicator {
      transform-origin: right center;
    }

    /* ─── WhatsApp Section ─── */
    .whatsapp-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(37, 211, 102, 0.06), rgba(18, 140, 126, 0.04));
      border: 1px solid rgba(37, 211, 102, 0.25);
      border-radius: 12px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #128c7e;
      margin: 0 0 1.25rem 0;
    }

    .section-icon {
      font-size: 1.2rem;
      line-height: 1;
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
  activeTab = 'general';

  showDeleteModal = false;
  deleteConfirmation = '';

  /** Setzt man auf true, werden beta-Tabs angezeigt */
  isBetaUser = false;

  /** Wiederverwendbare Tab-Definition – analog NavTab */
  settingsTabs: SettingsTab[] = [
    { id: 'general',  icon: '⚙️', labelKey: 'settings.general' },
    { id: 'slider',   icon: '🎬', labelKey: 'settings.slider' },
    { id: 'branding', icon: '🎨', labelKey: 'settings.branding.title' },
    { id: 'domain',   icon: '🌐', labelKey: 'settings.domain.title' },
    { id: 'advanced', icon: '🔧', labelKey: 'settings.advanced.title' }
  ];

  /** Gibt nur sichtbare Tabs zurück (respektiert visible + beta) */
  get visibleTabs(): SettingsTab[] {
    return this.settingsTabs.filter(tab => {
      if (tab.visible === false) return false;
      if (tab.beta && !this.isBetaUser) return false;
      return true;
    });
  }

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
      status: ['ACTIVE'],
      whatsappNumber: ['', [Validators.maxLength(20)]],
      greetingMessage: ['', [Validators.maxLength(500)]]
    });

    this.brandingForm = this.fb.group({
      logoUrl: [''],
      bannerUrl: ['']
    });
  }

  ngOnInit(): void {
    // Beta-Flag aus localStorage (oder UserService)
    this.isBetaUser = localStorage.getItem('betaAccess') === 'true';

    // Mehrstufige StoreId Extraktion
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      if (storeIdParam) {
        this.storeId = Number(storeIdParam);
      }
    });

    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const storeIdParam = params['id'] || params['storeId'];
        if (storeIdParam && !this.storeId) {
          this.storeId = Number(storeIdParam);
        }
      });
    }

    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
      }
    }

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', this.storeId);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID geladen:', this.storeId);
    this.loadStore();
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
          status: store.status,
          whatsappNumber: store.whatsappNumber ?? '',
          greetingMessage: store.greetingMessage ?? ''
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

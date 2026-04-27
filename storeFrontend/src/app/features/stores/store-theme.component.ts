import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ThemeService } from '../../core/services/theme.service';
import { StoreService } from '../../core/services/store.service';
import {
  StoreTheme,
  ThemePreset,
  ThemeType,
  ShopTemplate,
  CreateThemeRequest
} from '../../core/models';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { toDate } from '@app/core/utils/date.utils';

@Component({
  selector: 'app-store-theme',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="theme-container">
      <app-page-header
        [title]="'theme.management'"
        [subtitle]="'theme.subtitle'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <div class="theme-content" *ngIf="!loading">
        <!-- Aktives Theme -->
        <div class="active-theme-section" *ngIf="activeTheme">
          <h2>Aktives Theme</h2>
          <div class="theme-card active">
            <div class="theme-preview" [style.background]="activeTheme.colors.primary || '#667eea'">
              <div class="preview-content">
                <h3>{{ activeTheme.name }}</h3>
                <span class="theme-type">{{ getThemeTypeName(activeTheme.type) }}</span>
              </div>
            </div>
            <div class="theme-info">
              <p><strong>Template:</strong> {{ getTemplateName(activeTheme.template) }}</p>
              <p><strong>Erstellt:</strong> {{ toDate(activeTheme.createdAt) | date:'dd.MM.yyyy':'':'de-DE' }}</p>
              <button class="btn btn-primary" (click)="editTheme(activeTheme)">
                Bearbeiten
              </button>
            </div>
          </div>
        </div>

        <!-- Theme Presets aus Backend (Free-Template-Katalog) -->
        <div class="presets-section">
          <h2>Kostenlose Theme-Vorlagen 🎁</h2>
          <p class="section-description">
            Wähle eine Vorlage und wende sie mit einem Klick auf deinen Shop an –
            wird automatisch gespeichert und beim nächsten Mal geladen.
          </p>

          <div class="presets-grid">
            <div class="preset-card"
                 *ngFor="let preset of presets"
                 [class.is-active]="isActiveTemplate(preset)">
              <!-- Echtes Vorschaubild aus Backend (previewUrl) mit Fallback auf Farb-Gradient -->
              <div class="preset-preview"
                   [style.background]="'linear-gradient(135deg, ' + preset.colors.primary + ', ' + preset.colors.secondary + ')'">
                <img *ngIf="getPreviewUrl(preset) as previewSrc"
                     class="preset-preview__img"
                     [src]="previewSrc"
                     [alt]="preset.name + ' Preview'"
                     loading="lazy" />
                <div class="preview-overlay">
                  <h3>{{ preset.name }}</h3>
                </div>
                <span class="badge-free" *ngIf="isFreeTemplate(preset)">FREE</span>
                <span class="badge-active" *ngIf="isActiveTemplate(preset)">✓ AKTIV</span>
              </div>
              <div class="preset-info">
                <p>{{ preset.description }}</p>
                <div class="color-palette">
                  <span class="color-dot" [style.background]="preset.colors.primary" [title]="'Primär: ' + preset.colors.primary"></span>
                  <span class="color-dot" [style.background]="preset.colors.secondary" [title]="'Sekundär: ' + preset.colors.secondary"></span>
                  <span class="color-dot" [style.background]="preset.colors.accent" [title]="'Akzent: ' + preset.colors.accent"></span>
                </div>
                <div class="preset-actions">
                  <button class="btn btn-success"
                          (click)="applyTemplateImmediately(preset)"
                          [disabled]="applyingTemplate === preset.name || isActiveTemplate(preset)"
                          *ngIf="getTemplateId(preset)">
                    {{ isActiveTemplate(preset)
                        ? '✓ Aktiv'
                        : (applyingTemplate === preset.name ? '⏳ Wende an...' : '⚡ 1-Klick anwenden') }}
                  </button>
                  <button class="btn btn-secondary" (click)="selectPreset(preset)">
                    ✏️ Anpassen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Erfolgs-Toast -->
          <div class="toast-success" *ngIf="successMessage" (click)="successMessage = null">
            ✅ {{ successMessage }}
          </div>
        </div>

        <!-- Theme Editor -->
        <div class="editor-section" *ngIf="selectedPreset">
          <h2>Theme anpassen</h2>
          <form (ngSubmit)="saveTheme()" class="theme-form">
            <div class="form-group">
              <label>Theme-Name</label>
              <input type="text" [(ngModel)]="themeName" name="themeName" 
                     class="form-control" placeholder="Mein Custom Theme" required>
            </div>

            <div class="form-group">
              <label>Template</label>
              <select [(ngModel)]="selectedTemplate" name="template" class="form-control">
                <option value="ELECTRONICS">Elektronik</option>
                <option value="FASHION">Mode</option>
                <option value="FOOD">Lebensmittel</option>
                <option value="BEAUTY">Beauty</option>
                <option value="GENERAL">Allgemein</option>
              </select>
            </div>

            <div class="form-section">
              <h3>Farben</h3>
              <div class="color-grid">
                <div class="color-input">
                  <label>Primärfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.primary" name="primary">
                  <span>{{ selectedPreset.colors.primary }}</span>
                </div>
                <div class="color-input">
                  <label>Sekund��rfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.secondary" name="secondary">
                  <span>{{ selectedPreset.colors.secondary }}</span>
                </div>
                <div class="color-input">
                  <label>Akzentfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.accent" name="accent">
                  <span>{{ selectedPreset.colors.accent }}</span>
                </div>
                <div class="color-input">
                  <label>Hintergrund</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.background" name="background">
                  <span>{{ selectedPreset.colors.background }}</span>
                </div>
                <div class="color-input">
                  <label>Text</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.text" name="text">
                  <span>{{ selectedPreset.colors.text }}</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Typografie</h3>
              <div class="form-group">
                <label>Schriftart</label>
                <select [(ngModel)]="selectedPreset.typography.fontFamily" name="fontFamily" class="form-control">
                  <option value="'Inter', sans-serif">Inter (Modern)</option>
                  <option value="'Georgia', serif">Georgia (Klassisch)</option>
                  <option value="'Helvetica Neue', sans-serif">Helvetica (Minimal)</option>
                  <option value="'Cormorant Garamond', serif">Cormorant (Elegant)</option>
                </select>
              </div>
            </div>

            <div class="form-section">
              <h3>Layout</h3>
              <div class="form-group">
                <label>Produktraster-Spalten</label>
                <select [(ngModel)]="selectedPreset.layout.productGridColumns" name="gridColumns" class="form-control">
                  <option [value]="2">2 Spalten</option>
                  <option [value]="3">3 Spalten</option>
                  <option [value]="4">4 Spalten</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">
                Abbrechen
              </button>
              <button type="submit" class="btn btn-success" [disabled]="saving">
                {{ saving ? 'Speichere...' : 'Theme speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Vorschau -->
        <div class="preview-section" *ngIf="selectedPreset">
          <div class="preview-toolbar">
            <h2>Vorschau</h2>
            <div class="preview-toolbar__actions">
              <button type="button"
                      class="btn btn-secondary btn-sm"
                      [class.active]="previewMode === 'mini'"
                      (click)="previewMode = 'mini'">
                🎨 Stil-Vorschau
              </button>
              <button type="button"
                      class="btn btn-secondary btn-sm"
                      [class.active]="previewMode === 'live'"
                      (click)="previewMode = 'live'">
                🌐 Live-Storefront
              </button>
              <button type="button"
                      class="btn btn-secondary btn-sm"
                      *ngIf="previewMode === 'live'"
                      (click)="reloadLivePreview()"
                      title="Iframe neu laden">
                ↻
              </button>
            </div>
          </div>

          <!-- Mini-Vorschau (Buttons + Karte mit aktuellen Farben) -->
          <div class="theme-preview-full" *ngIf="previewMode === 'mini'"
               [style.background]="selectedPreset.colors.background"
               [style.color]="selectedPreset.colors.text"
               [style.fontFamily]="selectedPreset.typography.fontFamily">
            <div class="preview-header" [style.background]="selectedPreset.colors.primary">
              <h3 [style.color]="'#ffffff'">Mein Shop</h3>
            </div>
            <div class="preview-content-area">
              <button class="preview-button"
                      [style.background]="selectedPreset.colors.primary"
                      [style.color]="'#ffffff'">
                Primär Button
              </button>
              <button class="preview-button"
                      [style.background]="selectedPreset.colors.secondary"
                      [style.color]="'#ffffff'">
                Sekundär Button
              </button>
              <div class="preview-card" [style.border]="'1px solid ' + selectedPreset.colors.border">
                <h4 [style.color]="selectedPreset.colors.text">Produktkarte</h4>
                <p [style.color]="selectedPreset.colors.textSecondary">Beispieltext für Produktbeschreibung</p>
                <span class="preview-price" [style.color]="selectedPreset.colors.accent">€99.99</span>
              </div>
            </div>
          </div>

          <!-- Live-Iframe-Vorschau auf den echten Storefront -->
          <div class="live-preview" *ngIf="previewMode === 'live'">
            <p class="live-preview__hint">
              Live-Vorschau unter
              <strong class="live-preview__url">{{ getStorefrontPreviewBaseUrl() }}</strong>
              – exakt die URL, die deine Kunden sehen. Nach „Theme speichern"
              hier auf <strong>↻</strong> klicken, um Änderungen zu sehen.
            </p>
            <iframe class="live-preview__iframe"
                    [src]="getStorefrontPreviewUrl()"
                    title="Live Storefront Preview"
                    loading="lazy"
                    referrerpolicy="no-referrer">
            </iframe>
            <a class="live-preview__open"
               [href]="getStorefrontPreviewBaseUrl()"
               target="_blank" rel="noopener">
              In neuem Tab öffnen ↗
            </a>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Lade Themes...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadThemes()">Erneut versuchen</button>
      </div>
    </div>
  `,
  styles: [`
    .theme-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .theme-header {
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

    .header-content h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem;
    }

    .header-content p {
      color: #666;
      margin: 0;
    }

    .active-theme-section {
      margin-bottom: 3rem;
    }

    .theme-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .theme-card.active {
      border: 3px solid #28a745;
    }

    .theme-preview {
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .preview-content {
      text-align: center;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .theme-type {
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
    }

    .theme-info {
      padding: 1.5rem;
    }

    .presets-section {
      margin-bottom: 3rem;
    }

    .section-description {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .preset-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .preset-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .preset-card.is-active {
      border: 2px solid #28a745;
      box-shadow: 0 4px 20px rgba(40, 167, 69, 0.25);
    }

    .preset-preview {
      height: 160px;
      position: relative;
      overflow: hidden;
    }

    .preset-preview__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .preview-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.2);
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .preset-info {
      padding: 1.5rem;
    }

    .color-palette {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .color-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: help;
    }

    .editor-section, .preview-section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .theme-form {
      max-width: 800px;
    }

    .form-section {
      margin: 2rem 0;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .form-section h3 {
      margin-top: 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .color-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .color-input input[type="color"] {
      width: 100%;
      height: 50px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }

    .color-input span {
      font-family: monospace;
      font-size: 0.875rem;
      color: #666;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover {
      background: #218838;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .theme-preview-full {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      min-height: 400px;
    }

    /* Toolbar mit Mini ↔ Live Toggle */
    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .preview-toolbar h2 { margin: 0; }
    .preview-toolbar__actions {
      display: inline-flex;
      gap: .5rem;
      flex-wrap: wrap;
    }
    .btn.btn-sm {
      padding: .4rem .75rem;
      font-size: .85rem;
      border-radius: 6px;
    }
    .btn.btn-sm.active {
      background: #2563eb;
      color: #fff;
      box-shadow: inset 0 0 0 1px #1d4ed8;
    }

    /* Live-Iframe-Preview */
    .live-preview {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .live-preview__hint {
      margin: 0;
      padding: .75rem 1rem;
      background: #f1f5f9;
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      color: #334155;
      font-size: .9rem;
      line-height: 1.5;
    }
    .live-preview__url {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .85rem;
      color: #1d4ed8;
      background: #ffffff;
      padding: .1rem .4rem;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
    }
    .live-preview__iframe {
      width: 100%;
      height: 720px;
      max-height: 80vh;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(15, 23, 42, .06);
    }
    .live-preview__open {
      align-self: flex-end;
      color: #2563eb;
      text-decoration: none;
      font-size: .85rem;
      font-weight: 500;
    }
    .live-preview__open:hover { text-decoration: underline; }

    .preview-header {
      padding: 1.5rem;
      text-align: center;
    }

    .preview-content-area {
      padding: 2rem;
    }

    .preview-button {
      margin: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .preview-card {
      margin-top: 2rem;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .preview-price {
      font-size: 1.5rem;
      font-weight: 700;
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

    /* Free-Badge auf Preset-Karten */
    .badge-free {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: #28a745;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .badge-active {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: #0d6efd;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* Preset-Action-Buttons (nebeneinander) */
    .preset-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .preset-actions .btn {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }

    /* Erfolgs-Toast */
    .toast-success {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      background: #28a745;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
      font-weight: 500;
    }
    @keyframes slideInRight {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `]
})
export class StoreThemeComponent implements OnInit {
  storeId!: number;
  activeTheme: StoreTheme | null = null;
  presets: ThemePreset[] = [];
  selectedPreset: ThemePreset | null = null;
  themeName = '';
  selectedTemplate: ShopTemplate = ShopTemplate.FOOD;
  loading = false;
  saving = false;
  applyingTemplate: string | null = null;
  successMessage: string | null = null;
  error: string | null = null;
  headerActions: HeaderAction[] = [];
  breadcrumbItems: BreadcrumbItem[] = [];

  /** 'mini' = Buttons-/Karten-Vorschau · 'live' = echtes Storefront-Iframe */
  previewMode: 'mini' | 'live' = 'mini';
  /** Cache-Buster für das Live-Iframe (wird nach Save erhöht). */
  private livePreviewVersion = 0;
  /** Slug des aktuellen Stores für die echte Subdomain-Vorschau (z.B. "myshop"). */
  private storeSlug: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
    private storeService: StoreService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Methode 1: Aus direkten Route Params
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      if (storeIdParam) {
        this.storeId = Number(storeIdParam);
        console.log('✅ Store-ID aus params geladen:', this.storeId);

        // Breadcrumbs initialisieren
        this.breadcrumbItems = [
          { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
          { label: 'navigation.store', route: ['/dashboard/stores', this.storeId], icon: '🏪' },
          { label: 'theme.management', icon: '🎨' }
        ];
      }
    });

    // Methode 2: Aus Parent Route (falls verschachtelt)
    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const storeIdParam = params['id'] || params['storeId'];
        if (storeIdParam && !this.storeId) {
          this.storeId = Number(storeIdParam);
          console.log('✅ Store-ID aus parent params geladen:', this.storeId);
        }
      });
    }

    // Methode 3: Aus URL extrahieren (letzter Fallback)
    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
        console.log('✅ Store-ID aus URL extrahiert:', this.storeId);
      }
    }

    // Validation und Laden
    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', this.storeId);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID final geladen:', this.storeId);
    this.loadThemes();
    this.loadPresets();
    this.loadStoreSlug();
  }

  loadThemes(): void {
    this.loading = true;
    this.error = null;

    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Themes';
        console.error('Error loading themes:', error);
        this.loading = false;
      }
    });
  }

  loadPresets(): void {
    // ✅ Lade Templates aus dem Backend (Free-Template-Katalog)
    // Fallback auf lokale Presets falls Backend nicht erreichbar
    this.themeService.getTemplatesFromBackend(true).subscribe({
      next: (presets) => {
        this.presets = presets;
        console.log(`✅ ${presets.length} Theme-Templates geladen`);
      },
      error: (error) => {
        console.error('Error loading presets:', error);
        // Fallback
        this.themeService.getThemePresets().subscribe(p => this.presets = p);
      }
    });
  }

  /** Hilfsmethode: Backend-Template-ID falls vorhanden */
  getTemplateId(preset: ThemePreset): number | undefined {
    return (preset as any).id;
  }

  /** Free-Badge anzeigen falls Template als kostenlos markiert ist */
  isFreeTemplate(preset: ThemePreset): boolean {
    const isFree = (preset as any).isFree;
    return isFree === undefined ? true : isFree;
  }

  /** Vorschaubild-URL aus Backend (previewUrl → preset.preview), Fallback null. */
  getPreviewUrl(preset: ThemePreset): string | null {
    const url = (preset as any).preview;
    if (!url || typeof url !== 'string') return null;
    // Default-Placeholder vom Service nicht anzeigen, dann Gradient nutzen
    if (url.endsWith('/default-preview.jpg')) return null;
    return url;
  }

  /**
   * Markiert Karte als „aktiv", wenn der Template-Slug (oder ID) mit dem
   * aktuell aktiven Theme übereinstimmt.
   */
  isActiveTemplate(preset: ThemePreset): boolean {
    if (!this.activeTheme) return false;
    const presetTemplate = (preset as any).template ?? preset.type;
    const themeTemplate = this.activeTheme.template ?? this.activeTheme.type;
    return !!presetTemplate && !!themeTemplate
      && String(presetTemplate).toUpperCase() === String(themeTemplate).toUpperCase();
  }

  /**
   * 1-Klick-Anwendung: Template direkt auf Store anwenden + speichern.
   * Kein Editor-Schritt nötig.
   */
  applyTemplateImmediately(preset: ThemePreset): void {
    const templateId = this.getTemplateId(preset);
    if (!templateId) {
      console.warn('⚠️ Preset hat keine Backend-ID, fallback auf Editor-Modus');
      this.selectPreset(preset);
      return;
    }

    this.applyingTemplate = preset.name;
    this.error = null;

    this.themeService.applyTemplateToStore(this.storeId, templateId, `${preset.name} Theme`).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.applyingTemplate = null;
        this.successMessage = `Theme "${preset.name}" wurde aktiviert und gespeichert.`;
        // Live-Iframe automatisch refreshen, falls offen
        this.reloadLivePreview();
        // Toast nach 4s ausblenden
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: (err) => {
        console.error('Fehler beim Anwenden des Templates:', err);
        this.error = 'Template konnte nicht angewendet werden';
        this.applyingTemplate = null;
      }
    });
  }

  selectPreset(preset: ThemePreset): void {
    this.selectedPreset = JSON.parse(JSON.stringify(preset));
    this.themeName = `${preset.name} Theme`;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  editTheme(theme: StoreTheme): void {
    const preset = this.presets.find(p => p.type === theme.type);
    if (preset) {
      // ✅ Stelle sicher, dass colors, typography und layout existieren
      this.selectedPreset = {
        ...preset,
        colors: theme.colors || preset.colors,
        typography: theme.typography || preset.typography,
        layout: theme.layout || preset.layout
      };
      this.themeName = theme.name;
      this.selectedTemplate = theme.template;
    } else {
      console.warn('⚠️ Preset nicht gefunden für Theme-Typ:', theme.type);
      // Fallback: Verwende das erste Preset
      this.selectedPreset = JSON.parse(JSON.stringify(this.presets[0]));
      this.themeName = theme.name || 'Custom Theme';
      this.selectedTemplate = theme.template || ShopTemplate.CUSTOM;
    }
  }

  saveTheme(): void {
    if (!this.selectedPreset || !this.themeName) {
      return;
    }

    this.saving = true;
    this.error = null;

    const request: CreateThemeRequest = {
      storeId: this.storeId,
      name: this.themeName,
      type: this.selectedPreset.type,
      template: this.selectedTemplate,
      colors: this.selectedPreset.colors,
      typography: this.selectedPreset.typography,
      layout: this.selectedPreset.layout
    };

    this.themeService.createTheme(request).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.selectedPreset = null;
        this.saving = false;

        // ✅ Theme sofort anwenden
        this.themeService.applyTheme(theme);

        this.successMessage = `Theme "${theme.name}" wurde gespeichert und angewendet.`;
        // Live-Iframe automatisch refreshen, falls offen
        this.reloadLivePreview();
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: (error) => {
        this.error = 'Fehler beim Speichern des Themes';
        console.error('Error saving theme:', error);
        this.saving = false;
      }
    });
  }

  cancelEdit(): void {
    this.selectedPreset = null;
    this.themeName = '';
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }

  // ----------------------------------------------------------------
  //  Live-Storefront-Iframe (Vorschau-Tab "🌐 Live")
  // ----------------------------------------------------------------

  /**
   * Lädt den Slug des aktuellen Stores, damit die Live-Vorschau
   * die echte Subdomain-URL `https://{slug}.markt.ma` rendern kann.
   */
  private loadStoreSlug(): void {
    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        if (store?.slug) {
          this.storeSlug = store.slug;
          // Falls Live-Tab schon offen ist, sofort neu laden mit echter URL
          this.reloadLivePreview();
          console.log('🌐 Store-Slug für Live-Preview geladen:', this.storeSlug);
        }
      },
      error: (err) => console.warn('Store-Slug konnte nicht geladen werden:', err)
    });
  }

  /**
   * Basis-URL der Live-Storefront-Vorschau für diesen Store.
   *
   * Priorität:
   *   1. Wenn Slug bekannt → echte Subdomain `https://{slug}.markt.ma`
   *      (so wie der Store auch von Endkunden gesehen wird).
   *   2. Fallback: Frontend-Route `/storefront/:storeId` für lokale Entwicklung,
   *      falls der Slug noch nicht geladen wurde oder die DNS-Subdomain
   *      lokal nicht erreichbar ist.
   *
   * Hinweis: In rein lokaler Entwicklung (`localhost`) erreicht der Browser
   * die Subdomain nicht – daher der Fallback. Auf Production (markt.ma)
   * sieht der Owner die exakte URL, die seine Kunden sehen.
   */
  getStorefrontPreviewBaseUrl(): string {
    if (this.storeSlug) {
      return `https://${this.storeSlug}.markt.ma`;
    }
    return `/storefront/${this.storeId}`;
  }

  /**
   * Iframe-`src` mit Cache-Buster, sicher als SafeResourceUrl.
   * Wird durch {@link reloadLivePreview} neu erzeugt, sodass Hibernate-
   * Updates nach „Theme speichern" sofort sichtbar werden.
   */
  getStorefrontPreviewUrl(): SafeResourceUrl {
    const url = `${this.getStorefrontPreviewBaseUrl()}?previewKey=${this.livePreviewVersion}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Erhöht die Version → triggert Iframe-Reload via Angular-Change-Detection. */
  reloadLivePreview(): void {
    this.livePreviewVersion++;
  }

  /** Konvertiert Spring LocalDateTime-Array zu JS Date für die date-Pipe */
  toDate = toDate;

  getThemeTypeName(type: string): string {
    const names: { [key: string]: string } = {
      'MODERN': 'Modern',
      'CLASSIC': 'Klassisch',
      'MINIMAL': 'Minimalistisch',
      'ELEGANT': 'Elegant',
      'DARK': 'Dunkel'
    };
    return names[type] || type;
  }

  getTemplateName(template: string): string {
    const names: { [key: string]: string } = {
      'ELECTRONICS': 'Elektronik',
      'FASHION': 'Mode',
      'FOOD': 'Lebensmittel',
      'BEAUTY': 'Beauty',
      'GENERAL': 'Allgemein'
    };
    return names[template] || template;
  }
}

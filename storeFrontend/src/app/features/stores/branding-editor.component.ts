import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import { MediaService } from '../../core/services/media.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { StoreTheme, ThemeColors } from '../../core/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-branding-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="branding-editor">
      <div class="editor-layout">
        <!-- Left: Settings -->
        <div class="settings-panel">
          <h2>🎨 Branding & Design</h2>
          <p class="subtitle">Passen Sie das Erscheinungsbild Ihres Stores an</p>

          <form [formGroup]="brandingForm">
            <!-- Logo Upload -->
            <div class="form-section">
              <h3>📷 Logo</h3>
              <div class="form-group">
                <label>Store Logo</label>
                
                <!-- Upload Error -->
                <div class="upload-error" *ngIf="uploadError">
                  <span class="error-icon">⚠️</span>
                  <span>{{ uploadError }}</span>
                  <button type="button" class="btn-retry" (click)="retryUpload()">
                    Erneut versuchen
                  </button>
                </div>

                <!-- Upload Area -->
                <div class="upload-area" (click)="fileInput.click()" [class.uploading]="uploading">
                  <input 
                    #fileInput 
                    type="file" 
                    accept="image/*" 
                    (change)="onFileSelected($event, 'logo')"
                    style="display: none">
                  
                  <!-- Uploading State -->
                  <div class="upload-progress" *ngIf="uploading">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="uploadProgress"></div>
                    </div>
                    <p>Uploading... {{ uploadProgress }}%</p>
                  </div>

                  <!-- No Logo State -->
                  <div class="upload-content" *ngIf="!logoPreview && !uploading">
                    <span class="upload-icon">📁</span>
                    <p>Click to upload logo</p>
                    <small>PNG, JPG, SVG (max 2MB)</small>
                  </div>

                  <!-- Logo Preview -->
                  <div class="logo-preview" *ngIf="logoPreview && !uploading">
                    <img [src]="logoPreview" alt="Logo">
                    <button type="button" class="btn-remove" (click)="removeLogo($event)">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Colors -->
            <div class="form-section">
              <h3>🎨 Farben</h3>
              
              <div class="color-grid">
                <div class="color-input">
                  <label>Primärfarbe</label>
                  <div class="color-picker-wrapper">
                    <input 
                      type="color" 
                      formControlName="primaryColor"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="brandingForm.get('primaryColor')?.value"
                      (input)="updateColor('primaryColor', $event)"
                      class="color-hex"
                      placeholder="#667eea">
                  </div>
                  <small>Buttons, Links, Highlights</small>
                </div>

                <div class="color-input">
                  <label>Sekundärfarbe</label>
                  <div class="color-picker-wrapper">
                    <input 
                      type="color" 
                      formControlName="secondaryColor"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="brandingForm.get('secondaryColor')?.value"
                      (input)="updateColor('secondaryColor', $event)"
                      class="color-hex"
                      placeholder="#764ba2">
                  </div>
                  <small>Sekundäre Elemente</small>
                </div>

                <div class="color-input">
                  <label>Akzentfarbe</label>
                  <div class="color-picker-wrapper">
                    <input 
                      type="color" 
                      formControlName="accentColor"
                      class="color-picker">
                    <input 
                      type="text" 
                      [value]="brandingForm.get('accentColor')?.value"
                      (input)="updateColor('accentColor', $event)"
                      class="color-hex"
                      placeholder="#f093fb">
                  </div>
                  <small>Preise, Badges, Call-to-Action</small>
                </div>
              </div>
            </div>

            <!-- Typography -->
            <div class="form-section">
              <h3>📝 Typografie</h3>
              <div class="form-group">
                <label>Schriftart</label>
                <select formControlName="fontFamily" class="form-control">
                  <option value="'Inter', sans-serif">Inter (Modern & Clean)</option>
                  <option value="'Roboto', sans-serif">Roboto (Google Standard)</option>
                  <option value="'Poppins', sans-serif">Poppins (Friendly & Round)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Elegant)</option>
                  <option value="'Georgia', serif">Georgia (Classic)</option>
                  <option value="'Helvetica Neue', sans-serif">Helvetica (Minimal)</option>
                </select>
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="form-section">
              <h3>⚡ Schnellvorlagen</h3>
              <div class="preset-buttons">
                <button 
                  type="button"
                  *ngFor="let preset of quickPresets"
                  class="preset-button"
                  [style.background]="preset.colors.primary"
                  (click)="applyPreset(preset)">
                  {{ preset.name }}
                </button>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="reset()">
                Zurücksetzen
              </button>
              <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving">
                {{ saving ? 'Speichern...' : 'Änderungen speichern' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Live Preview -->
        <div class="preview-panel">
          <div class="preview-header">
            <h3>👁️ Live Vorschau</h3>
            <div class="preview-device-toggle">
              <button 
                [class.active]="previewDevice === 'desktop'"
                (click)="previewDevice = 'desktop'">
                🖥️
              </button>
              <button 
                [class.active]="previewDevice === 'mobile'"
                (click)="previewDevice = 'mobile'">
                📱
              </button>
            </div>
          </div>

          <div class="preview-container" [class.mobile]="previewDevice === 'mobile'">
            <div class="storefront-preview" [ngStyle]="previewStyles">
              <!-- Header Preview -->
              <div class="preview-store-header">
                <div class="preview-logo">
                  <img *ngIf="logoPreview" [src]="logoPreview" alt="Logo">
                  <span *ngIf="!logoPreview" class="logo-placeholder">LOGO</span>
                </div>
                <div class="preview-nav">
                  <a href="javascript:void(0)">Produkte</a>
                  <a href="javascript:void(0)">Kategorien</a>
                  <a href="javascript:void(0)">Kontakt</a>
                </div>
                <button class="preview-cart-button">
                  🛒 Warenkorb
                </button>
              </div>

              <!-- Content Preview -->
              <div class="preview-content">
                <h1>Willkommen in Ihrem Store</h1>
                <p>Dies ist eine Vorschau wie Ihr Store aussehen wird.</p>

                <!-- Buttons Preview -->
                <div class="preview-buttons">
                  <button class="preview-btn preview-btn-primary">
                    Primär Button
                  </button>
                  <button class="preview-btn preview-btn-secondary">
                    Sekundär Button
                  </button>
                </div>

                <!-- Product Card Preview -->
                <div class="preview-products">
                  <div class="preview-product-card">
                    <div class="preview-product-image">
                      <span>🖼️</span>
                    </div>
                    <h4>Beispiel Produkt</h4>
                    <p class="preview-product-desc">Produktbeschreibung</p>
                    <div class="preview-product-footer">
                      <span class="preview-price">€99.99</span>
                      <button class="preview-add-to-cart">+ Warenkorb</button>
                    </div>
                  </div>
                  <div class="preview-product-card">
                    <div class="preview-product-image">
                      <span>🖼️</span>
                    </div>
                    <h4>Beispiel Produkt 2</h4>
                    <p class="preview-product-desc">Produktbeschreibung</p>
                    <div class="preview-product-footer">
                      <span class="preview-price">€149.99</span>
                      <button class="preview-add-to-cart">+ Warenkorb</button>
                    </div>
                  </div>
                </div>

                <!-- Badge Preview -->
                <div class="preview-badges">
                  <span class="preview-badge">Neu</span>
                  <span class="preview-badge preview-badge-accent">Sale</span>
                  <span class="preview-badge">Top Seller</span>
                </div>
              </div>
            </div>
          </div>

          <div class="preview-info">
            <small>💡 Änderungen werden sofort in der Vorschau angezeigt</small>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .branding-editor {
      background: #f8f9fa;
      min-height: 100vh;
      padding: 2rem;
    }

    .editor-layout {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 2rem;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* Settings Panel */
    .settings-panel {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      height: fit-content;
      position: sticky;
      top: 2rem;
    }

    .settings-panel h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      color: #333;
    }

    .subtitle {
      color: #666;
      margin: 0 0 2rem;
      font-size: 0.9375rem;
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .form-section h3 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      color: #333;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Upload Area */
    .upload-error {
      background: #fee;
      border: 2px solid #f56565;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .upload-error .error-icon {
      font-size: 1.5rem;
    }

    .upload-error span:not(.error-icon) {
      flex: 1;
      color: #c53030;
      font-weight: 500;
    }

    .btn-retry {
      padding: 0.5rem 1rem;
      background: #f56565;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-size: 0.875rem;
    }

    .btn-retry:hover {
      background: #e53e3e;
    }

    .upload-area {
      border: 2px dashed #e0e0e0;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #fafafa;
    }

    .upload-area:hover:not(.uploading) {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .upload-area.uploading {
      cursor: wait;
      border-color: #667eea;
      background: #f5f7ff;
    }

    .upload-progress {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .progress-bar {
      width: 100%;
      max-width: 300px;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }

    .upload-progress p {
      margin: 0;
      color: #667eea;
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .upload-icon {
      font-size: 2rem;
    }

    .logo-preview {
      position: relative;
      display: inline-block;
    }

    .logo-preview img {
      max-width: 200px;
      max-height: 100px;
      border-radius: 8px;
    }

    .btn-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Color Inputs */
    .color-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .color-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .color-input label {
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }

    .color-picker-wrapper {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .color-picker {
      width: 60px;
      height: 44px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
    }

    .color-hex {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.9375rem;
    }

    .color-input small {
      color: #666;
      font-size: 0.8125rem;
    }

    /* Preset Buttons */
    .preset-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .preset-button {
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 0.9375rem;
    }

    .preset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 1rem;
      padding-top: 1.5rem;
    }

    .btn {
      flex: 1;
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #333;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
      border-color: #667eea;
    }

    /* Preview Panel */
    .preview-panel {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .preview-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #333;
    }

    .preview-device-toggle {
      display: flex;
      gap: 0.5rem;
    }

    .preview-device-toggle button {
      padding: 0.5rem 1rem;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.3s;
    }

    .preview-device-toggle button.active {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .preview-container {
      background: #f0f0f0;
      border-radius: 12px;
      padding: 2rem;
      min-height: 600px;
      transition: all 0.3s;
    }

    .preview-container.mobile {
      max-width: 375px;
      margin: 0 auto;
    }

    .storefront-preview {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Preview Store Header */
    .preview-store-header {
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }

    .preview-logo {
      display: flex;
      align-items: center;
    }

    .preview-logo img {
      max-height: 40px;
      max-width: 150px;
    }

    .logo-placeholder {
      font-weight: 700;
      font-size: 1.5rem;
      color: #333;
    }

    .preview-nav {
      display: flex;
      gap: 1.5rem;
      flex: 1;
    }

    .preview-nav a {
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s;
    }

    .preview-nav a:hover {
      opacity: 0.7;
    }

    .preview-cart-button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Preview Content */
    .preview-content {
      padding: 2rem;
    }

    .preview-content h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
    }

    .preview-content > p {
      color: #666;
      margin: 0 0 2rem;
    }

    .preview-buttons {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .preview-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      color: white;
    }

    .preview-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .preview-product-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.3s;
    }

    .preview-product-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .preview-product-image {
      background: #f0f0f0;
      border-radius: 8px;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .preview-product-card h4 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }

    .preview-product-desc {
      color: #666;
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }

    .preview-product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-price {
      font-weight: 700;
      font-size: 1.125rem;
    }

    .preview-add-to-cart {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .preview-badges {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .preview-badge {
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .preview-info {
      margin-top: 1rem;
      text-align: center;
      color: #666;
    }

    /* Mobile Responsive */
    @media (max-width: 1200px) {
      .editor-layout {
        grid-template-columns: 1fr;
      }

      .settings-panel {
        position: static;
      }
    }

    @media (max-width: 768px) {
      .branding-editor {
        padding: 1rem;
      }

      .settings-panel,
      .preview-panel {
        padding: 1.5rem;
      }

      .preview-nav {
        display: none;
      }

      .preview-store-header {
        padding: 1rem;
      }

      .preview-content {
        padding: 1.5rem;
      }

      .preview-products {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BrandingEditorComponent implements OnInit, OnDestroy {
  private storeId: number | null = null;
  private storeIdSubscription?: Subscription;

  brandingForm: FormGroup;
  logoPreview: string | null = null;
  uploadedLogoUrl: string | null = null;
  previewDevice: 'desktop' | 'mobile' = 'desktop';
  saving = false;
  uploading = false;
  uploadProgress = 0;
  uploadError: string | null = null;

  quickPresets = [
    {
      name: 'Modern',
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb'
      }
    },
    {
      name: 'Ocean',
      colors: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        accent: '#06b6d4'
      }
    },
    {
      name: 'Forest',
      colors: {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399'
      }
    },
    {
      name: 'Sunset',
      colors: {
        primary: '#f59e0b',
        secondary: '#ea580c',
        accent: '#fb923c'
      }
    }
  ];

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeService,
    private mediaService: MediaService,
    private storeContext: StoreContextService
  ) {
    this.brandingForm = this.fb.group({
      primaryColor: ['#667eea', Validators.required],
      secondaryColor: ['#764ba2', Validators.required],
      accentColor: ['#f093fb', Validators.required],
      fontFamily: ["'Inter', sans-serif", Validators.required]
    });
  }

  ngOnInit(): void {
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      if (id !== null) {
        this.storeId = id;
        this.loadCurrentTheme();
      }
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
  }

  get previewStyles() {
    const primary = this.brandingForm.get('primaryColor')?.value;
    const secondary = this.brandingForm.get('secondaryColor')?.value;
    const accent = this.brandingForm.get('accentColor')?.value;
    const font = this.brandingForm.get('fontFamily')?.value;

    return {
      '--preview-primary': primary,
      '--preview-secondary': secondary,
      '--preview-accent': accent,
      '--preview-font': font,
      'font-family': font
    };
  }

  loadCurrentTheme(): void {
    if (this.storeId === null) return;

    // Load active theme from API
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        if (theme) {
          this.brandingForm.patchValue({
            primaryColor: theme.colors.primary,
            secondaryColor: theme.colors.secondary,
            accentColor: theme.colors.accent,
            fontFamily: theme.typography.fontFamily
          });

          // Load existing logo
          if (theme.logoUrl) {
            this.uploadedLogoUrl = theme.logoUrl;
            this.logoPreview = theme.logoUrl;
          }
        }
      },
      error: (err) => console.error('Error loading theme:', err)
    });
  }

  onFileSelected(event: any, type: 'logo' | 'banner'): void {
    const file = event.target.files[0];
    if (!file) return;

    // Reset errors
    this.uploadError = null;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.uploadError = 'Bitte nur Bild-Dateien hochladen (PNG, JPG, SVG)';
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadError = `Datei zu groß (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 2MB`;
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoPreview = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server
    this.uploadLogo(file);
  }

  uploadLogo(file: File): void {
    if (this.storeId === null) {
      this.uploadError = 'Fehler: Store-Kontext nicht verfügbar';
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    this.mediaService.uploadMediaWithProgress(this.storeId, file, 'LOGO').subscribe({
      next: (event) => {
        if (event.progress !== undefined) {
          this.uploadProgress = event.progress;
        }
        if (event.response) {
          // Upload complete
          this.uploadedLogoUrl = event.response.url;
          this.uploading = false;
          this.uploadProgress = 100;
          console.log('✅ Logo uploaded:', event.response);
        }
      },
      error: (err) => {
        console.error('❌ Upload error:', err);
        this.uploading = false;
        this.uploadProgress = 0;
        this.uploadError = err.error?.message || 'Upload fehlgeschlagen. Bitte versuchen Sie es erneut.';
        this.logoPreview = null;
        this.uploadedLogoUrl = null;
      }
    });
  }

  retryUpload(): void {
    // Trigger file input again
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  removeLogo(event: Event): void {
    event.stopPropagation();
    this.logoPreview = null;
    this.uploadedLogoUrl = null;
    this.uploadError = null;
    this.uploadProgress = 0;
  }

  updateColor(control: string, event: any): void {
    const value = event.target.value;
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      this.brandingForm.get(control)?.setValue(value);
    }
  }

  applyPreset(preset: any): void {
    this.brandingForm.patchValue({
      primaryColor: preset.colors.primary,
      secondaryColor: preset.colors.secondary,
      accentColor: preset.colors.accent
    });
  }

  reset(): void {
    this.brandingForm.reset({
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      fontFamily: "'Inter', sans-serif"
    });
    this.logoPreview = null;
  }

  save(): void {
    if (this.brandingForm.invalid) return;

    if (this.storeId === null) {
      alert('Fehler: Store-Kontext nicht verfügbar');
      return;
    }

    // Check if upload is still in progress
    if (this.uploading) {
      alert('Bitte warten Sie, bis der Upload abgeschlossen ist.');
      return;
    }

    this.saving = true;

    // Create theme request
    const themeRequest = {
      storeId: this.storeId,
      name: 'Custom Theme',
      type: 'MODERN' as any,
      template: 'CUSTOM' as any,
      colors: {
        primary: this.brandingForm.get('primaryColor')?.value,
        secondary: this.brandingForm.get('secondaryColor')?.value,
        accent: this.brandingForm.get('accentColor')?.value,
        background: '#ffffff',
        text: '#1a202c',
        textSecondary: '#718096',
        border: '#e2e8f0',
        success: '#48bb78',
        warning: '#ed8936',
        error: '#f56565'
      },
      typography: {
        fontFamily: this.brandingForm.get('fontFamily')?.value,
        headingFontFamily: this.brandingForm.get('fontFamily')?.value,
        fontSize: {
          small: '0.875rem',
          base: '1rem',
          large: '1.125rem',
          xl: '1.5rem',
          xxl: '2.25rem'
        }
      },
      layout: {
        headerStyle: 'fixed' as any,
        footerStyle: 'full' as any,
        productGridColumns: 3 as any,
        borderRadius: 'medium' as any,
        spacing: 'normal' as any
      },
      logoUrl: this.uploadedLogoUrl || undefined
    };

    this.themeService.createTheme(themeRequest).subscribe({
      next: (theme) => {
        console.log('✅ Theme saved:', theme);
        this.saving = false;
        alert('Branding erfolgreich gespeichert!');
      },
      error: (err) => {
        console.error('❌ Error saving theme:', err);
        this.saving = false;
        alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
      }
    });
  }
}


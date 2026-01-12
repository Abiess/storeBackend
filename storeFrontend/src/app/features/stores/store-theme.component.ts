import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import {
  StoreTheme,
  ThemePreset,
  ThemeType,
  ShopTemplate,
  CreateThemeRequest
} from '../../core/models';

@Component({
  selector: 'app-store-theme',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="theme-container">
      <div class="theme-header">
        <button class="back-button" (click)="goBack()">
          ← Zurück zum Store
        </button>
        <div class="header-content">
          <h1>🎨 Theme-Verwaltung</h1>
          <p>Gestalten Sie das Aussehen Ihres Shops</p>
        </div>
      </div>

      <div class="theme-content" *ngIf="!loading">
        <!-- Aktives Theme -->
        <div class="active-theme-section" *ngIf="activeTheme">
          <h2>Aktives Theme</h2>
          <div class="theme-card active">
            <div class="theme-preview" [style.background]="activeTheme.colors?.primary || '#667eea'">
              <div class="preview-content">
                <h3>{{ activeTheme.name }}</h3>
                <span class="theme-type">{{ getThemeTypeName(activeTheme.type) }}</span>
              </div>
            </div>
            <div class="theme-info">
              <p><strong>Template:</strong> {{ getTemplateName(activeTheme.template) }}</p>
              <p><strong>Erstellt:</strong> {{ activeTheme.createdAt | date:'dd.MM.yyyy' }}</p>
              <button class="btn btn-primary" (click)="editTheme(activeTheme)">
                Bearbeiten
              </button>
            </div>
          </div>
        </div>

        <!-- Theme Presets -->
        <div class="presets-section">
          <h2>Theme-Vorlagen</h2>
          <p class="section-description">Wählen Sie eine Vorlage als Ausgangspunkt für Ihr Theme</p>
          
          <div class="presets-grid">
            <div class="preset-card" *ngFor="let preset of presets">
              <div class="preset-preview" [style.background]="'linear-gradient(135deg, ' + preset.colors.primary + ', ' + preset.colors.secondary + ')'">
                <div class="preview-overlay">
                  <h3>{{ preset.name }}</h3>
                </div>
              </div>
              <div class="preset-info">
                <p>{{ preset.description }}</p>
                <div class="color-palette">
                  <span class="color-dot" [style.background]="preset.colors.primary" [title]="'Primär: ' + preset.colors.primary"></span>
                  <span class="color-dot" [style.background]="preset.colors.secondary" [title]="'Sekundär: ' + preset.colors.secondary"></span>
                  <span class="color-dot" [style.background]="preset.colors.accent" [title]="'Akzent: ' + preset.colors.accent"></span>
                </div>
                <button class="btn btn-primary" (click)="selectPreset(preset)">
                  Verwenden
                </button>
              </div>
            </div>
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
                  <label>Sekundärfarbe</label>
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
          <h2>Vorschau</h2>
          <div class="theme-preview-full" 
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

    .preset-preview {
      height: 120px;
      position: relative;
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
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeId = +params['id'];
      this.loadThemes();
      this.loadPresets();
    });
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
    this.themeService.getThemePresets().subscribe({
      next: (presets) => {
        this.presets = presets;
      },
      error: (error) => {
        console.error('Error loading presets:', error);
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
      this.selectedPreset = {
        ...preset,
        colors: theme.colors,
        typography: theme.typography,
        layout: theme.layout
      };
      this.themeName = theme.name;
      this.selectedTemplate = theme.template;
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
        alert('Theme erfolgreich gespeichert!');
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


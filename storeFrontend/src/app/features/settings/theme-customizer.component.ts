import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '@app/core/services/theme.service';
import {
  ThemePreset,
  StoreTheme,
  ThemeType,
  ShopTemplate,
  CreateThemeRequest
} from '@app/core/models';

@Component({
  selector: 'app-theme-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './theme-customizer.component.html',
  styleUrls: ['./theme-customizer.component.scss']
})
export class ThemeCustomizerComponent implements OnInit {
  storeId!: number;
  themePresets: ThemePreset[] = [];
  selectedPreset: ThemePreset | null = null;
  currentTheme: StoreTheme | null = null;

  // Customization state
  customColors = {
    primary: '',
    secondary: '',
    accent: '',
    background: '',
    text: ''
  };

  customLayout = {
    productGridColumns: 3 as 2 | 3 | 4,
    headerStyle: 'fixed' as 'fixed' | 'static' | 'transparent',
    borderRadius: 'medium' as 'none' | 'small' | 'medium' | 'large'
  };

  customCss = '';
  saving = false;
  showPreview = false;

  // Expose enums to template
  ThemeType = ThemeType;
  ShopTemplate = ShopTemplate;

  constructor(
    private themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.loadThemePresets();
    this.loadCurrentTheme();
  }

  loadThemePresets(): void {
    this.themeService.getThemePresets().subscribe({
      next: (presets) => {
        this.themePresets = presets;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Theme-Presets:', error);
      }
    });
  }

  loadCurrentTheme(): void {
    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        this.currentTheme = theme;
        if (theme) {
          this.customColors = { ...theme.colors };
          this.customLayout = { ...theme.layout };
          this.customCss = theme.customCss || '';
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden des aktuellen Themes:', error);
      }
    });
  }

  selectPreset(preset: ThemePreset): void {
    this.selectedPreset = preset;
    this.customColors = { ...preset.colors };
    this.customLayout = { ...preset.layout };

    // Live-Preview
    this.applyPreview();
  }

  applyPreview(): void {
    if (!this.selectedPreset) return;

    const previewTheme: StoreTheme = {
      id: 0,
      storeId: this.storeId,
      name: 'Preview',
      type: this.selectedPreset.type,
      template: ShopTemplate.CUSTOM,
      colors: this.customColors as any,
      typography: this.selectedPreset.typography,
      layout: this.customLayout as any,
      customCss: this.customCss,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.themeService.applyTheme(previewTheme);
  }

  saveTheme(): void {
    if (!this.selectedPreset) {
      alert('Bitte wählen Sie zuerst ein Theme-Preset aus.');
      return;
    }

    this.saving = true;

    const request: CreateThemeRequest = {
      storeId: this.storeId,
      name: `${this.selectedPreset.name} - Custom`,
      type: this.selectedPreset.type,
      template: ShopTemplate.CUSTOM,
      colors: this.customColors as any,
      typography: this.selectedPreset.typography,
      layout: this.customLayout as any,
      customCss: this.customCss
    };

    this.themeService.createTheme(request).subscribe({
      next: (theme) => {
        this.saving = false;
        this.currentTheme = theme;
        this.themeService.applyTheme(theme);
        alert('✅ Theme erfolgreich gespeichert!');
      },
      error: (error) => {
        console.error('Fehler beim Speichern des Themes:', error);
        alert('❌ Fehler beim Speichern des Themes.');
        this.saving = false;
      }
    });
  }

  resetToDefault(): void {
    if (this.selectedPreset) {
      this.customColors = { ...this.selectedPreset.colors };
      this.customLayout = { ...this.selectedPreset.layout };
      this.customCss = '';
      this.applyPreview();
    }
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }
}


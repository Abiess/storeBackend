import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, tap, catchError, map } from 'rxjs/operators';
import {
  StoreTheme,
  ThemePreset,
  ThemeType,
  ShopTemplate,
  CreateThemeRequest,
  ThemeColors,
  ThemeTypography,
  ThemeLayout
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly API_URL = `${environment.apiUrl}/themes`;
  private currentTheme$ = new BehaviorSubject<StoreTheme | null>(null);

  // Vordefinierte Theme-Presets
  private readonly THEME_PRESETS: ThemePreset[] = [
    {
      type: ThemeType.MODERN,
      name: 'Modern',
      description: 'Sauberes, modernes Design mit lebendigen Farben',
      preview: '/assets/themes/modern-preview.jpg',
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        background: '#ffffff',
        text: '#1a202c',
        textSecondary: '#718096',
        border: '#e2e8f0',
        success: '#48bb78',
        warning: '#ed8936',
        error: '#f56565'
      },
      typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        headingFontFamily: "'Poppins', sans-serif",
        fontSize: {
          small: '0.875rem',
          base: '1rem',
          large: '1.125rem',
          xl: '1.5rem',
          xxl: '2.25rem'
        }
      },
      layout: {
        headerStyle: 'fixed',
        footerStyle: 'full',
        productGridColumns: 3,
        borderRadius: 'medium',
        spacing: 'normal'
      }
    },
    {
      type: ThemeType.CLASSIC,
      name: 'Klassisch',
      description: 'Zeitloses Design für traditionelle Shops',
      preview: '/assets/themes/classic-preview.jpg',
      colors: {
        primary: '#2c5282',
        secondary: '#2d3748',
        accent: '#d69e2e',
        background: '#f7fafc',
        text: '#2d3748',
        textSecondary: '#718096',
        border: '#cbd5e0',
        success: '#38a169',
        warning: '#d69e2e',
        error: '#e53e3e'
      },
      typography: {
        fontFamily: "'Georgia', 'Times New Roman', serif",
        headingFontFamily: "'Playfair Display', serif",
        fontSize: {
          small: '0.875rem',
          base: '1rem',
          large: '1.125rem',
          xl: '1.5rem',
          xxl: '2.5rem'
        }
      },
      layout: {
        headerStyle: 'static',
        footerStyle: 'full',
        productGridColumns: 3,
        borderRadius: 'small',
        spacing: 'normal'
      }
    },
    {
      type: ThemeType.MINIMAL,
      name: 'Minimalistisch',
      description: 'Reduziertes Design mit Fokus auf Produkte',
      preview: '/assets/themes/minimal-preview.jpg',
      colors: {
        primary: '#000000',
        secondary: '#4a5568',
        accent: '#718096',
        background: '#ffffff',
        text: '#000000',
        textSecondary: '#718096',
        border: '#e2e8f0',
        success: '#38a169',
        warning: '#d69e2e',
        error: '#e53e3e'
      },
      typography: {
        fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
        headingFontFamily: "'Helvetica Neue', sans-serif",
        fontSize: {
          small: '0.8125rem',
          base: '0.9375rem',
          large: '1.0625rem',
          xl: '1.375rem',
          xxl: '2rem'
        }
      },
      layout: {
        headerStyle: 'static',
        footerStyle: 'minimal',
        productGridColumns: 4,
        borderRadius: 'none',
        spacing: 'spacious'
      }
    },
    {
      type: ThemeType.ELEGANT,
      name: 'Elegant',
      description: 'Luxuriöses Design für Premium-Produkte',
      preview: '/assets/themes/elegant-preview.jpg',
      colors: {
        primary: '#744210',
        secondary: '#2d3748',
        accent: '#d4af37',
        background: '#fafaf9',
        text: '#1c1917',
        textSecondary: '#78716c',
        border: '#e7e5e4',
        success: '#15803d',
        warning: '#ca8a04',
        error: '#dc2626'
      },
      typography: {
        fontFamily: "'Cormorant Garamond', serif",
        headingFontFamily: "'Cinzel', serif",
        fontSize: {
          small: '0.9375rem',
          base: '1.0625rem',
          large: '1.1875rem',
          xl: '1.625rem',
          xxl: '2.75rem'
        }
      },
      layout: {
        headerStyle: 'transparent',
        footerStyle: 'full',
        productGridColumns: 3,
        borderRadius: 'small',
        spacing: 'spacious'
      }
    },
    {
      type: ThemeType.DARK,
      name: 'Dunkel',
      description: 'Modernes dunkles Theme für Tech-Produkte',
      preview: '/assets/themes/dark-preview.jpg',
      colors: {
        primary: '#818cf8',
        secondary: '#a78bfa',
        accent: '#c084fc',
        background: '#0f172a',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171'
      },
      typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        headingFontFamily: "'Rajdhani', sans-serif",
        fontSize: {
          small: '0.875rem',
          base: '1rem',
          large: '1.125rem',
          xl: '1.5rem',
          xxl: '2.25rem'
        }
      },
      layout: {
        headerStyle: 'fixed',
        footerStyle: 'minimal',
        productGridColumns: 3,
        borderRadius: 'medium',
        spacing: 'normal'
      }
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Hole alle verfügbaren Theme-Presets
   */
  getThemePresets(): Observable<ThemePreset[]> {
    return of(this.THEME_PRESETS).pipe(delay(200));
  }

  /**
   * Hole ein spezifisches Theme-Preset
   */
  getThemePreset(type: ThemeType): Observable<ThemePreset | undefined> {
    const preset = this.THEME_PRESETS.find(p => p.type === type);
    return of(preset).pipe(delay(100));
  }

  /**
   * Erstelle ein neues Theme
   */
  createTheme(request: CreateThemeRequest): Observable<StoreTheme> {
    console.log('🎨 Creating theme', request);

    // ✅ Serialisiere die komplexen Objekte zu JSON-Strings für das Backend
    const backendRequest = {
      storeId: request.storeId,
      name: request.name,
      type: request.type,
      template: request.template,
      colorsJson: JSON.stringify(request.colors),
      typographyJson: JSON.stringify(request.typography),
      layoutJson: JSON.stringify(request.layout),
      customCss: request.customCss
    };

    return this.http.post<any>(this.API_URL, backendRequest).pipe(
      map(dto => this.convertDTOtoTheme(dto)),
      tap(theme => {
        console.log('✅ Theme in Datenbank gespeichert:', theme);
        this.currentTheme$.next(theme);
      })
    );
  }

  /**
   * Konvertiere Backend-DTO zu Frontend-Theme
   */
  private convertDTOtoTheme(dto: any): StoreTheme {
    return {
      id: dto.id,
      storeId: dto.storeId,
      name: dto.name,
      type: dto.type as ThemeType,
      template: dto.template as ShopTemplate,
      colors: typeof dto.colorsJson === 'string' ? JSON.parse(dto.colorsJson) : dto.colorsJson,
      typography: typeof dto.typographyJson === 'string' ? JSON.parse(dto.typographyJson) : dto.typographyJson,
      layout: typeof dto.layoutJson === 'string' ? JSON.parse(dto.layoutJson) : dto.layoutJson,
      customCss: dto.customCss,
      isActive: dto.isActive,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    };
  }

  /**
   * Hole aktives Theme für einen Store
   */
  getActiveTheme(storeId: number): Observable<StoreTheme | null> {
    return this.http.get<any>(`${this.API_URL}/store/${storeId}/active`).pipe(
      map(dto => dto ? this.convertDTOtoTheme(dto) : null),
      tap(theme => {
        if (theme) {
          console.log('✅ Theme aus Datenbank geladen:', theme.name);
          this.currentTheme$.next(theme);
        }
      }),
      catchError(error => {
        console.warn('Theme-Laden fehlgeschlagen:', error);
        return of(null);
      })
    );
  }

  /**
   * Hole alle Themes eines Stores
   */
  getStoreThemes(storeId: number): Observable<StoreTheme[]> {
    return this.http.get<StoreTheme[]>(`${this.API_URL}/store/${storeId}`);
  }

  /**
   * Aktualisiere ein Theme
   */
  updateTheme(themeId: number, updates: Partial<StoreTheme>): Observable<StoreTheme> {
    console.log('🎨 Updating theme', themeId, updates);
    return this.http.put<StoreTheme>(`${this.API_URL}/${themeId}`, updates).pipe(
      tap(theme => this.currentTheme$.next(theme))
    );
  }

  /**
   * Aktiviere ein Theme
   */
  activateTheme(storeId: number, themeId: number): Observable<StoreTheme> {
    console.log('🎨 Activating theme', themeId);
    return this.http.post<StoreTheme>(`${this.API_URL}/${themeId}/activate`, { storeId }).pipe(
      tap(theme => this.currentTheme$.next(theme))
    );
  }

  /**
   * Lösche ein Theme
   */
  deleteTheme(themeId: number): Observable<void> {
    console.log('🎨 Deleting theme', themeId);
    return this.http.delete<void>(`${this.API_URL}/${themeId}`);
  }

  // ===================================================================
  // Free / Premium Theme-Templates aus dem Backend-Katalog
  // ===================================================================

  /**
   * Lade alle Theme-Templates aus dem Backend (Free + Premium).
   * Optional nur Free-Templates.
   */
  getTemplatesFromBackend(onlyFree: boolean = false): Observable<ThemePreset[]> {
    const url = `${this.API_URL}/templates?onlyFree=${onlyFree}`;
    return this.http.get<any[]>(url).pipe(
      map(list => list.map(t => this.convertTemplateDTOToPreset(t))),
      catchError(error => {
        console.warn('⚠️ Templates konnten nicht aus DB geladen werden, fallback auf lokale Presets', error);
        return of(this.THEME_PRESETS);
      })
    );
  }

  /**
   * 1-Klick: Wende ein Free-Template auf einen Store an.
   * Das Backend speichert sofort als aktives Theme.
   */
  applyTemplateToStore(storeId: number, templateId: number, customName?: string): Observable<StoreTheme> {
    let url = `${this.API_URL}/store/${storeId}/apply-template/${templateId}`;
    if (customName) {
      url += `?name=${encodeURIComponent(customName)}`;
    }
    return this.http.post<any>(url, {}).pipe(
      map(dto => this.convertDTOtoTheme(dto)),
      tap(theme => {
        console.log('✅ Template auf Store angewendet & gespeichert:', theme.name);
        this.currentTheme$.next(theme);
        this.applyTheme(theme);
      })
    );
  }

  private convertTemplateDTOToPreset(dto: any): ThemePreset & { id?: number; isFree?: boolean; preview?: string } {
    return {
      id: dto.id,
      type: dto.type as ThemeType,
      name: dto.name,
      description: dto.description,
      preview: dto.previewUrl || '/assets/themes/default-preview.jpg',
      isFree: dto.isFree,
      colors: typeof dto.colorsJson === 'string' ? JSON.parse(dto.colorsJson) : dto.colorsJson,
      typography: typeof dto.typographyJson === 'string' ? JSON.parse(dto.typographyJson) : dto.typographyJson,
      layout: typeof dto.layoutJson === 'string' ? JSON.parse(dto.layoutJson) : dto.layoutJson
    } as any;
  }

  /**
   * Wende Theme-CSS auf die Seite an
   */
  applyTheme(theme: StoreTheme): void {
    // ✅ Validiere Theme-Struktur vor dem Anwenden
    if (!theme || !theme.colors || !theme.typography || !theme.layout) {
      console.error('❌ Ungültiges Theme kann nicht angewendet werden:', theme);
      return;
    }

    const root = document.documentElement;

    // Farben anwenden
    root.style.setProperty('--theme-primary', theme.colors.primary || '#667eea');
    root.style.setProperty('--theme-secondary', theme.colors.secondary || '#764ba2');
    root.style.setProperty('--theme-accent', theme.colors.accent || '#f093fb');
    root.style.setProperty('--theme-background', theme.colors.background || '#ffffff');
    root.style.setProperty('--theme-text', theme.colors.text || '#1a202c');
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary || '#718096');
    root.style.setProperty('--theme-border', theme.colors.border || '#e2e8f0');
    root.style.setProperty('--theme-success', theme.colors.success || '#48bb78');
    root.style.setProperty('--theme-warning', theme.colors.warning || '#ed8936');
    root.style.setProperty('--theme-error', theme.colors.error || '#f56565');

    // Typografie anwenden
    root.style.setProperty('--theme-font-family', theme.typography.fontFamily || 'Inter, sans-serif');
    root.style.setProperty('--theme-heading-font-family', theme.typography.headingFontFamily || theme.typography.fontFamily || 'Poppins, sans-serif');
    root.style.setProperty('--theme-font-size-small', theme.typography.fontSize?.small || '0.875rem');
    root.style.setProperty('--theme-font-size-base', theme.typography.fontSize?.base || '1rem');
    root.style.setProperty('--theme-font-size-large', theme.typography.fontSize?.large || '1.125rem');
    root.style.setProperty('--theme-font-size-xl', theme.typography.fontSize?.xl || '1.5rem');
    root.style.setProperty('--theme-font-size-xxl', theme.typography.fontSize?.xxl || '2.25rem');

    // Layout anwenden
    const borderRadiusMap: Record<string, string> = {
      none: '0',
      small: '4px',
      medium: '8px',
      large: '16px'
    };
    root.style.setProperty('--theme-border-radius', borderRadiusMap[theme.layout.borderRadius] || '8px');

    const spacingMap: Record<string, string> = {
      compact: '0.5rem',
      normal: '1rem',
      spacious: '1.5rem'
    };
    root.style.setProperty('--theme-spacing', spacingMap[theme.layout.spacing] || '1rem');

    // ✅ NEU: Produktraster-Spalten anwenden
    root.style.setProperty('--theme-product-grid-columns', String(theme.layout.productGridColumns || 3));
    console.log('🎨 Produktraster-Spalten gesetzt auf:', theme.layout.productGridColumns);

    // Custom CSS anwenden
    if (theme.customCss) {
      let styleEl = document.getElementById('custom-theme-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-theme-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = theme.customCss;
    }

    this.currentTheme$.next(theme);
    console.log('✅ Theme erfolgreich angewendet:', theme.name);
  }

  /**
   * Hole aktuelles Theme als Observable
   */
  getCurrentTheme(): Observable<StoreTheme | null> {
    return this.currentTheme$.asObservable();
  }

  /**
   * Generiere CSS-Variablen String
   */
  generateCssVariables(theme: StoreTheme): string {
    return `
:root {
  --theme-primary: ${theme.colors.primary};
  --theme-secondary: ${theme.colors.secondary};
  --theme-accent: ${theme.colors.accent};
  --theme-background: ${theme.colors.background};
  --theme-text: ${theme.colors.text};
  --theme-text-secondary: ${theme.colors.textSecondary};
  --theme-border: ${theme.colors.border};
  --theme-success: ${theme.colors.success};
  --theme-warning: ${theme.colors.warning};
  --theme-error: ${theme.colors.error};
  
  --theme-font-family: ${theme.typography.fontFamily};
  --theme-heading-font-family: ${theme.typography.headingFontFamily || theme.typography.fontFamily};
  --theme-font-size-small: ${theme.typography.fontSize.small};
  --theme-font-size-base: ${theme.typography.fontSize.base};
  --theme-font-size-large: ${theme.typography.fontSize.large};
  --theme-font-size-xl: ${theme.typography.fontSize.xl};
  --theme-font-size-xxl: ${theme.typography.fontSize.xxl};
}
    `.trim();
  }
}

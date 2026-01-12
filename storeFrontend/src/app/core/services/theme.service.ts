import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';
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
   * Hole aktives Theme für einen Store
   */
  getActiveTheme(storeId: number): Observable<StoreTheme | null> {
    if (environment.useMockData) {
      // ✅ Zuerst im LocalStorage nachschauen
      const savedTheme = this.loadThemeFromLocalStorage(storeId);
      if (savedTheme) {
        console.log('💾 Theme aus LocalStorage geladen:', savedTheme.name);
        return of(savedTheme).pipe(
          delay(100),
          tap(theme => this.currentTheme$.next(theme))
        );
      }

      // Fallback: Standard Mock-Theme
      const mockTheme: StoreTheme = {
        id: 1,
        storeId: storeId,
        name: 'Modern Theme',
        type: ThemeType.MODERN,
        template: ShopTemplate.ELECTRONICS,
        colors: this.THEME_PRESETS[0].colors,
        typography: this.THEME_PRESETS[0].typography,
        layout: this.THEME_PRESETS[0].layout,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return of(mockTheme).pipe(
        delay(300),
        tap(theme => this.currentTheme$.next(theme))
      );
    }
    return this.http.get<StoreTheme>(`${this.API_URL}/store/${storeId}/active`).pipe(
      tap(theme => this.currentTheme$.next(theme)),
      catchError(error => {
        console.warn('Theme-Laden fehlgeschlagen, verwende Standard-Theme:', error);
        return of(null);
      })
    );
  }

  /**
   * Speichere Theme im LocalStorage (für Mock-Modus)
   */
  private saveThemeToLocalStorage(storeId: number, theme: StoreTheme): void {
    try {
      const key = `store_${storeId}_theme`;
      localStorage.setItem(key, JSON.stringify(theme));
      console.log('💾 Theme im LocalStorage gespeichert:', key);
    } catch (error) {
      console.error('Fehler beim Speichern im LocalStorage:', error);
    }
  }

  /**
   * Lade Theme aus LocalStorage (für Mock-Modus)
   */
  private loadThemeFromLocalStorage(storeId: number): StoreTheme | null {
    try {
      const key = `store_${storeId}_theme`;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Fehler beim Laden aus LocalStorage:', error);
    }
    return null;
  }

  /**
   * Hole alle Themes eines Stores
   */
  getStoreThemes(storeId: number): Observable<StoreTheme[]> {
    if (environment.useMockData) {
      return of([]).pipe(delay(300));
    }
    return this.http.get<StoreTheme[]>(`${this.API_URL}/store/${storeId}`);
  }

  /**
   * Erstelle ein neues Theme
   */
  createTheme(request: CreateThemeRequest): Observable<StoreTheme> {
    if (environment.useMockData) {
      console.log('🎨 Mock: Creating theme', request);
      const preset = this.THEME_PRESETS.find(p => p.type === request.type);

      const newTheme: StoreTheme = {
        id: Date.now(),
        storeId: request.storeId,
        name: request.name,
        type: request.type,
        template: request.template,
        colors: { ...preset!.colors, ...request.colors },
        typography: { ...preset!.typography, ...request.typography },
        layout: { ...preset!.layout, ...request.layout },
        customCss: request.customCss,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // ✅ Im LocalStorage speichern für Persistenz
      this.saveThemeToLocalStorage(request.storeId, newTheme);

      return of(newTheme).pipe(
        delay(500),
        tap(theme => this.currentTheme$.next(theme))
      );
    }
    return this.http.post<StoreTheme>(this.API_URL, request).pipe(
      tap(theme => this.currentTheme$.next(theme))
    );
  }

  /**
   * Aktualisiere ein Theme
   */
  updateTheme(themeId: number, updates: Partial<StoreTheme>): Observable<StoreTheme> {
    if (environment.useMockData) {
      console.log('🎨 Mock: Updating theme', themeId, updates);
      const updatedTheme: StoreTheme = {
        ...(this.currentTheme$.value || {} as StoreTheme),
        ...updates,
        id: themeId,
        updatedAt: new Date().toISOString()
      };

      return of(updatedTheme).pipe(
        delay(500),
        tap(theme => this.currentTheme$.next(theme))
      );
    }
    return this.http.put<StoreTheme>(`${this.API_URL}/${themeId}`, updates).pipe(
      tap(theme => this.currentTheme$.next(theme))
    );
  }

  /**
   * Aktiviere ein Theme
   */
  activateTheme(storeId: number, themeId: number): Observable<StoreTheme> {
    if (environment.useMockData) {
      console.log('🎨 Mock: Activating theme', themeId);
      const theme = this.currentTheme$.value!;
      return of({ ...theme, isActive: true }).pipe(
        delay(300),
        tap(t => this.currentTheme$.next(t))
      );
    }
    return this.http.post<StoreTheme>(`${this.API_URL}/${themeId}/activate`, { storeId }).pipe(
      tap(theme => this.currentTheme$.next(theme))
    );
  }

  /**
   * Lösche ein Theme
   */
  deleteTheme(themeId: number): Observable<void> {
    if (environment.useMockData) {
      console.log('🎨 Mock: Deleting theme', themeId);
      return of(void 0).pipe(delay(300));
    }
    return this.http.delete<void>(`${this.API_URL}/${themeId}`);
  }

  /**
   * Wende Theme-CSS auf die Seite an
   */
  applyTheme(theme: StoreTheme): void {
    const root = document.documentElement;

    // Farben anwenden
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-warning', theme.colors.warning);
    root.style.setProperty('--theme-error', theme.colors.error);

    // Typografie anwenden
    root.style.setProperty('--theme-font-family', theme.typography.fontFamily);
    root.style.setProperty('--theme-heading-font-family', theme.typography.headingFontFamily || theme.typography.fontFamily);
    root.style.setProperty('--theme-font-size-small', theme.typography.fontSize.small);
    root.style.setProperty('--theme-font-size-base', theme.typography.fontSize.base);
    root.style.setProperty('--theme-font-size-large', theme.typography.fontSize.large);
    root.style.setProperty('--theme-font-size-xl', theme.typography.fontSize.xl);
    root.style.setProperty('--theme-font-size-xxl', theme.typography.fontSize.xxl);

    // Layout anwenden
    const borderRadiusMap = {
      none: '0',
      small: '4px',
      medium: '8px',
      large: '16px'
    };
    root.style.setProperty('--theme-border-radius', borderRadiusMap[theme.layout.borderRadius]);

    const spacingMap = {
      compact: '0.5rem',
      normal: '1rem',
      spacious: '1.5rem'
    };
    root.style.setProperty('--theme-spacing', spacingMap[theme.layout.spacing]);

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

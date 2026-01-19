import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export type SupportedLanguage = 'de' | 'en' | 'ar';

interface TranslationData {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLangSignal = signal<SupportedLanguage>('de');
  private translationsSignal = signal<TranslationData>({});

  // Public readonly signals
  readonly currentLang = this.currentLangSignal.asReadonly();
  readonly translations = this.translationsSignal.asReadonly();

  private readonly STORAGE_KEY = 'app_language';
  private readonly DEFAULT_LANG: SupportedLanguage = 'de';

  // RTL Languages
  private readonly RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

  constructor(private http: HttpClient) {
    this.initializeLanguage();
  }

  /**
   * Initialize language from localStorage or browser settings
   */
  private initializeLanguage(): void {
    const savedLang = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguage;
    const browserLang = this.getBrowserLanguage();

    const lang = savedLang || browserLang || this.DEFAULT_LANG;
    this.setLanguage(lang);
  }

  /**
   * Get browser language
   */
  private getBrowserLanguage(): SupportedLanguage {
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'de' || browserLang === 'en' || browserLang === 'ar') ? browserLang as SupportedLanguage : this.DEFAULT_LANG;
  }

  /**
   * Load translations for a specific language
   */
  private loadTranslations(lang: SupportedLanguage): Observable<TranslationData> {
    return this.http.get<TranslationData>(`/assets/i18n/${lang}.json`).pipe(
      tap(translations => {
        console.log(`✅ Translations loaded for language: ${lang}`);
        this.translationsSignal.set(translations);
      }),
      catchError(error => {
        console.error(`❌ Error loading translations for ${lang}:`, error);
        return of({});
      })
    );
  }

  /**
   * Set the current language and load translations
   */
  setLanguage(lang: SupportedLanguage): void {
    this.currentLangSignal.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);

    // Update document direction and language
    this.updateDirection();

    this.loadTranslations(lang).subscribe();
  }

  /**
   * Toggle between available languages (DE -> EN -> AR -> DE)
   */
  toggleLanguage(): void {
    const currentLang = this.currentLangSignal();
    const languages: SupportedLanguage[] = ['de', 'en', 'ar'];
    const currentIndex = languages.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % languages.length;
    this.setLanguage(languages[nextIndex]);
  }

  /**
   * Get translation for a key (supports nested keys with dot notation)
   * Example: translate('auth.loginTitle')
   */
  translate(key: string, params?: Record<string, any>): string {
    // Safety check: Wenn key nicht vorhanden oder leer ist
    if (!key || typeof key !== 'string') {
      console.warn(`Invalid translation key:`, key);
      return '';
    }

    try {
      const translations = this.translationsSignal();

      // Wenn noch keine Übersetzungen geladen wurden, gib den Key zurück
      if (!translations || Object.keys(translations).length === 0) {
        return key;
      }

      const keys = key.split('.');
      let value: any = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Nur einmal warnen, nicht bei jedem Render
          if (Math.random() < 0.01) { // Nur 1% der Zeit loggen
            console.warn(`Translation key not found: ${key}`);
          }
          return key;
        }
      }

      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string for key: ${key}`);
        return key;
      }

      // Replace parameters in translation string
      if (params) {
        return this.replaceParams(value, params);
      }

      return value;
    } catch (error) {
      console.error(`Error translating key "${key}":`, error);
      return key; // Fallback zum Key bei Fehler
    }
  }

  /**
   * Shorthand for translate
   */
  t(key: string, params?: Record<string, any>): string {
    return this.translate(key, params);
  }

  /**
   * Replace parameters in translation string
   * Example: "Minimum {{min}} characters" with params {min: 5} => "Minimum 5 characters"
   */
  private replaceParams(text: string, params: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Get translation as Observable (for async pipe)
   */
  translate$(key: string, params?: Record<string, any>): Observable<string> {
    return of(this.translate(key, params));
  }

  /**
   * Update document direction based on language
   */
  private updateDirection(): void {
    const lang = this.currentLangSignal();
    const dir = this.isRTL() ? 'rtl' : 'ltr';

    document.documentElement.dir = dir;
    document.documentElement.lang = lang;

    // Add/remove RTL class for additional styling if needed
    if (this.isRTL()) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }

    console.log(`📐 Document direction set to: ${dir} for language: ${lang}`);
  }

  /**
   * Check if current language is RTL
   */
  isRTL(): boolean {
    return this.RTL_LANGUAGES.includes(this.currentLangSignal());
  }

  /**
   * Check if translations are loaded
   */
  isLoaded(): boolean {
    return Object.keys(this.translationsSignal()).length > 0;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return ['de', 'en', 'ar'];
  }

  /**
   * Get language display name
   */
  getLanguageDisplayName(lang: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      'de': 'Deutsch',
      'en': 'English',
      'ar': 'العربية'
    };
    return names[lang];
  }

  /**
   * Get language flag emoji
   */
  getLanguageFlag(lang: SupportedLanguage): string {
    const flags: Record<SupportedLanguage, string> = {
      'de': '🇩🇪',
      'en': '🇬🇧',
      'ar': '🇸🇦'
    };
    return flags[lang];
  }
}

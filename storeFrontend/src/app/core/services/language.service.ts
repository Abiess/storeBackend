import { Injectable, signal, computed } from '@angular/core';
import { translations, Language, TranslationKey } from '../i18n/translations';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguage = signal<Language>('ar'); // Default to Arabic

  // Computed signal for current translations
  translations = computed(() => translations[this.currentLanguage()]);

  // Expose current language as readonly
  language = this.currentLanguage.asReadonly();

  constructor() {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('app-language') as Language;
    if (savedLang && (savedLang === 'ar' || savedLang === 'de')) {
      this.currentLanguage.set(savedLang);
    }

    // Update document direction
    this.updateDirection();
  }

  /**
   * Switch to a different language
   */
  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    localStorage.setItem('app-language', lang);
    this.updateDirection();
  }

  /**
   * Toggle between Arabic and German
   */
  toggleLanguage(): void {
    const newLang: Language = this.currentLanguage() === 'ar' ? 'de' : 'ar';
    this.setLanguage(newLang);
  }

  /**
   * Get translation for a key
   */
  translate(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = this.translations()[key] || key;

    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  }

  /**
   * Get translation using shorthand
   */
  t(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }

  /**
   * Update document direction based on language
   */
  private updateDirection(): void {
    const dir = this.currentLanguage() === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = this.currentLanguage();
  }

  /**
   * Check if current language is RTL
   */
  isRTL(): boolean {
    return this.currentLanguage() === 'ar';
  }
}

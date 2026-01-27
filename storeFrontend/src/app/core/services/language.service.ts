import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LanguageConfig {
  resolvedLanguage: string;
  supportedLanguages: string[];
  direction: 'ltr' | 'rtl';
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly COOKIE_NAME = 'preferred_lang';
  private readonly SUPPORTED_LANGUAGES = ['de', 'en', 'ar'];
  private readonly DEFAULT_LANGUAGE = 'en';

  private currentLanguageSubject = new BehaviorSubject<string>(this.DEFAULT_LANGUAGE);
  private directionSubject = new BehaviorSubject<'ltr' | 'rtl'>('ltr');

  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  public direction$ = this.directionSubject.asObservable();

  constructor(
    private http: HttpClient,
    private translate: TranslateService
  ) {}

  /**
   * Initialisierung - wird vom APP_INITIALIZER aufgerufen
   */
  async initialize(): Promise<void> {
    // Setze verfügbare Sprachen
    this.translate.addLangs(this.SUPPORTED_LANGUAGES);

    // Versuche Sprache zu erkennen
    let detectedLanguage = this.detectLanguageFromCookie();

    if (!detectedLanguage) {
      // Fallback: Backend fragen
      try {
        const config = await firstValueFrom(this.getLanguageConfigFromBackend());
        detectedLanguage = config.resolvedLanguage;
      } catch (error) {
        console.warn('Failed to fetch language config from backend:', error);
        detectedLanguage = this.detectLanguageFromBrowser();
      }
    }

    // Setze die erkannte Sprache
    await this.setLanguage(detectedLanguage, false);
  }

  /**
   * Sprache wechseln
   */
  async setLanguage(lang: string, saveCookie: boolean = true): Promise<void> {
    // Validierung
    if (!this.SUPPORTED_LANGUAGES.includes(lang)) {
      lang = this.DEFAULT_LANGUAGE;
    }

    // Setze Sprache in ngx-translate
    this.translate.setDefaultLang(lang);
    await firstValueFrom(this.translate.use(lang));

    // Direction ermitteln
    const direction: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

    // HTML Attribute setzen
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;

    // Body Klasse für zusätzliches Styling
    document.body.classList.remove('ltr', 'rtl');
    document.body.classList.add(direction);

    // Cookie speichern
    if (saveCookie) {
      this.setCookie(this.COOKIE_NAME, lang, 365);

      // Backend informieren
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/config/language?lang=${lang}`, {}));
      } catch (error) {
        console.warn('Failed to save language preference to backend:', error);
      }
    }

    // Subjects aktualisieren
    this.currentLanguageSubject.next(lang);
    this.directionSubject.next(direction);
  }

  /**
   * Aktuelle Sprache abrufen
   */
  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  /**
   * Aktuelle Direction abrufen
   */
  getCurrentDirection(): 'ltr' | 'rtl' {
    return this.directionSubject.value;
  }

  /**
   * Ist RTL aktiv?
   */
  isRTL(): boolean {
    return this.getCurrentDirection() === 'rtl';
  }

  /**
   * Language Config vom Backend holen
   */
  private getLanguageConfigFromBackend(): Observable<LanguageConfig> {
    return this.http.get<LanguageConfig>(`${environment.apiUrl}/config`);
  }

  /**
   * Sprache aus Cookie lesen
   */
  private detectLanguageFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.COOKIE_NAME) {
        const lang = value.trim();
        if (this.SUPPORTED_LANGUAGES.includes(lang)) {
          return lang;
        }
      }
    }
    return null;
  }

  /**
   * Sprache aus Browser-Einstellungen erkennen
   */
  private detectLanguageFromBrowser(): string {
    const browserLangs = navigator.languages || [navigator.language];

    for (const lang of browserLangs) {
      // Extrahiere Hauptsprache (de-DE -> de)
      const mainLang = lang.split('-')[0].toLowerCase();
      if (this.SUPPORTED_LANGUAGES.includes(mainLang)) {
        return mainLang;
      }
    }

    return this.DEFAULT_LANGUAGE;
  }

  /**
   * Cookie setzen
   */
  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
  }

  /**
   * Unterstützte Sprachen
   */
  getSupportedLanguages(): string[] {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Sprach-Name für Display
   */
  getLanguageDisplayName(lang: string): string {
    const names: { [key: string]: string } = {
      'de': 'Deutsch',
      'en': 'English',
      'ar': 'العربية'
    };
    return names[lang] || lang;
  }
}


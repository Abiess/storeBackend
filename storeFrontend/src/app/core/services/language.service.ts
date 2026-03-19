import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslationService, SupportedLanguage } from './translation.service';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<SupportedLanguage>('en');
  private directionSubject = new BehaviorSubject<'ltr' | 'rtl'>('ltr');

  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  public direction$ = this.directionSubject.asObservable();

  constructor(private translationService: TranslationService) {
    const lang = this.translationService.currentLang();
    this.currentLanguageSubject.next(lang);
    this.directionSubject.next(this.translationService.isRTL() ? 'rtl' : 'ltr');
  }

  async initialize(): Promise<void> {
    const lang = this.translationService.currentLang();
    this.currentLanguageSubject.next(lang);
    this.directionSubject.next(this.translationService.isRTL() ? 'rtl' : 'ltr');
  }

  async setLanguage(lang: string): Promise<void> {
    const safeLang: SupportedLanguage =
        lang === 'de' || lang === 'en' || lang === 'ar' ? lang : 'en';

    this.translationService.setLanguage(safeLang);

    this.currentLanguageSubject.next(safeLang);
    this.directionSubject.next(this.translationService.isRTL() ? 'rtl' : 'ltr');
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.translationService.currentLang();
  }

  getCurrentDirection(): 'ltr' | 'rtl' {
    return this.translationService.isRTL() ? 'rtl' : 'ltr';
  }

  isRTL(): boolean {
    return this.translationService.isRTL();
  }

  getSupportedLanguages(): SupportedLanguage[] {
    return this.translationService.getSupportedLanguages();
  }

  getLanguageDisplayName(lang: string): string {
    return this.translationService.getLanguageDisplayName(lang as SupportedLanguage);
  }
}

import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { CurrencyCode } from '../models';

@Pipe({
  name: 'storeCurrency',
  standalone: true
})
export class StoreCurrencyPipe implements PipeTransform {
  private translationService = inject(TranslationService);

  transform(
    value: number | null | undefined,
    currencyCode: CurrencyCode | string = 'EUR',
    locale?: string
  ): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-';
    }

    // Use current language from TranslationService if locale not provided
    const effectiveLocale = locale ?? this.getLocaleFromLanguage();

    try {
      return new Intl.NumberFormat(effectiveLocale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value));
    } catch (error) {
      // Fallback bei ungültiger Währung oder Locale
      console.warn(`Currency formatting failed for ${currencyCode} in ${effectiveLocale}:`, error);
      return `${Number(value).toFixed(2)} ${currencyCode}`;
    }
  }

  private getLocaleFromLanguage(): string {
    const lang = this.translationService.currentLang();
    
    // Map language codes to locales
    const localeMap: Record<string, string> = {
      'de': 'de-DE',
      'en': 'en-US',
      'ar': 'ar-MA',
      'fr': 'fr-FR'
    };

    return localeMap[lang] || 'de-DE';
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { TranslationKey } from '../i18n/translations';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Make it impure so it updates when language changes
})
export class TranslatePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.languageService.translate(key, params);
  }
}

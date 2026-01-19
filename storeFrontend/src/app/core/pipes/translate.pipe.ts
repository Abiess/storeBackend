import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false // Must be impure to react to language changes
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(key: string, params?: Record<string, any>): string {
    try {
      // Safety check: Wenn key nicht vorhanden ist
      if (!key) {
        return '';
      }

      return this.translationService.translate(key, params);
    } catch (error) {
      // Fehler abfangen und Key zurückgeben statt Exception zu werfen
      console.error('TranslatePipe error:', error);
      return key || '';
    }
  }
}

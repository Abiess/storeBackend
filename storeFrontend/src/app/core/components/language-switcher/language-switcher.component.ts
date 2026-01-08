import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../core/services/translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button 
        *ngFor="let lang of languages"
        [class.active]="lang === currentLang()"
        (click)="switchLanguage(lang)"
        class="lang-button"
        [attr.aria-label]="'Switch to ' + getLanguageName(lang)"
        [title]="getLanguageName(lang)">
        {{ getLanguageFlag(lang) }} <span class="lang-code">{{ lang.toUpperCase() }}</span>
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      padding: 4px;
    }

    .lang-button {
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      color: #666;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
      min-width: 65px;
      justify-content: center;
    }

    .lang-button:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #333;
    }

    .lang-button.active {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .lang-button:focus {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    .lang-code {
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* RTL Support */
    [dir="rtl"] .language-switcher {
      flex-direction: row-reverse;
    }
  `]
})
export class LanguageSwitcherComponent {
  languages: SupportedLanguage[] = ['de', 'en', 'ar'];

  constructor(private translationService: TranslationService) {}

  get currentLang() {
    return this.translationService.currentLang;
  }

  switchLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
  }

  getLanguageName(lang: SupportedLanguage): string {
    return this.translationService.getLanguageDisplayName(lang);
  }

  getLanguageFlag(lang: SupportedLanguage): string {
    return this.translationService.getLanguageFlag(lang);
  }
}

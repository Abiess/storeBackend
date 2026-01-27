import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../../core/services/translation.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button 
        class="language-btn" 
        [class.active]="lang === translationService.currentLang()"
        *ngFor="let lang of languages"
        (click)="changeLanguage(lang)"
        [attr.aria-label]="getLanguageLabel(lang)">
        <span class="flag">{{ getFlag(lang) }}</span>
        <span class="lang-code">{{ lang.toUpperCase() }}</span>
      </button>
    </div>
  `,
  styles: [`
    .language-selector {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .language-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.875rem;
      font-weight: 500;
      color: #1d1d1f;
      
      &:hover {
        border-color: rgba(0, 113, 227, 0.3);
        background: rgba(0, 113, 227, 0.05);
        transform: translateY(-1px);
      }
      
      &.active {
        border-color: #0071e3;
        background: rgba(0, 113, 227, 0.1);
        color: #0071e3;
        font-weight: 600;
      }
      
      .flag {
        font-size: 1.25rem;
        line-height: 1;
      }
      
      .lang-code {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }
    
    /* Mobile Responsive */
    @media (max-width: 640px) {
      .language-selector {
        gap: 0.375rem;
      }
      
      .language-btn {
        padding: 0.375rem 0.625rem;
        font-size: 0.8125rem;
        
        .flag {
          font-size: 1.125rem;
        }
        
        .lang-code {
          display: none;
        }
      }
    }
    
    /* RTL Support */
    [dir="rtl"] .language-selector {
      flex-direction: row-reverse;
    }
  `]
})
export class LanguageSelectorComponent {
  languages: SupportedLanguage[] = ['de', 'en', 'ar'];

  constructor(public translationService: TranslationService) {}

  changeLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
  }

  getFlag(lang: SupportedLanguage): string {
    const flags: Record<SupportedLanguage, string> = {
      de: '🇩🇪',
      en: '🇬🇧',
      ar: '🇸🇦'
    };
    return flags[lang];
  }

  getLanguageLabel(lang: SupportedLanguage): string {
    const labels: Record<SupportedLanguage, string> = {
      de: 'Deutsch',
      en: 'English',
      ar: 'العربية'
    };
    return labels[lang];
  }
}

import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../../core/services/translation.service';

@Component({
    selector: 'app-language-selector',
    imports: [CommonModule],
    template: `
    <div class="selector-dropdown" [class.open]="isOpen">
      <button 
        class="selector-button"
        (click)="toggleDropdown()"
        [attr.aria-label]="'Sprache wechseln'"
        [attr.aria-expanded]="isOpen"
        type="button">
        <span class="selector-icon">{{ getCurrentFlag() }}</span>
        <span class="selector-label">{{ getCurrentLabel() }}</span>
        <svg class="selector-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      
      <div class="selector-menu" *ngIf="isOpen">
        <button 
          class="selector-option"
          [class.active]="lang === translationService.currentLang()"
          *ngFor="let lang of languages"
          (click)="changeLanguage(lang)"
          type="button">
          <span class="option-flag">{{ getFlag(lang) }}</span>
          <span class="option-label">{{ getLanguageLabel(lang) }}</span>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .selector-dropdown {
      position: relative;
      display: inline-block;
    }

    .selector-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      font-weight: 500;
      color: #1d1d1f;
      min-width: 120px;
      
      &:hover {
        border-color: rgba(103, 126, 234, 0.3);
        background: rgba(103, 126, 234, 0.05);
      }
      
      .selector-icon {
        font-size: 1.25rem;
        line-height: 1;
      }
      
      .selector-label {
        flex: 1;
        text-align: left;
      }
      
      .selector-chevron {
        opacity: 0.5;
        transition: transform 0.2s ease;
      }
    }
    
    .selector-dropdown.open .selector-button {
      border-color: #667eea;
      background: rgba(103, 126, 234, 0.1);
      
      .selector-chevron {
        transform: rotate(180deg);
      }
    }
    
    .selector-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 1000;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .selector-option {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: none;
      background: white;
      cursor: pointer;
      transition: background 0.15s ease;
      font-size: 0.875rem;
      color: #1d1d1f;
      text-align: left;
      
      &:hover {
        background: rgba(103, 126, 234, 0.08);
      }
      
      &.active {
        background: rgba(103, 126, 234, 0.15);
        font-weight: 600;
        color: #667eea;
      }
      
      .option-flag {
        font-size: 1.25rem;
        line-height: 1;
      }
    }
    
    /* Mobile */
    @media (max-width: 640px) {
      .selector-button {
        min-width: 100px;
        padding: 0.375rem 0.625rem;
        font-size: 0.8125rem;
      }
    }
    
    /* RTL */
    [dir="rtl"] .selector-label {
      text-align: right;
    }
  `]
})
export class LanguageSelectorComponent {
  languages: SupportedLanguage[] = ['de', 'en', 'ar', 'fr'];
  isOpen = false;

  constructor(public translationService: TranslationService) {}

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-dropdown')) {
      this.isOpen = false;
    }
  }

  changeLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
    this.isOpen = false;
  }

  getCurrentFlag(): string {
    return this.getFlag(this.translationService.currentLang());
  }

  getCurrentLabel(): string {
    return this.getLanguageLabel(this.translationService.currentLang());
  }

  getFlag(lang: SupportedLanguage): string {
    const flags: Record<SupportedLanguage, string> = {
      de: '🇩🇪',
      en: '🇬🇧',
      ar: '🇸🇦',
      fr: '🇫🇷'
    };
    return flags[lang];
  }

  getLanguageLabel(lang: SupportedLanguage): string {
    const labels: Record<SupportedLanguage, string> = {
      de: 'Deutsch',
      en: 'English',
      ar: 'العربية',
      fr: 'Français'
    };
    return labels[lang];
  }
}

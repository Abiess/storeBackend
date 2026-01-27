import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="language-switcher">
      <button 
        class="language-button"
        [class.rtl]="languageService.isRTL()"
        (click)="toggleDropdown()"
        type="button">
        <span class="language-icon">🌐</span>
        <span class="language-text">{{ languageService.getLanguageDisplayName(currentLanguage) }}</span>
        <span class="dropdown-arrow" [class.open]="isOpen">▼</span>
      </button>
      
      <div class="language-dropdown" *ngIf="isOpen" [class.rtl]="languageService.isRTL()">
        <button
          *ngFor="let lang of supportedLanguages"
          class="language-option"
          [class.active]="lang === currentLanguage"
          (click)="selectLanguage(lang)"
          type="button">
          <span class="language-flag">{{ getFlag(lang) }}</span>
          <span class="language-name">{{ languageService.getLanguageDisplayName(lang) }}</span>
          <span class="check-icon" *ngIf="lang === currentLanguage">✓</span>
        </button>
      </div>
    </div>
    
    <!-- Overlay zum Schließen -->
    <div class="dropdown-overlay" *ngIf="isOpen" (click)="closeDropdown()"></div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
      z-index: 100;
    }

    .language-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
      color: #374151;
    }

    .language-button:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .language-button.rtl {
      flex-direction: row-reverse;
    }

    .language-icon {
      font-size: 1.25rem;
    }

    .dropdown-arrow {
      font-size: 0.625rem;
      transition: transform 0.2s;
    }

    .dropdown-arrow.open {
      transform: rotate(180deg);
    }

    .language-dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      inset-inline-end: 0;
      min-width: 200px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: fadeIn 0.2s ease-out;
    }

    .language-dropdown.rtl {
      text-align: start;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-0.5rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
      text-align: start;
      color: #374151;
    }

    .language-option:hover {
      background: #f9fafb;
    }

    .language-option.active {
      background: #eff6ff;
      color: #2563eb;
    }

    .language-flag {
      font-size: 1.5rem;
    }

    .language-name {
      flex: 1;
    }

    .check-icon {
      color: #10b981;
      font-weight: bold;
    }

    .dropdown-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99;
    }

    /* RTL Adjustments */
    :host-context([dir="rtl"]) .language-dropdown {
      left: 0;
      right: auto;
    }
  `]
})
export class LanguageSwitcherComponent {
  isOpen = false;
  currentLanguage: string;
  supportedLanguages: string[];

  constructor(public languageService: LanguageService) {
    this.currentLanguage = this.languageService.getCurrentLanguage();
    this.supportedLanguages = this.languageService.getSupportedLanguages();

    // Subscribe to language changes
    this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  async selectLanguage(lang: string): Promise<void> {
    await this.languageService.setLanguage(lang, true);
    this.closeDropdown();
  }

  getFlag(lang: string): string {
    const flags: { [key: string]: string } = {
      'de': '🇩🇪',
      'en': '🇬🇧',
      'ar': '🇸🇦'
    };
    return flags[lang] || '🌐';
  }
}


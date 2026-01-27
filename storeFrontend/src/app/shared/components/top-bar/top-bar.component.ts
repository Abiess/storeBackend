import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, SupportedLanguage } from '../../../core/services/translation.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="top-bar">
      <div class="container">
        <div class="top-bar-content">
          <!-- Left side: Info/Help -->
          <div class="top-bar-left">
            <a href="#" class="top-bar-link">
              <i class="fas fa-question-circle"></i>
              <span>{{ t('topBar.help') }}</span>
            </a>
            <a href="#" class="top-bar-link">
              <i class="fas fa-phone"></i>
              <span>{{ t('topBar.contact') }}</span>
            </a>
          </div>

          <!-- Right side: Language & User -->
          <div class="top-bar-right">
            <!-- Language Dropdown -->
            <div class="language-dropdown" [class.open]="isDropdownOpen">
              <button 
                class="language-trigger"
                (click)="toggleDropdown()"
                [attr.aria-label]="t('language.select')"
                [attr.aria-expanded]="isDropdownOpen">
                <span class="flag">{{ getCurrentFlag() }}</span>
                <span class="lang-name">{{ getCurrentLanguageName() }}</span>
                <i class="fas fa-chevron-down arrow" [class.rotate]="isDropdownOpen"></i>
              </button>
              
              <div class="dropdown-menu" *ngIf="isDropdownOpen" @slideDown>
                <button 
                  *ngFor="let lang of languages"
                  class="dropdown-item"
                  [class.active]="lang === translationService.currentLang()"
                  (click)="changeLanguage(lang)"
                  [attr.aria-label]="getLanguageLabel(lang)">
                  <span class="flag">{{ getFlag(lang) }}</span>
                  <span class="lang-full-name">{{ getLanguageLabel(lang) }}</span>
                  <i class="fas fa-check check-icon" *ngIf="lang === translationService.currentLang()"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== TOP BAR - Inspired by Amazon/Zalando ==================== */
    .top-bar {
      background: #232f3e;
      color: #ffffff;
      font-size: 0.8125rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .top-bar-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 40px;
      gap: 1rem;
    }

    .top-bar-left,
    .top-bar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .top-bar-link {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #ffffff;
      text-decoration: none;
      padding: 0.375rem 0.625rem;
      border-radius: 4px;
      transition: all 0.2s;
      font-weight: 400;

      i {
        font-size: 0.875rem;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ff9900;
      }
    }

    /* ==================== LANGUAGE DROPDOWN ==================== */
    .language-dropdown {
      position: relative;
      z-index: 100;
    }

    .language-trigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 0.375rem 0.875rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.8125rem;
      font-weight: 500;
      min-width: 120px;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      &:focus {
        outline: 2px solid #ff9900;
        outline-offset: 2px;
      }

      .flag {
        font-size: 1.125rem;
        line-height: 1;
      }

      .lang-name {
        flex: 1;
        text-align: left;
      }

      .arrow {
        font-size: 0.625rem;
        transition: transform 0.2s;
        margin-left: auto;

        &.rotate {
          transform: rotate(180deg);
        }
      }
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 180px;
      overflow: hidden;
      animation: slideDown 0.2s ease-out;
    }

    .dropdown-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      color: #1d1d1f;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      font-size: 0.875rem;
      position: relative;

      &:hover {
        background: #f5f5f7;
      }

      &.active {
        background: rgba(0, 113, 227, 0.08);
        color: #0071e3;
        font-weight: 600;

        .check-icon {
          opacity: 1;
        }
      }

      .flag {
        font-size: 1.25rem;
      }

      .lang-full-name {
        flex: 1;
      }

      .check-icon {
        font-size: 0.875rem;
        color: #0071e3;
        opacity: 0;
      }
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

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .top-bar {
        font-size: 0.75rem;
      }

      .top-bar-content {
        min-height: 36px;
      }

      .top-bar-link span {
        display: none;
      }

      .top-bar-link {
        padding: 0.375rem;
      }

      .language-trigger {
        min-width: auto;
        padding: 0.375rem 0.625rem;
      }

      .lang-name {
        display: none;
      }

      .dropdown-menu {
        right: -1rem;
        left: auto;
      }
    }

    /* ==================== RTL SUPPORT ==================== */
    [dir="rtl"] {
      .top-bar-content {
        flex-direction: row-reverse;
      }

      .language-trigger {
        .lang-name {
          text-align: right;
        }

        .arrow {
          margin-left: 0;
          margin-right: auto;
        }
      }

      .dropdown-menu {
        right: auto;
        left: 0;
      }

      .dropdown-item {
        text-align: right;
        flex-direction: row-reverse;
      }

      .top-bar-link {
        flex-direction: row-reverse;
      }
    }
  `]
})
export class TopBarComponent {
  languages: SupportedLanguage[] = ['de', 'en', 'ar'];
  isDropdownOpen = false;

  constructor(public translationService: TranslationService) {
    // Close dropdown when clicking outside
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.language-dropdown')) {
          this.isDropdownOpen = false;
        }
      });
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  changeLanguage(lang: SupportedLanguage): void {
    this.translationService.setLanguage(lang);
    this.isDropdownOpen = false;
  }

  getCurrentFlag(): string {
    return this.getFlag(this.translationService.currentLang());
  }

  getCurrentLanguageName(): string {
    const lang = this.translationService.currentLang();
    const shortNames: Record<SupportedLanguage, string> = {
      de: 'Deutsch',
      en: 'English',
      ar: 'العربية'
    };
    return shortNames[lang];
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
      de: 'Deutsch (Deutschland)',
      en: 'English (United Kingdom)',
      ar: 'العربية (السعودية)'
    };
    return labels[lang];
  }

  t(key: string): string {
    return this.translationService.translate(key);
  }
}


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button 
        class="lang-btn"
        [class.active]="languageService.getCurrentLanguage() === 'ar'"
        (click)="setLanguage('ar')"
        title="العربية">
        AR
      </button>
      <button 
        class="lang-btn"
        [class.active]="languageService.getCurrentLanguage() === 'de'"
        (click)="setLanguage('de')"
        title="Deutsch">
        DE
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      padding: 4px;
    }

    .lang-btn {
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: #666;
      font-weight: 600;
      font-size: 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 40px;
    }

    .lang-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #333;
    }

    .lang-btn.active {
      background: white;
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .lang-btn:focus {
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }
  `]
})
export class LanguageSwitcherComponent {
  constructor(public languageService: LanguageService) {}

  setLanguage(lang: 'ar' | 'de'): void {
    this.languageService.setLanguage(lang);
  }
}

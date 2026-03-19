import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';

type AppLanguage = 'de' | 'en' | 'ar';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="language-switcher">
      <select
        class="lang-select"
        [ngModel]="currentLanguage"
        (ngModelChange)="setLanguage($event)"
      >
        <option *ngFor="let lang of languages" [ngValue]="lang.code">
          {{ lang.label }}
        </option>
      </select>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: inline-flex;
      align-items: center;
    }

    .lang-select {
      padding: 8px 36px 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #333;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 130px;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, #667eea 50%),
        linear-gradient(135deg, #667eea 50%, transparent 50%);
      background-position:
        calc(100% - 18px) calc(50% - 3px),
        calc(100% - 12px) calc(50% - 3px);
      background-size: 6px 6px, 6px 6px;
      background-repeat: no-repeat;
    }

    .lang-select:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.12);
    }

    .lang-select:focus {
      outline: 2px solid #667eea;
      outline-offset: 2px;
      border-color: #667eea;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class LanguageSwitcherComponent {
  languages: { code: AppLanguage; label: string }[] = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' }
  ];

  constructor(public languageService: LanguageService) {}

  get currentLanguage(): AppLanguage {
    return this.languageService.getCurrentLanguage() as AppLanguage;
  }

  async setLanguage(lang: AppLanguage): Promise<void> {
    await this.languageService.setLanguage(lang);
  }
}

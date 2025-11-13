import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LanguageSwitcherComponent, TranslatePipe],
  template: `
    <div class="settings-page">
      <div class="container">
        <div class="settings-header">
          <div class="header-content">
            <div class="breadcrumb">
              <a routerLink="/dashboard">← Zurück zum Dashboard</a>
            </div>
            <h1>Einstellungen</h1>
            <p class="subtitle">Verwalten Sie Ihre Kontoeinstellungen und Präferenzen</p>
          </div>
          <app-language-switcher></app-language-switcher>
        </div>

        <div class="settings-content">
          <div class="settings-tabs">
            <button
              *ngFor="let tab of tabs"
              [class.active]="activeTab === tab.id"
              (click)="switchTab(tab.id)"
              class="tab-button">
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          </div>

          <div class="settings-section">
            <p>Einstellungen werden geladen...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 2rem 0;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-content {
      flex: 1;
    }

    .breadcrumb {
      margin-bottom: 1rem;
    }

    .breadcrumb a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem;
      color: #333;
    }

    .subtitle {
      color: #666;
      margin: 0;
    }

    .settings-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .settings-tabs {
      display: flex;
      border-bottom: 2px solid #f0f0f0;
      overflow-x: auto;
      gap: 0.5rem;
      padding: 1rem 1.5rem 0;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      background: transparent;
      color: #666;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .tab-button:hover {
      color: #667eea;
      background: rgba(102, 126, 234, 0.05);
    }

    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab-icon {
      font-size: 1.25rem;
    }

    .settings-section {
      padding: 2rem 1.5rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab = 'account';

  tabs = [
    { id: 'account', label: 'Konto', icon: '👤' },
    { id: 'language', label: 'Sprache & Region', icon: '🌐' },
    { id: 'security', label: 'Sicherheit', icon: '🔒' },
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔' },
    { id: 'appearance', label: 'Erscheinungsbild', icon: '🎨' },
    { id: 'privacy', label: 'Datenschutz', icon: '🛡️' }
  ];

  accountForm: FormGroup;
  languageForm: FormGroup;
  passwordForm: FormGroup;
  notificationsForm: FormGroup;
  appearanceForm: FormGroup;
  privacyForm: FormGroup;

  savingAccount = false;
  savingLanguage = false;
  changingPassword = false;
  savingNotifications = false;
  savingAppearance = false;
  savingPrivacy = false;

  accountSuccess = '';
  accountError = '';
  languageSuccess = '';
  languageError = '';
  passwordSuccess = '';
  passwordError = '';
  notificationsSuccess = '';
  notificationsError = '';
  appearanceSuccess = '';
  appearanceError = '';
  privacySuccess = '';
  privacyError = '';

  twoFactorEnabled = false;

  constructor(
    private fb: FormBuilder,
    private languageService: LanguageService,
    private authService: AuthService
  ) {
    this.accountForm = this.fb.group({
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      company: ['']
    });

    this.languageForm = this.fb.group({
      language: ['de'],
      timezone: ['Europe/Berlin'],
      currency: ['EUR'],
      dateFormat: ['DD.MM.YYYY']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.notificationsForm = this.fb.group({
      emailOrders: [true],
      emailProducts: [true],
      emailMarketing: [false],
      browserOrders: [true],
      browserAlerts: [true]
    });

    this.appearanceForm = this.fb.group({
      theme: ['light'],
      fontSize: ['medium'],
      compactMode: [false]
    });

    this.privacyForm = this.fb.group({
      analyticsEnabled: [true],
      profilePublic: [true],
      showEmail: [false]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  switchTab(tabId: string): void {
    this.activeTab = tabId;
  }

  loadSettings(): void {
    const savedSettings = localStorage.getItem('user-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.accountForm.patchValue(settings.account || {});
      this.languageForm.patchValue(settings.language || {});
      this.notificationsForm.patchValue(settings.notifications || {});
      this.appearanceForm.patchValue(settings.appearance || {});
      this.privacyForm.patchValue(settings.privacy || {});
    }
  }

  saveAccountSettings(): void {
    if (this.accountForm.valid) {
      this.savingAccount = true;
      this.accountError = '';
      this.accountSuccess = '';

      setTimeout(() => {
        this.saveToLocalStorage('account', this.accountForm.value);
        this.accountSuccess = 'Kontoeinstellungen wurden erfolgreich gespeichert!';
        this.savingAccount = false;

        setTimeout(() => this.accountSuccess = '', 3000);
      }, 1000);
    }
  }

  saveLanguageSettings(): void {
    if (this.languageForm.valid) {
      this.savingLanguage = true;
      this.languageError = '';
      this.languageSuccess = '';

      const lang = this.languageForm.get('language')?.value;
      this.languageService.setLanguage(lang);

      setTimeout(() => {
        this.saveToLocalStorage('language', this.languageForm.value);
        this.languageSuccess = 'Spracheinstellungen wurden erfolgreich gespeichert!';
        this.savingLanguage = false;

        setTimeout(() => this.languageSuccess = '', 3000);
      }, 1000);
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.changingPassword = true;
      this.passwordError = '';
      this.passwordSuccess = '';

      setTimeout(() => {
        this.passwordSuccess = 'Passwort wurde erfolgreich geändert!';
        this.changingPassword = false;
        this.passwordForm.reset();

        setTimeout(() => this.passwordSuccess = '', 3000);
      }, 1000);
    }
  }

  toggleTwoFactor(): void {
    this.twoFactorEnabled = !this.twoFactorEnabled;
  }

  saveNotificationSettings(): void {
    if (this.notificationsForm.valid) {
      this.savingNotifications = true;
      this.notificationsError = '';
      this.notificationsSuccess = '';

      setTimeout(() => {
        this.saveToLocalStorage('notifications', this.notificationsForm.value);
        this.notificationsSuccess = 'Benachrichtigungseinstellungen wurden erfolgreich gespeichert!';
        this.savingNotifications = false;

        setTimeout(() => this.notificationsSuccess = '', 3000);
      }, 1000);
    }
  }

  saveAppearanceSettings(): void {
    if (this.appearanceForm.valid) {
      this.savingAppearance = true;
      this.appearanceError = '';
      this.appearanceSuccess = '';

      setTimeout(() => {
        this.saveToLocalStorage('appearance', this.appearanceForm.value);
        this.appearanceSuccess = 'Erscheinungseinstellungen wurden erfolgreich gespeichert!';
        this.savingAppearance = false;

        setTimeout(() => this.appearanceSuccess = '', 3000);
      }, 1000);
    }
  }

  savePrivacySettings(): void {
    if (this.privacyForm.valid) {
      this.savingPrivacy = true;
      this.privacyError = '';
      this.privacySuccess = '';

      setTimeout(() => {
        this.saveToLocalStorage('privacy', this.privacyForm.value);
        this.privacySuccess = 'Datenschutzeinstellungen wurden erfolgreich gespeichert!';
        this.savingPrivacy = false;

        setTimeout(() => this.privacySuccess = '', 3000);
      }, 1000);
    }
  }

  confirmDeleteAccount(): void {
    if (confirm('Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      console.log('Account deletion confirmed');
    }
  }

  private saveToLocalStorage(key: string, value: any): void {
    const settings = JSON.parse(localStorage.getItem('user-settings') || '{}');
    settings[key] = value;
    localStorage.setItem('user-settings', JSON.stringify(settings));
  }
}


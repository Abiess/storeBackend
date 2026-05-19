import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BannerService, BannerSettings } from '@app/core/services/banner.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ToastService } from '@app/core/services/toast.service';

/**
 * Admin-Einstellungsseite für das Promo-Banner pro Store.
 * Route: /stores/:storeId/banner
 *
 * Features:
 * – Aktivieren / Deaktivieren
 * – Position (top / bottom)
 * – Hintergrundfarbe + Textfarbe (Color-Picker)
 * – Animationsgeschwindigkeit (0 = statisch)
 * – Texte pro Sprache (DE / EN / AR)
 * – Optional: Icon/Emoji
 * – Live-Vorschau
 */
@Component({
  selector: 'app-banner-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="banner-settings-page">

      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">← {{ 'common.back' | translate }}</button>
        <div class="header-info">
          <h1>🎯 {{ 'banner.settings.title' | translate }}</h1>
          <p class="subtitle">{{ 'banner.settings.subtitle' | translate }}</p>
        </div>
        <div class="header-actions">
          <button class="btn-save" (click)="save()" [disabled]="saving">
            <span *ngIf="!saving">💾 {{ 'common.save' | translate }}</span>
            <span *ngIf="saving">{{ 'common.saving' | translate }}</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ 'common.loading' | translate }}</p>
      </div>

      <div *ngIf="!loading && settings" class="settings-body">

        <!-- ═══════════════════════════════════════
             LIVE VORSCHAU
        ══════════════════════════════════════════ -->
        <div class="preview-section">
          <h2 class="section-title">👁️ {{ 'banner.settings.preview' | translate }}</h2>
          <div
            class="banner-preview"
            [style.background]="settings.bgColor"
            [style.color]="settings.textColor"
            [class.preview-disabled]="!settings.enabled">
            <div class="preview-track-wrapper">
              <div class="preview-track" [style.animation-duration.s]="previewAnimDuration">
                <span class="preview-content">
                  <span *ngIf="settings.icon">{{ settings.icon }}&nbsp;</span>
                  {{ previewText }}
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <span *ngIf="settings.icon">{{ settings.icon }}&nbsp;</span>
                  {{ previewText }}
                </span>
              </div>
            </div>
          </div>
          <p *ngIf="!settings.enabled" class="preview-hint">
            ⚠️ {{ 'banner.settings.disabledHint' | translate }}
          </p>
        </div>

        <!-- ═══════════════════════════════════════
             GRUNDEINSTELLUNGEN
        ══════════════════════════════════════════ -->
        <div class="settings-card">
          <h2 class="section-title">⚙️ {{ 'banner.settings.general' | translate }}</h2>

          <div class="form-row">
            <label class="toggle-label">
              <div class="toggle-switch" [class.active]="settings.enabled" (click)="settings.enabled = !settings.enabled">
                <div class="toggle-knob"></div>
              </div>
              <span>{{ 'banner.settings.enabled' | translate }}</span>
              <span class="badge" [class.badge-active]="settings.enabled" [class.badge-inactive]="!settings.enabled">
                {{ settings.enabled ? ('common.active' | translate) : ('common.inactive' | translate) }}
              </span>
            </label>
          </div>

          <div class="form-row">
            <label class="form-label">{{ 'banner.settings.position' | translate }}</label>
            <div class="btn-group">
              <button
                [class.active]="settings.position === 'top'"
                (click)="settings.position = 'top'">
                ⬆️ {{ 'banner.settings.positionTop' | translate }}
              </button>
              <button
                [class.active]="settings.position === 'bottom'"
                (click)="settings.position = 'bottom'">
                ⬇️ {{ 'banner.settings.positionBottom' | translate }}
              </button>
            </div>
          </div>

          <div class="form-two-col">
            <div class="form-group">
              <label class="form-label">🎨 {{ 'banner.settings.bgColor' | translate }}</label>
              <div class="color-input-row">
                <input type="color" [(ngModel)]="settings.bgColor" class="color-picker" />
                <input type="text" [(ngModel)]="settings.bgColor" class="color-text" placeholder="#667eea" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">✏️ {{ 'banner.settings.textColor' | translate }}</label>
              <div class="color-input-row">
                <input type="color" [(ngModel)]="settings.textColor" class="color-picker" />
                <input type="text" [(ngModel)]="settings.textColor" class="color-text" placeholder="#ffffff" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              ⚡ {{ 'banner.settings.animationSpeed' | translate }}
              <span class="hint">{{ settings.animationSpeed === 0 ? ('banner.settings.staticMode' | translate) : (settings.animationSpeed + ' px/s') }}</span>
            </label>
            <input
              type="range"
              [(ngModel)]="settings.animationSpeed"
              min="0" max="200" step="10"
              class="speed-slider" />
            <div class="speed-labels">
              <span>{{ 'banner.settings.static' | translate }}</span>
              <span>{{ 'banner.settings.slow' | translate }}</span>
              <span>{{ 'banner.settings.fast' | translate }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">😀 {{ 'banner.settings.icon' | translate }}</label>
            <div class="icon-row">
              <input type="text" [(ngModel)]="settings.icon" class="icon-input" placeholder="🎉" maxlength="10" />
              <div class="icon-presets">
                <button *ngFor="let ic of iconPresets" (click)="settings.icon = ic" class="icon-preset-btn">{{ ic }}</button>
                <button (click)="settings.icon = ''" class="icon-preset-btn clear">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════
             MEHRSPRACHIGE TEXTE
        ══════════════════════════════════════════ -->
        <div class="settings-card">
          <h2 class="section-title">🌍 {{ 'banner.settings.texts' | translate }}</h2>
          <p class="section-desc">{{ 'banner.settings.textsHint' | translate }}</p>

          <div *ngFor="let lang of languages" class="lang-row">
            <div class="lang-flag">
              <span class="flag">{{ lang.flag }}</span>
              <span class="lang-name">{{ lang.label }}</span>
            </div>
            <textarea
              [(ngModel)]="settings.texts[lang.code]"
              class="lang-textarea"
              rows="2"
              [placeholder]="lang.placeholder"
              [dir]="lang.code === 'ar' ? 'rtl' : 'ltr'">
            </textarea>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .banner-settings-page { max-width: 860px; margin: 0 auto; padding: 24px 16px; }

    /* Header */
    .page-header {
      display: flex; align-items: flex-start; gap: 16px;
      margin-bottom: 28px; flex-wrap: wrap;
    }
    .back-btn {
      background: #f3f4f6; border: none; border-radius: 8px;
      padding: 8px 14px; cursor: pointer; font-size: 13px;
      color: #374151; white-space: nowrap; align-self: center;
    }
    .back-btn:hover { background: #e5e7eb; }
    .header-info { flex: 1; }
    .header-info h1 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin: 0; }
    .header-actions { align-self: center; }
    .btn-save {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff; border: none; border-radius: 8px;
      padding: 10px 22px; font-weight: 600; cursor: pointer;
      font-size: 14px; transition: opacity 0.2s;
    }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-save:hover:not(:disabled) { opacity: 0.9; }

    /* Loading */
    .loading-state { display: flex; align-items: center; gap: 12px; padding: 40px; color: #6b7280; }
    .spinner {
      width: 20px; height: 20px; border: 2px solid #e5e7eb;
      border-top-color: #667eea; border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Cards */
    .settings-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 24px; margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .section-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 18px; }
    .section-desc { font-size: 13px; color: #6b7280; margin: -12px 0 16px; }

    /* Preview */
    .preview-section { margin-bottom: 20px; }
    .banner-preview {
      border-radius: 8px; overflow: hidden; min-height: 38px;
      display: flex; align-items: center;
      position: relative; border: 2px solid transparent;
    }
    .preview-preview-disabled { opacity: 0.5; filter: grayscale(0.5); }
    .preview-track-wrapper { flex: 1; overflow: hidden; white-space: nowrap; }
    .preview-track {
      display: inline-flex; animation: banner-scroll 12s linear infinite;
    }
    .preview-content { display: inline-block; padding: 8px 24px; font-size: 13px; font-weight: 600; }
    .preview-hint { font-size: 12px; color: #f59e0b; margin-top: 6px; }
    @keyframes banner-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

    /* Form */
    .form-row { margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    .form-label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 8px;
    }
    .form-label .hint { font-weight: 400; color: #667eea; margin-inline-start: 8px; }
    .form-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 600px) { .form-two-col { grid-template-columns: 1fr; } }

    /* Toggle */
    .toggle-label {
      display: flex; align-items: center; gap: 14px; cursor: pointer; user-select: none;
    }
    .toggle-switch {
      width: 44px; height: 24px; border-radius: 999px; background: #d1d5db;
      position: relative; transition: background 0.2s; flex-shrink: 0; cursor: pointer;
    }
    .toggle-switch.active { background: linear-gradient(135deg, #667eea, #764ba2); }
    .toggle-knob {
      width: 20px; height: 20px; border-radius: 50%; background: #fff;
      position: absolute; top: 2px; left: 2px;
      transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle-switch.active .toggle-knob { left: 22px; }
    .badge {
      padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
    }
    .badge-active { background: #d1fae5; color: #065f46; }
    .badge-inactive { background: #f3f4f6; color: #6b7280; }

    /* Position Btn Group */
    .btn-group { display: flex; gap: 8px; }
    .btn-group button {
      flex: 1; padding: 8px 12px; border: 2px solid #e5e7eb;
      border-radius: 8px; background: #fff; cursor: pointer;
      font-size: 13px; font-weight: 500; transition: all 0.15s;
    }
    .btn-group button.active {
      border-color: #667eea; background: #ede9fe; color: #4c1d95; font-weight: 700;
    }
    .btn-group button:hover:not(.active) { border-color: #c4b5fd; }

    /* Color */
    .color-input-row { display: flex; gap: 10px; align-items: center; }
    .color-picker { width: 44px; height: 36px; border: none; border-radius: 8px; cursor: pointer; padding: 2px; }
    .color-text {
      flex: 1; padding: 8px 12px; border: 1px solid #e5e7eb;
      border-radius: 8px; font-size: 13px;
    }

    /* Speed Slider */
    .speed-slider { width: 100%; accent-color: #667eea; }
    .speed-labels {
      display: flex; justify-content: space-between;
      font-size: 11px; color: #9ca3af; margin-top: 4px;
    }

    /* Icon */
    .icon-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .icon-input {
      width: 80px; padding: 8px 12px; border: 1px solid #e5e7eb;
      border-radius: 8px; font-size: 20px; text-align: center;
    }
    .icon-presets { display: flex; gap: 6px; flex-wrap: wrap; }
    .icon-preset-btn {
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 8px;
      background: #f9fafb; cursor: pointer; font-size: 18px;
      transition: all 0.15s;
    }
    .icon-preset-btn:hover { border-color: #667eea; background: #ede9fe; }
    .icon-preset-btn.clear { font-size: 12px; color: #ef4444; border-color: #fca5a5; }

    /* Language */
    .lang-row {
      display: grid; grid-template-columns: 100px 1fr; gap: 12px;
      align-items: flex-start; margin-bottom: 14px;
    }
    @media (max-width: 600px) { .lang-row { grid-template-columns: 1fr; } }
    .lang-flag { display: flex; align-items: center; gap: 8px; padding-top: 10px; }
    .flag { font-size: 22px; }
    .lang-name { font-size: 13px; font-weight: 600; color: #374151; }
    .lang-textarea {
      width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb;
      border-radius: 8px; font-size: 13px; resize: vertical;
      font-family: inherit; line-height: 1.5; box-sizing: border-box;
    }
    .lang-textarea:focus { outline: none; border-color: #667eea; }
  `]
})
export class BannerSettingsComponent implements OnInit {

  settings: BannerSettings | null = null;
  loading = true;
  saving = false;
  storeId!: number;

  iconPresets = ['🎉', '🔥', '⚡', '🛍️', '💥', '🎁', '📢', '🆕', '🏷️', '✨'];

  languages = [
    { code: 'de', label: 'Deutsch',  flag: '🇩🇪', placeholder: '🎉 Du erhältst heute Rabatt auf ausgewählte Produkte!' },
    { code: 'en', label: 'English',  flag: '🇬🇧', placeholder: '🎉 Get a discount on selected products today!' },
    { code: 'ar', label: 'عربي',     flag: '🇲🇦', placeholder: '🎉 احصل على خصم على منتجات مختارة اليوم!' }
  ];

  get previewText(): string {
    if (!this.settings?.texts) return '';
    return this.settings.texts['de'] || this.settings.texts['en'] || '';
  }

  get previewAnimDuration(): number {
    if (!this.settings) return 12;
    const speed = this.settings.animationSpeed || 60;
    if (speed === 0) return 0;
    const estimatedPx = (this.previewText.length * 8) + 200;
    return Math.max(5, estimatedPx / speed);
  }

  constructor(
    private bannerService: BannerService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // StoreId aus Route extrahieren (3-stufig wie in copilot-instructions.md)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }

    if (id) {
      this.storeId = +id;
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.bannerService.getAdminBanner(this.storeId).subscribe({
      next: (s) => {
        // Sicherstellen dass texts-Objekt alle Sprachen hat
        if (!s.texts) s.texts = {};
        this.languages.forEach(l => { if (!s.texts[l.code]) s.texts[l.code] = ''; });
        this.settings = s;
        this.loading = false;
      },
      error: () => {
        // Fallback: leere Settings
        this.settings = {
          storeId: this.storeId,
          enabled: false,
          position: 'top',
          bgColor: '#667eea',
          textColor: '#ffffff',
          animationSpeed: 60,
          texts: {
            de: '🎉 Du erhältst heute Rabatt auf ausgewählte Produkte!',
            en: '🎉 Get a discount on selected products today!',
            ar: '🎉 احصل على خصم على منتجات مختارة اليوم!'
          },
          icon: '🎉'
        };
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.settings || this.saving) return;
    this.saving = true;
    this.bannerService.saveBanner(this.storeId, this.settings).subscribe({
      next: (saved) => {
        this.settings = saved;
        this.saving = false;
        this.toastService.show('✅ Banner gespeichert!', 'success');
      },
      error: () => {
        this.saving = false;
        this.toastService.show('❌ Fehler beim Speichern', 'error');
      }
    });
  }

  goBack(): void {
    this.router.navigate([`/stores/${this.storeId}/settings`]);
  }
}


import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '@app/core/services/theme.service';
import { StoreService } from '@app/core/services/store.service';
import { PreviewPanelService } from '@app/core/services/preview-panel.service';
import { TranslationService } from '@app/core/services/translation.service';
import {
  StoreTheme,
  ThemePreset,
  ThemeType,
  ShopTemplate,
  CreateThemeRequest
} from '../../core/models';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { toDate } from '@app/core/utils/date.utils';
import { LucideAngularModule, Palette, Layout, Grid3x3, Eye, Save, ArrowLeft, RotateCcw, Sparkles } from 'lucide-angular';

@Component({
  selector: 'app-store-theme',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, TranslateModule, LucideAngularModule],
  template: `
    <div class="theme-container">
      <app-page-header
        [title]="'storeTheme.management' | translate"
        [subtitle]="'storeTheme.subtitle' | translate"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <div class="theme-content" *ngIf="!loading">
        <!-- Aktives Theme -->
        <div class="active-theme-section" *ngIf="activeTheme">
          <h2>{{ 'storeTheme.activeTheme' | translate }}</h2>
          <div class="theme-card active">
            <div class="theme-preview" [style.background]="activeTheme.colors.primary || '#667eea'">
              <div class="preview-content">
                <h3>{{ activeTheme.name }}</h3>
                <span class="theme-type">{{ getThemeTypeName(activeTheme.type) }}</span>
              </div>
            </div>
            <div class="theme-info">
              <p><strong>{{ 'storeTheme.template' | translate }}:</strong> {{ getTemplateName(activeTheme.template) }}</p>
              <p><strong>{{ 'storeTheme.created' | translate }}:</strong> {{ toDate(activeTheme.createdAt) | date:'dd.MM.yyyy':'':'de-DE' }}</p>
              <button class="btn btn-primary" (click)="editTheme(activeTheme)">
                {{ 'storeTheme.edit' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             PRODUKTGRID-LAYOUT AUSWAHL (strukturell unterschiedlich)
             ══════════════════════════════════════════════════════════ -->
        <div class="grid-layout-section">
          <h2><lucide-icon [img]="Grid3x3" [size]="24"></lucide-icon> {{ 'storeTheme.gridLayoutSection' | translate }}</h2>
          <p class="section-description">
            {{ 'storeTheme.gridLayoutDescription' | translate }}
          </p>

          <div class="no-theme-hint" *ngIf="!activeTheme">
            {{ 'storeTheme.noThemeHint' | translate }}
          </div>

          <div class="grid-templates" *ngIf="activeTheme">
            <div class="grid-template-card"
                 *ngFor="let gt of gridTemplates"
                 [class.grid-template-card--active]="isActiveGridTemplate(gt.code)"
                 (click)="applyGridTemplate(gt.code)">

              <!-- ── MINI STRUKTUR-VORSCHAU ── -->
              <div class="gt-mini-preview" [class]="'gt-mini--' + gt.previewClass">

                <!-- Classic: Sidebar links + 3-col Grid -->
                <ng-container *ngIf="gt.previewClass === 'classic'">
                  <div class="pv-classic">
                    <div class="pv-sidebar">
                      <div class="pv-sb-header"></div>
                      <div class="pv-sb-item pv-sb-item--active"></div>
                      <div class="pv-sb-item"></div>
                      <div class="pv-sb-item" style="width:70%"></div>
                      <div class="pv-sb-item" style="width:55%"></div>
                      <div class="pv-sb-divider"></div>
                      <div class="pv-sb-header" style="margin-top:4px"></div>
                      <div class="pv-price-bar"><div class="pv-price-fill"></div></div>
                    </div>
                    <div class="pv-main">
                      <div class="pv-toolbar">
                        <div class="pv-tb-count"></div>
                        <div class="pv-tb-sort"></div>
                      </div>
                      <div class="pv-grid pv-grid--3">
                        <div class="pv-card" *ngFor="let _ of [1,2,3,4,5,6]">
                          <div class="pv-card-img"></div>
                          <div class="pv-card-line"></div>
                          <div class="pv-card-line pv-card-line--short"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ng-container>

                <!-- Fashion: Chips + Editorial-Grid -->
                <ng-container *ngIf="gt.previewClass === 'fashion'">
                  <div class="pv-fashion">
                    <div class="pv-chips">
                      <div class="pv-chip pv-chip--active"></div>
                      <div class="pv-chip"></div>
                      <div class="pv-chip"></div>
                      <div class="pv-chip"></div>
                    </div>
                    <div class="pv-editorial">
                      <div class="pv-hero-card">
                        <div class="pv-overlay"></div>
                      </div>
                      <div class="pv-small-col">
                        <div class="pv-sm-card pv-sm-card--top"></div>
                        <div class="pv-sm-card pv-sm-card--bottom"></div>
                      </div>
                    </div>
                    <div class="pv-row3">
                      <div class="pv-reg-card" *ngFor="let _ of [1,2,3]"></div>
                    </div>
                  </div>
                </ng-container>

                <!-- Compact: Filterbar + dichtes 5-col Grid -->
                <ng-container *ngIf="gt.previewClass === 'compact'">
                  <div class="pv-compact">
                    <div class="pv-cfilter">
                      <div class="pv-cf-select"></div>
                      <div class="pv-cf-select" style="width:60px"></div>
                      <div class="pv-cf-count"></div>
                      <div class="pv-cf-toggle"></div>
                    </div>
                    <div class="pv-dense">
                      <div class="pv-dense-card" *ngFor="let _ of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]">
                        <div class="pv-dc-img"></div>
                        <div class="pv-dc-line"></div>
                        <div class="pv-dc-price"></div>
                      </div>
                    </div>
                  </div>
                </ng-container>

                <!-- Marketplace: Bottom Sheet + OLX-Style -->
                <ng-container *ngIf="gt.previewClass === 'marketplace'">
                  <div class="pv-marketplace">
                    <div class="pv-mp-chips">
                      <div class="pv-mpc pv-mpc--active"></div>
                      <div class="pv-mpc"></div>
                      <div class="pv-mpc"></div>
                    </div>
                    <div class="pv-mp-grid">
                      <div class="pv-mp-card" *ngFor="let _ of [1,2,3,4]">
                        <div class="pv-mp-img">
                          <div class="pv-mp-heart">♡</div>
                        </div>
                        <div class="pv-mp-price"></div>
                        <div class="pv-mp-title"></div>
                        <div class="pv-mp-meta">
                          <div class="pv-mp-loc"></div>
                          <div class="pv-mp-btn"></div>
                        </div>
                      </div>
                    </div>
                    <div class="pv-mp-bottombar">
                      <div class="pv-mp-bb-btn">⚙ Filter</div>
                      <div class="pv-mp-bb-div"></div>
                      <div class="pv-mp-bb-btn">↕ Sortieren</div>
                    </div>
                  </div>
                </ng-container>

              </div>

              <!-- ── KARTEN-INHALT ── -->
              <div class="gt-body">
                <div class="gt-header-row">
                  <span class="gt-icon">{{ gt.icon }}</span>
                  <h4 class="gt-name">{{ gt.name }}</h4>
                  <span class="gt-active-badge" *ngIf="isActiveGridTemplate(gt.code)">{{ 'storeTheme.gridActive' | translate }}</span>
                </div>
                <p class="gt-desc">{{ gt.description }}</p>

                <!-- Features List -->
                <ul class="gt-features">
                  <li *ngFor="let f of gt.features">{{ f }}</li>
                </ul>

                <!-- Empfohlen für -->
                <div class="gt-recommended">
                  <span class="gt-rec-label">{{ 'storeTheme.gridRecommendedFor' | translate }}</span>
                  <div class="gt-rec-tags">
                    <span class="gt-rec-tag" *ngFor="let r of gt.recommendedFor">{{ r }}</span>
                  </div>
                </div>
              </div>

              <div class="gt-footer">
                <button class="btn btn-sm"
                        [class.btn-success]="!isActiveGridTemplate(gt.code)"
                        [class.btn-outline-active]="isActiveGridTemplate(gt.code)"
                        [disabled]="isActiveGridTemplate(gt.code) || applyingTemplate === gt.code"
                        (click)="$event.stopPropagation(); applyGridTemplate(gt.code)">
                  {{ isActiveGridTemplate(gt.code)
                      ? ('storeTheme.gridAlreadyActive' | translate)
                      : (applyingTemplate === gt.code ? ('storeTheme.gridApplying' | translate) : ('storeTheme.gridActivate' | translate)) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Theme Presets aus Backend (Free-Template-Katalog) -->
        <div class="presets-section">
          <h2><lucide-icon [img]="Sparkles" [size]="24"></lucide-icon> {{ 'storeTheme.freeTemplatesSection' | translate }}</h2>
          <p class="section-description">
            {{ 'storeTheme.freeTemplatesDescription' | translate }}
          </p>

          <div class="presets-grid">
            <div class="preset-card"
                 *ngFor="let preset of presets"
                 [class.is-active]="isActiveTemplate(preset)">
              <!-- Echtes Vorschaubild aus Backend (previewUrl) mit Fallback auf Farb-Gradient -->
              <div class="preset-preview"
                   [style.background]="'linear-gradient(135deg, ' + preset.colors.primary + ', ' + preset.colors.secondary + ')'">
                <img *ngIf="getPreviewUrl(preset) as previewSrc"
                     class="preset-preview__img"
                     [src]="previewSrc"
                     [alt]="preset.name + ' Preview'"
                     loading="lazy" />
                <div class="preview-overlay">
                  <h3>{{ preset.name }}</h3>
                </div>
                <span class="badge-free" *ngIf="isFreeTemplate(preset)">{{ 'storeTheme.badgeFree' | translate }}</span>
                <span class="badge-active" *ngIf="isActiveTemplate(preset)">{{ 'storeTheme.badgeActive' | translate }}</span>
              </div>
              <div class="preset-info">
                <p>{{ preset.description }}</p>
                <div class="color-palette">
                  <span class="color-dot" [style.background]="preset.colors.primary" [title]="('storeTheme.colorPrimary' | translate) + ': ' + preset.colors.primary"></span>
                  <span class="color-dot" [style.background]="preset.colors.secondary" [title]="('storeTheme.colorSecondary' | translate) + ': ' + preset.colors.secondary"></span>
                  <span class="color-dot" [style.background]="preset.colors.accent" [title]="('storeTheme.colorAccent' | translate) + ': ' + preset.colors.accent"></span>
                </div>
                <div class="preset-actions">
                  <button class="btn btn-success"
                          (click)="applyTemplateImmediately(preset)"
                          [disabled]="applyingTemplate === preset.name || isActiveTemplate(preset)"
                          *ngIf="getTemplateId(preset)">
                    {{ isActiveTemplate(preset)
                        ? ('storeTheme.applyActive' | translate)
                        : (applyingTemplate === preset.name ? ('storeTheme.applyApplying' | translate) : ('storeTheme.applyOneClick' | translate)) }}
                  </button>
                  <button class="btn btn-secondary" (click)="selectPreset(preset)">
                    {{ 'storeTheme.customize' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Erfolgs-Toast -->
          <div class="toast-success" *ngIf="successMessage" (click)="successMessage = null">
            ✅ {{ successMessage }}
          </div>
        </div>

        <!-- Theme Editor -->
        <div class="editor-section" *ngIf="selectedPreset">
          <h2>Theme anpassen</h2>
          <form (ngSubmit)="saveTheme()" class="theme-form">
            <div class="form-group">
              <label>Theme-Name</label>
              <input type="text" [(ngModel)]="themeName" name="themeName" 
                     class="form-control" placeholder="Mein Custom Theme" required>
            </div>

            <div class="form-group">
              <label>Produktgrid-Layout</label>
              <select [(ngModel)]="selectedTemplate" name="template" class="form-control">
                <option value="MODERN_GRID">📱 Mobile Marketplace (Standard)</option>
                <option value="CLASSIC_BOOTSTRAP">🏛️ Classic Sidebar Grid</option>
                <option value="FASHION_EDITORIAL">👗 Fashion Editorial</option>
                <option value="ELECTRONICS_PRO">📦 Compact Market</option>
                <option value="RESTAURANT_WARM">🍽️ Classic Sidebar (Restaurant)</option>
                <option value="BEAUTY_SOFT">💄 Fashion Editorial (Beauty)</option>
                <option value="MINIMAL_DARK">🌑 Compact Market (Dark)</option>
              </select>
            </div>

            <div class="form-section">
              <h3>Farben</h3>
              <div class="color-grid">
                <div class="color-input">
                  <label>Primärfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.primary" name="primary">
                  <span>{{ selectedPreset.colors.primary }}</span>
                </div>
                <div class="color-input">
                  <label>Sekund��rfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.secondary" name="secondary">
                  <span>{{ selectedPreset.colors.secondary }}</span>
                </div>
                <div class="color-input">
                  <label>Akzentfarbe</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.accent" name="accent">
                  <span>{{ selectedPreset.colors.accent }}</span>
                </div>
                <div class="color-input">
                  <label>Hintergrund</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.background" name="background">
                  <span>{{ selectedPreset.colors.background }}</span>
                </div>
                <div class="color-input">
                  <label>Text</label>
                  <input type="color" [(ngModel)]="selectedPreset.colors.text" name="text">
                  <span>{{ selectedPreset.colors.text }}</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Typografie</h3>
              <div class="form-group">
                <label>Schriftart</label>
                <select [(ngModel)]="selectedPreset.typography.fontFamily" name="fontFamily" class="form-control">
                  <option value="'Inter', sans-serif">Inter (Modern)</option>
                  <option value="'Georgia', serif">Georgia (Klassisch)</option>
                  <option value="'Helvetica Neue', sans-serif">Helvetica (Minimal)</option>
                  <option value="'Cormorant Garamond', serif">Cormorant (Elegant)</option>
                </select>
              </div>
            </div>

            <div class="form-section">
              <h3>Layout</h3>
              <div class="form-group">
                <label>Produktraster-Spalten</label>
                <select [(ngModel)]="selectedPreset.layout.productGridColumns" name="gridColumns" class="form-control">
                  <option [value]="2">2 Spalten</option>
                  <option [value]="3">3 Spalten</option>
                  <option [value]="4">4 Spalten</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">
                Abbrechen
              </button>
              <button type="submit" class="btn btn-success" [disabled]="saving">
                {{ saving ? 'Speichere...' : 'Theme speichern' }}
              </button>
            </div>
          </form>
        </div>

      </div>

      <!-- Vorschau-FAB + Side-Panel werden global via PreviewPanelService / app-preview-panel bereitgestellt -->

      <div class="loading" *ngIf="loading">
        <div class="spinner"></div>
        <p>Lade Themes...</p>
      </div>

      <div class="error" *ngIf="error">
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="loadThemes()">Erneut versuchen</button>
      </div>
    </div>
  `,
  styles: [`
    .theme-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .theme-header {
      margin-bottom: 2rem;
    }

    .header-content h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem;
    }

    .header-content p {
      color: #666;
      margin: 0;
    }

    .active-theme-section {
      margin-bottom: 3rem;
    }

    .theme-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .theme-card.active {
      border: 3px solid #28a745;
    }

    .theme-preview {
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .preview-content {
      text-align: center;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .theme-type {
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
    }

    .theme-info {
      padding: 1.5rem;
    }

    .presets-section {
      margin-bottom: 3rem;
    }

    .section-description {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .preset-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .preset-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .preset-card.is-active {
      border: 2px solid #28a745;
      box-shadow: 0 4px 20px rgba(40, 167, 69, 0.25);
    }

    .preset-preview {
      height: 160px;
      position: relative;
      overflow: hidden;
    }

    .preset-preview__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .preview-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.2);
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .preset-info {
      padding: 1.5rem;
    }

    .color-palette {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .color-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: help;
    }

    .editor-section, .preview-section {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .theme-form {
      max-width: 800px;
    }

    .form-section {
      margin: 2rem 0;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .form-section h3 {
      margin-top: 0;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .color-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .color-input input[type="color"] {
      width: 100%;
      height: 50px;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }

    .color-input span {
      font-family: monospace;
      font-size: 0.875rem;
      color: #666;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover {
      background: #218838;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .theme-preview-full {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      min-height: 400px;
    }

    /* Toolbar mit Mini ↔ Live Toggle */
    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .preview-toolbar h2 { margin: 0; }
    .preview-toolbar__actions {
      display: inline-flex;
      gap: .5rem;
      flex-wrap: wrap;
    }
    .btn.btn-sm {
      padding: .4rem .75rem;
      font-size: .85rem;
      border-radius: 6px;
    }
    .btn.btn-sm.active {
      background: #2563eb;
      color: #fff;
      box-shadow: inset 0 0 0 1px #1d4ed8;
    }

    /* Live-Iframe-Preview */
    .live-preview {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .live-preview__hint {
      margin: 0;
      padding: .75rem 1rem;
      background: #f1f5f9;
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      color: #334155;
      font-size: .9rem;
      line-height: 1.5;
    }
    .live-preview__url {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .85rem;
      color: #1d4ed8;
      background: #ffffff;
      padding: .1rem .4rem;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
    }
    .live-preview__iframe {
      width: 100%;
      height: 720px;
      max-height: 80vh;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(15, 23, 42, .06);
    }
    .live-preview__open {
      align-self: flex-end;
      color: #2563eb;
      text-decoration: none;
      font-size: .85rem;
      font-weight: 500;
    }
    .live-preview__open:hover { text-decoration: underline; }

    .preview-header {
      padding: 1.5rem;
      text-align: center;
    }

    .preview-content-area {
      padding: 2rem;
    }

    .preview-button {
      margin: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .preview-card {
      margin-top: 2rem;
      padding: 1.5rem;
      border-radius: 8px;
    }

    .preview-price {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #dc3545;
    }

    /* Free-Badge auf Preset-Karten */
    .badge-free {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: #28a745;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .badge-active {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: #0d6efd;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* Preset-Action-Buttons (nebeneinander) */
    .preset-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .preset-actions .btn {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }

    /* Erfolgs-Toast */
    .toast-success {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      background: #28a745;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
      font-weight: 500;
    }
    @keyframes slideInRight {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    /* ═══════════════════════════════════════════
       FLOATING PREVIEW BUTTON (FAB) + PANEL
       → Ausgelagert in PreviewPanelComponent (global via app.component)
       ═══════════════════════════════════════════ */

    /* ═══════════════════════════════════════════
       PRODUKTGRID-LAYOUT PICKER
       ═══════════════════════════════════════════ */
    .grid-layout-section {
      margin-bottom: 3rem;
    }

    .no-theme-hint {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-size: 0.9rem;
      color: #856404;
    }

    .grid-templates {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1.25rem;
    }

    .grid-template-card {
      background: #fff;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    .grid-template-card:hover {
      border-color: #764ba2;
      box-shadow: 0 4px 16px rgba(118,75,162,0.15);
    }
    .grid-template-card--active {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.2);
    }

    /* Mini-Vorschau-Area */
    .gt-mini-preview {
      background: #f8f9fa;
      padding: 0.875rem;
      height: 90px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }

    /* Classic preview layout */
    .gt-mini--classic { flex-direction: row; gap: 6px; }
    .mp-sidebar { width: 28%; display: flex; flex-direction: column; gap: 3px; }
    .mp-bar { height: 7px; background: #d1d5db; border-radius: 3px; }
    .mp-bar:nth-child(2) { width: 80%; }
    .mp-bar:nth-child(3) { width: 60%; }
    .mp-right { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .mp-row { display: flex; gap: 4px; }
    .mp-card {
      flex: 1;
      background: #e5e7eb;
      border-radius: 3px;
      height: 22px;
    }

    /* Fashion preview */
    .gt-mini--fashion { gap: 6px; }
    .mp-chips { display: flex; gap: 4px; }
    .mp-chip { height: 7px; width: 28px; background: #d1d5db; border-radius: 999px; }
    .mp-row--2col { flex: 1; }
    .mp-card--tall { height: 50px; }
    .mp-col2 { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .mp-card--sm { height: 22px; }

    /* Compact preview */
    .gt-mini--compact { gap: 5px; }
    .mp-filterbar {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .mp-fb-item { height: 7px; width: 35px; background: #d1d5db; border-radius: 3px; }
    .mp-fb-dot { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; margin-left: auto; }
    .mp-dense-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3px;
      flex: 1;
    }
    .mp-sm-card { background: #e5e7eb; border-radius: 2px; height: 14px; }

    /* Marketplace preview */
    .gt-mini--marketplace { justify-content: space-between; }
    .mp-bottom-strip {
      display: flex;
      gap: 4px;
      margin-top: auto;
    }
    .mp-bs-btn { flex: 1; height: 8px; background: #667eea; border-radius: 3px; opacity: 0.6; }

    /* Card content */
    .gt-body {
      padding: 0.75rem;
      flex: 1;
    }
    .gt-name {
      margin: 0 0 0.25rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #111827;
    }
    .gt-desc {
      margin: 0;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.4;
    }
    .gt-footer {
      padding: 0.5rem 0.75rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .gt-active-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #667eea;
    }
    .btn-sm {
      font-size: 0.75rem;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .btn-success { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
    .btn-success:hover:not(:disabled) { opacity: 0.85; }
    .btn-outline-active { background: #f0ecff; color: #5b21b6; border: 1px solid #c4b5fd; cursor: default; }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ═══════════════════════════════════════════
       DETAIL-MINI-PREVIEWS (pv-*)
       ═══════════════════════════════════════════ */

    /* -- Übergreifend -- */
    .gt-mini-preview { height: 130px; background: #f1f5f9; border-bottom: 1px solid #e5e7eb; }

    /* ── CLASSIC ── */
    .pv-classic { display: flex; gap: 5px; width: 100%; height: 100%; }
    .pv-sidebar {
      width: 28%; background: #fff; border-radius: 4px; padding: 5px;
      display: flex; flex-direction: column; gap: 3px; border: 1px solid #e5e7eb;
    }
    .pv-sb-header { height: 6px; background: #9ca3af; border-radius: 2px; width: 80%; margin-bottom: 2px; }
    .pv-sb-item {
      height: 8px; background: #e5e7eb; border-radius: 3px; width: 100%;
      transition: background 0.15s;
    }
    .pv-sb-item--active { background: linear-gradient(90deg, #667eea, #764ba2); }
    .pv-sb-divider { height: 1px; background: #e5e7eb; margin: 2px 0; }
    .pv-price-bar { height: 4px; background: #e5e7eb; border-radius: 999px; margin-top: 2px; }
    .pv-price-fill { height: 100%; width: 65%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 999px; }
    .pv-main { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .pv-toolbar {
      display: flex; justify-content: space-between; align-items: center;
      background: #fff; border-radius: 3px; padding: 3px 5px; border: 1px solid #e5e7eb;
    }
    .pv-tb-count { height: 5px; width: 40%; background: #d1d5db; border-radius: 2px; }
    .pv-tb-sort { height: 5px; width: 30%; background: #d1d5db; border-radius: 2px; }
    .pv-grid { display: grid; gap: 4px; flex: 1; }
    .pv-grid--3 { grid-template-columns: repeat(3, 1fr); }
    .pv-card { background: #fff; border-radius: 3px; padding: 3px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 2px; }
    .pv-card-img { background: #e5e7eb; border-radius: 2px; flex: 1; min-height: 12px; }
    .pv-card-line { height: 4px; background: #d1d5db; border-radius: 2px; }
    .pv-card-line--short { width: 60%; }

    /* ── FASHION ── */
    .pv-fashion { display: flex; flex-direction: column; gap: 4px; height: 100%; }
    .pv-chips { display: flex; gap: 3px; }
    .pv-chip { height: 8px; width: 26px; background: #d1d5db; border-radius: 999px; }
    .pv-chip--active { background: linear-gradient(90deg, #667eea, #764ba2); width: 32px; }
    .pv-editorial { display: flex; gap: 4px; flex: 1; }
    .pv-hero-card {
      flex: 2; background: linear-gradient(135deg, #e5e7eb, #d1d5db);
      border-radius: 4px; position: relative; overflow: hidden;
    }
    .pv-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(102,126,234,0.5) 0%, transparent 60%);
    }
    .pv-small-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .pv-sm-card { flex: 1; border-radius: 3px; }
    .pv-sm-card--top { background: #ddd6fe; }
    .pv-sm-card--bottom { background: #e0e7ff; }
    .pv-row3 { display: flex; gap: 4px; }
    .pv-reg-card { flex: 1; height: 18px; background: #e5e7eb; border-radius: 3px; }

    /* ── COMPACT ── */
    .pv-compact { display: flex; flex-direction: column; gap: 4px; height: 100%; }
    .pv-cfilter {
      display: flex; gap: 4px; align-items: center;
      background: #fff; border-radius: 3px; padding: 3px 5px; border: 1px solid #e5e7eb;
    }
    .pv-cf-select { height: 7px; width: 50px; background: #d1d5db; border-radius: 3px; }
    .pv-cf-count { height: 7px; width: 25px; background: #e5e7eb; border-radius: 3px; margin-left: auto; }
    .pv-cf-toggle { display: flex; gap: 2px; }
    .pv-cf-toggle::before, .pv-cf-toggle::after {
      content: ''; display: block; width: 7px; height: 7px;
      background: #d1d5db; border-radius: 1px;
    }
    .pv-dense { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; flex: 1; }
    .pv-dense-card {
      background: #fff; border-radius: 2px; border: 1px solid #e5e7eb;
      display: flex; flex-direction: column; gap: 1px; padding: 2px; overflow: hidden;
    }
    .pv-dc-img { background: #e5e7eb; flex: 1; border-radius: 1px; min-height: 8px; }
    .pv-dc-line { height: 3px; background: #d1d5db; border-radius: 1px; }
    .pv-dc-price { height: 3px; width: 60%; background: #667eea; border-radius: 1px; opacity: 0.6; }

    /* ── MARKETPLACE ── */
    .pv-marketplace { display: flex; flex-direction: column; gap: 4px; height: 100%; }
    .pv-mp-chips { display: flex; gap: 3px; }
    .pv-mpc { height: 8px; width: 24px; background: #d1d5db; border-radius: 999px; }
    .pv-mpc--active { background: #1d1d1f; width: 28px; }
    .pv-mp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px; flex: 1; }
    .pv-mp-card {
      background: #fff; border-radius: 3px; border: 1px solid #e5e7eb;
      display: flex; flex-direction: column; gap: 2px; padding: 2px; overflow: hidden;
    }
    .pv-mp-img {
      background: linear-gradient(135deg, #e5e7eb, #d1d5db);
      border-radius: 2px; aspect-ratio: 1; position: relative;
      display: flex; align-items: flex-start; justify-content: flex-end; padding: 2px;
    }
    .pv-mp-heart { font-size: 6px; color: #9ca3af; line-height: 1; }
    .pv-mp-price { height: 5px; background: #1f2937; border-radius: 1px; width: 55%; }
    .pv-mp-title { height: 3px; background: #d1d5db; border-radius: 1px; }
    .pv-mp-meta { display: flex; gap: 2px; align-items: center; }
    .pv-mp-loc { height: 3px; width: 40%; background: #e5e7eb; border-radius: 1px; }
    .pv-mp-btn { height: 5px; width: 30%; background: #667eea; border-radius: 2px; opacity: 0.7; margin-left: auto; }
    .pv-mp-bottombar {
      display: flex; align-items: center; justify-content: center; gap: 0;
      background: #fff; border-radius: 3px; border: 1px solid #e5e7eb;
      padding: 3px 4px;
    }
    .pv-mp-bb-btn { flex: 1; font-size: 5px; color: #374151; font-weight: 700; text-align: center; }
    .pv-mp-bb-div { width: 1px; height: 8px; background: #e5e7eb; }

    /* ── KARTEN-INHALT CSS ── */
    .gt-header-row {
      display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem;
    }
    .gt-icon { font-size: 1.1rem; flex-shrink: 0; }
    .gt-name { margin: 0; font-size: 0.875rem; font-weight: 700; color: #111827; flex: 1; }
    .gt-active-badge {
      font-size: 0.65rem; font-weight: 700; color: #fff;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 999px; padding: 1px 7px; flex-shrink: 0;
    }
    .gt-desc { margin: 0 0 0.6rem; font-size: 0.72rem; color: #6b7280; line-height: 1.4; }

    .gt-features {
      list-style: none; margin: 0 0 0.6rem; padding: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .gt-features li {
      font-size: 0.68rem; color: #374151; padding-left: 1rem; position: relative;
    }
    .gt-features li::before {
      content: '✓'; position: absolute; left: 0;
      color: #667eea; font-weight: 700; font-size: 0.6rem;
    }

    .gt-recommended { margin-top: auto; }
    .gt-rec-label {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #9ca3af; display: block; margin-bottom: 4px;
    }
    .gt-rec-tags { display: flex; flex-wrap: wrap; gap: 3px; }
    .gt-rec-tag {
      font-size: 0.62rem; padding: 2px 6px;
      background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 4px; color: #374151; white-space: nowrap;
    }

    /* Grid: 4 Karten nebeneinander auf Desktop */
    .grid-templates {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
    @media (min-width: 1100px) {
      .grid-templates { grid-template-columns: repeat(4, 1fr); }
    }
  `]
})
export class StoreThemeComponent implements OnInit, OnDestroy {
  // Lucide Icon components
  readonly Palette = Palette;
  readonly Layout = Layout;
  readonly Grid3x3 = Grid3x3;
  readonly Eye = Eye;
  readonly Save = Save;
  readonly ArrowLeft = ArrowLeft;
  readonly RotateCcw = RotateCcw;
  readonly Sparkles = Sparkles;

  storeId!: number;
  activeTheme: StoreTheme | null = null;
  presets: ThemePreset[] = [];
  selectedPreset: ThemePreset | null = null;
  themeName = '';
  selectedTemplate: ShopTemplate = ShopTemplate.FOOD;
  loading = false;
  saving = false;
  applyingTemplate: string | null = null;
  successMessage: string | null = null;
  error: string | null = null;
  headerActions: HeaderAction[] = [];
  breadcrumbItems: BreadcrumbItem[] = [];

  private livePreviewVersion = 0;
  private storeSlug: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
    private storeService: StoreService,
    private sanitizer: DomSanitizer,
    private previewPanel: PreviewPanelService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Methode 1: Aus direkten Route Params
    this.route.params.subscribe(params => {
      const storeIdParam = params['id'] || params['storeId'];
      if (storeIdParam) {
        this.storeId = Number(storeIdParam);
        console.log('✅ Store-ID aus params geladen:', this.storeId);

        // Breadcrumbs initialisieren
        this.breadcrumbItems = [
          { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
          { label: 'navigation.store', route: ['/dashboard/stores', this.storeId], icon: '🏪' },
          { label: 'theme.management', icon: '🎨' }
        ];
      }
    });

    // Methode 2: Aus Parent Route (falls verschachtelt)
    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const storeIdParam = params['id'] || params['storeId'];
        if (storeIdParam && !this.storeId) {
          this.storeId = Number(storeIdParam);
          console.log('✅ Store-ID aus parent params geladen:', this.storeId);
        }
      });
    }

    // Methode 3: Aus URL extrahieren (letzter Fallback)
    if (!this.storeId) {
      const urlMatch = this.router.url.match(/\/stores\/(\d+)/);
      if (urlMatch) {
        this.storeId = +urlMatch[1];
        console.log('✅ Store-ID aus URL extrahiert:', this.storeId);
      }
    }

    // Validation und Laden
    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', this.storeId);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID final geladen:', this.storeId);
    this.loadThemes();
    this.loadPresets();
    this.loadStoreSlug();
    this.registerPreviewPanel();
  }

  ngOnDestroy(): void {
    this.previewPanel.clear();
  }

  /** Registriert das globale Preview-Panel für diese Seite */
  private registerPreviewPanel(): void {
    this.previewPanel.register({
      title: '🎨 Live-Vorschau',
      badge: this.selectedPreset?.name ?? undefined,
      liveUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
        `${this.getStorefrontPreviewBaseUrl()}?v=${this.livePreviewVersion}`
      ),
      liveBaseUrl: this.getStorefrontPreviewBaseUrl(),
      miniData: this.selectedPreset ? {
        colors: this.selectedPreset.colors,
        typography: this.selectedPreset.typography,
        presetName: this.selectedPreset.name
      } : null,
      onReload: () => this.reloadLivePreview()
    });
  }

  /** Aktualisiert den Panel-Service nach Preset-/Theme-Änderung */
  private updatePreviewPanel(): void {
    this.previewPanel.update({
      badge: this.selectedPreset?.name ?? undefined,
      liveUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
        `${this.getStorefrontPreviewBaseUrl()}?v=${this.livePreviewVersion}`
      ),
      liveBaseUrl: this.getStorefrontPreviewBaseUrl(),
      miniData: this.selectedPreset ? {
        colors: this.selectedPreset.colors,
        typography: this.selectedPreset.typography,
        presetName: this.selectedPreset.name
      } : null
    });
  }

  loadThemes(): void {
    this.loading = true;
    this.error = null;

    this.themeService.getActiveTheme(this.storeId).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.loading = false;
      },
      error: (error) => {
        this.error = this.translationService.translate('storeTheme.errorLoading');
        console.error('Error loading themes:', error);
        this.loading = false;
      }
    });
  }

  loadPresets(): void {
    // ✅ Lade Templates aus dem Backend (Free-Template-Katalog)
    // Fallback auf lokale Presets falls Backend nicht erreichbar
    this.themeService.getTemplatesFromBackend(true).subscribe({
      next: (presets) => {
        this.presets = presets;
        console.log(`✅ ${presets.length} Theme-Templates geladen`);
      },
      error: (error) => {
        console.error('Error loading presets:', error);
        // Fallback
        this.themeService.getThemePresets().subscribe(p => this.presets = p);
      }
    });
  }

  /** Hilfsmethode: Backend-Template-ID falls vorhanden */
  getTemplateId(preset: ThemePreset): number | undefined {
    return (preset as any).id;
  }

  /** Free-Badge anzeigen falls Template als kostenlos markiert ist */
  isFreeTemplate(preset: ThemePreset): boolean {
    const isFree = (preset as any).isFree;
    return isFree === undefined ? true : isFree;
  }

  /** Vorschaubild-URL aus Backend (previewUrl → preset.preview), Fallback auf lokale SVGs. */
  private readonly previewJpgToSvgMap: Record<string, string> = {
    'modern-preview.jpg':    '/assets/themes/modern-grid.svg',
    'classic-preview.jpg':   '/assets/themes/classic-bootstrap.svg',
    'minimal-preview.jpg':   '/assets/themes/minimal-dark.svg',
    'elegant-preview.jpg':   '/assets/themes/fashion-editorial.svg',
    'dark-preview.jpg':      '/assets/themes/minimal-dark.svg',
    'fashion-preview.jpg':   '/assets/themes/fashion-editorial.svg',
    'beauty-preview.jpg':    '/assets/themes/beauty-soft.svg',
    'electronics-preview.jpg': '/assets/themes/electronics-pro.svg',
    'restaurant-preview.jpg':  '/assets/themes/restaurant-warm.svg',
  };

  getPreviewUrl(preset: ThemePreset): string | null {
    const url = (preset as any).preview;
    if (!url || typeof url !== 'string') return null;
    // Default-Placeholder vom Service nicht anzeigen, dann Gradient nutzen
    if (url.endsWith('/default-preview.jpg')) return null;
    // Bekannte .jpg-Pfade auf lokal vorhandene .svg Dateien umleiten (kein 404)
    const filename = url.split('/').pop() ?? '';
    if (filename && this.previewJpgToSvgMap[filename]) {
      return this.previewJpgToSvgMap[filename];
    }
    // .jpg-Dateien die nicht in der Map sind → Gradient-Fallback statt 404
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return null;
    return url;
  }

  /**
   * Markiert Karte als „aktiv", wenn der Template-Slug (oder ID) mit dem
   * aktuell aktiven Theme übereinstimmt.
   */
  isActiveTemplate(preset: ThemePreset): boolean {
    if (!this.activeTheme) return false;
    const presetTemplate = (preset as any).template ?? preset.type;
    const themeTemplate = this.activeTheme.template ?? this.activeTheme.type;
    return !!presetTemplate && !!themeTemplate
      && String(presetTemplate).toUpperCase() === String(themeTemplate).toUpperCase();
  }

  /**
   * 1-Klick-Anwendung: Template direkt auf Store anwenden + speichern.
   * Kein Editor-Schritt nötig.
   */
  applyTemplateImmediately(preset: ThemePreset): void {
    const templateId = this.getTemplateId(preset);
    if (!templateId) {
      console.warn('⚠️ Preset hat keine Backend-ID, fallback auf Editor-Modus');
      this.selectPreset(preset);
      return;
    }

    this.applyingTemplate = preset.name;
    this.error = null;

    this.themeService.applyTemplateToStore(this.storeId, templateId, `${preset.name} Theme`).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.applyingTemplate = null;
        this.successMessage = this.translationService.translate('storeTheme.successApplied', { name: preset.name });
        this.reloadLivePreview();
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: (err) => {
        console.error('Fehler beim Anwenden des Templates:', err);
        this.error = this.translationService.translate('storeTheme.errorApplying');
        this.applyingTemplate = null;
      }
    });
  }

  selectPreset(preset: ThemePreset): void {
    this.selectedPreset = JSON.parse(JSON.stringify(preset));
    this.themeName = `${preset.name} Theme`;
    this.updatePreviewPanel();
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  editTheme(theme: StoreTheme): void {
    const preset = this.presets.find(p => p.type === theme.type);
    if (preset) {
      // ✅ Stelle sicher, dass colors, typography und layout existieren
      this.selectedPreset = {
        ...preset,
        colors: theme.colors || preset.colors,
        typography: theme.typography || preset.typography,
        layout: theme.layout || preset.layout
      };
      this.themeName = theme.name;
      this.selectedTemplate = theme.template;
    } else {
      console.warn('⚠️ Preset nicht gefunden für Theme-Typ:', theme.type);
      // Fallback: Verwende das erste Preset
      this.selectedPreset = JSON.parse(JSON.stringify(this.presets[0]));
      this.themeName = theme.name || 'Custom Theme';
      this.selectedTemplate = theme.template || ShopTemplate.CUSTOM;
    }
  }

  saveTheme(): void {
    if (!this.selectedPreset || !this.themeName) {
      return;
    }

    this.saving = true;
    this.error = null;

    const request: CreateThemeRequest = {
      storeId: this.storeId,
      name: this.themeName,
      type: this.selectedPreset.type,
      template: this.selectedTemplate,
      colors: this.selectedPreset.colors,
      typography: this.selectedPreset.typography,
      layout: this.selectedPreset.layout
    };

    this.themeService.createTheme(request).subscribe({
      next: (theme) => {
        this.activeTheme = theme;
        this.selectedPreset = null;
        this.saving = false;
        this.themeService.applyTheme(theme);
        this.successMessage = this.translationService.translate('storeTheme.successSaved', { name: theme.name });
        this.reloadLivePreview();
        this.updatePreviewPanel();
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: (error) => {
        this.error = this.translationService.translate('storeTheme.errorSaving');
        console.error('Error saving theme:', error);
        this.saving = false;
      }
    });
  }

  cancelEdit(): void {
    this.selectedPreset = null;
    this.themeName = '';
  }

  goBack(): void {
    this.router.navigate(['/stores', this.storeId]);
  }

  // ----------------------------------------------------------------
  //  Live-Storefront-Iframe (Vorschau-Tab "🌐 Live")
  // ----------------------------------------------------------------

  /**
   * Lädt den Slug des aktuellen Stores, damit die Live-Vorschau
   * die echte Subdomain-URL `https://{slug}.markt.ma` rendern kann.
   */
  private loadStoreSlug(): void {
    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        if (store?.slug) {
          this.storeSlug = store.slug;
          this.reloadLivePreview();
          this.previewPanel.update({ liveBaseUrl: this.getStorefrontPreviewBaseUrl() });
          console.log('🌐 Store-Slug für Live-Preview geladen:', this.storeSlug);
        }
      },
      error: (err) => console.warn('Store-Slug konnte nicht geladen werden:', err)
    });
  }

  /**
   * Basis-URL der Live-Storefront-Vorschau für diesen Store.
   *
   * Priorität:
   *   1. Wenn Slug bekannt → echte Subdomain `https://{slug}.markt.ma`
   *      (so wie der Store auch von Endkunden gesehen wird).
   *   2. Fallback: Frontend-Route `/storefront/:storeId` für lokale Entwicklung,
   *      falls der Slug noch nicht geladen wurde oder die DNS-Subdomain
   *      lokal nicht erreichbar ist.
   *
   * Hinweis: In rein lokaler Entwicklung (`localhost`) erreicht der Browser
   * die Subdomain nicht – daher der Fallback. Auf Production (markt.ma)
   * sieht der Owner die exakte URL, die seine Kunden sehen.
   */
  getStorefrontPreviewBaseUrl(): string {
    if (this.storeSlug) {
      return `https://${this.storeSlug}.markt.ma`;
    }
    return `/storefront/${this.storeId}`;
  }


  /** Erhöht die Version → triggert Iframe-Reload via Panel-Service */
  reloadLivePreview(): void {
    this.livePreviewVersion++;
    this.previewPanel.update({
      liveUrl: this.sanitizer.bypassSecurityTrustResourceUrl(
        `${this.getStorefrontPreviewBaseUrl()}?v=${this.livePreviewVersion}`
      )
    });
  }


  /** Konvertiert Spring LocalDateTime-Array zu JS Date für die date-Pipe */
  toDate = toDate;

  getThemeTypeName(type: string): string {
    const names: { [key: string]: string } = {
      'MODERN': this.translationService.translate('storeTheme.themeTypeModern'),
      'CLASSIC': this.translationService.translate('storeTheme.themeTypeClassic'),
      'MINIMAL': this.translationService.translate('storeTheme.themeTypeMinimal'),
      'ELEGANT': this.translationService.translate('storeTheme.themeTypeElegant'),
      'DARK': this.translationService.translate('storeTheme.themeTypeDark')
    };
    return names[type] || type;
  }

  getTemplateName(template: string): string {
    const names: { [key: string]: string} = {
      'MODERN_GRID':        this.translationService.translate('storeTheme.templateModernGrid'),
      'CLASSIC_BOOTSTRAP':  this.translationService.translate('storeTheme.templateClassicBootstrap'),
      'FASHION_EDITORIAL':  this.translationService.translate('storeTheme.templateFashionEditorial'),
      'ELECTRONICS_PRO':    this.translationService.translate('storeTheme.templateElectronicsPro'),
      'RESTAURANT_WARM':    this.translationService.translate('storeTheme.templateRestaurantWarm'),
      'BEAUTY_SOFT':        this.translationService.translate('storeTheme.templateBeautySoft'),
      'MINIMAL_DARK':       this.translationService.translate('storeTheme.templateMinimalDark'),
      // Legacy
      'ELECTRONICS': this.translationService.translate('storeTheme.templateElectronics'),
      'FASHION': this.translationService.translate('storeTheme.templateFashion'),
      'FOOD': this.translationService.translate('storeTheme.templateFood'),
      'BEAUTY': this.translationService.translate('storeTheme.templateBeauty'),
      'GENERAL': this.translationService.translate('storeTheme.templateGeneral')
    };
    return names[template] || template;
  }

  // ─── Grid-Template Picker ───────────────────────────────────────────────────

  readonly gridTemplates: {
    code: string; name: string; icon: string;
    description: string; previewClass: string;
    features: string[]; recommendedFor: string[];
  }[] = [
    {
      code: 'MODERN_GRID',
      icon: '📱',
      name: this.translationService.translate('storeTheme.gridMobileMarketplace'),
      description: this.translationService.translate('storeTheme.gridMobileDescription'),
      previewClass: 'marketplace',
      features: [
        this.translationService.translate('storeTheme.gridMobileFeature1'),
        this.translationService.translate('storeTheme.gridMobileFeature2'),
        this.translationService.translate('storeTheme.gridMobileFeature3'),
        this.translationService.translate('storeTheme.gridMobileFeature4'),
        this.translationService.translate('storeTheme.gridMobileFeature5')
      ],
      recommendedFor: [this.translationService.translate('storeTheme.gridMobileRecommended')]
    },
    {
      code: 'CLASSIC_BOOTSTRAP',
      icon: '🏛️',
      name: this.translationService.translate('storeTheme.gridClassicSidebar'),
      description: this.translationService.translate('storeTheme.gridClassicDescription'),
      previewClass: 'classic',
      features: [
        this.translationService.translate('storeTheme.gridClassicFeature1'),
        this.translationService.translate('storeTheme.gridClassicFeature2'),
        this.translationService.translate('storeTheme.gridClassicFeature3'),
        this.translationService.translate('storeTheme.gridClassicFeature4'),
        this.translationService.translate('storeTheme.gridClassicFeature5')
      ],
      recommendedFor: [this.translationService.translate('storeTheme.gridClassicRecommended')]
    },
    {
      code: 'FASHION_EDITORIAL',
      icon: '👗',
      name: this.translationService.translate('storeTheme.gridFashionEditorial'),
      description: this.translationService.translate('storeTheme.gridFashionDescription'),
      previewClass: 'fashion',
      features: [
        this.translationService.translate('storeTheme.gridFashionFeature1'),
        this.translationService.translate('storeTheme.gridFashionFeature2'),
        this.translationService.translate('storeTheme.gridFashionFeature3'),
        this.translationService.translate('storeTheme.gridFashionFeature4'),
        this.translationService.translate('storeTheme.gridFashionFeature5')
      ],
      recommendedFor: [this.translationService.translate('storeTheme.gridFashionRecommended')]
    },
    {
      code: 'ELECTRONICS_PRO',
      icon: '📦',
      name: this.translationService.translate('storeTheme.gridCompactMarket'),
      description: this.translationService.translate('storeTheme.gridCompactDescription'),
      previewClass: 'compact',
      features: [
        this.translationService.translate('storeTheme.gridCompactFeature1'),
        this.translationService.translate('storeTheme.gridCompactFeature2'),
        this.translationService.translate('storeTheme.gridCompactFeature3'),
        this.translationService.translate('storeTheme.gridCompactFeature4'),
        this.translationService.translate('storeTheme.gridCompactFeature5')
      ],
      recommendedFor: [this.translationService.translate('storeTheme.gridCompactRecommended')]
    }
  ];

  /** Prüft ob der übergebene Template-Code aktuell aktiv ist (inkl. Legacy-Mapping) */
  isActiveGridTemplate(code: string): boolean {
    if (!this.activeTheme) return false;
    const t = (this.activeTheme.template ?? '').toString().toUpperCase();
    if (t === code) return true;
    // Legacy enum → neuer Code
    const legacyMap: Record<string, string> = {
      'FASHION': 'FASHION_EDITORIAL',
      'ELECTRONICS': 'ELECTRONICS_PRO',
      'FOOD': 'RESTAURANT_WARM',
      'BEAUTY': 'BEAUTY_SOFT'
    };
    return legacyMap[t] === code;
  }

  getGridTemplateName(code: string): string {
    return this.gridTemplates.find(g => g.code === code)?.name ?? code;
  }

  /** Setzt nur das Grid-Layout des aktiven Themes (1-Klick, kein Editor). */
  applyGridTemplate(code: string): void {
    if (!this.activeTheme || this.isActiveGridTemplate(code) || this.applyingTemplate === code) return;
    this.applyingTemplate = code;
    this.error = null;
    this.themeService.updateTheme(this.activeTheme.id, { template: code as any }).subscribe({
      next: () => {
        // Nur template-Feld lokal überschreiben – applyTheme() NICHT aufrufen,
        // weil das Backend-DTO colorsJson als String zurückgibt (nicht geparst).
        // Grid-Layout ändert keine CSS-Variablen, nur die Struktur der Storefront.
        this.activeTheme = { ...this.activeTheme!, template: code as any };
        this.applyingTemplate = null;
        this.successMessage = this.translationService.translate('storeTheme.gridLayoutApplied', { name: this.getGridTemplateName(code) });
        this.reloadLivePreview();
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: () => {
        this.error = this.translationService.translate('storeTheme.errorSavingGrid');
        this.applyingTemplate = null;
      }
    });
  }
}


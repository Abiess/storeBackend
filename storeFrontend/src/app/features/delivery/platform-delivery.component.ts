import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminSidebarComponent } from '@app/shared/components/admin-sidebar/admin-sidebar.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { ToastService } from '@app/core/services/toast.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import {
  PlatformDeliveryService,
  GlobalDeliveryOption
} from '@app/core/services/platform-delivery.service';

@Component({
  selector: 'app-platform-delivery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSidebarComponent,
    PageHeaderComponent,
    TranslatePipe
  ],
  template: `
    <app-admin-sidebar></app-admin-sidebar>

    <div class="pd-page">

      <!-- ── Header ───────────────────────────────────────────── -->
      <app-page-header
        [title]="'platformDelivery.title' | translate"
        [subtitle]="'platformDelivery.subtitle' | translate"
        [showBackButton]="false"
        [actions]="headerActions"
      ></app-page-header>

      <!-- ── Info-Banner ──────────────────────────────────────── -->
      <div class="pd-info-banner">
        <span class="pd-info-icon">💡</span>
        <p class="pd-info-text">
          <strong>{{ 'platformDelivery.infoTitle' | translate }}</strong>
          {{ 'platformDelivery.infoText' | translate }}
        </p>
      </div>

      <!-- ── Loading ──────────────────────────────────────────── -->
      <div *ngIf="loading" class="pd-loading">
        <div class="pd-spinner"></div>
        <span>{{ 'common.loading' | translate }}</span>
      </div>

      <!-- ── Empty state ──────────────────────────────────────── -->
      <div *ngIf="!loading && options.length === 0" class="pd-empty">
        <span class="pd-empty-icon">🚚</span>
        <h3>{{ 'platformDelivery.emptyTitle' | translate }}</h3>
        <p>{{ 'platformDelivery.emptyText' | translate }}</p>
        <button class="pd-btn pd-btn-primary" (click)="openCreate()">
          + {{ 'platformDelivery.addFirst' | translate }}
        </button>
      </div>

      <!-- ── Cards Grid ────────────────────────────────────────── -->
      <div *ngIf="!loading && options.length > 0" class="pd-grid">
        <div *ngFor="let opt of options" class="pd-card" [class.pd-card--inactive]="!opt.isActive">
          <div class="pd-card__header">
            <span class="pd-card__icon">{{ opt.icon || '🚚' }}</span>
            <div class="pd-card__title-group">
              <h3 class="pd-card__name">{{ opt.name }}</h3>
              <span class="pd-card__type pd-badge pd-badge--{{ opt.deliveryType | lowercase }}">
                {{ 'platformDelivery.types.' + opt.deliveryType | translate }}
              </span>
            </div>
            <label class="pd-toggle" [title]="opt.isActive ? ('platformDelivery.deactivate' | translate) : ('platformDelivery.activate' | translate)">
              <input type="checkbox" [checked]="opt.isActive" (change)="toggleActive(opt)" />
              <span class="pd-toggle__slider"></span>
            </label>
          </div>

          <p *ngIf="opt.description" class="pd-card__desc">{{ opt.description }}</p>

          <div class="pd-card__meta">
            <div class="pd-meta-item">
              <span class="pd-meta-label">{{ 'platformDelivery.price' | translate }}</span>
              <span class="pd-meta-value pd-price">
                <ng-container *ngIf="opt.price === 0">{{ 'platformDelivery.free' | translate }}</ng-container>
                <ng-container *ngIf="opt.price > 0">{{ opt.price | number:'1.2-2' }} MAD</ng-container>
              </span>
            </div>
            <div class="pd-meta-item" *ngIf="opt.etaMinDays != null">
              <span class="pd-meta-label">{{ 'platformDelivery.eta' | translate }}</span>
              <span class="pd-meta-value">{{ opt.etaMinDays }}–{{ opt.etaMaxDays ?? opt.etaMinDays }} {{ 'platformDelivery.days' | translate }}</span>
            </div>
            <div class="pd-meta-item">
              <span class="pd-meta-label">{{ 'platformDelivery.order' | translate }}</span>
              <span class="pd-meta-value">{{ opt.sortOrder }}</span>
            </div>
          </div>

          <div class="pd-card__actions">
            <button class="pd-btn pd-btn-ghost" (click)="openEdit(opt)">
              ✏️ {{ 'common.edit' | translate }}
            </button>
            <button class="pd-btn pd-btn-danger-ghost" (click)="deleteOption(opt)">
              🗑️ {{ 'common.delete' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal ─────────────────────────────────────────────── -->
      <div *ngIf="showForm" class="pd-overlay" (click)="closeForm()">
        <div class="pd-modal" (click)="$event.stopPropagation()">

          <div class="pd-modal__header">
            <h2>{{ (editingOption ? 'platformDelivery.editTitle' : 'platformDelivery.createTitle') | translate }}</h2>
            <button class="pd-modal__close" (click)="closeForm()" [attr.aria-label]="'common.close' | translate">✕</button>
          </div>

          <div class="pd-modal__body">

            <!-- Name + Type -->
            <div class="pd-form-row">
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.name' | translate }} <span class="pd-req">*</span></label>
                <input type="text" [(ngModel)]="form.name"
                  [placeholder]="'platformDelivery.form.namePlaceholder' | translate" />
              </div>
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.type' | translate }} <span class="pd-req">*</span></label>
                <select [(ngModel)]="form.deliveryType">
                  <option value="PICKUP">📦 {{ 'platformDelivery.types.PICKUP' | translate }}</option>
                  <option value="STANDARD">🚚 {{ 'platformDelivery.types.STANDARD' | translate }}</option>
                  <option value="EXPRESS">⚡ {{ 'platformDelivery.types.EXPRESS' | translate }}</option>
                  <option value="SAME_DAY">🔥 {{ 'platformDelivery.types.SAME_DAY' | translate }}</option>
                </select>
              </div>
            </div>

            <!-- Description -->
            <div class="pd-field">
              <label>{{ 'platformDelivery.form.description' | translate }}</label>
              <textarea [(ngModel)]="form.description" rows="2"
                [placeholder]="'platformDelivery.form.descriptionPlaceholder' | translate"></textarea>
            </div>

            <!-- Price + Icon -->
            <div class="pd-form-row">
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.price' | translate }} <span class="pd-req">*</span></label>
                <div class="pd-input-group">
                  <input type="number" [(ngModel)]="form.price" min="0" step="0.5" placeholder="0.00" />
                  <span class="pd-input-suffix">MAD</span>
                </div>
              </div>
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.icon' | translate }}</label>
                <input type="text" [(ngModel)]="form.icon" placeholder="🚚" maxlength="4" class="pd-icon-input" />
              </div>
            </div>

            <!-- ETA -->
            <div class="pd-form-row">
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.etaMin' | translate }}</label>
                <div class="pd-input-group">
                  <input type="number" [(ngModel)]="form.etaMinDays" min="0" placeholder="1" />
                  <span class="pd-input-suffix">{{ 'platformDelivery.days' | translate }}</span>
                </div>
              </div>
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.etaMax' | translate }}</label>
                <div class="pd-input-group">
                  <input type="number" [(ngModel)]="form.etaMaxDays" min="0" placeholder="3" />
                  <span class="pd-input-suffix">{{ 'platformDelivery.days' | translate }}</span>
                </div>
              </div>
            </div>

            <!-- Sort + Active -->
            <div class="pd-form-row">
              <div class="pd-field">
                <label>{{ 'platformDelivery.form.sortOrder' | translate }}</label>
                <input type="number" [(ngModel)]="form.sortOrder" min="0" placeholder="100" />
              </div>
              <div class="pd-field pd-field--toggle">
                <label>{{ 'platformDelivery.form.active' | translate }}</label>
                <label class="pd-toggle pd-toggle--large">
                  <input type="checkbox" [(ngModel)]="form.isActive" />
                  <span class="pd-toggle__slider"></span>
                  <span class="pd-toggle__label">{{ form.isActive ? ('platformDelivery.activeYes' | translate) : ('platformDelivery.activeNo' | translate) }}</span>
                </label>
              </div>
            </div>

          </div>

          <div class="pd-modal__footer">
            <button class="pd-btn pd-btn-ghost" (click)="closeForm()">
              {{ 'common.cancel' | translate }}
            </button>
            <button class="pd-btn pd-btn-primary" (click)="saveOption()" [disabled]="saving">
              <span *ngIf="saving">⏳</span>
              {{ (editingOption ? 'common.save' : 'platformDelivery.create') | translate }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ── Layout ───────────────────────────────────────────────── */
    .pd-page {
      margin-inline-start: 260px;   /* RTL-safe (LTR: left | RTL: right) */
      padding: 24px 28px;
      min-height: 100vh;
      background: #f5f6fa;
      box-sizing: border-box;
    }
    @media (max-width: 1024px) { .pd-page { margin-inline-start: 0; } }

    /* ── Info Banner ──────────────────────────────────────────── */
    .pd-info-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: linear-gradient(135deg, #667eea12, #764ba210);
      border: 1px solid #667eea35;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .pd-info-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .pd-info-text {
      font-size: 14px; color: #555; line-height: 1.6; margin: 0;
    }
    .pd-info-text strong { color: #667eea; display: block; margin-bottom: 2px; }

    /* ── Loading ──────────────────────────────────────────────── */
    .pd-loading {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 60px; color: #666; font-size: 15px;
    }
    .pd-spinner {
      width: 24px; height: 24px;
      border: 3px solid #e0e0e0; border-top-color: #667eea;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Empty State ──────────────────────────────────────────── */
    .pd-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px 24px; text-align: center;
      background: white; border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
    }
    .pd-empty-icon { font-size: 56px; margin-bottom: 16px; }
    .pd-empty h3 { margin: 0 0 8px; font-size: 20px; color: #333; }
    .pd-empty p { margin: 0 0 24px; color: #888; font-size: 15px; }

    /* ── Cards Grid ───────────────────────────────────────────── */
    .pd-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .pd-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,.07);
      padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
      border: 2px solid transparent;
      transition: box-shadow .2s, border-color .2s;
    }
    .pd-card:hover { box-shadow: 0 6px 24px rgba(102,126,234,.15); border-color: #667eea30; }
    .pd-card--inactive { opacity: .6; }

    .pd-card__header {
      display: flex; align-items: center; gap: 12px;
    }
    .pd-card__icon { font-size: 28px; flex-shrink: 0; }
    .pd-card__title-group { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .pd-card__name { margin: 0; font-size: 16px; font-weight: 600; color: #1a1a2e; }

    .pd-badge {
      display: inline-block; padding: 2px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px;
      width: fit-content;
    }
    .pd-badge--pickup    { background: #e8f5e9; color: #2e7d32; }
    .pd-badge--standard  { background: #e3f2fd; color: #1565c0; }
    .pd-badge--express   { background: #fff3e0; color: #e65100; }
    .pd-badge--same_day  { background: #fce4ec; color: #c62828; }

    .pd-card__desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }

    .pd-card__meta {
      display: flex; gap: 16px; flex-wrap: wrap;
      padding: 12px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;
    }
    .pd-meta-item { display: flex; flex-direction: column; gap: 2px; }
    .pd-meta-label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: .4px; }
    .pd-meta-value { font-size: 14px; font-weight: 600; color: #333; }
    .pd-price { color: #667eea; }

    .pd-card__actions { display: flex; gap: 8px; }

    /* ── Toggle Switch ────────────────────────────────────────── */
    .pd-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; flex-shrink: 0; }
    .pd-toggle input { display: none; }
    .pd-toggle__slider {
      width: 40px; height: 22px; background: #ccc; border-radius: 22px;
      position: relative; transition: background .2s; flex-shrink: 0;
    }
    .pd-toggle__slider::after {
      content: ''; position: absolute; top: 2px; inset-inline-start: 2px;
      width: 18px; height: 18px; background: white; border-radius: 50%;
      transition: transform .2s;
    }
    .pd-toggle input:checked + .pd-toggle__slider { background: #667eea; }
    .pd-toggle input:checked + .pd-toggle__slider::after { transform: translateX(18px); }
    .pd-toggle--large .pd-toggle__slider { width: 48px; height: 26px; }
    .pd-toggle--large .pd-toggle__slider::after { width: 22px; height: 22px; }
    .pd-toggle--large input:checked + .pd-toggle__slider::after { transform: translateX(22px); }
    .pd-toggle__label { font-size: 13px; color: #555; }

    /* ── Buttons ──────────────────────────────────────────────── */
    .pd-btn {
      padding: 8px 16px; border-radius: 8px; font-size: 13px;
      font-weight: 500; cursor: pointer; border: none; transition: all .15s;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .pd-btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2); color: white;
      padding: 10px 20px;
    }
    .pd-btn-primary:hover { opacity: .9; transform: translateY(-1px); }
    .pd-btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; }
    .pd-btn-ghost { background: #f5f5f5; color: #444; }
    .pd-btn-ghost:hover { background: #ebebeb; }
    .pd-btn-danger-ghost { background: #fff5f5; color: #e53e3e; }
    .pd-btn-danger-ghost:hover { background: #fed7d7; }

    /* ── Modal ────────────────────────────────────────────────── */
    .pd-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 16px;
    }
    .pd-modal {
      background: white; border-radius: 18px; width: 580px; max-width: 100%;
      box-shadow: 0 24px 64px rgba(0,0,0,.22); max-height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .pd-modal__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
    }
    .pd-modal__header h2 { margin: 0; font-size: 18px; color: #1a1a2e; }
    .pd-modal__close {
      background: #f5f5f5; border: none; border-radius: 50%;
      width: 32px; height: 32px; cursor: pointer; font-size: 14px; color: #666;
      display: flex; align-items: center; justify-content: center;
    }
    .pd-modal__close:hover { background: #ebebeb; color: #333; }
    .pd-modal__body {
      padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;
      overflow-y: auto;
    }
    .pd-modal__footer {
      padding: 16px 24px; border-top: 1px solid #f0f0f0;
      display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
    }

    /* ── Form ─────────────────────────────────────────────────── */
    .pd-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 480px) { .pd-form-row { grid-template-columns: 1fr; } }

    .pd-field { display: flex; flex-direction: column; gap: 6px; }
    .pd-field label { font-size: 13px; font-weight: 500; color: #555; }
    .pd-req { color: #e53e3e; }

    .pd-field input, .pd-field select, .pd-field textarea {
      padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 9px;
      font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
      background: white; width: 100%; box-sizing: border-box;
    }
    .pd-field input:focus, .pd-field select:focus, .pd-field textarea:focus {
      border-color: #667eea; box-shadow: 0 0 0 3px #667eea1a;
    }
    .pd-icon-input { font-size: 20px; text-align: center; max-width: 80px; }

    .pd-input-group { display: flex; align-items: stretch; }
    .pd-input-group input {
      border-radius: 9px 0 0 9px; border-inline-end: none; flex: 1;
    }
    .pd-input-suffix {
      background: #f5f6fa; border: 1.5px solid #e2e8f0;
      border-radius: 0 9px 9px 0; padding: 0 12px;
      font-size: 13px; color: #666; display: flex; align-items: center;
      white-space: nowrap;
    }

    .pd-field--toggle { justify-content: flex-start; gap: 10px; }
    .pd-field--toggle label:first-child { margin-bottom: 0; }

    /* RTL overrides */
    [dir="rtl"] .pd-input-group input { border-radius: 0 9px 9px 0; border-inline-end: 1.5px solid #e2e8f0; border-inline-start: none; }
    [dir="rtl"] .pd-input-suffix { border-radius: 9px 0 0 9px; }
    [dir="rtl"] .pd-toggle__slider::after { inset-inline-start: 2px; }
  `]
})
export class PlatformDeliveryComponent implements OnInit, OnDestroy {

  options: GlobalDeliveryOption[] = [];
  loading = false;
  saving = false;
  showForm = false;
  editingOption: GlobalDeliveryOption | null = null;
  form: GlobalDeliveryOption = this.emptyForm();

  headerActions: HeaderAction[] = [
    {
      label: '+ Neue Lieferoption',
      icon: 'plus',
      class: 'btn-primary',
      onClick: () => this.openCreate()
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private deliveryService: PlatformDeliveryService,
    private toast: ToastService
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.deliveryService.getAllOptions().pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.options = data; this.loading = false; },
        error: () => { this.toast.error('Fehler beim Laden'); this.loading = false; }
      });
  }

  openCreate(): void {
    this.editingOption = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(option: GlobalDeliveryOption): void {
    this.editingOption = option;
    this.form = { ...option };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingOption = null;
    this.form = this.emptyForm();
  }

  saveOption(): void {
    if (!this.form.name?.trim() || this.form.price == null) {
      this.toast.error('Name und Preis sind Pflichtfelder');
      return;
    }
    this.saving = true;
    const obs = this.editingOption?.id
      ? this.deliveryService.updateOption(this.editingOption.id, this.form)
      : this.deliveryService.createOption(this.form);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success(this.editingOption ? '✅ Aktualisiert' : '✅ Erstellt');
        this.saving = false;
        this.closeForm();
        this.load();
      },
      error: () => { this.toast.error('Fehler beim Speichern'); this.saving = false; }
    });
  }

  toggleActive(option: GlobalDeliveryOption): void {
    const updated = { ...option, isActive: !option.isActive };
    this.deliveryService.updateOption(option.id!, updated).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { option.isActive = !option.isActive; },
        error: () => this.toast.error('Fehler beim Umschalten')
      });
  }

  deleteOption(option: GlobalDeliveryOption): void {
    if (!confirm(`Lieferoption "${option.name}" wirklich löschen?`)) return;
    this.deliveryService.deleteOption(option.id!).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.toast.success('Gelöscht'); this.load(); },
        error: () => this.toast.error('Fehler beim Löschen')
      });
  }

  private emptyForm(): GlobalDeliveryOption {
    return { name: '', description: '', deliveryType: 'STANDARD', price: 0,
      etaMinDays: 1, etaMaxDays: 3, icon: '🚚', isActive: true, sortOrder: 100 };
  }
}


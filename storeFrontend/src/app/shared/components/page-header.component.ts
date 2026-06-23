import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

/**
 * Einheitliche Page Header Komponente
 *
 * Verwendung:
 * <app-page-header
 *   [title]="'Produktverwaltung'"
 *   [breadcrumbs]="breadcrumbItems"
 *   [showBackButton]="true"
 *   [backRoute]="'/admin/products'"
 *   [actions]="headerActions">
 * </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe, BreadcrumbComponent],
  template: `
    <!-- Breadcrumbs -->
    <app-breadcrumb *ngIf="breadcrumbs && breadcrumbs.length > 0" [items]="breadcrumbs"></app-breadcrumb>

    <!-- Header -->
    <div class="page-header">
      <div class="page-header-glow"></div>

      <div class="page-header-inner">
        <div class="page-header-left">
          <button
            *ngIf="showBackButton"
            class="btn-back"
            (click)="handleBack()"
            [attr.aria-label]="'common.back' | translate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            <span class="back-text">{{ (backButtonText ? (backButtonText | translate) : ('common.back' | translate)) }}</span>
          </button>

          <div class="title-block">
            <h1 class="page-title">{{ title | translate }}</h1>
            <p *ngIf="subtitle" class="page-subtitle">{{ subtitle | translate }}</p>
          </div>
        </div>

        <div class="page-header-right" *ngIf="actions && actions.length > 0">
          <button
            *ngFor="let action of actions"
            [class]="'action-btn ' + (action.class || 'action-btn-primary')"
            (click)="action.onClick()"
            [disabled]="action.disabled"
            [attr.aria-label]="action.label | translate">
            <span *ngIf="action.icon" [class]="'btn-icon ' + action.icon"></span>
            <span>{{ action.label | translate }}</span>
          </button>
        </div>
      </div>

      <div class="page-header-accent"></div>
    </div>
  `,
  styles: [`
    /* ── Wrapper ─────────────────────────────────────────────── */
    .page-header {
      position: relative;
      background: linear-gradient(135deg, #fdf4ff 0%, #fce7f3 40%, #ede9fe 100%);
      border-radius: 18px;
      margin-bottom: 2rem;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(168,85,247,.10), 0 1px 4px rgba(0,0,0,.04);
    }

    /* subtle ambient glow top-right */
    .page-header-glow {
      position: absolute; top: -40px; right: -40px;
      width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, rgba(236,72,153,.18) 0%, transparent 70%);
      pointer-events: none;
    }

    .page-header-inner {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.4rem 1.75rem 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    /* ── Left side ───────────────────────────────────────────── */
    .page-header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      min-width: 0;
    }

    .title-block { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }

    .page-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -.4px;
      background: linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #667eea 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .page-subtitle {
      margin: 0;
      color: #7c3aed;
      font-size: 0.82rem;
      font-weight: 500;
      opacity: .75;
    }

    /* ── Back button ─────────────────────────────────────────── */
    .btn-back {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px 7px 10px;
      background: rgba(255,255,255,.7);
      border: 1px solid rgba(168,85,247,.25);
      border-radius: 10px;
      font-size: 13px; font-weight: 600; color: #7c3aed;
      cursor: pointer; flex-shrink: 0;
      backdrop-filter: blur(6px);
      transition: background .15s, box-shadow .15s, transform .1s;
    }
    .btn-back:hover {
      background: rgba(255,255,255,.95);
      box-shadow: 0 2px 10px rgba(168,85,247,.2);
      transform: translateX(-1px);
    }
    .btn-back svg { flex-shrink: 0; }

    /* ── Right side – action buttons ────────────────────────── */
    .page-header-right { display: flex; gap: 0.6rem; flex-shrink: 0; flex-wrap: wrap; }

    .action-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 20px; border-radius: 10px;
      font-size: 0.875rem; font-weight: 700; cursor: pointer;
      transition: opacity .15s, transform .1s, box-shadow .15s;
      border: none;
      &:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(168,85,247,.3); }
      &:active { transform: translateY(0); }
      &:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }
    }
    .action-btn-primary {
      background: linear-gradient(135deg, #ec4899, #a855f7);
      color: #fff;
      box-shadow: 0 2px 10px rgba(168,85,247,.25);
    }
    .action-btn-secondary {
      background: rgba(255,255,255,.8);
      border: 1px solid rgba(168,85,247,.3);
      color: #7c3aed;
      backdrop-filter: blur(6px);
    }

    /* ── Bottom accent line ──────────────────────────────────── */
    .page-header-accent {
      height: 3px;
      background: linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #667eea 100%);
    }

    /* ── Responsive ──────────────────────────────────────────── */
    @media (max-width: 768px) {
      .page-header-inner { flex-direction: column; align-items: stretch; padding: 1.1rem 1.1rem 1rem; }
      .page-header-left { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
      .page-header-right { width: 100%; }
      .page-header-right .action-btn { flex: 1; justify-content: center; }
      .page-title { font-size: 1.4rem; white-space: normal; }
    }
    @media (max-width: 480px) {
      .page-header-right { flex-direction: column; }
      .back-text { display: none; }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() breadcrumbs?: BreadcrumbItem[];
  @Input() showBackButton: boolean = true;
  @Input() backButtonText?: string;
  @Input() backRoute?: string;
  @Input() actions?: HeaderAction[] = [];

  @Output() backClick = new EventEmitter<void>();

  constructor(
    private location: Location,
    private router: Router
  ) {}

  handleBack(): void {
    if (this.backClick.observers.length > 0) {
      // Wenn ein Custom Handler definiert ist
      this.backClick.emit();
    } else if (this.backRoute) {
      // Wenn eine spezifische Route definiert ist
      this.router.navigate([this.backRoute]);
    } else {
      // Standard: Browser History zurück
      this.location.back();
    }
  }
}

export interface HeaderAction {
  label: string;
  icon?: string;
  class?: string;
  disabled?: boolean;
  onClick: () => void;
}


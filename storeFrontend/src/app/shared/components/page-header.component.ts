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
      <div class="page-header-left">
        <button 
          *ngIf="showBackButton" 
          class="btn btn-back" 
          (click)="handleBack()"
          [attr.aria-label]="'common.back' | translate">
          <span class="back-icon">←</span>
          <span class="back-text">{{ backButtonText || ('common.back' | translate) }}</span>
        </button>
        <h1 class="page-title">{{ title | translate }}</h1>
        <span *ngIf="subtitle" class="page-subtitle">{{ subtitle | translate }}</span>
      </div>
      
      <div class="page-header-right" *ngIf="actions && actions.length > 0">
        <button
          *ngFor="let action of actions"
          [class]="'btn ' + (action.class || 'btn-primary')"
          (click)="action.onClick()"
          [disabled]="action.disabled"
          [attr.aria-label]="action.label | translate"
        >
          <span *ngIf="action.icon" [class]="'btn-icon ' + action.icon"></span>
          <span>{{ action.label | translate }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 1rem 0;
      border-bottom: 2px solid var(--theme-border, #e2e8f0);
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      min-width: 0;
    }

    .page-header-right {
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .page-title {
      margin: 0;
      color: var(--theme-text, #333);
      font-size: 1.875rem;
      font-weight: 700;
      font-family: var(--theme-heading-font-family, inherit);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .page-subtitle {
      color: var(--theme-text-secondary, #718096);
      font-size: 0.875rem;
      font-weight: 400;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .back-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .back-text {
      font-weight: 500;
    }

    .btn-icon {
      font-size: 1rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .page-header-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .page-header-right {
        width: 100%;
        
        button {
          flex: 1;
        }
      }

      .page-title {
        font-size: 1.5rem;
      }

      .btn-back {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .page-header-right {
        flex-direction: column;
      }

      .back-text {
        display: none;
      }

      .back-icon {
        font-size: 1.5rem;
      }
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


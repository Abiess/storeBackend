import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';

/**
 * Einheitliche Breadcrumb-Komponente
 *
 * Verwendung:
 * <app-breadcrumb [items]="breadcrumbItems"></app-breadcrumb>
 *
 * breadcrumbItems: BreadcrumbItem[] = [
 *   { label: 'Dashboard', route: '/dashboard' },
 *   { label: 'Shop', route: '/dashboard/stores/1' },
 *   { label: 'Kategorien' }  // Letzter ohne Route = aktuell
 * ];
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <nav class="breadcrumb" *ngIf="items && items.length > 0" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li 
          *ngFor="let item of items; let i = index; let last = last" 
          class="breadcrumb-item"
          [class.active]="last"
        >
          <!-- Link für nicht-letzte Items -->
          <a 
            *ngIf="!last && item.route" 
            [routerLink]="item.route"
            [queryParams]="item.queryParams"
            class="breadcrumb-link"
          >
            <span *ngIf="item.icon" class="breadcrumb-icon">{{ item.icon }}</span>
            <span class="breadcrumb-label">{{ item.label | translate }}</span>
          </a>
          
          <!-- Text für nicht-klickbare Items -->
          <span *ngIf="!last && !item.route" class="breadcrumb-text">
            <span *ngIf="item.icon" class="breadcrumb-icon">{{ item.icon }}</span>
            <span class="breadcrumb-label">{{ item.label | translate }}</span>
          </span>
          
          <!-- Aktuelles Item (letztes) -->
          <span *ngIf="last" class="breadcrumb-current">
            <span *ngIf="item.icon" class="breadcrumb-icon">{{ item.icon }}</span>
            <span class="breadcrumb-label">{{ item.label | translate }}</span>
          </span>
          
          <!-- Separator (außer beim letzten) -->
          <span *ngIf="!last" class="breadcrumb-separator" aria-hidden="true">›</span>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb {
      background: var(--theme-background, #ffffff);
      padding: 0.75rem 0;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--theme-border, #e2e8f0);
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.875rem;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .breadcrumb-link {
      color: var(--theme-primary, #667eea);
      text-decoration: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .breadcrumb-link:hover {
      color: var(--theme-secondary, #5568d3);
      background: rgba(102, 126, 234, 0.1);
      text-decoration: none;
    }

    .breadcrumb-link:focus {
      outline: 2px solid var(--theme-primary, #667eea);
      outline-offset: 2px;
    }

    .breadcrumb-text {
      color: var(--theme-text-secondary, #718096);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .breadcrumb-current {
      color: var(--theme-text, #1a202c);
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .breadcrumb-separator {
      color: var(--theme-text-secondary, #a0aec0);
      font-weight: 400;
      user-select: none;
    }

    .breadcrumb-icon {
      font-size: 1rem;
      line-height: 1;
    }

    .breadcrumb-label {
      line-height: 1.5;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .breadcrumb {
        padding: 0.5rem 0;
      }

      .breadcrumb-list {
        font-size: 0.8125rem;
        gap: 0.375rem;
      }

      .breadcrumb-icon {
        display: none; /* Icons auf Mobile ausblenden für mehr Platz */
      }

      .breadcrumb-link,
      .breadcrumb-text,
      .breadcrumb-current {
        padding: 0.125rem 0.25rem;
      }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .breadcrumb-link {
        transition: none;
      }
    }

    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .breadcrumb-link {
        text-decoration: underline;
      }
    }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}

export interface BreadcrumbItem {
  label: string;           // Text (wird übersetzt)
  route?: string | any[];  // Route (optional)
  queryParams?: any;       // Query Parameters (optional)
  icon?: string;           // Emoji/Icon (optional)
}


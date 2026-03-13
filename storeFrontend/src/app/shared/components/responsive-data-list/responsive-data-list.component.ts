import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ColumnConfig {
  key: string;
  label: string;
  type?: 'text' | 'image' | 'badge' | 'currency' | 'date' | 'custom';
  width?: string;
  mobileLabel?: string; // Label für Mobile-Ansicht
  hideOnMobile?: boolean;
  formatFn?: (value: any, item: any) => string;
  badgeClass?: (value: any, item: any) => string;
}

export interface ActionConfig {
  icon: string;
  label: string;
  class?: string;
  handler: (item: any) => void;
  visible?: (item: any) => boolean;
}

@Component({
  selector: 'app-responsive-data-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Desktop Table View -->
    <div class="desktop-table-view">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th *ngFor="let col of columns" [style.width]="col.width">
                {{ col.label }}
              </th>
              <th *ngIf="actions.length > 0" class="actions-header">
                {{ actionsLabel }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items" [class.clickable]="rowClickable" (click)="onRowClick(item)">
              <td *ngFor="let col of columns" [attr.data-label]="col.label">
                <!-- Image Type -->
                <div *ngIf="col.type === 'image'" class="image-cell">
                  <img 
                    *ngIf="getCellValue(item, col.key)" 
                    [src]="getCellValue(item, col.key)" 
                    [alt]="col.label"
                    class="cell-image"
                    (error)="onImageError($event)">
                  <div *ngIf="!getCellValue(item, col.key)" class="image-placeholder">
                    📷
                  </div>
                </div>

                <!-- Badge Type -->
                <span 
                  *ngIf="col.type === 'badge'" 
                  class="status-badge"
                  [ngClass]="col.badgeClass ? col.badgeClass(getCellValue(item, col.key), item) : ''">
                  {{ formatCell(item, col) }}
                </span>

                <!-- Currency Type -->
                <span *ngIf="col.type === 'currency'" class="currency-value">
                  {{ getCellValue(item, col.key) | number:'1.2-2' }} €
                </span>

                <!-- Date Type -->
                <span *ngIf="col.type === 'date'">
                  {{ getCellValue(item, col.key) | date:'dd.MM.yyyy HH:mm' }}
                </span>

                <!-- Text Type (default) -->
                <span *ngIf="!col.type || col.type === 'text'">
                  {{ formatCell(item, col) }}
                </span>

                <!-- Custom Type -->
                <ng-container *ngIf="col.type === 'custom' && customCellTemplate">
                  <ng-container *ngTemplateOutlet="customCellTemplate!; context: { $implicit: item, column: col }">
                  </ng-container>
                </ng-container>
              </td>
              <td *ngIf="actions.length > 0" class="actions-cell">
                <div class="action-buttons">
                  <button 
                    *ngFor="let action of actions"
                    [hidden]="action.visible && !action.visible(item)"
                    class="btn-action"
                    [ngClass]="action.class"
                    [title]="action.label"
                    (click)="executeAction(action, item, $event)">
                    {{ action.icon }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Card/List View -->
    <div class="mobile-list-view">
      <div class="card-list">
        <div 
          *ngFor="let item of items" 
          class="item-card"
          [class.clickable]="rowClickable"
          (click)="onRowClick(item)">
          
          <!-- Card Content -->
          <div class="card-content">
            <!-- Image Section (if exists) -->
            <div *ngIf="hasImageColumn()" class="card-image-section">
              <img 
                *ngIf="getImageUrl(item)" 
                [src]="getImageUrl(item)" 
                [alt]="'Image'"
                class="card-image"
                (error)="onImageError($event)">
              <div *ngIf="!getImageUrl(item)" class="card-image-placeholder">
                📷
              </div>
            </div>

            <!-- Info Section -->
            <div class="card-info-section">
              <div *ngFor="let col of getMobileColumns()" class="card-field">
                <span class="field-label">{{ col.mobileLabel || col.label }}:</span>
                
                <!-- Badge -->
                <span 
                  *ngIf="col.type === 'badge'" 
                  class="status-badge field-value"
                  [ngClass]="col.badgeClass ? col.badgeClass(getCellValue(item, col.key), item) : ''">
                  {{ formatCell(item, col) }}
                </span>

                <!-- Currency -->
                <span *ngIf="col.type === 'currency'" class="field-value currency-value">
                  {{ getCellValue(item, col.key) | number:'1.2-2' }} €
                </span>

                <!-- Date -->
                <span *ngIf="col.type === 'date'" class="field-value">
                  {{ getCellValue(item, col.key) | date:'dd.MM.yyyy' }}
                </span>

                <!-- Text -->
                <span *ngIf="!col.type || col.type === 'text'" class="field-value">
                  {{ formatCell(item, col) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Actions -->
          <div *ngIf="actions.length > 0" class="card-actions">
            <button 
              *ngFor="let action of actions"
              [hidden]="action.visible && !action.visible(item)"
              class="btn-action"
              [ngClass]="action.class"
              [title]="action.label"
              (click)="executeAction(action, item, $event)">
              {{ action.icon }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="items.length === 0 && !loading" class="empty-state">
      <div class="empty-icon">{{ emptyIcon }}</div>
      <p>{{ emptyMessage }}</p>
    </div>

    <!-- Loading State -->
    <div *ngIf="loading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  `,
  styleUrls: ['./responsive-data-list.component.scss']
})
export class ResponsiveDataListComponent {
  @Input() items: any[] = [];
  @Input() columns: ColumnConfig[] = [];
  @Input() actions: ActionConfig[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'Keine Einträge vorhanden';
  @Input() emptyIcon = '📭';
  @Input() loadingMessage = 'Wird geladen...';
  @Input() actionsLabel = 'Aktionen';
  @Input() rowClickable = false;

  @Output() rowClick = new EventEmitter<any>();

  @ContentChild('customCell') customCellTemplate: TemplateRef<any> | null = null;

  getCellValue(item: any, key: string): any {
    const keys = key.split('.');
    let value = item;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  }

  formatCell(item: any, col: ColumnConfig): string {
    const value = this.getCellValue(item, col.key);
    if (col.formatFn) {
      return col.formatFn(value, item);
    }
    return value ?? '-';
  }

  hasImageColumn(): boolean {
    return this.columns.some(col => col.type === 'image');
  }

  getImageUrl(item: any): string | null {
    const imageCol = this.columns.find(col => col.type === 'image');
    if (!imageCol) return null;
    return this.getCellValue(item, imageCol.key);
  }

  getMobileColumns(): ColumnConfig[] {
    return this.columns.filter(col => col.type !== 'image' && !col.hideOnMobile);
  }

  executeAction(action: ActionConfig, item: any, event: Event): void {
    event.stopPropagation();
    action.handler(item);
  }

  onRowClick(item: any): void {
    if (this.rowClickable) {
      this.rowClick.emit(item);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}


import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ColumnConfig {
  key: string;
  label: string;
  type?: 'text' | 'image' | 'badge' | 'currency' | 'date' | 'custom' | 'number';
  width?: string;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
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
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ─── Toolbar ──────────────────────────────────────────── -->
    <div class="rdl-toolbar" *ngIf="showToolbar">
      <div class="rdl-toolbar__left">
        <div class="rdl-search" *ngIf="searchable">
          <span class="rdl-search__icon">🔍</span>
          <input
            class="rdl-search__input"
            type="text"
            [placeholder]="searchPlaceholder"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)" />
          <button *ngIf="searchQuery" class="rdl-search__clear" (click)="clearSearch()">✕</button>
        </div>
        <span class="rdl-count" *ngIf="filteredItems.length !== items.length">
          {{ filteredItems.length }} / {{ items.length }} Einträge
        </span>
        <span class="rdl-count" *ngIf="filteredItems.length === items.length && !loading">
          {{ items.length }} {{ items.length === 1 ? 'Eintrag' : 'Einträge' }}
        </span>
      </div>
      <div class="rdl-toolbar__right">
        <div class="rdl-view-toggle">
          <button class="rdl-toggle-btn" [class.rdl-toggle-btn--active]="viewMode === 'table'" (click)="viewMode = 'table'" title="Tabellenansicht">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="0" width="16" height="3" rx="1"/>
              <rect x="0" y="5" width="16" height="3" rx="1"/>
              <rect x="0" y="10" width="16" height="3" rx="1"/>
            </svg>
          </button>
          <button class="rdl-toggle-btn" [class.rdl-toggle-btn--active]="viewMode === 'cards'" (click)="viewMode = 'cards'" title="Kartenansicht">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="0" width="7" height="7" rx="1.5"/>
              <rect x="9" y="0" width="7" height="7" rx="1.5"/>
              <rect x="0" y="9" width="7" height="7" rx="1.5"/>
              <rect x="9" y="9" width="7" height="7" rx="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Loading Skeleton ──────────────────────────────────── -->
    <div *ngIf="loading" class="rdl-skeleton">
      <div *ngFor="let _ of skeletonRows" class="rdl-skeleton__row">
        <div class="rdl-skeleton__img"></div>
        <div class="rdl-skeleton__lines">
          <div class="rdl-skeleton__line rdl-skeleton__line--wide"></div>
          <div class="rdl-skeleton__line rdl-skeleton__line--slim"></div>
        </div>
        <div class="rdl-skeleton__badge"></div>
        <div class="rdl-skeleton__actions"></div>
      </div>
    </div>

    <!-- ─── Empty State ──────────────────────────────────────── -->
    <div *ngIf="!loading && filteredItems.length === 0" class="rdl-empty">
      <div class="rdl-empty__icon">{{ searchQuery ? '🔍' : emptyIcon }}</div>
      <h3 class="rdl-empty__title">{{ searchQuery ? 'Keine Ergebnisse' : 'Noch nichts hier' }}</h3>
      <p class="rdl-empty__text">{{ searchQuery ? ('Keine Einträge für "' + searchQuery + '"') : emptyMessage }}</p>
      <button *ngIf="searchQuery" class="rdl-empty__btn" (click)="clearSearch()">Suche zurücksetzen</button>
    </div>

    <!-- ─── TABLE VIEW ────────────────────────────────────────── -->
    <div *ngIf="!loading && filteredItems.length > 0 && viewMode === 'table'" class="rdl-table-wrap">
      <table class="rdl-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns" [style.width]="col.width"
                [class.rdl-th--sortable]="col.sortable"
                (click)="col.sortable && sort(col.key)">
              {{ col.label }}
              <span *ngIf="col.sortable" class="rdl-sort-icon">
                {{ sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th *ngIf="actions.length > 0" class="rdl-th--actions">{{ actionsLabel }}</th>
            <th *ngIf="rowClickable" class="rdl-th--chevron"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of sortedItems"
              [class.rdl-row--clickable]="rowClickable"
              (click)="onRowClick(item)">
            <td *ngFor="let col of columns" [attr.data-label]="col.label">
              <!-- Image -->
              <div *ngIf="col.type === 'image'" class="rdl-img-cell">
                <img *ngIf="getCellValue(item, col.key)" [src]="getCellValue(item, col.key)"
                     [alt]="col.label" class="rdl-img" (error)="onImageError($event)">
                <div *ngIf="!getCellValue(item, col.key)" class="rdl-img-placeholder">📷</div>
              </div>
              <!-- Badge -->
              <span *ngIf="col.type === 'badge'" class="rdl-badge"
                    [ngClass]="col.badgeClass ? col.badgeClass(getCellValue(item, col.key), item) : ''">
                {{ formatCell(item, col) }}
              </span>
              <!-- Currency -->
              <span *ngIf="col.type === 'currency'" class="rdl-currency">
                {{ getCellValue(item, col.key) | number:'1.2-2' }} €
              </span>
              <!-- Date -->
              <span *ngIf="col.type === 'date'" class="rdl-date">
                {{ getCellValue(item, col.key) | date:'dd.MM.yyyy' }}
              </span>
              <!-- Number -->
              <span *ngIf="col.type === 'number'" class="rdl-number">
                {{ getCellValue(item, col.key) | number }}
              </span>
              <!-- Text -->
              <span *ngIf="!col.type || col.type === 'text'" class="rdl-text">
                {{ formatCell(item, col) }}
              </span>
              <!-- Custom -->
              <ng-container *ngIf="col.type === 'custom' && customCellTemplate">
                <ng-container *ngTemplateOutlet="customCellTemplate!; context: { $implicit: item, column: col }">
                </ng-container>
              </ng-container>
            </td>
            <!-- Action Buttons -->
            <td *ngIf="actions.length > 0" class="rdl-td--actions">
              <div class="rdl-actions">
                <button *ngFor="let action of actions"
                        [hidden]="action.visible && !action.visible(item)"
                        class="rdl-action-btn"
                        [ngClass]="action.class"
                        [title]="action.label"
                        (click)="executeAction(action, item, $event)">
                  {{ action.icon }}
                </button>
              </div>
            </td>
            <!-- Clickable Chevron -->
            <td *ngIf="rowClickable" class="rdl-td--chevron">
              <span class="rdl-chevron">›</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─── CARDS VIEW ────────────────────────────────────────── -->
    <div *ngIf="!loading && filteredItems.length > 0 && viewMode === 'cards'" class="rdl-cards">
      <div *ngFor="let item of sortedItems"
           class="rdl-card"
           [class.rdl-card--clickable]="rowClickable"
           (click)="onRowClick(item)">
        <!-- Card Image -->
        <div *ngIf="hasImageColumn()" class="rdl-card__img-wrap">
          <img *ngIf="getImageUrl(item)" [src]="getImageUrl(item)" alt="Vorschaubild" class="rdl-card__img" (error)="onImageError($event)">
          <div *ngIf="!getImageUrl(item)" class="rdl-card__img-placeholder">📷</div>
        </div>
        <!-- Card Body -->
        <div class="rdl-card__body">
          <div *ngFor="let col of getMobileColumns()" class="rdl-card__field">
            <span class="rdl-card__label">{{ col.mobileLabel || col.label }}</span>
            <span *ngIf="col.type === 'badge'" class="rdl-badge rdl-card__value"
                  [ngClass]="col.badgeClass ? col.badgeClass(getCellValue(item, col.key), item) : ''">
              {{ formatCell(item, col) }}
            </span>
            <span *ngIf="col.type === 'currency'" class="rdl-currency rdl-card__value">
              {{ getCellValue(item, col.key) | number:'1.2-2' }} €
            </span>
            <span *ngIf="col.type === 'date'" class="rdl-card__value">
              {{ getCellValue(item, col.key) | date:'dd.MM.yyyy' }}
            </span>
            <span *ngIf="!col.type || col.type === 'text'" class="rdl-card__value">
              {{ formatCell(item, col) }}
            </span>
          </div>
        </div>
        <!-- Card Footer -->
        <div class="rdl-card__footer">
          <div class="rdl-actions">
            <button *ngFor="let action of actions"
                    [hidden]="action.visible && !action.visible(item)"
                    class="rdl-action-btn"
                    [ngClass]="action.class"
                    [title]="action.label"
                    (click)="executeAction(action, item, $event)">
              <span>{{ action.icon }}</span>
              <span class="rdl-action-btn__label">{{ action.label }}</span>
            </button>
          </div>
          <span *ngIf="rowClickable" class="rdl-chevron">›</span>
        </div>
      </div>
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
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Suchen...';
  @Input() showToolbar = true;
  @Input() defaultView: 'table' | 'cards' = 'table';

  @Output() rowClick = new EventEmitter<any>();
  @Output() searchChange = new EventEmitter<string>();

  @ContentChild('customCell') customCellTemplate: TemplateRef<any> | null = null;

  viewMode: 'table' | 'cards' = 'table';
  searchQuery = '';
  sortKey = '';
  sortDir: 'asc' | 'desc' = 'asc';
  skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit() {
    this.viewMode = this.defaultView;
    // Mobile default → cards
    if (window.innerWidth < 768) this.viewMode = 'cards';
  }

  get filteredItems(): any[] {
    if (!this.searchQuery.trim()) return this.items;
    const q = this.searchQuery.toLowerCase();
    return this.items.filter(item =>
      this.columns.some(col => {
        const val = this.getCellValue(item, col.key);
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }

  get sortedItems(): any[] {
    if (!this.sortKey) return this.filteredItems;
    return [...this.filteredItems].sort((a, b) => {
      const va = this.getCellValue(a, this.sortKey);
      const vb = this.getCellValue(b, this.sortKey);
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'de', { numeric: true });
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  sort(key: string) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  onSearch(q: string) {
    this.searchChange.emit(q);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchChange.emit('');
  }

  getCellValue(item: any, key: string): any {
    return key.split('.').reduce((v, k) => v?.[k], item);
  }

  formatCell(item: any, col: ColumnConfig): string {
    const value = this.getCellValue(item, col.key);
    if (col.formatFn) return col.formatFn(value, item);
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
    if (this.rowClickable) this.rowClick.emit(item);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}


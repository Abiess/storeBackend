import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Filter-Chip-Konfiguration
 */
export interface FilterChip {
  /** Eindeutiger Wert des Filters (z.B. 'ACTIVE', 'DRAFT', 'ALL') */
  value: string;
  /** Anzeige-Label (bereits übersetzt) */
  label: string;
  /** Optional: Icon/Emoji */
  icon?: string;
  /** Optional: Anzahl der Elemente in diesem Filter */
  count?: number;
  /** Optional: CSS-Klasse für Farb-Varianten (z.B. 'filter-chip--active', 'filter-chip--draft') */
  variant?: string;
  /** Optional: Sichtbarkeit (Standard: true) */
  visible?: boolean;
}

/**
 * FilterBarComponent – Wiederverwendbare Filter-Chip-Leiste
 * 
 * Rein präsentational: Nur Darstellung/Input/Output, keine Business-Logic.
 * 
 * @example
 * ```html
 * <app-filter-bar
 *   [chips]="filterChips"
 *   [activeValue]="currentFilter"
 *   (filterChange)="onFilterChange($event)">
 * </app-filter-bar>
 * ```
 */
@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filter-bar" *ngIf="visibleChips.length > 0">
      <button
        *ngFor="let chip of visibleChips"
        class="filter-chip"
        [class.filter-chip--active]="chip.value === activeValue"
        [ngClass]="chip.variant"
        (click)="onChipClick(chip.value)"
        [attr.aria-pressed]="chip.value === activeValue"
        type="button">
        <span *ngIf="chip.icon" class="filter-chip__icon">{{ chip.icon }}</span>
        <span class="filter-chip__label">{{ chip.label }}</span>
        <span *ngIf="chip.count !== undefined" class="filter-chip__count">({{ chip.count }})</span>
      </button>
    </div>
  `,
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent {
  /** Array von Filter-Chips */
  @Input() chips: FilterChip[] = [];

  /** Aktuell aktiver Filter-Wert */
  @Input() activeValue: string = '';

  /** Event wenn Filter gewechselt wird */
  @Output() filterChange = new EventEmitter<string>();

  /** Nur sichtbare Chips zurückgeben */
  get visibleChips(): FilterChip[] {
    return this.chips.filter(chip => chip.visible !== false);
  }

  /** Chip-Click-Handler */
  onChipClick(value: string): void {
    this.filterChange.emit(value);
  }
}

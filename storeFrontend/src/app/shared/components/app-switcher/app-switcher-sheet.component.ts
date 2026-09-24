import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { AppRegistryEntry } from '@app/core/config/app-registry';

export interface AppSwitcherSheetData {
  apps: AppRegistryEntry[];
}

/**
 * Mobile Darstellung des `AppSwitcherComponent` als `MatBottomSheet`.
 *
 * Bewusst eine eigene, sehr kleine Komponente (nicht der volle
 * `AppSwitcherComponent`), da `MatBottomSheet.open()` eine eigene
 * Komponentenklasse + `MAT_BOTTOM_SHEET_DATA` benötigt. Enthält KEINE
 * eigene Fachlogik – reine Darstellung der von `AppSwitcherComponent`
 * übergebenen `apps`-Liste, Auswahl wird per `MatBottomSheetRef.dismiss()`
 * an den Aufrufer zurückgegeben (dort erfolgt die eigentliche Navigation
 * über `AppAccessService`, siehe `AppSwitcherComponent.onToggleClick()`).
 *
 * Styling bewusst eigenständig (keine Material-Standardoptik für die
 * Einträge) – nur der Sheet-Container selbst kommt von Material.
 */
@Component({
  selector: 'app-switcher-sheet',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="app-switcher-sheet" role="menu" [attr.aria-label]="'apps.switcher.label' | translate">
      <button
        type="button"
        class="app-switcher-sheet__item"
        role="menuitem"
        *ngFor="let entry of data.apps"
        (click)="ref.dismiss(entry)"
      >
        <span class="app-switcher-sheet__icon" aria-hidden="true">{{ entry.icon }}</span>
        <span>{{ entry.titleKey | translate }}</span>
      </button>
    </div>
  `,
  styles: [`
    .app-switcher-sheet {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.25rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
    }

    .app-switcher-sheet__item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.85rem 1rem;
      border: none;
      background: transparent;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #2d3748;
      text-align: start;
      cursor: pointer;
    }

    .app-switcher-sheet__item:hover,
    .app-switcher-sheet__item:focus-visible {
      background: #f3f0ff;
      color: #667eea;
      outline: none;
    }

    .app-switcher-sheet__icon {
      font-size: 1.3rem;
    }
  `]
})
export class AppSwitcherSheetComponent {
  readonly ref = inject(MatBottomSheetRef<AppSwitcherSheetComponent, AppRegistryEntry>);
  readonly data = inject<AppSwitcherSheetData>(MAT_BOTTOM_SHEET_DATA);
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ThemeColors } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ThemeApplierService {
  private currentTheme$ = new BehaviorSubject<ThemeColors | null>(null);

  /**
   * Apply theme colors to the document root as CSS variables
   */
  applyTheme(colors: ThemeColors, fontFamily?: string): void {
    const root = document.documentElement;

    // Apply colors as CSS variables
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-background', colors.background);
    root.style.setProperty('--theme-text', colors.text);
    root.style.setProperty('--theme-text-secondary', colors.textSecondary);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-success', colors.success);
    root.style.setProperty('--theme-warning', colors.warning);
    root.style.setProperty('--theme-error', colors.error);

    // Apply font family if provided
    if (fontFamily) {
      root.style.setProperty('--theme-font-family', fontFamily);
    }

    // Emit theme change
    this.currentTheme$.next(colors);
  }

  /**
   * Reset to default theme
   */
  resetTheme(): void {
    const root = document.documentElement;

    // Remove all theme variables
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-secondary');
    root.style.removeProperty('--theme-accent');
    root.style.removeProperty('--theme-background');
    root.style.removeProperty('--theme-text');
    root.style.removeProperty('--theme-text-secondary');
    root.style.removeProperty('--theme-border');
    root.style.removeProperty('--theme-success');
    root.style.removeProperty('--theme-warning');
    root.style.removeProperty('--theme-error');
    root.style.removeProperty('--theme-font-family');

    this.currentTheme$.next(null);
  }

  /**
   * Get current theme observable
   */
  getCurrentTheme() {
    return this.currentTheme$.asObservable();
  }

  /**
   * Generate complementary color (lighter/darker)
   */
  private adjustColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16)
      .slice(1);
  }
}


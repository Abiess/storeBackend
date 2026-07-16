import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="selector-dropdown" [class.open]="isOpen">
      <button 
        class="selector-button"
        (click)="toggleDropdown()"
        [attr.aria-label]="'Währung anzeigen'"
        [attr.aria-expanded]="isOpen"
        type="button">
        <span class="selector-icon">{{ getCurrentSymbol() }}</span>
        <span class="selector-label">{{ selectedCurrency }}</span>
        <svg class="selector-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      
      <div class="selector-menu" *ngIf="isOpen">
        <div class="currency-info">
          <div class="info-row">
            <span class="info-label">{{ 'storefront.storeCurrency' | translate }}</span>
            <span class="info-value">{{ getCurrentSymbol() }} {{ selectedCurrency }}</span>
          </div>
          <p class="info-text">{{ 'storefront.currencyFixedByMerchant' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .selector-dropdown {
      position: relative;
      display: inline-block;
    }

    .selector-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      font-weight: 500;
      color: #1d1d1f;
      min-width: 100px;
      
      &:hover {
        border-color: rgba(103, 126, 234, 0.3);
        background: rgba(103, 126, 234, 0.05);
      }
      
      .selector-icon {
        font-size: 1.125rem;
        line-height: 1;
      }
      
      .selector-label {
        flex: 1;
        text-align: left;
        font-weight: 600;
      }
      
      .selector-chevron {
        opacity: 0.5;
        transition: transform 0.2s ease;
      }
    }
    
    .selector-dropdown.open .selector-button {
      border-color: #667eea;
      background: rgba(103, 126, 234, 0.1);
      
      .selector-chevron {
        transform: rotate(180deg);
      }
    }
    
    .selector-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      z-index: 1000;
      animation: slideDown 0.2s ease;
      min-width: 240px;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .currency-info {
      padding: 0.875rem;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.625rem;
      padding-bottom: 0.625rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    .info-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .info-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1d1d1f;
    }
    
    .info-text {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: #666;
    }
    
    /* Mobile */
    @media (max-width: 640px) {
      .selector-button {
        min-width: 80px;
        padding: 0.375rem 0.625rem;
        font-size: 0.8125rem;
      }
      
      .selector-menu {
        min-width: 200px;
      }
    }
    
    /* RTL */
    [dir="rtl"] .selector-label {
      text-align: right;
    }
    
    [dir="rtl"] .info-row {
      flex-direction: row-reverse;
    }
  `]
})
export class CurrencySelectorComponent {
  @Input() selectedCurrency: string = 'EUR';
  
  isOpen = false;

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-dropdown')) {
      this.isOpen = false;
    }
  }

  getCurrentSymbol(): string {
    const symbols: Record<string, string> = {
      'EUR': '€',
      'MAD': 'د.م.',
      'USD': '$',
      'GBP': '£'
    };
    return symbols[this.selectedCurrency] ?? '€';
  }
}

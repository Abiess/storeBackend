import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Zentrale Quantity-Stepper-Komponente
 * 
 * Verwendung:
 * ```html
 * <app-quantity-stepper
 *   [value]="quantity"
 *   [min]="1"
 *   [max]="availableStock"
 *   [disabled]="!isAvailable"
 *   [compact]="true"
 *   [size]="'md'"
 *   ariaLabel="Produktmenge"
 *   (valueChange)="onQuantityChange($event)">
 * </app-quantity-stepper>
 * ```
 */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="quantity-stepper"
      [class.quantity-stepper--compact]="compact"
      [class.quantity-stepper--disabled]="disabled || readonly"
      [class.quantity-stepper--loading]="loading"
      [class.quantity-stepper--sm]="size === 'sm'"
      [class.quantity-stepper--md]="size === 'md'"
      [class.quantity-stepper--lg]="size === 'lg'">
      
      <!-- Decrement Button -->
      <button
        type="button"
        class="quantity-stepper__btn quantity-stepper__btn--minus"
        [disabled]="disabled || readonly || loading || value <= min"
        [attr.aria-label]="'Menge verringern'"
        (click)="decrement()">
        <span class="quantity-stepper__icon">−</span>
      </button>

      <!-- Value Display or Input -->
      <div class="quantity-stepper__value-wrapper">
        <input
          *ngIf="allowDirectInput && !readonly"
          type="number"
          class="quantity-stepper__input"
          [value]="value"
          [min]="min"
          [max]="max || 999"
          [step]="step"
          [disabled]="disabled || loading"
          [attr.aria-label]="ariaLabel"
          [attr.aria-valuemin]="min"
          [attr.aria-valuemax]="max"
          [attr.aria-valuenow]="value"
          (change)="onDirectInput($event)"
          (blur)="onInputBlur($event)">
        
        <span
          *ngIf="!allowDirectInput || readonly"
          class="quantity-stepper__display"
          role="spinbutton"
          [attr.aria-valuemin]="min"
          [attr.aria-valuemax]="max"
          [attr.aria-valuenow]="value"
          [attr.aria-label]="ariaLabel">
          {{ value }}
        </span>

        <!-- Loading Spinner -->
        <div *ngIf="loading" class="quantity-stepper__spinner"></div>
      </div>

      <!-- Increment Button -->
      <button
        type="button"
        class="quantity-stepper__btn quantity-stepper__btn--plus"
        [disabled]="disabled || readonly || loading || (max !== null && value >= max)"
        [attr.aria-label]="'Menge erhöhen'"
        (click)="increment()">
        <span class="quantity-stepper__icon">+</span>
      </button>
    </div>
  `,
  styleUrls: ['./quantity-stepper.component.scss']
})
export class QuantityStepperComponent implements OnChanges {
  @Input() value: number = 1;
  @Input() min: number = 1;
  @Input() max: number | null = null;
  @Input() step: number = 1;
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() compact: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() ariaLabel: string = 'Menge';
  @Input() showInput: boolean = true;
  @Input() allowDirectInput: boolean = false;
  @Input() loading: boolean = false;

  @Output() valueChange = new EventEmitter<number>();
  @Output() incremented = new EventEmitter<number>();
  @Output() decremented = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.value = this.clampValue(this.value);
    }
  }

  increment(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }

    const next = this.value + this.step;

    if (this.max !== null && next > this.max) {
      return;
    }

    this.updateValue(next);
    this.incremented.emit(next);
  }

  decrement(): void {
    if (this.disabled || this.readonly || this.loading) {
      return;
    }

    const next = this.value - this.step;

    if (next < this.min) {
      return;
    }

    this.updateValue(next);
    this.decremented.emit(next);
  }

  onDirectInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    if (isNaN(value) || !input.value) {
      input.value = this.value.toString();
      return;
    }

    const clamped = this.clampValue(value);
    input.value = clamped.toString();
    this.updateValue(clamped);
  }

  onInputBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    if (isNaN(value) || !input.value) {
      input.value = this.value.toString();
      return;
    }

    const clamped = this.clampValue(value);
    input.value = clamped.toString();
    
    if (clamped !== this.value) {
      this.updateValue(clamped);
    }
  }

  private updateValue(newValue: number): void {
    const clamped = this.clampValue(newValue);
    
    if (this.value !== clamped) {
      this.value = clamped;
      this.valueChange.emit(clamped);
    }
  }

  private clampValue(value: number): number {
    if (isNaN(value)) {
      return this.min;
    }

    let clamped = Math.max(this.min, value);
    
    if (this.max !== null) {
      clamped = Math.min(this.max, clamped);
    }

    return clamped;
  }
}

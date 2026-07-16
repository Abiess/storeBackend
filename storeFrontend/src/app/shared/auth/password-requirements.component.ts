import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PASSWORD_MIN_LENGTH } from '../validators/password.validators';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Passwort-Anforderungen Anzeige
 * 
 * Zeigt visuell die Passwort-Anforderungen und prüft sie in Echtzeit.
 * WICHTIG: Verwendet dieselbe Konstante wie die Validatoren (PASSWORD_MIN_LENGTH)
 * 
 * Verwendung:
 * ```html
 * <app-password-requirements 
 *   [passwordControl]="registerForm.get('password')">
 * </app-password-requirements>
 * ```
 */
@Component({
  selector: 'app-password-requirements',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="password-requirements" *ngIf="passwordControl">
      <div class="requirement" [class.met]="hasMinLength" [class.unmet]="!hasMinLength && isTouched">
        <span class="icon">{{ hasMinLength ? '✓' : '○' }}</span>
        <span class="text">{{ 'auth.reqMinChars' | translate }}</span>
      </div>
      
      <!-- Optional: Weitere Anforderungen können später aktiviert werden -->
      <!-- 
      <div class="requirement" [class.met]="hasUppercase" [class.unmet]="!hasUppercase && isTouched">
        <span class="icon">{{ hasUppercase ? '✓' : '○' }}</span>
        <span class="text">{{ 'auth.reqUpperLower' | translate }}</span>
      </div>
      -->
    </div>
  `,
  styles: [`
    .password-requirements {
      margin-top: 8px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #e9ecef;
    }
    
    .requirement {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 13px;
      color: #6c757d;
      transition: all 0.2s ease;
    }
    
    .requirement.met {
      color: #28a745;
    }
    
    .requirement.met .icon {
      color: #28a745;
      font-weight: bold;
    }
    
    .requirement.unmet {
      color: #dc3545;
    }
    
    .requirement.unmet .icon {
      color: #dc3545;
    }
    
    .icon {
      font-size: 14px;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .text {
      flex: 1;
    }
  `]
})
export class PasswordRequirementsComponent implements OnInit, OnDestroy {
  @Input() passwordControl: AbstractControl | null = null;
  
  readonly PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
  
  hasMinLength = false;
  isTouched = false;
  
  // Optional: Weitere Anforderungen (aktuell nicht aktiv)
  hasUppercase = false;
  hasLowercase = false;
  hasDigit = false;
  hasSpecial = false;
  
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    if (!this.passwordControl) {
      return;
    }
    
    // Initiale Prüfung
    this.checkRequirements();
    
    // Prüfung bei Wertänderung (mit debounce für bessere Performance)
    this.passwordControl.valueChanges
      .pipe(
        debounceTime(150),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkRequirements();
      });
    
    // Touch-Status überwachen
    this.passwordControl.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isTouched = this.passwordControl?.touched || false;
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private checkRequirements(): void {
    const value = this.passwordControl?.value || '';
    
    // Mindestlänge prüfen
    this.hasMinLength = value.length >= this.PASSWORD_MIN_LENGTH;
    
    // Optional: Weitere Prüfungen (aktuell nicht aktiv)
    // this.hasUppercase = /[A-Z]/.test(value);
    // this.hasLowercase = /[a-z]/.test(value);
    // this.hasDigit = /[0-9]/.test(value);
    // this.hasSpecial = /[^A-Za-z0-9]/.test(value);
  }
}

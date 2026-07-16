import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Zentrale Passwort-Validierungs-Regeln und -Konstanten
 * 
 * WICHTIG: Diese Datei ist die Single Source of Truth für alle Passwort-Regeln!
 * Änderungen hier gelten für:
 * - Registrierung (zentral + Storefront)
 * - Passwort-Änderung
 * - Passwort-Reset
 */

/** 
 * Passwort-Mindestlänge (muss mit Backend RegisterRequest.java übereinstimmen!)
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Validator: Prüft ob zwei Passwort-Felder übereinstimmen
 * 
 * Verwendung:
 * ```typescript
 * this.form = this.fb.group({
 *   password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
 *   confirmPassword: ['', [Validators.required]]
 * }, { validators: passwordMatchValidator() });
 * ```
 * 
 * Fehlerprüfung im Template:
 * ```html
 * <div *ngIf="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched">
 *   {{ 'auth.passwordsDoNotMatch' | translate }}
 * </div>
 * ```
 */
export function passwordMatchValidator(
  passwordFieldName: string = 'password', 
  confirmPasswordFieldName: string = 'confirmPassword'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordFieldName);
    const confirmPassword = control.get(confirmPasswordFieldName);

    // Nur validieren wenn beide Felder Werte haben
    if (!password || !confirmPassword) {
      return null;
    }

    // Nur validieren wenn confirmPassword touched ist (nicht sofort beim Tippen im password-Feld)
    if (!confirmPassword.touched) {
      return null;
    }

    // Passwörter stimmen nicht überein
    if (password.value !== confirmPassword.value) {
      // Setze Fehler auf dem confirmPassword-Feld
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Entferne passwordMismatch-Fehler, wenn Passwörter übereinstimmen
      if (confirmPassword.hasError('passwordMismatch')) {
        const errors = confirmPassword.errors;
        delete errors?.['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors || {}).length > 0 ? errors : null);
      }
      return null;
    }
  };
}

/**
 * Validator: Prüft Passwort-Stärke (optional, für zukünftige Erweiterungen)
 * 
 * Anforderungen:
 * - Mindestens 12 Zeichen
 * - Mindestens 1 Großbuchstabe (optional)
 * - Mindestens 1 Kleinbuchstabe (optional)
 * - Mindestens 1 Zahl (optional)
 * - Mindestens 1 Sonderzeichen (optional)
 * 
 * HINWEIS: Aktuell nur Mindestlänge aktiv, Rest kann später aktiviert werden
 */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null; // required-Validator übernimmt leere Felder
    }

    const errors: ValidationErrors = {};

    // Mindestlänge
    if (value.length < PASSWORD_MIN_LENGTH) {
      errors['minLength'] = {
        requiredLength: PASSWORD_MIN_LENGTH,
        actualLength: value.length
      };
    }

    // Optional: Weitere Regeln (aktuell deaktiviert)
    // if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
    // if (!/[a-z]/.test(value)) errors['lowercase'] = true;
    // if (!/[0-9]/.test(value)) errors['digit'] = true;
    // if (!/[^A-Za-z0-9]/.test(value)) errors['special'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  };
}

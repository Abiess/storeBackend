import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

/**
 * Email-Verfügbarkeits-Validator (Async)
 * 
 * Prüft ob eine E-Mail-Adresse bereits registriert ist.
 * 
 * Features:
 * - Debounced (500ms) - nicht bei jedem Tastendruck
 * - Nur wenn Email-Format gültig
 * - Zeigt Hinweis auf Login/Passwort-vergessen wenn Email existiert
 * 
 * Verwendung:
 * ```typescript
 * this.form = this.fb.group({
 *   email: ['', 
 *     [Validators.required, Validators.email],
 *     [emailAvailabilityValidator()]  // Async validator als drittes Argument
 *   ]
 * });
 * ```
 * 
 * Im Template:
 * ```html
 * <div *ngIf="form.get('email')?.hasError('emailTaken') && form.get('email')?.touched" class="error">
 *   {{ 'auth.emailAlreadyExists' | translate }}
 *   <a routerLink="/login">{{ 'auth.goToLogin' | translate }}</a>
 * </div>
 * ```
 */
export function emailAvailabilityValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const http = inject(HttpClient);
    
    // Keine Prüfung wenn Feld leer oder ungültiges Format
    if (!control.value || control.errors?.['email']) {
      return of(null);
    }
    
    const email = control.value.trim().toLowerCase();
    
    // API-URL aus Environment (könnte auch injected werden)
    const apiUrl = 'http://localhost:8080/api'; // TODO: Aus Environment laden
    
    return timer(500).pipe(  // 500ms Debounce
      switchMap(() => 
        http.get<{ available: boolean }>(`${apiUrl}/auth/check-email`, {
          params: { email }
        })
      ),
      map(response => {
        // Email ist NICHT verfügbar (bereits registriert)
        if (!response.available) {
          return { emailTaken: true };
        }
        // Email ist verfügbar
        return null;
      }),
      catchError((error) => {
        // Bei Fehler (z.B. Netzwerk, Rate Limit) keine Validierungsfehler setzen
        // Der Benutzer soll trotzdem fortfahren können
        console.error('[EMAIL_VALIDATOR] Error checking email availability:', error);
        
        // Rate Limit: Benutzer soll es später versuchen
        if (error.status === 429) {
          return of({ emailCheckRateLimit: true });
        }
        
        // Andere Fehler: Kein Validierungsfehler (fail-open)
        return of(null);
      })
    );
  };
}

/**
 * Einfachere Variante: Email-Verfügbarkeit im Service prüfen
 * 
 * Kann im Component verwendet werden für manuelle Prüfung.
 */
export class EmailAvailabilityService {
  constructor(private http: HttpClient) {}
  
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    const apiUrl = 'http://localhost:8080/api'; // TODO: Aus Environment laden
    return this.http.get<{ available: boolean }>(`${apiUrl}/auth/check-email`, {
      params: { email: email.trim().toLowerCase() }
    });
  }
}

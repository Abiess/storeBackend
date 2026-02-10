import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Loading State -->
        <div *ngIf="validatingToken" class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 class="mt-6 text-2xl font-bold text-gray-900">
            Validiere Token...
          </h2>
        </div>

        <!-- Invalid Token State -->
        <div *ngIf="!validatingToken && !tokenValid && !successMessage" class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
            Ungültiger oder abgelaufener Link
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.
          </p>
          <div class="mt-6">
            <a [routerLink]="['/forgot-password']" 
               class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Neuen Link anfordern
            </a>
          </div>
        </div>

        <!-- Success State -->
        <div *ngIf="successMessage" class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
            Passwort erfolgreich geändert!
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            {{ successMessage }}
          </p>
          <div class="mt-6">
            <a [routerLink]="['/login']" 
               class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Zum Login
            </a>
          </div>
        </div>

        <!-- Reset Password Form -->
        <div *ngIf="!validatingToken && tokenValid && !successMessage">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Neues Passwort festlegen
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
              Geben Sie Ihr neues Passwort ein.
            </p>
          </div>

          <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6">
            <div class="rounded-md shadow-sm space-y-4">
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700">Neues Passwort</label>
                <input
                  id="password"
                  type="password"
                  formControlName="password"
                  required
                  class="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Mindestens 6 Zeichen"
                />
                <div *ngIf="resetPasswordForm.get('password')?.invalid && resetPasswordForm.get('password')?.touched" class="text-red-600 text-sm mt-1">
                  Passwort muss mindestens 6 Zeichen lang sein
                </div>
              </div>

              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Passwort bestätigen</label>
                <input
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  required
                  class="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Passwort wiederholen"
                />
                <div *ngIf="resetPasswordForm.hasError('passwordMismatch') && resetPasswordForm.get('confirmPassword')?.touched" class="text-red-600 text-sm mt-1">
                  Passwörter stimmen nicht überein
                </div>
              </div>
            </div>

            <div *ngIf="errorMessage" class="rounded-md bg-red-50 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">
                    {{ errorMessage }}
                  </h3>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                [disabled]="resetPasswordForm.invalid || loading"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Wird gespeichert...' : 'Passwort ändern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  validatingToken = true;
  tokenValid = false;
  errorMessage = '';
  successMessage = '';
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.validatingToken = false;
      this.tokenValid = false;
      this.errorMessage = 'Kein Token vorhanden';
      return;
    }

    this.validateToken(this.token);
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private validateToken(token: string) {
    this.validatingToken = true;

    this.http.get<{ valid: boolean, message: string }>(`${environment.apiUrl}/auth/reset-password/validate`, {
      params: { token }
    }).pipe(
      catchError(error => {
        return of({
          valid: false,
          message: error.error?.message || 'Token ist ungültig oder abgelaufen'
        });
      })
    ).subscribe(response => {
      this.validatingToken = false;
      this.tokenValid = response.valid;
      if (!response.valid) {
        this.errorMessage = response.message;
      }
    });
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      this.loading = true;
      this.errorMessage = '';

      const payload = {
        token: this.token,
        newPassword: this.resetPasswordForm.value.password
      };

      this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, payload)
        .pipe(
          catchError(error => {
            return of({
              error: true,
              message: error.error?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
            });
          })
        )
        .subscribe((response: any) => {
          this.loading = false;
          if (response.error) {
            this.errorMessage = response.message;
          } else {
            this.successMessage = response.message || 'Ihr Passwort wurde erfolgreich geändert. Sie können sich jetzt anmelden.';
            this.resetPasswordForm.reset();
          }
        });
    }
  }
}


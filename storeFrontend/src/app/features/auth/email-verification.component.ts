import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Loading State -->
        <div *ngIf="status === 'loading'" class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <h2 class="mt-6 text-2xl font-bold text-gray-900">
            Verifying your email...
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            Please wait while we verify your email address.
          </p>
        </div>

        <!-- Success State -->
        <div *ngIf="status === 'success'" class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verified! ✓
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            {{ message }}
          </p>
          <div class="mt-6">
            <a [routerLink]="['/login']" 
               class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Go to Login
            </a>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="status === 'error'" class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
            Verification Failed
          </h2>
          <p class="mt-2 text-sm text-red-600">
            {{ message }}
          </p>
          <div class="mt-6 space-y-3">
            <button (click)="resendVerification()" 
                    [disabled]="resending"
                    class="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {{ resending ? 'Sending...' : 'Resend Verification Email' }}
            </button>
            <a [routerLink]="['/register']" 
               class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Back to Register
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class EmailVerificationComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  message: string = '';
  token: string | null = null;
  resending = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.status = 'error';
      this.message = 'Invalid verification link. No token provided.';
      return;
    }

    this.verifyEmail(this.token);
  }

  private verifyEmail(token: string) {
    this.status = 'loading';

    this.http.get<{ message: string }>(`${environment.apiUrl}/auth/verify`, {
      params: { token }
    }).pipe(
      catchError(error => {
        return of({
          error: true,
          message: error.error?.message || 'Verification failed. The link may be expired or invalid.'
        });
      })
    ).subscribe((response: any) => {
      if (response.error) {
        this.status = 'error';
        this.message = response.message;
      } else {
        this.status = 'success';
        this.message = response.message || 'Your email has been verified successfully! You can now log in.';
      }
    });
  }

  resendVerification() {
    // Hier müssten wir die Email des Users haben - alternativ zum Register zurück
    this.router.navigate(['/register']);
  }
}


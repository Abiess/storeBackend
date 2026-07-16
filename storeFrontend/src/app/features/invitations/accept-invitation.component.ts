import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamInvitationService } from '@app/core/services/team-invitation.service';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="accept-invitation-container">
      <div class="card">
        <div class="card-header" *ngIf="!loading && !error && !success">
          <h2>Team-Einladung</h2>
        </div>

        <div class="card-body">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Einladung wird verarbeitet...</p>
          </div>

          <div *ngIf="success && !loading" class="success-state">
            <div class="icon">✅</div>
            <h3>Willkommen im Team!</h3>
            <p>{{ successMessage }}</p>
            <button class="btn btn-primary" (click)="goToDashboard()">
              Zum Dashboard
            </button>
          </div>

          <div *ngIf="error && !loading" class="error-state">
            <div class="icon">❌</div>
            <h3>Einladung konnte nicht angenommen werden</h3>
            <p>{{ errorMessage }}</p>
            <button class="btn btn-secondary" (click)="goToLogin()">
              Zum Login
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accept-invitation-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      max-width: 500px;
      width: 100%;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .card-header h2 {
      margin: 0;
      font-size: 24px;
    }
    .card-body {
      padding: 32px;
      text-align: center;
    }
    .loading-state, .success-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .success-state h3 {
      color: #4caf50;
      margin: 0;
    }
    .error-state h3 {
      color: #f44336;
      margin: 0;
    }
    .btn {
      padding: 12px 32px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    .btn:hover {
      opacity: 0.9;
    }
  `]
})
export class AcceptInvitationComponent implements OnInit {
  loading = true;
  success = false;
  error = false;
  successMessage = '';
  errorMessage = '';
  token = '';
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitationService: TeamInvitationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.error = true;
      this.loading = false;
      this.errorMessage = 'Kein gültiger Einladungslink';
      return;
    }

    this.acceptInvitation();
  }

  private acceptInvitation(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    this.invitationService.acceptInvitation(this.token).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        this.isSubmitting = false;
        this.successMessage = response.message || 'Einladung erfolgreich angenommen';
      },
      error: (err) => {
        this.error = true;
        this.loading = false;
        this.isSubmitting = false;
        
        if (err.status === 401) {
          const currentUrl = this.router.url;
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl }
          });
          return;
        }
        
        if (err.error && err.error.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
        }
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/invitations/accept?token=${this.token}` }
    });
  }
}

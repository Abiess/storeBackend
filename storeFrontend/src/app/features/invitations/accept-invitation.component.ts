import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamInvitationService } from '@app/core/services/team-invitation.service';
import { AuthService } from '@app/core/services/auth.service';
import { StoreService } from '@app/core/services/store.service';

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
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>{{ loadingMessage }}</p>
          </div>

          <!-- Success State -->
          <div *ngIf="success && !loading" class="success-state">
            <div class="icon">✅</div>
            <h3>Willkommen im Team!</h3>
            <p>{{ successMessage }}</p>
            <button class="btn btn-primary" (click)="goToStoreDashboard()">
              Zum Store-Dashboard
            </button>
          </div>

          <!-- Error State -->
          <div *ngIf="error && !loading" class="error-state">
            <div class="icon">{{ needsRegister ? '✉️' : '❌' }}</div>
            <h3>{{ errorTitle }}</h3>
            <p style="white-space: pre-line;">{{ errorMessage }}</p>
            
            <!-- Preview-Informationen anzeigen -->
            <div *ngIf="invitationPreview" class="info-box">
              <p><strong>Store:</strong> {{ invitationPreview.storeName }}</p>
              <p><strong>Rolle:</strong> {{ invitationPreview.role }}</p>
              <p><strong>E-Mail:</strong> {{ invitationPreview.emailMasked }}</p>
            </div>
            
            <div class="button-group">
              <!-- Fall 1: Nicht angemeldet → Registrieren -->
              <button *ngIf="needsRegister" class="btn btn-primary" (click)="goToRegister()">
                Jetzt Registrieren
              </button>
              
              <!-- Fall 2: Falsche E-Mail → Abmelden und mit eingeladener E-Mail fortfahren -->
              <button *ngIf="!needsRegister && invitationPreview" class="btn btn-primary" (click)="logoutAndRegister()">
                Abmelden und mit eingeladener E-Mail fortfahren
              </button>
              
              <button class="btn btn-secondary" (click)="goBack()">
                Zurück
              </button>
            </div>
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
      max-width: 550px;
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
    .info-box {
      background: #f5f5f5;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 16px 0;
      text-align: left;
      border-radius: 4px;
    }
    .info-box p {
      margin: 8px 0;
      font-size: 14px;
      color: #333;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      margin-top: 16px;
    }
    .btn {
      padding: 12px 32px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
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
  loadingMessage = 'Einladung wird verarbeitet...';
  success = false;
  error = false;
  successMessage = '';
  errorMessage = '';
  errorTitle = 'Einladung konnte nicht angenommen werden';
  token = '';
  storeId?: number;
  needsLogin = false;
  needsRegister = false;
  invitationPreview?: { emailMasked: string; storeName: string; role: string; expiresAt: string };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitationService: TeamInvitationService,
    private authService: AuthService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.showError('Kein gültiger Einladungslink', 'Der Link ist ungültig oder unvollständig.');
      return;
    }

    // IMMER Preview laden (zeigt E-Mail, Store, Rolle)
    this.loadInvitationPreview();
  }

  private loadInvitationPreview(): void {
    this.loadingMessage = 'Einladungsinformationen werden geladen...';
    
    this.invitationService.getInvitationPreview(this.token).subscribe({
      next: (preview) => {
        this.invitationPreview = preview;
        
        // FALL 1: Nicht angemeldet
        if (!this.authService.isAuthenticated()) {
          sessionStorage.setItem('pendingInvitationToken', this.token);
          this.needsRegister = true;
          this.showError(
            'Einladung für ' + preview.storeName,
            'Um diese Einladung anzunehmen, müssen Sie sich registrieren oder anmelden.'
          );
          return;
        }
        
        // FALL 2 & 3: Angemeldet → E-Mail-Prüfung
        const currentUser = this.authService.currentUserValue;
        const invitedEmail = preview.email.toLowerCase().trim();
        const currentEmail = currentUser?.email?.toLowerCase().trim();
        
        if (currentEmail === invitedEmail) {
          // FALL 3: Richtige E-Mail → direkt annehmen
          this.acceptInvitation();
        } else {
          // FALL 2: Falsche E-Mail → Abmelden anbieten
          sessionStorage.setItem('pendingInvitationToken', this.token);
          this.needsRegister = false;
          this.showError(
            'Falsche E-Mail-Adresse',
            `Diese Einladung ist für ${preview.emailMasked} bestimmt.\n\nSie sind aktuell mit ${currentEmail} angemeldet.`
          );
        }
      },
      error: (err) => {
        this.handlePreviewError(err);
      }
    });
  }

  private acceptInvitation(): void {
    this.loading = true;
    this.loadingMessage = 'Einladung wird angenommen...';

    this.invitationService.acceptInvitation(this.token).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        this.storeId = response.storeId;
        this.successMessage = response.message || 'Sie wurden erfolgreich zum Store-Team hinzugefügt!';
        
        // Token aus sessionStorage entfernen
        sessionStorage.removeItem('pendingInvitationToken');
        
        // UI aktualisieren (Store-Liste, Berechtigungen, etc.)
        this.refreshUserData();
      },
      error: (err) => {
        this.handleAcceptError(err);
      }
    });
  }

  private refreshUserData(): void {
    // Store-Liste neu laden
    this.storeService.getMyStores().subscribe({
      next: (stores) => {
        console.log('✅ Store-Liste aktualisiert:', stores.length, 'Stores');
        
        // Token vom Backend neu validieren (lädt User-Daten inkl. neuer Berechtigungen)
        const token = this.authService.getToken();
        if (token) {
          // Verwende die vorhandene validateTokenWithBackend Methode
          (this.authService as any).validateTokenWithBackend();
        }
      },
      error: (err) => {
        console.warn('⚠️ Store-Liste konnte nicht aktualisiert werden:', err);
      }
    });
  }

  private handlePreviewError(err: any): void {
    if (err.status === 404 || err.error?.error?.includes('Ungültiger')) {
      this.showError('Ungültiger Link', 'Dieser Einladungslink ist nicht gültig.');
    } else if (err.error?.error?.includes('abgelaufen')) {
      this.showError('Link abgelaufen', 'Diese Einladung ist leider abgelaufen. Bitte kontaktieren Sie den Store-Administrator für eine neue Einladung.');
    } else if (err.error?.error?.includes('nicht mehr gültig')) {
      this.showError('Einladung bereits verwendet', 'Diese Einladung wurde bereits angenommen oder widerrufen.');
    } else {
      this.showError('Fehler', 'Die Einladungsinformationen konnten nicht geladen werden. Bitte versuchen Sie es erneut.');
    }
  }

  private handleAcceptError(err: any): void {
    this.loading = false;
    this.error = true;
    
    if (err.status === 401) {
      // User ist nicht eingeloggt
      sessionStorage.setItem('pendingInvitationToken', this.token);
      this.needsLogin = true;
      this.needsRegister = true;
      this.errorTitle = 'Anmeldung erforderlich';
      this.errorMessage = 'Um diese Einladung anzunehmen, müssen Sie sich anmelden oder registrieren.';
      return;
    }
    
    if (err.status === 403) {
      this.errorTitle = 'Falsche E-Mail-Adresse';
      this.errorMessage = err.error?.error || 'Diese Einladung ist für eine andere E-Mail-Adresse bestimmt. Bitte melden Sie sich mit der korrekten E-Mail an.';
    } else if (err.status === 404) {
      this.errorTitle = 'Ungültiger Link';
      this.errorMessage = 'Dieser Einladungslink ist nicht gültig.';
    } else if (err.status === 409) {
      this.errorTitle = 'Bereits Mitglied';
      this.errorMessage = err.error?.error || 'Sie sind bereits Mitglied dieses Stores.';
    } else if (err.status === 410) {
      this.errorTitle = 'Link abgelaufen';
      this.errorMessage = 'Diese Einladung ist leider abgelaufen. Bitte kontaktieren Sie den Store-Administrator für eine neue Einladung.';
    } else {
      this.errorTitle = 'Fehler';
      this.errorMessage = err.error?.error || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
  }

  private showError(title: string, message: string): void {
    this.error = true;
    this.loading = false;
    this.errorTitle = title;
    this.errorMessage = message;
  }

  goToStoreDashboard(): void {
    if (this.storeId) {
      this.router.navigate(['/stores', this.storeId, 'dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goToLogin(): void {
    // Token bleibt in sessionStorage gespeichert
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    // Token bleibt in sessionStorage gespeichert
    this.router.navigate(['/register'], {
      queryParams: { invitationToken: this.token }
    });
  }

  logoutAndRegister(): void {
    // Fall 2: User abmelden und zur Registrierung mit eingeladener E-Mail
    this.authService.logout();
    sessionStorage.setItem('pendingInvitationToken', this.token);
    
    this.router.navigate(['/register'], {
      queryParams: {
        invitationToken: this.token
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}

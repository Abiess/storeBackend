import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubdomainService } from '@app/core/services/subdomain.service';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-store-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="store-not-found-container">
      <div class="content-card">
        <!-- Icon -->
        <div class="icon-section">
          <div class="icon-circle">
            <span class="icon">🏪</span>
          </div>
        </div>

        <!-- Hauptnachricht -->
        <h1>Store nicht gefunden</h1>
        <p class="subtitle" *ngIf="slug && !isReservedSlug">
          Der Store <strong>{{ slug }}.markt.ma</strong> existiert noch nicht.
        </p>
        <p class="subtitle" *ngIf="isReservedSlug">
          Die Subdomain <strong>{{ slug }}.markt.ma</strong> ist für technische Zwecke reserviert und kann nicht als Store verwendet werden.
        </p>

        <!-- Reservierte Slugs Warnung -->
        <div class="warning-box" *ngIf="isReservedSlug">
          <div class="warning-icon">⚠️</div>
          <div class="warning-content">
            <h3>Technische Subdomain</h3>
            <p>Diese Subdomain ist für Systemdienste reserviert (API, Datenbank, etc.) und kann nicht als Store registriert werden.</p>
          </div>
        </div>

        <!-- Call-to-Action für registrierte User -->
        <div class="action-section" *ngIf="!isReservedSlug">
          <div class="cta-box" *ngIf="isLoggedIn">
            <h2>Möchten Sie diesen Store erstellen?</h2>
            <p>Sie können jetzt Ihren eigenen Online-Shop unter dieser Adresse erstellen!</p>
            <button class="btn-primary" (click)="createStore()">
              <span class="btn-icon">✨</span>
              Store erstellen: {{ slug }}.markt.ma
            </button>
            <p class="small-text">Mit Ihrem eigenen Online-Shop auf markt.ma</p>
          </div>

          <!-- Call-to-Action für nicht-registrierte User -->
          <div class="cta-box" *ngIf="!isLoggedIn">
            <h2>Erstellen Sie Ihren eigenen Store!</h2>
            <p>Melden Sie sich an oder registrieren Sie sich, um {{ slug }}.markt.ma zu sichern.</p>
            <div class="button-group">
              <button class="btn-primary" (click)="goToRegister()">
                <span class="btn-icon">🚀</span>
                Jetzt registrieren
              </button>
              <button class="btn-secondary" (click)="goToLogin()">
                <span class="btn-icon">🔑</span>
                Anmelden
              </button>
            </div>
            <p class="small-text">Kostenlos starten • Keine Kreditkarte erforderlich</p>
          </div>
        </div>

        <!-- Alternative Aktionen -->
        <div class="alternative-actions">
          <button class="btn-link" (click)="goToMarketplace()">
            ← Zurück zum Marketplace
          </button>
          <span class="separator">•</span>
          <button class="btn-link" (click)="goToDashboard()" *ngIf="isLoggedIn">
            Zum Dashboard
          </button>
        </div>

        <!-- Hilfe-Sektion -->
        <div class="help-section" *ngIf="!isReservedSlug">
          <h3>💡 So funktioniert's:</h3>
          <ol>
            <li>Registrieren Sie sich kostenlos oder melden Sie sich an</li>
            <li>Erstellen Sie Ihren Store mit Ihrer Wunsch-Subdomain</li>
            <li>Fügen Sie Produkte hinzu und passen Sie das Design an</li>
            <li>Ihr Store ist sofort online unter ihrer-name.markt.ma</li>
          </ol>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-not-found-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .content-card {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .icon-section {
      margin-bottom: 2rem;
    }

    .icon-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .icon {
      font-size: 4rem;
    }

    h1 {
      font-size: 2.5rem;
      margin: 1rem 0;
      color: #2c3e50;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.25rem;
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .subtitle strong {
      color: #667eea;
      font-weight: 600;
    }

    .warning-box {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
      display: flex;
      gap: 1rem;
      text-align: left;
    }

    .warning-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .warning-content h3 {
      margin: 0 0 0.5rem 0;
      color: #856404;
      font-size: 1.1rem;
    }

    .warning-content p {
      margin: 0;
      color: #856404;
      font-size: 0.95rem;
    }

    .action-section {
      margin: 2rem 0;
    }

    .cta-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 16px;
      padding: 2rem;
      margin: 2rem 0;
    }

    .cta-box h2 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1.75rem;
    }

    .cta-box p {
      color: #666;
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-secondary:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
    }

    .btn-icon {
      font-size: 1.2rem;
    }

    .small-text {
      font-size: 0.875rem;
      color: #999;
      margin-top: 1rem;
    }

    .alternative-actions {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-link {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      font-size: 1rem;
      text-decoration: none;
      transition: color 0.3s;
    }

    .btn-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .separator {
      color: #ccc;
    }

    .help-section {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 2rem;
      margin-top: 2rem;
      text-align: left;
    }

    .help-section h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1.25rem;
    }

    .help-section ol {
      margin: 0;
      padding-left: 1.5rem;
      color: #666;
      line-height: 1.8;
    }

    .help-section li {
      margin-bottom: 0.5rem;
    }

    @media (max-width: 768px) {
      .content-card {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1.1rem;
      }

      .button-group {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class StoreNotFoundComponent implements OnInit {
  slug: string | null = null;
  isReservedSlug = false;
  isLoggedIn = false;

  constructor(
    private subdomainService: SubdomainService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const info = this.subdomainService.detectSubdomain();
    this.slug = info.slug;

    if (this.slug) {
      this.isReservedSlug = this.subdomainService.isReservedSlug(this.slug);
      console.log(`🔍 Slug "${this.slug}" - Reserviert: ${this.isReservedSlug}`);
    }

    this.isLoggedIn = this.authService.isAuthenticated();
  }

  createStore(): void {
    // Navigiere zum Store-Erstellungsformular mit vorausgefülltem Slug
    this.router.navigate(['/dashboard'], {
      queryParams: {
        createStore: true,
        slug: this.slug
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register'], {
      queryParams: {
        returnUrl: window.location.pathname,
        slug: this.slug
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: window.location.pathname,
        slug: this.slug
      }
    });
  }

  goToMarketplace(): void {
    window.location.href = 'https://markt.ma';
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}


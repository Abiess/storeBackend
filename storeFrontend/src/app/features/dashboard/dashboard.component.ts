import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '@app/core/services/store.service';
import { AuthService } from '@app/core/services/auth.service';
import { Store, User, CreateStoreRequest } from '@app/core/models';
import { LanguageSwitcherComponent } from '@app/shared/components/language-switcher.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LanguageSwitcherComponent],
  template: `
    <div class="dashboard">
      <nav class="navbar">
        <div class="container">
          <div class="nav-brand">
            <h1 class="logo">markt.ma</h1>
            <span class="tagline">E-Commerce Platform</span>
          </div>
          <div class="nav-right">
            <app-language-switcher></app-language-switcher>
            <a routerLink="/subscription" class="btn btn-subscription" title="Abonnement">
              <span class="subscription-icon">💎</span>
            </a>
            <a routerLink="/settings" class="btn btn-settings" title="Einstellungen">
              <span class="settings-icon">⚙️</span>
            </a>
            <div class="user-info">
              <span class="user-avatar">{{ getUserInitials() }}</span>
              <span class="user-email" *ngIf="currentUser">{{ currentUser.email }}</span>
            </div>
            <button class="btn btn-logout" (click)="logout()">
              <span class="logout-icon">⎋</span>
              <span class="logout-text">Abmelden</span>
            </button>
          </div>
        </div>
      </nav>

      <div class="container">
        <div class="dashboard-header">
          <div>
            <h2>Meine Stores</h2>
            <p class="subtitle">Verwalten Sie Ihre Online-Shops</p>
          </div>
          <button class="btn btn-create-store" (click)="openCreateStoreModal()">
            <span class="icon">➕</span>
            Neuer Store
          </button>
        </div>

        <div *ngIf="loading" class="loading-container">
          <div class="spinner"></div>
          <p>Stores werden geladen...</p>
        </div>

        <div *ngIf="!loading && stores.length === 0" class="empty-state">
          <div class="empty-icon">🏪</div>
          <h3>Noch keine Stores vorhanden</h3>
          <p>Erstellen Sie Ihren ersten Store und starten Sie mit dem Verkauf!</p>
          <button class="btn btn-primary btn-large" (click)="openCreateStoreModal()">
            <span>➕</span>
            Ersten Store erstellen
          </button>
        </div>

        <div *ngIf="!loading && stores.length > 0" class="stores-grid">
          <div *ngFor="let store of stores" class="store-card" [class.inactive]="store.status !== 'ACTIVE'">
            <div class="store-card-header">
              <div class="store-icon">🏪</div>
              <span [class]="'badge badge-' + getStatusClass(store.status)">
                {{ getStatusLabel(store.status) }}
              </span>
            </div>
            
            <div class="store-card-body">
              <h3>{{ store.name }}</h3>
              <p class="store-url">
                <span class="link-icon">🔗</span>
                <a [href]="getStorefrontUrl(store.slug)" class="domain-link" target="_blank">
                  {{ store.slug }}.markt.ma
                </a>
              </p>
              <div class="store-meta">
                <span class="meta-item">
                  <span class="meta-icon">📅</span>
                  Erstellt: {{ store.createdAt | date:'dd.MM.yyyy' }}
                </span>
              </div>
            </div>

            <div class="store-card-footer">
              <button class="btn btn-primary btn-block" [routerLink]="['/stores', store.id]">
                <span>📊</span>
                Store verwalten
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Store Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateStoreModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Neuen Store erstellen</h2>
            <button class="close-btn" (click)="closeCreateStoreModal()">×</button>
          </div>

          <div class="modal-body">
            <form #storeForm="ngForm" (ngSubmit)="createStore()">
              <div class="form-group">
                <label for="storeName">Store Name *</label>
                <input
                  type="text"
                  id="storeName"
                  name="storeName"
                  [(ngModel)]="newStore.name"
                  required
                  placeholder="z.B. Mein Online Shop"
                  class="form-control"
                  [class.error]="storeForm.submitted && !newStore.name"
                  (input)="generateSlug()"
                />
                <small class="form-hint">Der Name Ihres Stores, wie er Kunden angezeigt wird</small>
                <div class="error-message" *ngIf="storeForm.submitted && !newStore.name">
                  Bitte geben Sie einen Store-Namen ein
                </div>
              </div>

              <div class="form-group">
                <label for="storeSlug">URL-Slug *</label>
                <div class="slug-input-group">
                  <input
                    type="text"
                    id="storeSlug"
                    name="storeSlug"
                    [(ngModel)]="newStore.slug"
                    required
                    placeholder="mein-shop"
                    class="form-control"
                    [class.error]="storeForm.submitted && !newStore.slug"
                    pattern="^[a-z0-9-]+$"
                  />
                  <span class="slug-suffix">.markt.ma</span>
                </div>
                <small class="form-hint">
                  Nur Kleinbuchstaben, Zahlen und Bindestriche. Dies wird Ihre Shop-URL: 
                  <strong>{{ newStore.slug || 'mein-shop' }}.markt.ma</strong>
                </small>
                <div class="error-message" *ngIf="storeForm.submitted && !newStore.slug">
                  Bitte geben Sie einen URL-Slug ein
                </div>
                <div class="error-message" *ngIf="slugError">
                  {{ slugError }}
                </div>
              </div>

              <div class="form-group">
                <label for="storeDescription">Beschreibung (optional)</label>
                <textarea
                  id="storeDescription"
                  name="storeDescription"
                  [(ngModel)]="newStore.description"
                  placeholder="Beschreiben Sie Ihren Store..."
                  class="form-control"
                  rows="4"
                ></textarea>
                <small class="form-hint">Eine kurze Beschreibung Ihres Stores für Kunden und Suchmaschinen</small>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeCreateStoreModal()" [disabled]="creating">
                  Abbrechen
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="creating || !storeForm.valid">
                  <span *ngIf="!creating">✓ Store erstellen</span>
                  <span *ngIf="creating">
                    <span class="spinner-small"></span>
                    Wird erstellt...
                  </span>
                </button>
              </div>
            </form>

            <div class="error-alert" *ngIf="createError">
              <span class="icon">⚠️</span>
              <p>{{ createError }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Store Limit Modal -->
      <div class="modal-overlay" *ngIf="showLimitModal" (click)="closeLimitModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Store-Limit erreicht</h2>
            <button class="close-btn" (click)="closeLimitModal()">×</button>
          </div>

          <div class="modal-body">
            <p>Sie haben das maximale Limit an Stores erreicht. Bitte upgraden Sie Ihr Abonnement, um weitere Stores zu erstellen.</p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeLimitModal()">
              Später erinnern
            </button>
            <button class="btn btn-primary" (click)="goToSubscription()">
              Zum Abonnement
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    .dashboard {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      background-attachment: fixed;
    }

    .navbar {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 1rem 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .navbar .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .nav-brand {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .logo {
      color: #667eea;
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }

    @media (min-width: 768px) {
      .logo {
        font-size: 1.75rem;
      }
    }

    .tagline {
      color: #666;
      font-size: 0.75rem;
      display: none;
    }

    @media (min-width: 640px) {
      .tagline {
        display: inline;
        font-size: 0.875rem;
      }
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    @media (min-width: 768px) {
      .nav-right {
        gap: 1rem;
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    @media (min-width: 768px) {
      .user-avatar {
        width: 36px;
        height: 36px;
      }
    }

    .user-email {
      color: #333;
      font-size: 0.875rem;
      display: none;
    }

    @media (min-width: 768px) {
      .user-email {
        display: inline;
      }
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
      transition: all 0.3s;
      font-size: 0.875rem;
    }

    @media (min-width: 768px) {
      .btn-logout {
        padding: 0.5rem 1rem;
      }
    }

    .logout-text {
      display: none;
    }

    @media (min-width: 640px) {
      .logout-text {
        display: inline;
      }
    }

    .btn-logout:hover {
      background: #f5f5f5;
      color: #333;
      border-color: #999;
    }

    .btn-settings {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 8px;
      transition: all 0.3s;
      font-size: 1.25rem;
      text-decoration: none;
      width: 40px;
      height: 40px;
    }

    .btn-settings:hover {
      background: #f5f5f5;
      color: #667eea;
      border-color: #667eea;
      transform: rotate(90deg);
    }

    .settings-icon {
      display: block;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    @media (min-width: 640px) {
      .container {
        padding: 0 1.5rem;
      }
    }

    .dashboard-header {
      padding: 1.5rem 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    @media (min-width: 768px) {
      .dashboard-header {
        padding: 2rem 0 1.5rem;
        align-items: center;
      }
    }

    .dashboard-header h2 {
      color: white;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
    }

    @media (min-width: 768px) {
      .dashboard-header h2 {
        font-size: 2rem;
      }
    }

    .btn-create-store {
      background: white;
      color: #667eea;
      border: 2px solid white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    @media (min-width: 768px) {
      .btn-create-store {
        padding: 0.875rem 1.75rem;
        font-size: 1rem;
      }
    }

    .btn-create-store:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
    }

    .btn-create-store .icon {
      font-size: 1.25rem;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1rem;
      margin-top: 1.5rem;
    }

    @media (min-width: 768px) {
      .btn-large {
        padding: 1.125rem 2.5rem;
        font-size: 1.125rem;
      }
    }

    .btn-subscription {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      transition: all 0.3s;
      font-size: 1.25rem;
      text-decoration: none;
      width: 40px;
      height: 40px;
    }

    .btn-subscription:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .subscription-icon {
      display: block;
    }

    .form-control.error {
      border-color: #e74c3c;
    }

    .error-alert {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-alert .icon {
      font-size: 1.5rem;
    }

    .error-alert p {
      margin: 0;
      color: #856404;
      font-size: 0.875rem;
    }

    .form-hint strong {
      color: #667eea;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
      font-family: inherit;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 639px) {
      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-create-store {
        width: 100%;
        justify-content: center;
      }

      .modal-content {
        width: 95%;
        padding: 1.5rem;
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 600px;
      width: 90%;
      padding: 2rem;
      position: relative;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .modal-header h2 {
      font-size: 1.5rem;
      margin: 0;
      color: #333;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #666;
      font-size: 1.5rem;
      cursor: pointer;
      transition: color 0.3s;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      max-height: 70vh;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #333;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      border-color: #667eea;
      outline: none;
    }

    .form-hint {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .slug-input-group {
      display: flex;
      align-items: center;
    }

    .slug-input-group .form-control {
      flex: 1;
      margin-right: 0.5rem;
    }

    .slug-suffix {
      font-size: 0.875rem;
      color: #666;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 3px solid rgba(102, 126, 234, 0.3);
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      display: inline-block;
      margin-right: 0.5rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .modal-body p {
      font-size: 1rem;
      line-height: 1.6;
      color: #4b5563;
      margin: 0;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 0.875rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      color: white;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 12px;
      margin-top: 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .stores-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
      padding-bottom: 2rem;
    }

    .store-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .store-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .store-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .store-icon {
      font-size: 2rem;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-success {
      background: #d4edda;
      color: #155724;
    }

    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }

    .store-card-body h3 {
      font-size: 1.25rem;
      color: #333;
      margin: 0 0 0.5rem;
    }

    .store-url {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .link-icon {
      font-size: 0.875rem;
    }

    .domain-link {
      color: #667eea;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .domain-link:hover {
      text-decoration: underline;
    }

    .store-meta {
      font-size: 0.75rem;
      color: #666;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .store-card-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn-block {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.875rem;
      margin: 0;
    }
  `]
})
export class DashboardComponent implements OnInit {
  stores: Store[] = [];
  currentUser: User | null = null;
  loading = true;
  showCreateModal = false;
  newStore: CreateStoreRequest = {
    name: '',
    slug: '',
    description: ''
  };
  creating = false;
  slugError: string | null = null;
  createError: string | null = null;
  showLimitModal = false;

  constructor(
    private storeService: StoreService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.loadStores();
  }

  loadStores(): void {
    this.loading = true;
    this.storeService.getMyStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Stores:', error);
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }

  getUserInitials(): string {
    if (!this.currentUser?.email) return 'U';
    return this.currentUser.email.charAt(0).toUpperCase();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SUSPENDED': return 'danger';
      case 'PENDING_DOMAIN_VERIFICATION': return 'warning';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Aktiv';
      case 'SUSPENDED': return 'Gesperrt';
      case 'PENDING_DOMAIN_VERIFICATION': return 'Verifizierung';
      default: return status;
    }
  }

  openCreateStoreModal(): void {
    this.showCreateModal = true;
    this.resetNewStore();
  }

  closeCreateStoreModal(): void {
    this.showCreateModal = false;
    this.createError = null;
  }

  resetNewStore(): void {
    this.newStore = {
      name: '',
      slug: '',
      description: ''
    };
    this.slugError = null;
  }

  generateSlug(): void {
    if (!this.newStore.name) {
      this.newStore.slug = '';
      return;
    }
    const slug = this.newStore.name
      .toLowerCase()
      .replace(/[^a-z0-9- ]/g, '')
      .trim()
      .replace(/ +/g, '-');
    this.newStore.slug = slug;
    this.checkSlugAvailability(slug);
  }

  checkSlugAvailability(slug: string): void {
    // Validiere Slug-Format zuerst
    if (!slug || slug.trim().length === 0) {
      this.slugError = null;
      return;
    }

    // Prüfe Format mit Regex
    if (!slug.match(/^[a-z0-9-]+$/)) {
      this.slugError = 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt';
      return;
    }

    // Slug ist gültig, prüfe Verfügbarkeit
    this.storeService.checkSlugAvailability(slug).subscribe({
      next: (available) => {
        this.slugError = available ? null : 'Dieser Slug ist bereits vergeben';
      },
      error: (error) => {
        // Fehler nur loggen, nicht anzeigen - könnte am Backend liegen
        console.error('Fehler bei der Slug-Prüfung:', error);
        // Keine Fehlermeldung anzeigen, damit User trotzdem fortfahren kann
        this.slugError = null;
      }
    });
  }

  createStore(): void {
    this.creating = true;
    this.storeService.createStore(this.newStore).subscribe({
      next: () => {
        this.creating = false;
        this.closeCreateStoreModal();
        this.loadStores();
      },
      error: (error) => {
        this.creating = false;

        // Check if it's a store limit error
        if (error.error?.message && error.error.message.includes('Maximum stores limit reached')) {
          this.closeCreateStoreModal();
          this.showLimitModal = true;
          return;
        }

        if (error.status === 403) {
          this.createError = 'Authentifizierungsproblem. Bitte melden Sie sich erneut an.';
          console.error('403-Fehler beim Erstellen des Stores. Bitte Backend neu starten und erneut anmelden.');
        } else if (error.error?.message) {
          this.createError = error.error.message;
        } else {
          this.createError = 'Fehler beim Erstellen des Stores';
        }
        console.error('Fehler beim Erstellen des Stores:', error);
      }
    });
  }

  closeLimitModal(): void {
    this.showLimitModal = false;
  }

  goToSubscription(): void {
    this.showLimitModal = false;
    window.location.href = '/subscription';
  }

  getStorefrontUrl(slug: string): string {
    return `https://${slug}.markt.ma`;
  }
}

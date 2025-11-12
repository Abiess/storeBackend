import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreService } from '../../core/services/store.service';
import { AuthService } from '../../core/services/auth.service';
import { Store, User } from '../../core/models';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent],
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
        </div>

        <div *ngIf="loading" class="loading-container">
          <div class="spinner"></div>
          <p>Stores werden geladen...</p>
        </div>

        <div *ngIf="!loading && stores.length === 0" class="empty-state">
          <div class="empty-icon">🏪</div>
          <h3>Noch keine Stores vorhanden</h3>
          <p>Kontaktieren Sie den Administrator, um einen Store zu erhalten.</p>
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
                <a [routerLink]="['/storefront', store.id]" class="domain-link" target="_blank">
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
    }

    @media (min-width: 768px) {
      .dashboard-header {
        padding: 2rem 0 1.5rem;
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

    .subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.875rem;
      margin: 0;
    }

    @media (min-width: 768px) {
      .subtitle {
        font-size: 1rem;
      }
    }

    .loading-container {
      text-align: center;
      padding: 3rem 1rem;
    }

    @media (min-width: 768px) {
      .loading-container {
        padding: 4rem 1rem;
      }
    }

    .loading-container p {
      color: white;
      margin-top: 1rem;
      font-size: 0.875rem;
    }

    @media (min-width: 768px) {
      .loading-container p {
        font-size: 1rem;
      }
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @media (min-width: 768px) {
      .spinner {
        width: 50px;
        height: 50px;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      max-width: 500px;
      margin: 2rem auto;
    }

    @media (min-width: 768px) {
      .empty-state {
        padding: 4rem 2rem;
        border-radius: 16px;
      }
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    @media (min-width: 768px) {
      .empty-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
      }
    }

    .empty-state h3 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: #333;
    }

    @media (min-width: 768px) {
      .empty-state h3 {
        font-size: 1.5rem;
      }
    }

    .empty-state p {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 0;
    }

    @media (min-width: 768px) {
      .empty-state p {
        font-size: 1rem;
      }
    }

    .stores-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem 0 2rem;
    }

    @media (min-width: 640px) {
      .stores-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
      }
    }

    @media (min-width: 1024px) {
      .stores-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }
    }

    .store-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    @media (min-width: 768px) {
      .store-card {
        border-radius: 16px;
      }
    }

    .store-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    }

    .store-card.inactive {
      opacity: 0.7;
    }

    .store-card-header {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f0f0f0;
    }

    @media (min-width: 768px) {
      .store-card-header {
        padding: 1.25rem;
      }
    }

    .store-icon {
      font-size: 2rem;
    }

    @media (min-width: 768px) {
      .store-icon {
        font-size: 2.5rem;
      }
    }

    .store-card-body {
      padding: 1rem;
      flex: 1;
    }

    @media (min-width: 768px) {
      .store-card-body {
        padding: 1.25rem;
      }
    }

    .store-card-body h3 {
      font-size: 1.125rem;
      margin: 0 0 0.75rem;
      color: #333;
      font-weight: 600;
    }

    @media (min-width: 768px) {
      .store-card-body h3 {
        font-size: 1.25rem;
      }
    }

    .store-url {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      margin: 0 0 1rem;
      font-weight: 500;
      word-break: break-all;
    }

    @media (min-width: 768px) {
      .store-url {
        font-size: 0.875rem;
      }
    }

    .domain-link {
      color: #667eea;
      text-decoration: none;
      transition: all 0.3s;
      border-bottom: 1px solid transparent;
    }

    .domain-link:hover {
      color: #764ba2;
      border-bottom-color: #764ba2;
    }

    .store-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      font-size: 0.75rem;
    }

    @media (min-width: 768px) {
      .meta-item {
        font-size: 0.8125rem;
      }
    }

    .meta-icon {
      flex-shrink: 0;
    }

    .store-card-footer {
      padding: 0.875rem 1rem;
      background: #f8f9fa;
      border-top: 1px solid #f0f0f0;
    }

    @media (min-width: 768px) {
      .store-card-footer {
        padding: 1rem 1.25rem;
      }
    }

    .btn {
      padding: 0.625rem 1rem;
      border: none;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    @media (min-width: 768px) {
      .btn {
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
      }
    }

    .btn-block {
      width: 100%;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    @media (min-width: 768px) {
      .badge {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
      }
    }

    .badge-success {
      background-color: #d4edda;
      color: #155724;
    }

    .badge-danger {
      background-color: #f8d7da;
      color: #721c24;
    }

    .badge-warning {
      background-color: #fff3cd;
      color: #856404;
    }

    .badge-info {
      background-color: #d1ecf1;
      color: #0c5460;
    }
  `]
})
export class DashboardComponent implements OnInit {
  stores: Store[] = [];
  currentUser: User | null = null;
  loading = true;

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
}

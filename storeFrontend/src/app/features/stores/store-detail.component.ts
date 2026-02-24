import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ProductService } from '@app/core/services/product.service';
import { OrderService } from '@app/core/services/order.service';
import { DomainService } from '@app/core/services/domain.service';
import { StoreService } from '@app/core/services/store.service';
import { MediaService } from '@app/core/services/media.service';
import { Product, Order, Domain, DomainType } from '@app/core/models';
import { LanguageSwitcherComponent } from '@app/shared/components/language-switcher.component';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, LanguageSwitcherComponent],
  template: `
    <div class="store-detail">
      <div class="container">
        <div class="breadcrumb">
          <a routerLink="/dashboard">← Zurück zum Dashboard</a>
          <app-language-switcher></app-language-switcher>
        </div>

        <div class="store-header">
          <h1>Store Management</h1>
          <div class="tabs">
            <button [class.active]="activeTab === 'products'" (click)="switchTab('products')">
              📦 Produkte
            </button>
            <button [class.active]="activeTab === 'orders'" (click)="switchTab('orders')">
              📋 Bestellungen
            </button>
            <button [class.active]="activeTab === 'reviews'" (click)="switchTab('reviews')">
              ⭐ Bewertungen
            </button>
            <button [class.active]="activeTab === 'domains'" (click)="switchTab('domains')">
              🌐 Domains
            </button>
            <button [class.active]="activeTab === 'theme'" (click)="switchTab('theme')">
              🎨 Design & Theme
            </button>
          </div>
        </div>

        <!-- Products Tab -->
        <div *ngIf="activeTab === 'products'" class="tab-content">
          <div class="section-header">
            <h2>Produkte</h2>
            <div class="header-actions">
              <button class="btn btn-secondary" [routerLink]="['/dashboard/stores', storeId, 'categories', 'new']">
                + Kategorie
              </button>
              <button class="btn btn-primary" [routerLink]="['/dashboard/stores', storeId, 'products', 'new']">
                + Produkt
              </button>
            </div>
          </div>

          <div *ngIf="productsLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Produkte werden geladen...</p>
          </div>

          <div *ngIf="!productsLoading && products.length === 0" class="empty-state">
            <div class="empty-icon">📦</div>
            <p>Noch keine Produkte vorhanden</p>
            <button class="btn btn-primary" [routerLink]="['/dashboard/stores', storeId, 'products', 'new']">
              Erstes Produkt erstellen
            </button>
          </div>

          <div *ngIf="!productsLoading && products.length > 0">
            <div class="products-actions">
              <button class="btn btn-link" [routerLink]="['/dashboard/stores', storeId, 'products']">
                Alle Produkte anzeigen ({{ products.length }}) →
              </button>
            </div>
            
            <div class="products-grid">
              <div *ngFor="let product of products.slice(0, 6)" class="product-card">
                <div class="product-header">
                  <h3>{{ product.title }}</h3>
                  <span [class]="'badge badge-' + getProductStatusClass(product.status)">
                    {{ product.status }}
                  </span>
                </div>
                <p class="product-description">{{ product.description }}</p>
                <div class="product-footer">
                  <span class="product-price">{{ product.basePrice }} €</span>
                  <span class="product-date">{{ product.createdAt | date:'dd.MM.yyyy' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Tab -->
        <div *ngIf="activeTab === 'orders'" class="tab-content">
          <div class="section-header">
            <h2>Bestellungen</h2>
          </div>
          
          <div *ngIf="ordersLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Bestellungen werden geladen...</p>
          </div>

          <div *ngIf="!ordersLoading && orders.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>Noch keine Bestellungen vorhanden</p>
          </div>

          <div *ngIf="!ordersLoading && orders.length > 0" class="orders-list">
            <div *ngFor="let order of orders" class="order-card">
              <div class="order-header">
                <div>
                  <strong>{{ order.orderNumber }}</strong>
                  <span class="order-email">{{ order.customerEmail }}</span>
                </div>
                <span [class]="'badge badge-' + getOrderStatusClass(order.status)">
                  {{ order.status }}
                </span>
              </div>
              <div class="order-footer">
                <span class="order-amount">{{ order.totalAmount }} €</span>
                <span class="order-date">{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews Tab -->
        <div *ngIf="activeTab === 'reviews'" class="tab-content">
          <div class="section-header">
            <h2>Kundenbewertungen</h2>
            <button class="btn btn-primary" [routerLink]="['/stores', storeId, 'reviews']">
              Alle Bewertungen verwalten →
            </button>
          </div>
          
          <div class="reviews-info">
            <div class="info-card">
              <div class="info-icon">⭐</div>
              <div class="info-content">
                <h3>Bewertungen verwalten</h3>
                <p>Sehen Sie alle Kundenbewertungen, genehmigen Sie neue Reviews und löschen Sie unangemessene Inhalte.</p>
                <button class="btn btn-link" [routerLink]="['/stores', storeId, 'reviews']">
                  Zur Bewertungs-Verwaltung →
                </button>
              </div>
            </div>
            
            <div class="info-card">
              <div class="info-icon">📊</div>
              <div class="info-content">
                <h3>Statistiken einsehen</h3>
                <p>Verfolgen Sie die durchschnittliche Bewertung Ihrer Produkte und die Zufriedenheit Ihrer Kunden.</p>
              </div>
            </div>
            
            <div class="info-card">
              <div class="info-icon">✅</div>
              <div class="info-content">
                <h3>Moderation</h3>
                <p>Alle neuen Bewertungen warten auf Ihre Genehmigung, bevor sie öffentlich sichtbar werden.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Domains Tab -->
        <div *ngIf="activeTab === 'domains'" class="tab-content">
          <div class="section-header">
            <h2>Domains</h2>
            <button class="btn btn-primary" (click)="toggleAddDomain()" *ngIf="!showAddDomain">
              + Domain hinzufügen
            </button>
          </div>

          <!-- Add Domain Form -->
          <div *ngIf="showAddDomain" class="domain-form-card">
            <div class="form-header">
              <h3>Neue Domain hinzufügen</h3>
              <button class="btn-close" (click)="cancelAddDomain()">✕</button>
            </div>
            
            <form [formGroup]="domainForm" (ngSubmit)="onSubmitDomain()">
              <div class="form-group">
                <label for="domainType">Domain-Typ</label>
                <select id="domainType" formControlName="type" class="form-control">
                  <option value="SUBDOMAIN">Subdomain (*.markt.ma)</option>
                  <option value="CUSTOM">Custom Domain</option>
                </select>
              </div>

              <div class="form-group">
                <label for="domainHost">Domain</label>
                <input 
                  id="domainHost" 
                  type="text" 
                  formControlName="host" 
                  class="form-control"
                  [placeholder]="domainForm.get('type')?.value === 'SUBDOMAIN' ? 'meinshop.markt.ma' : 'shop.meine-domain.de'"
                />
                <small class="form-hint" *ngIf="domainForm.get('type')?.value === 'SUBDOMAIN'">
                  Geben Sie die vollständige Subdomain ein (z.B. meinshop.markt.ma)
                </small>
                <small class="form-hint" *ngIf="domainForm.get('type')?.value === 'CUSTOM'">
                  Geben Sie Ihre eigene Domain ein (z.B. shop.meine-domain.de)
                </small>
                <div *ngIf="domainForm.get('host')?.invalid && domainForm.get('host')?.touched" class="error">
                  Bitte geben Sie eine gültige Domain ein
                </div>
              </div>

              <div class="form-group" *ngIf="domainForm.get('type')?.value === 'CUSTOM'">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isPrimary" />
                  Als primäre Domain festlegen
                </label>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddDomain()">
                  Abbrechen
                </button>
                <button type="submit" class="btn btn-success" [disabled]="domainForm.invalid || savingDomain">
                  {{ savingDomain ? 'Wird gespeichert...' : 'Domain hinzufügen' }}
                </button>
              </div>

              <div *ngIf="domainError" class="alert alert-error">
                {{ domainError }}
              </div>
              <div *ngIf="domainSuccess" class="alert alert-success">
                {{ domainSuccess }}
              </div>
            </form>
          </div>

          <div *ngIf="domainsLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Domains werden geladen...</p>
          </div>

          <div *ngIf="!domainsLoading && domains.length === 0 && !showAddDomain" class="empty-state">
            <div class="empty-icon">🌐</div>
            <p>Noch keine Domains konfiguriert</p>
          </div>

          <div *ngIf="!domainsLoading && domains.length > 0" class="domains-list">
            <div *ngFor="let domain of domains" class="domain-card">
              <div class="domain-main">
                <div class="domain-info">
                  <strong class="domain-host">{{ domain.host }}</strong>
                  <div class="domain-badges">
                    <span [class]="'badge badge-' + (domain.type === 'SUBDOMAIN' ? 'info' : 'warning')">
                      {{ domain.type === 'SUBDOMAIN' ? 'Subdomain' : 'Custom' }}
                    </span>
                    <span *ngIf="domain.isPrimary" class="badge badge-success">Primär</span>
                    <span [class]="'badge badge-' + (domain.isVerified ? 'success' : 'warning')">
                      {{ domain.isVerified ? '✓ Verifiziert' : '⏳ Nicht verifiziert' }}
                    </span>
                  </div>
                  <small class="domain-date">Hinzugefügt: {{ domain.createdAt | date:'dd.MM.yyyy' }}</small>
                </div>
                <div class="domain-actions">
                  <button 
                    *ngIf="!domain.isVerified && domain.type === 'CUSTOM'" 
                    class="btn btn-info btn-sm"
                    (click)="verifyDomain(domain.id)"
                  >
                    Verifizieren
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="confirmDeleteDomain(domain)">
                    Löschen
                  </button>
                </div>
              </div>
              
              <div *ngIf="!domain.isVerified && domain.verificationToken" class="verification-info">
                <strong>DNS-Verifizierung erforderlich:</strong>
                <code>{{ domain.verificationToken }}</code>
                <small>Fügen Sie diesen TXT-Record zu Ihrer Domain hinzu</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Theme Tab -->
        <div *ngIf="activeTab === 'theme'" class="tab-content">
          <div class="section-header">
            <h2>Design & Theme</h2>
          </div>

          <div class="theme-intro">
            <div class="intro-card">
              <div class="intro-icon">🎨</div>
              <h3>Wählen Sie ein vordefiniertes Theme</h3>
              <p>
                Starten Sie schnell mit einem unserer professionell gestalteten Themes. 
                Sie können aus 5 verschiedenen Designs wählen: Modern, Klassisch, Minimalistisch, Elegant und Dunkel.
              </p>
              <button 
                class="btn btn-primary btn-large" 
                [routerLink]="['/stores', storeId, 'theme']"
              >
                🎨 Theme-Galerie öffnen
              </button>
            </div>

            <div class="theme-features">
              <h4>Was Sie anpassen können:</h4>
              <ul>
                <li>✓ Farben (Primär, Sekundär, Akzent, Hintergrund, Text)</li>
                <li>✓ Layout (Header-Stil, Produkt-Grid, Eckenradius)</li>
                <li>✓ Typografie (Schriftarten und Größen)</li>
                <li>✓ Eigenes CSS für erweiterte Anpassungen</li>
                <li>✓ Live-Vorschau aller Änderungen</li>
              </ul>
            </div>
          </div>

          <div class="divider"></div>

          <div class="theme-settings">
            <h3>Allgemeine Shop-Einstellungen</h3>
            <div class="form-group">
              <label for="storeName">Shop-Name</label>
              <input 
                id="storeName" 
                type="text" 
                [(ngModel)]="storeName" 
                class="form-control"
                placeholder="Geben Sie den Namen Ihres Shops ein"
              />
            </div>

            <div class="form-group">
              <label for="storeDescription">Shop-Beschreibung</label>
              <textarea 
                id="storeDescription" 
                [(ngModel)]="storeDescription" 
                class="form-control"
                rows="3"
                placeholder="Geben Sie eine kurze Beschreibung Ihres Shops ein"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="storeLogo">Shop-Logo</label>
              <input 
                id="storeLogo" 
                type="file" 
                (change)="onLogoSelected($event)" 
                class="form-control"
                accept="image/*"
              />
              <small class="form-hint">
                Empfohlene Größe: 250x250px. Unterstützte Formate: JPG, PNG.
              </small>
            </div>

            <div class="form-group">
              <label for="storeBanner">Shop-Banner</label>
              <input 
                id="storeBanner" 
                type="file" 
                (change)="onBannerSelected($event)" 
                class="form-control"
                accept="image/*"
              />
              <small class="form-hint">
                Empfohlene Größe: 1920x500px. Unterstützte Formate: JPG, PNG.
              </small>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" (click)="saveThemeSettings()">
                Änderungen speichern
              </button>
            </div>

            <div *ngIf="themeError" class="alert alert-error">
              {{ themeError }}
            </div>
            <div *ngIf="themeSuccess" class="alert alert-success">
              {{ themeSuccess }}
            </div>
          </div>

          <div class="divider"></div>

          <div class="theme-preview">
            <h3>Vorschau</h3>
            <div class="preview-card">
              <div class="preview-header">
                <img 
                  *ngIf="logoUrl" 
                  [src]="logoUrl" 
                  alt="Shop-Logo" 
                  class="preview-logo"
                />
                <h4 class="preview-store-name">{{ storeName }}</h4>
              </div>
              <div class="preview-banner">
                <img 
                  *ngIf="bannerUrl" 
                  [src]="bannerUrl" 
                  alt="Shop-Banner" 
                  class="banner-image"
                />
              </div>
              <div class="preview-content">
                <p class="preview-description">{{ storeDescription }}</p>
                <a 
                  [routerLink]="['/storefront', storeId]" 
                  class="btn btn-success btn-block"
                >
                  Zum Shop
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-detail {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 2rem 0;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .breadcrumb {
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .breadcrumb a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.3s;
    }

    .breadcrumb a:hover {
      color: #764ba2;
    }

    .store-header {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .store-header h1 {
      margin: 0 0 1rem;
      font-size: 1.75rem;
      color: #333;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tabs button {
      padding: 0.75rem 1.25rem;
      border: 2px solid transparent;
      background: #f5f5f5;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
      font-size: 0.9375rem;
    }

    .tabs button:hover {
      background: #e8e8e8;
    }

    .tabs button.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-color: #667eea;
    }

    .tab-content {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-height: 400px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .products-actions {
      margin-bottom: 1rem;
    }

    .btn-link {
      background: transparent;
      color: #667eea;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
    }

    .btn-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Products Grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .product-card {
      background: #f8f9fa;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      gap: 0.5rem;
    }

    .product-header h3 {
      margin: 0;
      font-size: 1.125rem;
      color: #333;
    }

    .product-description {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #dee2e6;
    }

    .product-price {
      font-weight: 600;
      color: #667eea;
      font-size: 1.125rem;
    }

    .product-date {
      font-size: 0.8125rem;
      color: #999;
    }

    /* Orders List */
    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .order-card {
      background: #f8f9fa;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .order-email {
      display: block;
      color: #666;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .order-amount {
      font-weight: 600;
      color: #28a745;
      font-size: 1.125rem;
    }

    .order-date {
      font-size: 0.8125rem;
      color: #999;
    }

    /* Domain Form */
    .domain-form-card {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      border: 2px solid #667eea;
      margin-bottom: 1.5rem;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .form-header h3 {
      margin: 0;
      color: #333;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .btn-close:hover {
      background: #e9ecef;
      color: #333;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.9375rem;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-hint {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: #666;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: normal;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .error {
      color: #dc3545;
      font-size: 0.8125rem;
      margin-top: 0.5rem;
    }

    /* Domains List */
    .domains-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .domain-card {
      background: #f8f9fa;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .domain-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .domain-info {
      flex: 1;
      min-width: 200px;
    }

    .domain-host {
      display: block;
      font-size: 1.125rem;
      color: #333;
      margin-bottom: 0.5rem;
      word-break: break-all;
    }

    .domain-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }

    .domain-date {
      display: block;
      color: #999;
      font-size: 0.8125rem;
    }

    .domain-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .verification-info {
      margin-top: 1rem;
      padding: 1rem;
      background: #fff3cd;
      border-radius: 6px;
      border: 1px solid #ffc107;
    }

    .verification-info strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #856404;
    }

    .verification-info code {
      display: block;
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
      margin: 0.5rem 0;
      font-family: monospace;
      word-break: break-all;
    }

    .verification-info small {
      display: block;
      color: #856404;
      font-size: 0.8125rem;
    }

    /* Buttons */
    .btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #218838;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-info:hover {
      background: #138496;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-success {
      background: #d4edda;
      color: #155724;
    }

    .badge-warning {
      background: #fff3cd;
      color: #856404;
    }

    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }

    .badge-info {
      background: #d1ecf1;
      color: #0c5460;
    }

    /* Alerts */
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .alert-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    /* Theme Tab Styles */
    .theme-intro {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    @media (min-width: 768px) {
      .theme-intro {
        grid-template-columns: 2fr 1fr;
      }
    }

    .intro-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
    }

    .intro-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }

    .intro-card h3 {
      margin: 0 0 1rem;
      font-size: 1.5rem;
    }

    .intro-card p {
      margin: 0 0 1.5rem;
      opacity: 0.95;
      line-height: 1.6;
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.125rem;
    }

    .theme-features {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      border: 2px solid #e9ecef;
    }

    .theme-features h4 {
      margin: 0 0 1rem;
      color: #333;
      font-size: 1.125rem;
    }

    .theme-features ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .theme-features li {
      padding: 0.5rem 0;
      color: #555;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    .divider {
      height: 1px;
      background: #e9ecef;
      margin: 2rem 0;
    }

    .theme-settings h3 {
      margin: 0 0 1.5rem;
      color: #333;
      font-size: 1.25rem;
    }

    .theme-preview {
      margin-top: 2rem;
    }

    .theme-preview h3 {
      margin: 0 0 1rem;
      color: #333;
      font-size: 1.25rem;
    }

    .preview-card {
      background: #f8f9fa;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #e9ecef;
    }

    .preview-header {
      padding: 1.5rem;
      text-align: center;
      background: white;
      border-bottom: 1px solid #e9ecef;
    }

    .preview-logo {
      max-width: 120px;
      max-height: 120px;
      margin-bottom: 1rem;
      border-radius: 8px;
    }

    .preview-store-name {
      margin: 0;
      color: #333;
      font-size: 1.5rem;
    }

    .preview-banner {
      max-height: 200px;
      overflow: hidden;
      background: #e9ecef;
    }

    .banner-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .preview-content {
      padding: 1.5rem;
    }

    .preview-description {
      margin: 0 0 1.5rem;
      color: #666;
      line-height: 1.6;
    }

    .btn-block {
      width: 100%;
      justify-content: center;
    }

    /* Reviews Info Cards */
    .reviews-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .info-card {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition: all 0.3s;
    }

    .info-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
      transform: translateY(-2px);
    }

    .info-card .info-icon {
      font-size: 2.5rem;
      text-align: center;
    }

    .info-card .info-content h3 {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      color: #333;
    }

    .info-card .info-content p {
      margin: 0;
      color: #666;
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    @media (max-width: 768px) {
      .container {
        padding: 0 0.75rem;
      }

      .store-header h1 {
        font-size: 1.5rem;
      }

      .tabs button {
        font-size: 0.875rem;
        padding: 0.625rem 1rem;
      }

      .domain-main {
        flex-direction: column;
      }

      .domain-actions {
        width: 100%;
      }

      .form-actions {
        flex-direction: column;
      }

      .form-actions .btn {
        width: 100%;
      }

      .intro-card {
        padding: 1.5rem;
      }

      .intro-icon {
        font-size: 2.5rem;
      }

      .intro-card h3 {
        font-size: 1.25rem;
      }

      .btn-large {
        width: 100%;
      }
    }
  `]
})
export class StoreDetailComponent implements OnInit {
  storeId!: number;
  activeTab = 'products';

  products: Product[] = [];
  orders: Order[] = [];
  domains: Domain[] = [];

  productsLoading = false;
  ordersLoading = false;
  domainsLoading = false;

  showAddDomain = false;
  savingDomain = false;
  domainError = '';
  domainSuccess = '';

  domainForm: FormGroup;

  storeName = 'Mein Shop';
  storeDescription = 'Willkommen in meinem Shop!';
  logoUrl?: string;
  bannerUrl?: string;
  logoFile?: File;
  bannerFile?: File;
  themeError = '';
  themeSuccess = '';
  savingTheme = false;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private orderService: OrderService,
    private domainService: DomainService,
    private storeService: StoreService,
    private mediaService: MediaService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.domainForm = this.fb.group({
      type: ['SUBDOMAIN', Validators.required],
      host: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*\.[a-zA-Z]{2,}$/)]],
      isPrimary: [false]
    });
  }

  ngOnInit(): void {
    const storeIdParam = this.route.snapshot.paramMap.get('id');
    this.storeId = storeIdParam ? Number(storeIdParam) : 0;

    if (!this.storeId || isNaN(this.storeId)) {
      console.error('❌ Ungültige Store-ID:', storeIdParam);
      this.router.navigate(['/dashboard']);
      return;
    }

    console.log('✅ Store-ID geladen:', this.storeId);
    this.loadStoreData();
    this.loadProducts();
    this.loadOrders();
    this.loadDomains();
  }

  loadStoreData(): void {
    this.storeService.getStoreById(this.storeId).subscribe({
      next: (store) => {
        this.storeName = store.name || 'Mein Shop';
        this.storeDescription = store.description || 'Willkommen in meinem Shop!';
        // Logo und Banner URLs laden wenn vorhanden
        console.log('✅ Store-Daten geladen:', store);
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden der Store-Daten:', error);
      }
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  loadProducts(): void {
    this.productsLoading = true;
    this.productService.getProducts(this.storeId).subscribe({
      next: (products) => {
        this.products = products;
        this.productsLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Produkte:', error);
        this.productsLoading = false;
      }
    });
  }

  loadOrders(): void {
    this.ordersLoading = true;
    this.orderService.getOrders(this.storeId).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.ordersLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Bestellungen:', error);
        this.ordersLoading = false;
      }
    });
  }

  loadDomains(): void {
    this.domainsLoading = true;
    this.domainService.getDomains(this.storeId).subscribe({
      next: (domains) => {
        this.domains = domains;
        this.domainsLoading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Domains:', error);
        this.domainsLoading = false;
      }
    });
  }

  toggleAddDomain(): void {
    this.showAddDomain = true;
    this.domainError = '';
    this.domainSuccess = '';
  }

  cancelAddDomain(): void {
    this.showAddDomain = false;
    this.domainForm.reset({
      type: 'SUBDOMAIN',
      host: '',
      isPrimary: false
    });
    this.domainError = '';
    this.domainSuccess = '';
  }

  onSubmitDomain(): void {
    if (this.domainForm.valid) {
      this.savingDomain = true;
      this.domainError = '';
      this.domainSuccess = '';

      const formValue = this.domainForm.value;
      const request = {
        domain: formValue.host,
        type: formValue.type as DomainType,
        storeId: this.storeId
      };

      this.domainService.createDomain(this.storeId, request).subscribe({
        next: (domain) => {
          this.domainSuccess = `Domain "${domain.host}" wurde erfolgreich hinzugefügt!`;
          this.savingDomain = false;
          this.loadDomains();

          setTimeout(() => {
            this.cancelAddDomain();
          }, 2000);
        },
        error: (error) => {
          this.savingDomain = false;
          this.domainError = error.error?.message || 'Fehler beim Hinzufügen der Domain. Bitte versuchen Sie es erneut.';
        }
      });
    }
  }

  verifyDomain(domainId: number): void {
    this.domainService.verifyDomain(this.storeId, domainId).subscribe({
      next: () => {
        this.loadDomains();
        alert('Domain-Verifizierung gestartet!');
      },
      error: (error) => {
        alert('Fehler bei der Verifizierung: ' + (error.error?.message || 'Unbekannter Fehler'));
      }
    });
  }

  confirmDeleteDomain(domain: Domain): void {
    if (confirm(`Möchten Sie die Domain "${domain.host}" wirklich löschen?`)) {
      this.deleteDomain(domain.id);
    }
  }

  deleteDomain(domainId: number): void {
    this.domainService.deleteDomain(this.storeId, domainId).subscribe({
      next: () => {
        this.loadDomains();
      },
      error: (error) => {
        console.error('Fehler beim Löschen der Domain:', error);
        alert('Fehler beim Löschen der Domain');
      }
    });
  }

  getProductStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'DRAFT': return 'warning';
      case 'ARCHIVED': return 'danger';
      default: return 'info';
    }
  }

  getOrderStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'PROCESSING': return 'info';
      case 'SHIPPED': return 'success';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'danger';
      default: return 'info';
    }
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.logoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onBannerSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.bannerFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.bannerUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveThemeSettings(): Promise<void> {
    this.savingTheme = true;
    this.themeSuccess = '';
    this.themeError = '';

    try {
      // 1. Store-Grunddaten aktualisieren (Name & Beschreibung)
      const storeUpdate = {
        name: this.storeName,
        description: this.storeDescription
      };

      await this.storeService.updateStore(this.storeId, storeUpdate).toPromise();
      console.log('✅ Store-Daten gespeichert');

      // 2. Logo hochladen falls vorhanden
      if (this.logoFile) {
        try {
          const logoUpload$ = this.mediaService.uploadMediaWithProgress(
            this.storeId,
            this.logoFile,
            'STORE_LOGO'
          );

          await new Promise<void>((resolve, reject) => {
            logoUpload$.subscribe({
              next: (event) => {
                if (event.response) {
                  console.log('✅ Logo hochgeladen:', event.response);
                  this.logoUrl = event.response.url;
                  resolve();
                }
              },
              error: (error) => {
                console.error('❌ Fehler beim Logo-Upload:', error);
                reject(error);
              }
            });
          });
        } catch (error) {
          console.error('❌ Logo-Upload fehlgeschlagen:', error);
          // Weiter machen, auch wenn Logo-Upload fehlschlägt
        }
      }

      // 3. Banner hochladen falls vorhanden
      if (this.bannerFile) {
        try {
          const bannerUpload$ = this.mediaService.uploadMediaWithProgress(
            this.storeId,
            this.bannerFile,
            'STORE_BANNER'
          );

          await new Promise<void>((resolve, reject) => {
            bannerUpload$.subscribe({
              next: (event) => {
                if (event.response) {
                  console.log('✅ Banner hochgeladen:', event.response);
                  this.bannerUrl = event.response.url;
                  resolve();
                }
              },
              error: (error) => {
                console.error('❌ Fehler beim Banner-Upload:', error);
                reject(error);
              }
            });
          });
        } catch (error) {
          console.error('❌ Banner-Upload fehlgeschlagen:', error);
          // Weiter machen, auch wenn Banner-Upload fehlschlägt
        }
      }

      this.themeSuccess = '✅ Änderungen wurden erfolgreich gespeichert! Die Änderungen sind jetzt auf Ihrer öffentlichen Storefront sichtbar.';
      this.savingTheme = false;

      // Reset der File-Inputs
      this.logoFile = undefined;
      this.bannerFile = undefined;

      // Optional: Store-Daten neu laden um sicherzustellen, dass alles aktuell ist
      this.loadStoreData();

    } catch (error: any) {
      console.error('❌ Fehler beim Speichern:', error);
      this.themeError = error.error?.message || 'Fehler beim Speichern der Änderungen. Bitte versuchen Sie es erneut.';
      this.savingTheme = false;
    }
  }
}

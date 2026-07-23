import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalBaseComponent } from './legal-base.component';

@Component({
  selector: 'app-impressum-store',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterModule],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <h1 class="legal-title">{{ 'legal.impressum.title' | translate }}</h1>

        <!-- Vollständiges Impressum -->
        <div class="legal-content" *ngIf="store && isImprintComplete()">
          <section class="imprint-section" *ngIf="store.legalName">
            <h2>{{ 'legal.impressum.operator' | translate }}</h2>
            <p>
              <strong>{{ store.legalName }}</strong>
              <span *ngIf="store.legalForm"> ({{ store.legalForm }})</span>
            </p>
          </section>

          <section class="imprint-section" *ngIf="hasAddress()">
            <h2>{{ 'legal.impressum.address' | translate }}</h2>
            <p>
              <span *ngIf="store.shippingAddressStreet">{{ store.shippingAddressStreet }}</span>
              <span *ngIf="store.shippingAddressHouseNumber"> {{ store.shippingAddressHouseNumber }}</span><br *ngIf="store.shippingAddressStreet">
              <span *ngIf="store.shippingAddressPostalCode">{{ store.shippingAddressPostalCode }}</span>
              <span *ngIf="store.shippingAddressCity"> {{ store.shippingAddressCity }}</span><br *ngIf="store.shippingAddressPostalCode || store.shippingAddressCity">
              <span *ngIf="store.shippingAddressCountry">{{ store.shippingAddressCountry }}</span>
            </p>
          </section>

          <section class="imprint-section" *ngIf="store.contactEmail || store.contactPhone">
            <h2>{{ 'legal.impressum.contact' | translate }}</h2>
            <p>
              <span *ngIf="store.contactEmail">
                {{ 'legal.impressum.email' | translate }}: 
                <a [href]="'mailto:' + store.contactEmail">{{ store.contactEmail }}</a>
              </span><br *ngIf="store.contactEmail && store.contactPhone">
              <span *ngIf="store.contactPhone">
                {{ 'legal.impressum.phone' | translate }}: 
                <a [href]="'tel:' + store.contactPhone">{{ store.contactPhone }}</a>
              </span>
            </p>
          </section>

          <section class="imprint-section" *ngIf="store.authorizedRepresentative">
            <h2>{{ 'legal.impressum.representative' | translate }}</h2>
            <p>{{ store.authorizedRepresentative }}</p>
          </section>

          <section class="imprint-section" *ngIf="store.commercialRegister && store.registerNumber">
            <h2>{{ 'legal.impressum.register' | translate }}</h2>
            <p>{{ store.commercialRegister }}: {{ store.registerNumber }}</p>
          </section>

          <section class="imprint-section" *ngIf="store.vatId">
            <h2>{{ 'legal.impressum.vatId' | translate }}</h2>
            <p>{{ store.vatId }}</p>
          </section>
        </div>

        <!-- Unvollständiges Impressum -->
        <div class="legal-empty" *ngIf="!store || !isImprintComplete()">
          <div class="empty-icon">📋</div>
          <h2>{{ 'legal.impressum.incomplete.title' | translate }}</h2>
          <p class="empty-description">
            {{ 'legal.impressum.incomplete.message' | translate }}
          </p>
          
          <!-- Owner-Link zu Settings -->
          <div class="owner-notice" *ngIf="isOwner()">
            <p>{{ 'legal.impressum.incomplete.ownerHint' | translate }}</p>
            <a [routerLink]="['/stores', store?.id, 'settings']" 
               [queryParams]="{tab: 'legal'}"
               class="btn btn-primary">
              🛠️ {{ 'legal.impressum.incomplete.toSettings' | translate }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: calc(100vh - 200px);
      padding: 2rem 1rem;
      background: #f9fafb;
    }

    .legal-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .legal-title {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 2rem 0;
      text-align: center;
    }

    .legal-content {
      font-size: 1rem;
      line-height: 1.6;
      color: #374151;
    }

    .imprint-section {
      margin-bottom: 2rem;
    }

    .imprint-section:last-child {
      margin-bottom: 0;
    }

    .imprint-section h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.75rem 0;
    }

    .imprint-section p {
      margin: 0;
      line-height: 1.8;
    }

    .imprint-section a {
      color: #667eea;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .imprint-section a:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    .legal-empty {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .legal-empty h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.75rem 0;
    }

    .empty-description {
      font-size: 1rem;
      color: #6b7280;
      margin: 0 0 2rem 0;
    }

    .owner-notice {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 1.25rem;
      margin-top: 1.5rem;
    }

    .owner-notice p {
      font-size: 0.9375rem;
      color: #92400e;
      margin: 0 0 1rem 0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      border: none;
      cursor: pointer;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
      .legal-container {
        padding: 1.5rem 1rem;
      }

      .legal-title {
        font-size: 1.5rem;
      }
    }
  `]
})
export class ImpressumStoreComponent extends LegalBaseComponent {
  
  /** Prüft, ob Pflichtfelder für Impressum vorhanden sind */
  isImprintComplete(): boolean {
    if (!this.store) return false;
    
    return !!(
      this.store.legalName &&
      this.store.contactEmail &&
      this.hasAddress()
    );
  }

  /** Prüft, ob eine vollständige Adresse vorhanden ist */
  hasAddress(): boolean {
    if (!this.store) return false;
    
    return !!(
      this.store.shippingAddressStreet &&
      this.store.shippingAddressPostalCode &&
      this.store.shippingAddressCity
    );
  }

  protected getContentField() { return this.store?.legalName && this.store?.contactEmail ? 'ok' : null; }
  protected getEmptyTitleKey() { return 'legal.impressum.notConfigured'; }
  protected getEmptyTextKey() { return 'legal.impressum.notConfiguredDesc'; }
}

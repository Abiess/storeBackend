import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { StoreNavigationComponent } from '../../shared/components/store-navigation.component';
import { DeliverySettingsService } from '../../core/services/delivery-settings.service';
import { DeliveryProvidersService } from '../../core/services/delivery-providers.service';
import { DeliveryZonesService } from '../../core/services/delivery-zones.service';
import { DeliveryPartnerService } from '../../core/services/delivery-partner.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { toDate } from '../../core/utils/date.utils';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import {
  DeliverySettings, DeliveryProvider, DeliveryZone,
  DeliveryPartnerProfile, CreateDeliveryPartnerRequest,
  DeliveryPartnerReview, DeliveryPartnerFilter, MoroccoRegion,
  CoverageArea
} from '../../core/models/delivery.model';

@Component({
  selector: 'app-delivery-management',
  standalone: true,
  imports: [CommonModule, FormsModule, StoreNavigationComponent, TranslatePipe, PageHeaderComponent],
  template: `
    <div class="delivery-page">
      <app-store-navigation currentPage="Lieferung"></app-store-navigation>

      <app-page-header
        [title]="'Lieferung & Logistik'"
        [subtitle]="'Versandeinstellungen, Partner-Marktplatz und eigenes Lieferprofil'"
        [breadcrumbs]="breadcrumbs"
        [showBackButton]="true"
      ></app-page-header>

      <!-- ═══ TAB-NAVIGATION ═══ -->
      <div class="tab-bar">
        <button class="tab" [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'">
          ⚙️ Mein Versand
        </button>
        <button class="tab" [class.active]="activeTab === 'marketplace'" (click)="activeTab = 'marketplace'; loadMarketplace()">
          🌍 Partner finden
          <span class="tab-count" *ngIf="marketplacePartners.length">{{ marketplacePartners.length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab === 'profile'" (click)="activeTab = 'profile'; loadMyProfile()">
          🚚 Mein Lieferprofil
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!--  TAB 1: MEIN VERSAND (bestehende Logik)          -->
      <!-- ══════════════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'settings'" class="tab-content">

        <div *ngIf="loading" class="loading-box">
          <div class="spinner"></div>
          <p>Lade Liefereinstellungen...</p>
        </div>

        <div *ngIf="!loading && !error" class="settings-grid">
          <!-- Allgemeine Einstellungen -->
          <div class="card">
            <div class="card-head">
              <h3>📋 Allgemeine Einstellungen</h3>
              <button class="btn btn-sm btn-outline" (click)="editSettingsInline()">
                {{ settings ? 'Bearbeiten' : 'Einrichten' }}
              </button>
            </div>
            <div *ngIf="settings" class="kv-list">
              <div class="kv"><span>Status</span><span class="badge" [class.badge-on]="settings.enabled">{{ settings.enabled ? 'Aktiv' : 'Inaktiv' }}</span></div>
              <div class="kv" *ngIf="settings.defaultProvider"><span>Standard-Anbieter</span><span>{{ settings.defaultProvider }}</span></div>
              <div class="kv" *ngIf="settings.estimatedMinDays != null"><span>Lieferzeit</span><span>{{ settings.estimatedMinDays }}–{{ settings.estimatedMaxDays }} Tage</span></div>
              <div class="kv" *ngIf="settings.freeShippingThreshold"><span>Gratis ab</span><span>{{ settings.freeShippingThreshold }} {{ settings.currency || 'MAD' }}</span></div>
            </div>
            <div *ngIf="!settings" class="empty-hint">Noch nicht eingerichtet</div>
          </div>

          <!-- Anbieter -->
          <div class="card">
            <div class="card-head">
              <h3>🏭 Lieferanbieter ({{ providers.length }})</h3>
              <button class="btn btn-sm btn-primary" (click)="addProviderInline()">+ Hinzufügen</button>
            </div>
            <div *ngFor="let p of providers" class="list-item">
              <div class="list-item-main">
                <strong>{{ p.name }}</strong>
                <span class="badge badge-sm" [class.badge-on]="p.enabled">{{ p.enabled ? 'Aktiv' : 'Aus' }}</span>
              </div>
              <span class="text-muted">{{ p.code }} · Prio {{ p.priority }}</span>
            </div>
            <div *ngIf="providers.length === 0" class="empty-hint">Keine Anbieter konfiguriert</div>
          </div>

          <!-- Zonen -->
          <div class="card">
            <div class="card-head">
              <h3>📍 Versandzonen ({{ zones.length }})</h3>
              <button class="btn btn-sm btn-primary" (click)="addZoneInline()">+ Hinzufügen</button>
            </div>
            <div *ngFor="let z of zones" class="list-item">
              <div class="list-item-main">
                <strong>{{ z.name }}</strong>
                <span class="badge badge-sm" [class.badge-on]="z.enabled">{{ z.enabled ? 'Aktiv' : 'Aus' }}</span>
              </div>
              <span class="text-muted">{{ z.countries.join(', ') }} · {{ z.shippingCost }} EUR</span>
            </div>
            <div *ngIf="zones.length === 0" class="empty-hint">Keine Zonen konfiguriert</div>
          </div>

          <!-- ════════════════════════════════════════════════ -->
          <!--  DHL VERSAND                                    -->
          <!-- ════════════════════════════════════════════════ -->
          <div class="card dhl-card">
            <div class="card-head">
              <h3>📦 {{ 'shipping.dhl.title' | translate }}</h3>
              <button class="btn btn-sm" [class.btn-primary]="dhlExpanded" [class.btn-outline]="!dhlExpanded" 
                      (click)="dhlExpanded = !dhlExpanded">
                {{ dhlExpanded ? '▲' : '▼' }} {{ dhlExpanded ? ('common.collapse' | translate) : ('common.expand' | translate) }}
              </button>
            </div>
            
            <!-- Collapsed View -->
            <div *ngIf="!dhlExpanded && dhlForm" class="kv-list">
              <div class="kv">
                <span>{{ 'shipping.dhl.enabled' | translate }}</span>
                <span class="badge" [class.badge-on]="dhlForm.dhlEnabled">
                  {{ dhlForm.dhlEnabled ? ('common.active' | translate) : ('common.inactive' | translate) }}
                </span>
              </div>
              <div class="kv" *ngIf="dhlForm.dhlEnabled && dhlForm.dhlEnvironment">
                <span>{{ 'shipping.dhl.environment' | translate }}</span>
                <span>{{ dhlForm.dhlEnvironment }}</span>
              </div>
              <div class="kv" *ngIf="dhlForm.dhlEnabled && dhlForm.dhlBillingNumber">
                <span>{{ 'shipping.dhl.billingNumber' | translate }}</span>
                <span>{{ dhlForm.dhlBillingNumber }}</span>
              </div>
            </div>
            <div *ngIf="!dhlExpanded && !dhlForm" class="empty-hint">
              {{ 'shipping.dhl.notConfigured' | translate }}
            </div>

            <!-- Expanded Form -->
            <div *ngIf="dhlExpanded" class="dhl-form">
              <!-- DHL Aktivieren -->
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="dhlForm.dhlEnabled" />
                  <strong>{{ 'shipping.dhl.enabled' | translate }}</strong>
                </label>
              </div>

              <div *ngIf="dhlForm.dhlEnabled">
                <!-- Umgebung -->
                <div class="form-section">
                  <h4>⚙️ {{ 'shipping.dhl.credentials' | translate }}</h4>
                  <div class="form-group">
                    <label>{{ 'shipping.dhl.environment' | translate }} *</label>
                    <select class="form-control" [(ngModel)]="dhlForm.dhlEnvironment">
                      <option value="SANDBOX">{{ 'shipping.dhl.sandbox' | translate }}</option>
                      <option value="PRODUCTION">{{ 'shipping.dhl.production' | translate }}</option>
                    </select>
                  </div>

                  <!-- Production Warnung -->
                  <div *ngIf="dhlForm.dhlEnvironment === 'PRODUCTION'" class="alert alert-warning" style="margin-top: 12px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    ⚠️ {{ 'shipping.dhl.productionCostWarning' | translate }}
                  </div>

                  <!-- Einfacher Modus Hinweis -->
                  <div class="info-box" style="margin-top: 16px; padding: 12px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                    💡 {{ 'shipping.dhl.simpleModeHint' | translate }}
                  </div>

                  <!-- Erweiterte API Zugangsdaten (einklappbar) -->
                  <div class="advanced-credentials-section" style="margin-top: 16px;">
                    <div class="advanced-credentials-header" style="cursor: pointer; padding: 12px; background: #f5f5f5; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;" (click)="dhlAdvancedExpanded = !dhlAdvancedExpanded">
                      <strong>🔧 {{ 'shipping.dhl.advancedApiCredentials' | translate }}</strong>
                      <span>{{ dhlAdvancedExpanded ? '▲' : '▼' }}</span>
                    </div>
                    
                    <div *ngIf="dhlAdvancedExpanded" class="advanced-credentials-content" style="margin-top: 12px; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; background: #fafafa;">
                      <p style="margin-bottom: 12px; color: #666; font-size: 0.9em;">
                        💡 {{ 'shipping.dhl.advancedApiCredentialsHint' | translate }}
                      </p>
                      
                      <div class="form-grid">
                        <div class="form-group">
                          <label>{{ 'shipping.dhl.clientId' | translate }}</label>
                          <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlClientId" 
                                 placeholder="abc123xyz" />
                        </div>
                        <div class="form-group">
                          <label>{{ 'shipping.dhl.clientSecret' | translate }}</label>
                          <input [type]="showDhlClientSecret ? 'text' : 'password'" class="form-control" 
                                 [(ngModel)]="dhlForm.dhlClientSecret" 
                                 [placeholder]="dhlForm.dhlClientSecret === '********' ? ('shipping.dhl.secretPlaceholder' | translate) : ''" />
                          <button type="button" class="btn-show-secret" (click)="showDhlClientSecret = !showDhlClientSecret" 
                                  *ngIf="dhlForm.dhlClientSecret && dhlForm.dhlClientSecret !== '********'">
                            {{ showDhlClientSecret ? '🙈' : '👁️' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- DHL Business Customer Credentials -->
                  <div class="form-grid" style="margin-top: 16px;">
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.username' | translate }}</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlUsername" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.password' | translate }}</label>
                      <input [type]="showDhlPassword ? 'text' : 'password'" class="form-control" 
                             [(ngModel)]="dhlForm.dhlPassword" 
                             [placeholder]="dhlForm.dhlPassword === '********' ? ('shipping.dhl.secretPlaceholder' | translate) : ''" />
                      <button type="button" class="btn-show-secret" (click)="showDhlPassword = !showDhlPassword"
                              *ngIf="dhlForm.dhlPassword && dhlForm.dhlPassword !== '********'">
                        {{ showDhlPassword ? '🙈' : '👁️' }}
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>{{ 'shipping.dhl.billingNumber' | translate }} *</label>
                    <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlBillingNumber" 
                           placeholder="33333333330101" />
                  </div>
                </div>

                <!-- Absenderadresse -->
                <div class="form-section">
                  <h4>🏢 {{ 'shipping.dhl.shipperAddress' | translate }}</h4>
                  <div class="form-grid">
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.shipperName' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperName" 
                             placeholder="Mein Shop GmbH" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.email' | translate }}</label>
                      <input type="email" class="form-control" [(ngModel)]="dhlForm.dhlShipperEmail" 
                             placeholder="info@example.com" />
                    </div>
                  </div>

                  <div class="form-grid cols-3">
                    <div class="form-group col-span-2">
                      <label>{{ 'shipping.dhl.street' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperStreet" 
                             placeholder="Hauptstraße" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.houseNumber' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperHouseNumber" 
                             placeholder="123" />
                    </div>
                  </div>

                  <div class="form-grid cols-3">
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.postalCode' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperPostalCode" 
                             placeholder="12345" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.city' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperCity" 
                             placeholder="Berlin" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.country' | translate }} *</label>
                      <input type="text" class="form-control" [(ngModel)]="dhlForm.dhlShipperCountry" 
                             placeholder="DE" maxlength="2" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>{{ 'shipping.dhl.phone' | translate }}</label>
                    <input type="tel" class="form-control" [(ngModel)]="dhlForm.dhlShipperPhone" 
                           placeholder="+49 123 456789" />
                  </div>
                </div>

                <!-- Standardpaket -->
                <div class="form-section">
                  <h4>📏 {{ 'shipping.dhl.defaultPackage' | translate }}</h4>
                  <div class="form-grid cols-4">
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.weightGrams' | translate }} *</label>
                      <input type="number" class="form-control" [(ngModel)]="dhlForm.dhlDefaultWeightGrams" 
                             placeholder="500" min="1" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.lengthMm' | translate }} *</label>
                      <input type="number" class="form-control" [(ngModel)]="dhlForm.dhlDefaultLengthMm" 
                             placeholder="300" min="1" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.widthMm' | translate }} *</label>
                      <input type="number" class="form-control" [(ngModel)]="dhlForm.dhlDefaultWidthMm" 
                             placeholder="200" min="1" />
                    </div>
                    <div class="form-group">
                      <label>{{ 'shipping.dhl.heightMm' | translate }} *</label>
                      <input type="number" class="form-control" [(ngModel)]="dhlForm.dhlDefaultHeightMm" 
                             placeholder="150" min="1" />
                    </div>
                  </div>
                </div>

                <!-- Aktionen -->
                <div class="form-actions">
                  <button class="btn btn-primary" (click)="saveDhlSettings()" [disabled]="dhlSaving || dhlTesting">
                    {{ dhlSaving ? ('common.saving' | translate) : ('common.save' | translate) }}
                  </button>
                  <button class="btn btn-outline" (click)="testDhlConnection()" [disabled]="dhlSaving || dhlTesting">
                    {{ dhlTesting ? ('shipping.dhl.testing' | translate) : ('shipping.dhl.testConnection' | translate) }}
                  </button>
                  <button class="btn btn-outline" (click)="cancelDhlEdit()" [disabled]="dhlSaving || dhlTesting">
                    {{ 'common.cancel' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!--  TAB 2: PARTNER-MARKTPLATZ                       -->
      <!-- ══════════════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'marketplace'" class="tab-content">

        <!-- Filter-Leiste -->
        <div class="filter-bar">
          <input type="text" class="search-input" placeholder="🔍 Name oder Stadt suchen..."
                 [(ngModel)]="mpFilter.search" (input)="onFilterChange()" />

          <select class="filter-select" [(ngModel)]="mpFilter.region" (change)="onFilterChange()">
            <option [ngValue]="undefined">Alle Regionen</option>
            <option *ngFor="let r of moroccoRegions" [ngValue]="r.code">{{ r.label }}</option>
          </select>

          <select class="filter-select" [(ngModel)]="mpFilter.type" (change)="onFilterChange()">
            <option [ngValue]="undefined">Firma & Einzelperson</option>
            <option value="COMPANY">Nur Firmen</option>
            <option value="INDIVIDUAL">Nur Einzelpersonen</option>
          </select>

          <select class="filter-select" [(ngModel)]="mpFilter.service" (change)="onFilterChange()">
            <option [ngValue]="undefined">Alle Services</option>
            <option *ngFor="let s of serviceTypes" [value]="s.code">{{ s.icon }} {{ s.label }}</option>
          </select>

          <label class="filter-check">
            <input type="checkbox" [(ngModel)]="mpFilter.verified" (change)="onFilterChange()" />
            ✅ Nur Verifizierte
          </label>
        </div>

        <div *ngIf="mpLoading" class="loading-box"><div class="spinner"></div></div>

        <!-- Partner-Karten -->
        <div *ngIf="!mpLoading" class="partner-grid">
          <div *ngFor="let partner of marketplacePartners" class="partner-card" (click)="openPartnerDetail(partner)">

            <!-- Header -->
            <div class="partner-top">
              <div class="partner-logo" *ngIf="partner.logoUrl"><img [src]="partner.logoUrl" /></div>
              <div class="partner-logo placeholder" *ngIf="!partner.logoUrl">
                {{ (partner.companyName || partner.contactName).charAt(0) }}
              </div>
              <div class="partner-name-block">
                <h4>
                  {{ partner.companyName || partner.contactName }}
                  <span class="verified-badge" *ngIf="partner.verified" title="Verifiziert">✅</span>
                </h4>
                <span class="partner-type">{{ partner.type === 'COMPANY' ? '🏢 Firma' : '👤 Einzelperson' }}</span>
              </div>
              <div class="partner-rating" *ngIf="partner.totalReviews > 0">
                <span class="stars">{{ renderStars(partner.averageRating) }}</span>
                <span class="rating-num">{{ partner.averageRating.toFixed(1) }}</span>
                <span class="review-count">({{ partner.totalReviews }})</span>
              </div>
              <span class="no-review" *ngIf="partner.totalReviews === 0">Noch keine Bewertungen</span>
            </div>

            <!-- Services -->
            <div class="partner-services">
              <span *ngFor="let s of partner.services.slice(0,4)" class="service-chip">
                {{ getServiceIcon(s) }} {{ getServiceLabel(s) }}
              </span>
              <span *ngIf="partner.services.length > 4" class="service-chip more">+{{ partner.services.length - 4 }}</span>
            </div>

            <!-- Coverage -->
            <div class="partner-coverage">
              <span *ngIf="partner.coverage.morocco" class="coverage-tag morocco">🇲🇦 Marokko</span>
              <span *ngIf="partner.coverage.international" class="coverage-tag intl">🌍 International</span>
              <span class="coverage-regions" *ngIf="partner.coverage.moroccoRegions.length">
                {{ partner.coverage.moroccoRegions.length }} Region(en)
              </span>
            </div>

            <!-- Bottom -->
            <div class="partner-bottom">
              <div class="price-block" *ngIf="partner.basePriceLocal">
                <span class="price-label">Ab</span>
                <span class="price-value">{{ partner.basePriceLocal }} {{ partner.currency }}</span>
              </div>
              <div class="delivery-count" *ngIf="partner.completedDeliveries > 0">
                📦 {{ partner.completedDeliveries }} Lieferungen
              </div>
            </div>
          </div>

          <div *ngIf="marketplacePartners.length === 0 && !mpLoading" class="empty-state-big">
            <span class="empty-icon">🔍</span>
            <h3>Keine Partner gefunden</h3>
            <p>Versuchen Sie andere Filterkriterien oder werden Sie selbst Lieferpartner!</p>
            <button class="btn btn-primary" (click)="activeTab = 'profile'">Profil anlegen →</button>
          </div>
        </div>

        <!-- Partner-Detail-Modal -->
        <div class="modal-overlay" *ngIf="selectedPartner" (click)="selectedPartner = null">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="selectedPartner = null">✕</button>

            <div class="modal-partner-header">
              <div class="partner-logo big" *ngIf="selectedPartner.logoUrl"><img [src]="selectedPartner.logoUrl" /></div>
              <div class="partner-logo big placeholder" *ngIf="!selectedPartner.logoUrl">
                {{ (selectedPartner.companyName || selectedPartner.contactName).charAt(0) }}
              </div>
              <div>
                <h2>{{ selectedPartner.companyName || selectedPartner.contactName }}</h2>
                <p class="text-muted">{{ selectedPartner.type === 'COMPANY' ? '🏢 Unternehmen' : '👤 Einzelperson' }}
                  <span *ngIf="selectedPartner.verified"> · ✅ Verifiziert</span>
                </p>
              </div>
            </div>

            <p class="partner-desc">{{ selectedPartner.description }}</p>

            <div class="detail-grid">
              <div class="detail-item" *ngIf="selectedPartner.phone">
                <span class="detail-label">📞 Telefon</span>
                <a [href]="'tel:' + selectedPartner.phone">{{ selectedPartner.phone }}</a>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.whatsapp">
                <span class="detail-label">💬 WhatsApp</span>
                <a [href]="'https://wa.me/' + selectedPartner.whatsapp" target="_blank">{{ selectedPartner.whatsapp }}</a>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.email">
                <span class="detail-label">✉️ E-Mail</span>
                <a [href]="'mailto:' + selectedPartner.email">{{ selectedPartner.email }}</a>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.website">
                <span class="detail-label">🌐 Website</span>
                <a [href]="selectedPartner.website" target="_blank">{{ selectedPartner.website }}</a>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.ice">
                <span class="detail-label">🏛️ ICE</span>
                <span>{{ selectedPartner.ice }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.basePriceLocal">
                <span class="detail-label">💰 Preis lokal</span>
                <span>{{ selectedPartner.basePriceLocal }} {{ selectedPartner.currency }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.basePriceNational">
                <span class="detail-label">💰 Preis national</span>
                <span>{{ selectedPartner.basePriceNational }} {{ selectedPartner.currency }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.estimatedLocalHours">
                <span class="detail-label">⏱️ Lokal</span>
                <span>{{ selectedPartner.estimatedLocalHours }}h</span>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.estimatedNationalDays">
                <span class="detail-label">📅 National</span>
                <span>{{ selectedPartner.estimatedNationalDays }} Tage</span>
              </div>
              <div class="detail-item" *ngIf="selectedPartner.maxWeightKg">
                <span class="detail-label">⚖️ Max. Gewicht</span>
                <span>{{ selectedPartner.maxWeightKg }} kg</span>
              </div>
            </div>

            <!-- Bewertungen -->
            <div class="reviews-section">
              <h3>Bewertungen</h3>
              <div *ngIf="partnerReviews.length > 0">
                <div *ngFor="let rev of partnerReviews" class="review-item">
                  <div class="review-head">
                    <strong>{{ rev.reviewerStoreName }}</strong>
                    <span class="stars small">{{ renderStars(rev.rating) }}</span>
                    <span class="review-date">{{ parseDate(rev.createdAt) | date:'dd.MM.yyyy' }}</span>
                  </div>
                  <p class="review-comment">{{ rev.comment }}</p>
                  <div class="review-scores">
                    <span>Zuverlässig: {{ rev.reliability }}/5</span>
                    <span>Schnell: {{ rev.speed }}/5</span>
                    <span>Kommunikation: {{ rev.communication }}/5</span>
                    <span>Preis/Leistung: {{ rev.priceQuality }}/5</span>
                  </div>
                </div>
              </div>
              <p *ngIf="partnerReviews.length === 0" class="text-muted">Noch keine Bewertungen vorhanden.</p>

              <!-- Bewertung abgeben -->
              <div class="add-review" *ngIf="canReview">
                <h4>Bewertung abgeben</h4>
                <div class="rating-inputs">
                  <div class="rating-row">
                    <label>Gesamt</label>
                    <div class="star-select">
                      <span *ngFor="let s of [1,2,3,4,5]" (click)="newReview.rating = s"
                            [class.active]="newReview.rating >= s">★</span>
                    </div>
                  </div>
                  <div class="rating-row">
                    <label>Zuverlässigkeit</label>
                    <div class="star-select"><span *ngFor="let s of [1,2,3,4,5]" (click)="newReview.reliability = s" [class.active]="newReview.reliability >= s">★</span></div>
                  </div>
                  <div class="rating-row">
                    <label>Geschwindigkeit</label>
                    <div class="star-select"><span *ngFor="let s of [1,2,3,4,5]" (click)="newReview.speed = s" [class.active]="newReview.speed >= s">★</span></div>
                  </div>
                  <div class="rating-row">
                    <label>Kommunikation</label>
                    <div class="star-select"><span *ngFor="let s of [1,2,3,4,5]" (click)="newReview.communication = s" [class.active]="newReview.communication >= s">★</span></div>
                  </div>
                  <div class="rating-row">
                    <label>Preis/Leistung</label>
                    <div class="star-select"><span *ngFor="let s of [1,2,3,4,5]" (click)="newReview.priceQuality = s" [class.active]="newReview.priceQuality >= s">★</span></div>
                  </div>
                </div>
                <textarea class="form-control" [(ngModel)]="newReview.comment" rows="3" placeholder="Ihre Erfahrung mit diesem Partner..."></textarea>
                <button class="btn btn-primary" (click)="submitReview()" [disabled]="!newReview.rating || !newReview.comment || submittingReview">
                  {{ submittingReview ? 'Senden...' : 'Bewertung senden' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!--  TAB 3: MEIN LIEFERPROFIL (Portfolio anlegen)    -->
      <!-- ══════════════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'profile'" class="tab-content">

        <div *ngIf="profileLoading" class="loading-box"><div class="spinner"></div></div>

        <div *ngIf="!profileLoading" class="profile-form-container">

          <!-- Info-Banner -->
          <div class="info-banner" *ngIf="!myProfile">
            <span class="info-icon">🚀</span>
            <div>
              <h3>Werden Sie Lieferpartner auf markt.ma</h3>
              <p>Erstellen Sie Ihr Portfolio, damit Store-Betreiber Sie als Versandpartner finden und beauftragen können. Ihre Bewertungen und Statistiken werden öffentlich sichtbar.</p>
            </div>
          </div>

          <div class="info-banner success" *ngIf="myProfile?.active">
            <span class="info-icon">✅</span>
            <div>
              <h3>Ihr Profil ist aktiv</h3>
              <p>{{ myProfile!.totalReviews }} Bewertungen · {{ myProfile!.completedDeliveries }} Lieferungen · ⭐ {{ myProfile!.averageRating.toFixed(1) }}</p>
            </div>
            <button class="btn btn-outline-danger btn-sm" (click)="toggleProfileActive(false)">Deaktivieren</button>
          </div>

          <div class="info-banner warn" *ngIf="myProfile && !myProfile.active">
            <span class="info-icon">⏸️</span>
            <div>
              <h3>Ihr Profil ist pausiert</h3>
              <p>Store-Betreiber können Sie nicht finden. Aktivieren Sie es wieder, um sichtbar zu werden.</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="toggleProfileActive(true)">Aktivieren</button>
          </div>

          <form class="profile-form" (ngSubmit)="saveProfile()">

            <!-- Typ -->
            <div class="form-section">
              <h4>Art des Partners</h4>
              <div class="type-selector">
                <div class="type-option" [class.active]="profileForm.type === 'COMPANY'" (click)="profileForm.type = 'COMPANY'">
                  <span class="type-icon">🏢</span>
                  <strong>Unternehmen</strong>
                  <small>Logistikfirma, Transportunternehmen, Kurierdienst</small>
                </div>
                <div class="type-option" [class.active]="profileForm.type === 'INDIVIDUAL'" (click)="profileForm.type = 'INDIVIDUAL'">
                  <span class="type-icon">👤</span>
                  <strong>Einzelperson</strong>
                  <small>Selbstständiger Kurier, Freelance-Fahrer</small>
                </div>
              </div>
            </div>

            <!-- Kontaktdaten -->
            <div class="form-section">
              <h4>Kontaktdaten</h4>
              <div class="form-grid">
                <div class="form-group" *ngIf="profileForm.type === 'COMPANY'">
                  <label>Firmenname *</label>
                  <input type="text" class="form-control" [(ngModel)]="profileForm.companyName" name="companyName" placeholder="z.B. Atlas Logistics SARL" />
                </div>
                <div class="form-group">
                  <label>Ansprechpartner *</label>
                  <input type="text" class="form-control" [(ngModel)]="profileForm.contactName" name="contactName" required placeholder="Vor- und Nachname" />
                </div>
                <div class="form-group">
                  <label>E-Mail *</label>
                  <input type="email" class="form-control" [(ngModel)]="profileForm.email" name="email" required />
                </div>
                <div class="form-group">
                  <label>Telefon *</label>
                  <input type="tel" class="form-control" [(ngModel)]="profileForm.phone" name="phone" required placeholder="+212 6XX XXX XXX" />
                </div>
                <div class="form-group">
                  <label>WhatsApp</label>
                  <input type="tel" class="form-control" [(ngModel)]="profileForm.whatsapp" name="whatsapp" placeholder="+212 6XX XXX XXX" />
                </div>
                <div class="form-group">
                  <label>Website</label>
                  <input type="url" class="form-control" [(ngModel)]="profileForm.website" name="website" placeholder="https://..." />
                </div>
              </div>
            </div>

            <!-- Geschäftsdaten -->
            <div class="form-section" *ngIf="profileForm.type === 'COMPANY'">
              <h4>🏛️ Geschäftsdaten (Marokko)</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>ICE (Identifiant Commun)</label>
                  <input type="text" class="form-control" [(ngModel)]="profileForm.ice" name="ice" placeholder="15 Ziffern" />
                </div>
                <div class="form-group">
                  <label>Registre de Commerce</label>
                  <input type="text" class="form-control" [(ngModel)]="profileForm.rc" name="rc" />
                </div>
              </div>
            </div>

            <!-- Beschreibung -->
            <div class="form-section">
              <h4>Beschreibung</h4>
              <textarea class="form-control" [(ngModel)]="profileForm.description" name="description" rows="4"
                        required placeholder="Beschreiben Sie Ihren Service, Ihre Erfahrung und was Sie von anderen unterscheidet..."></textarea>
            </div>

            <!-- Services -->
            <div class="form-section">
              <h4>Services</h4>
              <div class="chip-selector">
                <div *ngFor="let s of serviceTypes"
                     class="chip" [class.active]="profileForm.services.includes(s.code)"
                     (click)="toggleChip(profileForm.services, s.code)">
                  {{ s.icon }} {{ s.label }}
                </div>
              </div>
            </div>

            <!-- Fahrzeuge -->
            <div class="form-section">
              <h4>Fahrzeuge</h4>
              <div class="chip-selector">
                <div *ngFor="let v of vehicleTypes"
                     class="chip" [class.active]="profileForm.vehicleTypes.includes(v.code)"
                     (click)="toggleChip(profileForm.vehicleTypes, v.code)">
                  {{ v.icon }} {{ v.label }}
                </div>
              </div>
            </div>

            <!-- Abdeckung -->
            <div class="form-section">
              <h4>🗺️ Abdeckungsgebiet</h4>
              <label class="check-label">
                <input type="checkbox" [(ngModel)]="profileForm.coverage.morocco" name="covMorocco" />
                🇲🇦 Marokko
              </label>
              <div class="region-chips" *ngIf="profileForm.coverage.morocco">
                <div *ngFor="let r of moroccoRegions"
                     class="chip small" [class.active]="profileForm.coverage.moroccoRegions.includes(r.code)"
                     (click)="toggleChip(profileForm.coverage.moroccoRegions, r.code)">
                  {{ r.label }}
                </div>
              </div>
              <label class="check-label mt">
                <input type="checkbox" [(ngModel)]="profileForm.coverage.international" name="covIntl" />
                🌍 International
              </label>
              <input *ngIf="profileForm.coverage.international" type="text" class="form-control mt-sm"
                     [(ngModel)]="intlCountriesStr" name="intlCountries"
                     placeholder="Länderkürzel komma-getrennt: FR, ES, DE, BE" />
            </div>

            <!-- Preise -->
            <div class="form-section">
              <h4>💰 Preise</h4>
              <div class="form-grid cols-3">
                <div class="form-group">
                  <label>Lokal (Stadt)</label>
                  <div class="input-addon">
                    <input type="number" class="form-control" [(ngModel)]="profileForm.basePriceLocal" name="priceLocal" min="0" step="0.5" />
                    <span class="addon">{{ profileForm.currency }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>National</label>
                  <div class="input-addon">
                    <input type="number" class="form-control" [(ngModel)]="profileForm.basePriceNational" name="priceNational" min="0" step="0.5" />
                    <span class="addon">{{ profileForm.currency }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>International</label>
                  <div class="input-addon">
                    <input type="number" class="form-control" [(ngModel)]="profileForm.basePriceInternational" name="priceIntl" min="0" step="0.5" />
                    <span class="addon">{{ profileForm.currency }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label>Währung</label>
                  <select class="form-control" [(ngModel)]="profileForm.currency" name="currency">
                    <option value="MAD">MAD (Dirham)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nachnahme-Gebühr (%)</label>
                  <input type="number" class="form-control" [(ngModel)]="profileForm.codFeePercent" name="codFee" min="0" max="100" step="0.5" />
                </div>
                <div class="form-group">
                  <label>Max. Gewicht (kg)</label>
                  <input type="number" class="form-control" [(ngModel)]="profileForm.maxWeightKg" name="maxWeight" min="0" />
                </div>
              </div>
            </div>

            <!-- Lieferzeiten -->
            <div class="form-section">
              <h4>⏱️ Lieferzeiten</h4>
              <div class="form-grid cols-3">
                <div class="form-group">
                  <label>Lokal (Stunden)</label>
                  <input type="number" class="form-control" [(ngModel)]="profileForm.estimatedLocalHours" name="etaLocal" min="0" />
                </div>
                <div class="form-group">
                  <label>National (Tage)</label>
                  <input type="number" class="form-control" [(ngModel)]="profileForm.estimatedNationalDays" name="etaNational" min="0" />
                </div>
                <div class="form-group">
                  <label>International (Tage)</label>
                  <input type="number" class="form-control" [(ngModel)]="profileForm.estimatedInternationalDays" name="etaIntl" min="0" />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-lg" [disabled]="savingProfile">
                {{ savingProfile ? 'Speichern...' : (myProfile ? 'Profil aktualisieren' : 'Profil erstellen') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delivery-page { padding: 1.5rem 2rem; max-width: 1300px; margin: 0 auto; }

    /* ─── Tabs ─── */
    .tab-bar { display: flex; gap: 0.25rem; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; }
    .tab {
      padding: 0.75rem 1.25rem; border: none; background: none; font-weight: 600; font-size: 0.9rem;
      color: #6b7280; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.4rem;
    }
    .tab:hover { color: #667eea; }
    .tab.active { color: #667eea; border-bottom-color: #667eea; }
    .tab-count {
      background: #667eea; color: white; font-size: 0.7rem; padding: 0.1rem 0.5rem;
      border-radius: 10px; font-weight: 700;
    }
    .tab-content { animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ─── Loading / Empty ─── */
    .loading-box { display: flex; align-items: center; gap: 1rem; justify-content: center; padding: 3rem; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-hint { color: #9ca3af; font-size: 0.85rem; padding: 1rem 0; text-align: center; }
    .empty-state-big { text-align: center; padding: 4rem 2rem; }
    .empty-icon { font-size: 3rem; }
    .empty-state-big h3 { margin: 1rem 0 0.5rem; }
    .empty-state-big p { color: #6b7280; margin-bottom: 1.25rem; }

    /* ─── Settings Tab ─── */
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1rem; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-head h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .kv-list { display: flex; flex-direction: column; gap: 0; }
    .kv { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; }
    .kv:last-child { border-bottom: none; }
    .list-item { padding: 0.65rem 0; border-bottom: 1px solid #f3f4f6; }
    .list-item:last-child { border-bottom: none; }
    .list-item-main { display: flex; align-items: center; gap: 0.5rem; }
    .text-muted { color: #9ca3af; font-size: 0.78rem; }

    /* ─── Badges ─── */
    .badge { padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.72rem; font-weight: 600; background: #f3f4f6; color: #6b7280; }
    .badge.badge-on { background: #dcfce7; color: #166534; }
    .badge.badge-sm { padding: 0.15rem 0.45rem; font-size: 0.68rem; }

    /* ─── Buttons ─── */
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5568d3; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-outline { border: 1.5px solid #667eea; background: none; color: #667eea; }
    .btn-outline:hover { background: #667eea; color: white; }
    .btn-outline-danger { border: 1.5px solid #ef4444; background: none; color: #ef4444; }
    .btn-outline-danger:hover { background: #ef4444; color: white; }
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.78rem; }
    .btn-lg { padding: 0.75rem 2rem; font-size: 1rem; }

    /* ─── Filter Bar ─── */
    .filter-bar { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.25rem; align-items: center; }
    .search-input {
      flex: 1; min-width: 200px; padding: 0.55rem 0.85rem; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 0.88rem;
    }
    .search-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .filter-select { padding: 0.55rem 0.6rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.82rem; background: white; }
    .filter-check { display: flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 500; cursor: pointer; white-space: nowrap; }

    /* ─── Partner Grid ─── */
    .partner-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
    .partner-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.25rem;
      cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 0.75rem;
    }
    .partner-card:hover { border-color: #667eea; box-shadow: 0 4px 20px rgba(102,126,234,0.12); transform: translateY(-2px); }
    .partner-top { display: flex; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; }
    .partner-logo { width: 48px; height: 48px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
    .partner-logo img { width: 100%; height: 100%; object-fit: cover; }
    .partner-logo.placeholder { font-weight: 700; font-size: 1.25rem; color: #667eea; background: #667eea12; }
    .partner-logo.big { width: 64px; height: 64px; }
    .partner-name-block { flex: 1; min-width: 0; }
    .partner-name-block h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #1f2937; }
    .partner-type { font-size: 0.75rem; color: #9ca3af; }
    .verified-badge { font-size: 0.85rem; }
    .partner-rating { display: flex; align-items: center; gap: 0.3rem; margin-left: auto; }
    .stars { color: #f59e0b; font-size: 0.9rem; letter-spacing: 1px; }
    .stars.small { font-size: 0.8rem; }
    .rating-num { font-weight: 700; font-size: 0.9rem; color: #1f2937; }
    .review-count { font-size: 0.75rem; color: #9ca3af; }
    .no-review { font-size: 0.75rem; color: #d1d5db; margin-left: auto; }

    .partner-services { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .service-chip { background: #f3f4f6; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.72rem; font-weight: 500; color: #374151; }
    .service-chip.more { background: #667eea15; color: #667eea; font-weight: 600; }

    .partner-coverage { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .coverage-tag { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 6px; }
    .coverage-tag.morocco { background: #dcfce7; color: #166534; }
    .coverage-tag.intl { background: #dbeafe; color: #1e40af; }
    .coverage-regions { font-size: 0.72rem; color: #9ca3af; }

    .partner-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid #f3f4f6; }
    .price-label { font-size: 0.7rem; color: #9ca3af; }
    .price-value { font-weight: 700; font-size: 1rem; color: #667eea; }
    .delivery-count { font-size: 0.75rem; color: #6b7280; }

    /* ─── DHL Form ─── */
    .dhl-card { grid-column: span 2; max-width: none; }
    @media (max-width: 768px) { .dhl-card { grid-column: span 1; } }
    .dhl-form { display: flex; flex-direction: column; gap: 1.5rem; }
    .dhl-form .form-section { padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .dhl-form .form-section:first-of-type { border-top: none; padding-top: 0; }
    .dhl-form .form-section h4 { margin: 0 0 1rem; font-size: 0.95rem; font-weight: 600; color: #374151; }
    .dhl-form .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    .dhl-form .form-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .dhl-form .form-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .dhl-form .form-grid .col-span-2 { grid-column: span 2; }
    .dhl-form .form-group { display: flex; flex-direction: column; gap: 0.3rem; position: relative; }
    .dhl-form .form-group label { font-size: 0.78rem; font-weight: 600; color: #6b7280; }
    .dhl-form .form-control {
      width: 100%; padding: 0.55rem 0.8rem; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 0.88rem; box-sizing: border-box; transition: border-color 0.2s;
    }
    .dhl-form .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .dhl-form .btn-show-secret {
      position: absolute; right: 0.5rem; top: 2rem;
      background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0.25rem 0.5rem;
    }
    .dhl-form .checkbox-label {
      display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;
    }
    .dhl-form .form-actions { 
      display: flex; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; margin-top: 1rem;
    }
    @media (max-width: 768px) {
      .dhl-form .form-grid { grid-template-columns: 1fr; }
      .dhl-form .form-grid.cols-3,
      .dhl-form .form-grid.cols-4 { grid-template-columns: 1fr; }
      .dhl-form .form-grid .col-span-2 { grid-column: span 1; }
    }

    /* ─── Modal ─── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 2rem; }
    .modal-box {
      background: white; border-radius: 16px; padding: 2rem; max-width: 700px; width: 100%;
      max-height: 85vh; overflow-y: auto; position: relative;
    }
    .modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #9ca3af; }
    .modal-partner-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .modal-partner-header h2 { margin: 0; font-size: 1.3rem; }
    .partner-desc { color: #4b5563; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.25rem; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-label { font-size: 0.72rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.03em; }
    .detail-item a, .detail-item span { font-size: 0.88rem; color: #1f2937; }
    .detail-item a { color: #667eea; text-decoration: none; }
    .detail-item a:hover { text-decoration: underline; }

    /* ─── Reviews ─── */
    .reviews-section { border-top: 1px solid #e5e7eb; padding-top: 1.25rem; }
    .reviews-section h3 { margin: 0 0 1rem; font-size: 1.1rem; }
    .review-item { padding: 0.85rem 0; border-bottom: 1px solid #f3f4f6; }
    .review-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
    .review-date { font-size: 0.72rem; color: #9ca3af; margin-left: auto; }
    .review-comment { font-size: 0.85rem; color: #4b5563; margin: 0.25rem 0 0.4rem; }
    .review-scores { display: flex; gap: 0.75rem; font-size: 0.72rem; color: #9ca3af; }
    .add-review { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .add-review h4 { margin: 0 0 0.75rem; }
    .rating-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; }
    .rating-row { display: flex; align-items: center; gap: 0.5rem; }
    .rating-row label { font-size: 0.8rem; font-weight: 500; color: #6b7280; min-width: 110px; }
    .star-select span { cursor: pointer; font-size: 1.2rem; color: #d1d5db; transition: color 0.15s; }
    .star-select span.active { color: #f59e0b; }

    /* ─── Profile Form ─── */
    .profile-form-container { max-width: 900px; }
    .info-banner {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
      background: #667eea0a; border: 1px solid #667eea30; border-radius: 12px; margin-bottom: 1.5rem;
    }
    .info-banner.success { background: #dcfce710; border-color: #86efac; }
    .info-banner.warn { background: #fef3c710; border-color: #fbbf24; }
    .info-icon { font-size: 2rem; flex-shrink: 0; }
    .info-banner h3 { margin: 0; font-size: 1rem; font-weight: 600; }
    .info-banner p { margin: 0.2rem 0 0; font-size: 0.82rem; color: #6b7280; }
    .profile-form { display: flex; flex-direction: column; gap: 1.75rem; }
    .form-section h4 { margin: 0 0 0.85rem; font-size: 0.95rem; font-weight: 600; color: #374151; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
    .form-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .form-group label { font-size: 0.78rem; font-weight: 600; color: #6b7280; }
    .form-control {
      width: 100%; padding: 0.55rem 0.8rem; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 0.88rem; box-sizing: border-box; transition: border-color 0.2s;
    }
    .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .input-addon { display: flex; align-items: stretch; }
    .input-addon .form-control { border-top-right-radius: 0; border-bottom-right-radius: 0; }
    .addon {
      padding: 0 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-left: none;
      border-radius: 0 8px 8px 0; display: flex; align-items: center; font-size: 0.78rem; font-weight: 600; color: #6b7280;
    }
    .type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .type-option {
      border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; text-align: center;
      cursor: pointer; transition: all 0.2s;
    }
    .type-option:hover { border-color: #667eea; }
    .type-option.active { border-color: #667eea; background: #667eea08; box-shadow: 0 0 0 3px rgba(102,126,234,0.08); }
    .type-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
    .type-option strong { display: block; margin-bottom: 0.2rem; }
    .type-option small { font-size: 0.75rem; color: #9ca3af; }

    .chip-selector { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip {
      padding: 0.4rem 0.85rem; border: 1.5px solid #e5e7eb; border-radius: 20px;
      font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s; user-select: none;
    }
    .chip:hover { border-color: #667eea; }
    .chip.active { background: #667eea; color: white; border-color: #667eea; }
    .chip.small { padding: 0.3rem 0.65rem; font-size: 0.72rem; }
    .region-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; padding-left: 1.5rem; }
    .check-label { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; cursor: pointer; }
    .mt { margin-top: 1rem; }
    .mt-sm { margin-top: 0.5rem; }

    .form-actions { padding-top: 0.5rem; border-top: 1px solid #e5e7eb; }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .delivery-page { padding: 1rem; }
      .tab-bar { overflow-x: auto; }
      .filter-bar { flex-direction: column; }
      .partner-grid, .settings-grid { grid-template-columns: 1fr; }
      .form-grid, .form-grid.cols-3 { grid-template-columns: 1fr; }
      .type-selector { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      .rating-inputs { grid-template-columns: 1fr; }
      .modal-box { margin: 1rem; padding: 1.25rem; }
    }
  `]
})
export class DeliveryManagementComponent implements OnInit, OnDestroy {
  // ─── General ───
  storeId!: number;
  activeTab: 'settings' | 'marketplace' | 'profile' = 'settings';
  breadcrumbs: BreadcrumbItem[] = [];
  private destroy$ = new Subject<void>();

  // ─── Tab 1: Mein Versand ───
  settings: DeliverySettings | null = null;
  providers: DeliveryProvider[] = [];
  zones: DeliveryZone[] = [];
  loading = true;
  error: string | null = null;

  // DHL Form
  dhlExpanded = false;
  dhlSaving = false;
  dhlTesting = false; // NEW: For connection test
  dhlAdvancedExpanded = false; // NEW: For advanced API credentials collapse
  showDhlClientSecret = false;
  showDhlPassword = false;
  dhlForm: any = {
    dhlEnabled: false,
    dhlEnvironment: 'SANDBOX',
    dhlClientId: '',
    dhlClientSecret: '',
    dhlUsername: '',
    dhlPassword: '',
    dhlBillingNumber: '',
    dhlShipperName: '',
    dhlShipperStreet: '',
    dhlShipperHouseNumber: '',
    dhlShipperPostalCode: '',
    dhlShipperCity: '',
    dhlShipperCountry: 'DE',
    dhlShipperEmail: '',
    dhlShipperPhone: '',
    dhlDefaultWeightGrams: 500,
    dhlDefaultLengthMm: 300,
    dhlDefaultWidthMm: 200,
    dhlDefaultHeightMm: 150
  };
  private originalDhlSecrets = { clientSecret: '', password: '' };

  // ─── Tab 2: Marktplatz ───
  marketplacePartners: DeliveryPartnerProfile[] = [];
  mpLoading = false;
  mpFilter: DeliveryPartnerFilter = {};
  selectedPartner: DeliveryPartnerProfile | null = null;
  partnerReviews: DeliveryPartnerReview[] = [];
  canReview = false;
  submittingReview = false;
  newReview = { rating: 0, comment: '', reliability: 0, speed: 0, communication: 0, priceQuality: 0 };

  // ─── Tab 3: Mein Profil ───
  myProfile: DeliveryPartnerProfile | null = null;
  profileLoading = false;
  savingProfile = false;
  intlCountriesStr = '';
  profileForm: CreateDeliveryPartnerRequest & { vehicleTypes: string[] } = this.getEmptyProfileForm();

  // ─── Helpers (static) ───
  moroccoRegions = DeliveryPartnerService.MOROCCO_REGIONS;
  serviceTypes = DeliveryPartnerService.SERVICE_TYPES;
  vehicleTypes = DeliveryPartnerService.VEHICLE_TYPES;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsService: DeliverySettingsService,
    private providersService: DeliveryProvidersService,
    private zonesService: DeliveryZonesService,
    private partnerService: DeliveryPartnerService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Store-ID extrahieren (3-stufig)
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) id = this.route.parent.snapshot.paramMap.get('id');
    if (!id) { const m = this.router.url.match(/\/stores\/(\d+)/); if (m) id = m[1]; }

    if (id && !isNaN(Number(id))) {
      this.storeId = Number(id);
      this.loadStoreData();
    } else {
      this.error = 'Keine Store-ID gefunden';
      this.loading = false;
    }

    this.breadcrumbs = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'Lieferung & Logistik', icon: '🚚' }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════
  //  TAB 1: MEIN VERSAND
  // ══════════════════════════════════════════════════

  loadStoreData(): void {
    this.loading = true;
    forkJoin({
      settings: this.settingsService.getDeliverySettings(this.storeId).pipe(catchError(() => of(null))),
      providers: this.providersService.getProviders(this.storeId).pipe(catchError(() => of([]))),
      zones: this.zonesService.getZones(this.storeId).pipe(catchError(() => of([])))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.settings = data.settings;
        this.providers = data.providers;
        this.zones = data.zones;
        this.loadDhlFormFromSettings(data.settings);
        this.loading = false;
      },
      error: () => {
        this.error = 'Fehler beim Laden der Liefereinstellungen';
        this.loading = false;
      }
    });
  }

  // ══════════════════════════════════════════════════
  //  DHL METHODS
  // ══════════════════════════════════════════════════

  loadDhlFormFromSettings(settings: any): void {
    if (!settings) return;
    
    // Load all DHL fields from settings
    this.dhlForm = {
      dhlEnabled: settings.dhlEnabled || false,
      dhlEnvironment: settings.dhlEnvironment || 'SANDBOX',
      dhlClientId: settings.dhlClientId || '',
      dhlClientSecret: settings.dhlClientSecret || '', // Will be '********' if secret exists
      dhlUsername: settings.dhlUsername || '',
      dhlPassword: settings.dhlPassword || '', // Will be '********' if secret exists
      dhlBillingNumber: settings.dhlBillingNumber || '',
      dhlShipperName: settings.dhlShipperName || '',
      dhlShipperStreet: settings.dhlShipperStreet || '',
      dhlShipperHouseNumber: settings.dhlShipperHouseNumber || '',
      dhlShipperPostalCode: settings.dhlShipperPostalCode || '',
      dhlShipperCity: settings.dhlShipperCity || '',
      dhlShipperCountry: settings.dhlShipperCountry || 'DE',
      dhlShipperEmail: settings.dhlShipperEmail || '',
      dhlShipperPhone: settings.dhlShipperPhone || '',
      dhlDefaultWeightGrams: settings.dhlDefaultWeightGrams || 500,
      dhlDefaultLengthMm: settings.dhlDefaultLengthMm || 300,
      dhlDefaultWidthMm: settings.dhlDefaultWidthMm || 200,
      dhlDefaultHeightMm: settings.dhlDefaultHeightMm || 150
    };

    // Remember if secrets were masked (so we don't send them back unchanged)
    this.originalDhlSecrets = {
      clientSecret: settings.dhlClientSecret || '',
      password: settings.dhlPassword || ''
    };
  }

  saveDhlSettings(): void {
    // Validation
    if (this.dhlForm.dhlEnabled) {
      if (!this.dhlForm.dhlBillingNumber) {
        this.toastService.error('Abrechnungsnummer ist erforderlich');
        return;
      }
      if (!this.dhlForm.dhlShipperName || !this.dhlForm.dhlShipperStreet || 
          !this.dhlForm.dhlShipperHouseNumber || !this.dhlForm.dhlShipperPostalCode || 
          !this.dhlForm.dhlShipperCity || !this.dhlForm.dhlShipperCountry) {
        this.toastService.error('Absenderadresse ist unvollständig');
        return;
      }
      if (!this.dhlForm.dhlDefaultWeightGrams || !this.dhlForm.dhlDefaultLengthMm || 
          !this.dhlForm.dhlDefaultWidthMm || !this.dhlForm.dhlDefaultHeightMm) {
        this.toastService.error('Standardpaket-Maße sind erforderlich');
        return;
      }
    }

    this.dhlSaving = true;

    // Build payload with secret handling
    const payload: any = { ...this.settings };
    Object.keys(this.dhlForm).forEach(key => {
      // Special handling for secrets: don't send if unchanged (still masked '********')
      if (key === 'dhlClientSecret') {
        if (this.dhlForm[key] !== this.originalDhlSecrets.clientSecret) {
          payload[key] = this.dhlForm[key]; // New value entered
        }
        // else: leave undefined or don't include (backend keeps existing)
      } else if (key === 'dhlPassword') {
        if (this.dhlForm[key] !== this.originalDhlSecrets.password) {
          payload[key] = this.dhlForm[key]; // New value entered
        }
        // else: leave undefined or don't include (backend keeps existing)
      } else {
        payload[key] = this.dhlForm[key];
      }
    });

    this.settingsService.updateDeliverySettings(this.storeId, payload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updated) => {
        this.settings = updated;
        this.loadDhlFormFromSettings(updated);
        this.toastService.success('DHL-Einstellungen gespeichert');
        this.dhlSaving = false;
        this.dhlExpanded = false;
        this.showDhlClientSecret = false;
        this.showDhlPassword = false;
      },
      error: (err) => {
        console.error('DHL save error:', err);
        this.toastService.error('Fehler beim Speichern der DHL-Einstellungen');
        this.dhlSaving = false;
      }
    });
  }

  cancelDhlEdit(): void {
    this.loadDhlFormFromSettings(this.settings);
    this.dhlExpanded = false;
    this.showDhlClientSecret = false;
    this.showDhlPassword = false;
  }

  /**
   * Test DHL Connection
   * Speichert zuerst Settings und testet dann die Verbindung
   */
  testDhlConnection(): void {
    // Validation (gleiche wie saveDhlSettings)
    if (this.dhlForm.dhlEnabled) {
      if (!this.dhlForm.dhlBillingNumber) {
        this.toastService.error('Abrechnungsnummer ist erforderlich');
        return;
      }
      if (!this.dhlForm.dhlShipperName || !this.dhlForm.dhlShipperStreet || 
          !this.dhlForm.dhlShipperHouseNumber || !this.dhlForm.dhlShipperPostalCode || 
          !this.dhlForm.dhlShipperCity || !this.dhlForm.dhlShipperCountry) {
        this.toastService.error('Absenderadresse ist unvollständig');
        return;
      }
      if (!this.dhlForm.dhlDefaultWeightGrams || !this.dhlForm.dhlDefaultLengthMm || 
          !this.dhlForm.dhlDefaultWidthMm || !this.dhlForm.dhlDefaultHeightMm) {
        this.toastService.error('Standardpaket-Maße sind erforderlich');
        return;
      }
    }

    this.dhlTesting = true;

    // 1. Erst Settings speichern
    const payload: any = { ...this.settings };
    Object.keys(this.dhlForm).forEach(key => {
      if (key === 'dhlClientSecret') {
        if (this.dhlForm[key] !== this.originalDhlSecrets.clientSecret) {
          payload[key] = this.dhlForm[key];
        }
      } else if (key === 'dhlPassword') {
        if (this.dhlForm[key] !== this.originalDhlSecrets.password) {
          payload[key] = this.dhlForm[key];
        }
      } else {
        payload[key] = this.dhlForm[key];
      }
    });

    this.settingsService.updateDeliverySettings(this.storeId, payload).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updated) => {
        this.settings = updated;
        this.loadDhlFormFromSettings(updated);
        
        // 2. Dann Connection Test
        this.settingsService.testDhlConnection(this.storeId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (testResult) => {
            this.dhlTesting = false;
            
            if (testResult.success) {
              // Detaillierte Success-Message
              const mode = this.getCredentialsSourceLabel(testResult.credentialsSource);
              const passwordStatus = testResult.passwordConfigured ? 
                this.translateKey('shipping.dhl.passwordConfigured') + ': ✅' : 
                this.translateKey('shipping.dhl.passwordConfigured') + ': ❌';
              
              this.toastService.success(
                `${this.translateKey('shipping.dhl.connectionSuccess')}\n\n` +
                `${mode}\n` +
                `${passwordStatus}`
              );
            } else {
              // Error mit messageKey
              const messageKey = testResult.messageKey || 'shipping.dhl.connectionFailed';
              this.toastService.error(this.translateKey(messageKey));
            }
          },
          error: (err) => {
            console.error('DHL connection test error:', err);
            this.dhlTesting = false;
            
            // Try to extract messageKey from error response
            const messageKey = err?.error?.messageKey || 'shipping.dhl.connectionFailed';
            this.toastService.error(this.translateKey(messageKey));
          }
        });
      },
      error: (err) => {
        console.error('DHL save error before test:', err);
        this.toastService.error('Fehler beim Speichern der DHL-Einstellungen');
        this.dhlTesting = false;
      }
    });
  }

  editSettingsInline(): void { this.toastService.info('Settings-Dialog öffnen (bestehende Dialog-Komponente)'); }
  addProviderInline(): void { this.toastService.info('Provider-Dialog öffnen (bestehende Dialog-Komponente)'); }
  addZoneInline(): void { this.toastService.info('Zone-Dialog öffnen (bestehende Dialog-Komponente)'); }

  // ══════════════════════════════════════════════════
  //  TAB 2: MARKTPLATZ
  // ══════════════════════════════════════════════════

  loadMarketplace(): void {
    this.mpLoading = true;
    this.partnerService.searchPartners(this.mpFilter).pipe(
      takeUntil(this.destroy$),
      catchError(() => of([]))
    ).subscribe(partners => {
      this.marketplacePartners = partners;
      this.mpLoading = false;
    });
  }

  onFilterChange(): void {
    // Sync internationale Länder
    if (this.mpFilter.search !== undefined || this.mpFilter.region || this.mpFilter.type || this.mpFilter.service) {
      this.loadMarketplace();
    }
  }

  openPartnerDetail(partner: DeliveryPartnerProfile): void {
    this.selectedPartner = partner;
    this.partnerReviews = [];
    this.canReview = this.authService.isAuthenticated();
    this.resetNewReview();

    this.partnerService.getPartnerReviews(partner.id).pipe(
      takeUntil(this.destroy$),
      catchError(() => of([]))
    ).subscribe(reviews => this.partnerReviews = reviews);
  }

  submitReview(): void {
    if (!this.selectedPartner || !this.newReview.rating || !this.newReview.comment) return;
    this.submittingReview = true;

    this.partnerService.createReview(this.selectedPartner.id, this.newReview).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (review) => {
        this.partnerReviews.unshift(review);
        this.toastService.success('Bewertung gespeichert!');
        this.resetNewReview();
        this.submittingReview = false;
      },
      error: () => {
        this.toastService.error('Fehler beim Speichern der Bewertung');
        this.submittingReview = false;
      }
    });
  }

  private resetNewReview(): void {
    this.newReview = { rating: 0, comment: '', reliability: 0, speed: 0, communication: 0, priceQuality: 0 };
  }

  // ══════════════════════════════════════════════════
  //  TAB 3: MEIN PROFIL
  // ══════════════════════════════════════════════════

  loadMyProfile(): void {
    this.profileLoading = true;
    this.partnerService.getMyProfile().pipe(
      takeUntil(this.destroy$),
      catchError(() => of(null))
    ).subscribe(profile => {
      this.myProfile = profile;
      if (profile) {
        this.profileForm = {
          type: profile.type,
          companyName: profile.companyName,
          contactName: profile.contactName,
          email: profile.email,
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          website: profile.website,
          ice: profile.ice,
          rc: profile.rc,
          taxId: profile.taxId,
          description: profile.description,
          services: [...profile.services],
          vehicleTypes: [...(profile.vehicleTypes || [])],
          coverage: {
            morocco: profile.coverage.morocco,
            moroccoRegions: [...profile.coverage.moroccoRegions],
            international: profile.coverage.international,
            internationalCountries: [...profile.coverage.internationalCountries]
          },
          basePriceLocal: profile.basePriceLocal,
          basePriceNational: profile.basePriceNational,
          basePriceInternational: profile.basePriceInternational,
          currency: profile.currency,
          codFeePercent: profile.codFeePercent,
          estimatedLocalHours: profile.estimatedLocalHours,
          estimatedNationalDays: profile.estimatedNationalDays,
          estimatedInternationalDays: profile.estimatedInternationalDays,
          maxWeightKg: profile.maxWeightKg
        };
        this.intlCountriesStr = profile.coverage.internationalCountries.join(', ');
      }
      this.profileLoading = false;
    });
  }

  saveProfile(): void {
    // Sync internationale Länder
    this.profileForm.coverage.internationalCountries =
      this.intlCountriesStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    this.savingProfile = true;
    const op = this.myProfile
      ? this.partnerService.updateProfile(this.profileForm)
      : this.partnerService.createProfile(this.profileForm);

    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        this.myProfile = profile;
        this.toastService.success(this.myProfile ? 'Profil aktualisiert!' : 'Profil erstellt!');
        this.savingProfile = false;
      },
      error: () => {
        this.toastService.error('Fehler beim Speichern des Profils');
        this.savingProfile = false;
      }
    });
  }

  toggleProfileActive(active: boolean): void {
    this.partnerService.toggleActive(active).pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        this.myProfile = profile;
        this.toastService.success(active ? 'Profil aktiviert' : 'Profil pausiert');
      },
      error: () => this.toastService.error('Fehler beim Ändern des Status')
    });
  }

  // ══════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════

  renderStars(rating: number): string {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  getServiceIcon(code: string): string {
    return this.serviceTypes.find(s => s.code === code)?.icon || '📦';
  }

  getServiceLabel(code: string): string {
    return this.serviceTypes.find(s => s.code === code)?.label || code;
  }

  toggleChip(arr: string[], code: string): void {
    const idx = arr.indexOf(code);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(code);
  }

  private getEmptyProfileForm(): CreateDeliveryPartnerRequest & { vehicleTypes: string[] } {
    return {
      type: 'COMPANY',
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      ice: '',
      rc: '',
      taxId: '',
      description: '',
      services: [],
      vehicleTypes: [],
      coverage: { morocco: true, moroccoRegions: [], international: false, internationalCountries: [] },
      basePriceLocal: undefined,
      basePriceNational: undefined,
      basePriceInternational: undefined,
      currency: 'MAD',
      codFeePercent: undefined,
      estimatedLocalHours: undefined,
      estimatedNationalDays: undefined,
      estimatedInternationalDays: undefined,
      maxWeightKg: undefined
    };
  }

  /** Spring LocalDateTime-Array oder ISO-String → JS Date für DatePipe */
  parseDate(value: any): Date | null {
    return toDate(value);
  }

  /**
   * Übersetzt einen Credentials Source in benutzerfreundlichen Label
   */
  getCredentialsSourceLabel(source: string): string {
    const translations: Record<string, string> = {
      'SANDBOX': 'Sandbox (Testumgebung)',
      'PLATFORM': 'markt.ma Plattform-Anbindung',
      'STORE': 'Eigene API-Zugangsdaten'
    };
    return translations[source] || source;
  }

  /**
   * Übersetzt einen i18n Key (simplified for MVP)
   */
  translateKey(key: string): string {
    // Simplified translation - nutzt hardcoded Fallbacks für MVP
    // In Production würde man hier den TranslationService nutzen
    const translations: Record<string, string> = {
      'shipping.dhl.connectionSuccess': 'DHL Verbindung erfolgreich',
      'shipping.dhl.passwordConfigured': 'Passwort gesetzt',
      'shipping.dhl.connectionFailed': 'DHL Verbindung fehlgeschlagen',
      'shipping.dhl.invalidClient': 'API-Zugangsdaten sind falsch oder nicht aktiviert',
      'shipping.dhl.invalidGrant': 'DHL Geschäftskunden-Zugangsdaten sind falsch',
      'shipping.dhl.platformCredentialsMissing': 'Live-Versand ist noch nicht aktiviert'
    };
    return translations[key] || key;
  }
}

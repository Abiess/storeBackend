import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { LoyaltyService, LoyaltyAccount, LoyaltyPurchaseResponse, LoyaltyCustomerOption } from '@app/core/services/loyalty.service';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Loyalty Test-Flow (MVP)
 *
 * Manueller Testablauf für das Bonuspunkte-System:
 * 1. Karten-/Kundencode eingeben (simuliert später eine NFC-Karten-UID)
 * 2. Kunde + aktuellen Punktestand anzeigen
 * 3. Einkauf zuordnen (Betrag eingeben)
 * 4. Erhaltene Punkte + neuer Punktestand anzeigen
 *
 * WICHTIG: Backend, Berechnung und Datenmodell bleiben unverändert,
 * wenn der manuelle Code später durch einen echten NFC-Reader ersetzt wird.
 */
@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loyalty.component.html',
  styleUrls: ['./loyalty.component.scss']
})
export class LoyaltyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loyaltyService = inject(LoyaltyService);

  storeId!: number;

  code = '';
  purchaseAmount: number | null = null;

  searching = signal(false);
  searchError = signal<string | null>(null);
  account = signal<LoyaltyAccount | null>(null);

  // ─── Code-Registrierung (wenn lookupByIdentifier() keinen Treffer liefert) ───
  codeNotFound = signal(false);
  customerQuery = '';
  customerOptions = signal<LoyaltyCustomerOption[]>([]);
  searchingCustomers = signal(false);
  selectedCustomer = signal<LoyaltyCustomerOption | null>(null);
  registering = signal(false);
  registerError = signal<string | null>(null);

  processingPurchase = signal(false);
  purchaseError = signal<string | null>(null);
  lastPurchase = signal<LoyaltyPurchaseResponse | null>(null);

  ngOnInit(): void {
    this.extractStoreId();
  }

  private extractStoreId(): void {
    let id = this.route.snapshot.paramMap.get('storeId') || this.route.snapshot.paramMap.get('id');
    if (!id && this.route.parent) {
      id = this.route.parent.snapshot.paramMap.get('id');
    }
    if (!id) {
      const match = this.router.url.match(/\/stores\/(\d+)/);
      if (match) {
        id = match[1];
      }
    }
    this.storeId = id ? parseInt(id, 10) : 0;
  }

  searchCustomer(): void {
    const trimmedCode = this.code.trim();
    if (!trimmedCode || this.searching()) {
      return;
    }

    this.searchError.set(null);
    this.account.set(null);
    this.lastPurchase.set(null);
    this.purchaseError.set(null);
    this.resetRegistration();
    this.searching.set(true);

    this.loyaltyService.lookup(this.storeId, trimmedCode).subscribe({
      next: (account) => {
        this.account.set(account);
        this.searching.set(false);
      },
      error: (error) => {
        this.searching.set(false);
        this.account.set(null);
        this.searchError.set(this.extractErrorMessage(error, 'loyalty.errors.notFound'));
        if (error?.status === 404) {
          // Code existiert nicht → Registrierungsmöglichkeit anbieten
          this.codeNotFound.set(true);
          this.loadCustomerOptions('');
        }
      }
    });
  }

  onCodeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchCustomer();
    }
  }

  // ─── Code-Registrierung ───

  onCustomerQueryChange(): void {
    this.loadCustomerOptions(this.customerQuery.trim());
  }

  private loadCustomerOptions(query: string): void {
    this.searchingCustomers.set(true);
    this.loyaltyService.searchCustomers(this.storeId, query).subscribe({
      next: (options) => {
        this.customerOptions.set(options);
        this.searchingCustomers.set(false);
      },
      error: () => {
        this.customerOptions.set([]);
        this.searchingCustomers.set(false);
      }
    });
  }

  selectCustomer(option: LoyaltyCustomerOption): void {
    this.selectedCustomer.set(option);
    this.registerError.set(null);
  }

  confirmRegister(): void {
    const customer = this.selectedCustomer();
    const trimmedCode = this.code.trim();
    if (!customer || !trimmedCode || this.registering()) {
      return;
    }

    this.registerError.set(null);
    this.registering.set(true);

    this.loyaltyService.register(this.storeId, {
      customerProfileId: customer.customerProfileId,
      identifier: trimmedCode
    }).subscribe({
      next: (account) => {
        this.registering.set(false);
        this.account.set(account);
        this.searchError.set(null);
        this.resetRegistration();
      },
      error: (error) => {
        this.registering.set(false);
        this.registerError.set(this.extractErrorMessage(error, 'loyalty.errors.registerFailed'));
      }
    });
  }

  cancelRegister(): void {
    this.resetRegistration();
    this.searchError.set(null);
  }

  private resetRegistration(): void {
    this.codeNotFound.set(false);
    this.customerQuery = '';
    this.customerOptions.set([]);
    this.selectedCustomer.set(null);
    this.registering.set(false);
    this.registerError.set(null);
  }

  canAssignPurchase(): boolean {
    return !!this.account() && this.purchaseAmount != null && this.purchaseAmount > 0 && !this.processingPurchase();
  }

  assignPurchase(): void {
    const account = this.account();
    if (!account || !this.canAssignPurchase()) {
      return;
    }

    this.purchaseError.set(null);
    this.processingPurchase.set(true);

    this.loyaltyService.recordPurchase(this.storeId, {
      identifier: this.code.trim(),
      amount: this.purchaseAmount!
    }).subscribe({
      next: (response) => {
        this.processingPurchase.set(false);
        this.lastPurchase.set(response);
        // Punktestand direkt in der Anzeige aktualisieren
        this.account.set({
          ...account,
          pointsBalance: response.newBalance
        });
        this.purchaseAmount = null;
      },
      error: (error) => {
        this.processingPurchase.set(false);
        this.purchaseError.set(this.extractErrorMessage(error, 'loyalty.errors.purchaseFailed'));
      }
    });
  }

  startOver(): void {
    this.code = '';
    this.purchaseAmount = null;
    this.account.set(null);
    this.searchError.set(null);
    this.purchaseError.set(null);
    this.lastPurchase.set(null);
    this.resetRegistration();
  }

  private extractErrorMessage(error: any, fallbackKey: string): string {
    if (error?.error && typeof error.error === 'string') {
      return error.error;
    }
    return fallbackKey;
  }
}

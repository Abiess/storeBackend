import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { LoyaltyService, LoyaltyAccount, LoyaltyPurchaseResponse, LoyaltyCustomerOption, LoyaltyAccountListItem, LoyaltyTransaction } from '@app/core/services/loyalty.service';
import { LucideAngularModule } from 'lucide-angular';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';
import { FilterBarComponent, FilterChip } from '@app/shared/components/filter-bar/filter-bar.component';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';

/**
 * Loyalty Test-Flow (MVP)
 *
 * Manueller Testablauf für das Bonuspunkte-System:
 * 1. Karten-/Kundencode eingeben (simuliert später eine NFC-Karten-UID)
 * 2. Kunde + aktuellen Punktestand anzeigen
 * 3. Einkauf zuordnen (Betrag eingeben)
 * 4. Erhaltene Punkte + neuer Punktestand anzeigen
 *
 * Vor-Ort-Flow für Laufkundschaft OHNE Konto (unbekannter Code):
 * - "Neue Bonuskarte ausgeben": legt einen ANONYMEN LoyaltyAccount an
 *   (kein CustomerProfile), Karte ist danach sofort nutzbar.
 * - "Bestehendem Kunden zuordnen": bisheriger Registrierungs-Flow.
 * - "Kunde verknüpfen": verknüpft eine bereits ausgegebene anonyme Karte
 *   nachträglich mit einem bestehenden CustomerProfile, OHNE Punkte zu
 *   verlieren (derselbe Account bekommt lediglich die Kunden-Referenz).
 *
 * WICHTIG: Backend, Berechnung und Datenmodell bleiben unverändert,
 * wenn der manuelle Code später durch einen echten NFC-Reader ersetzt wird.
 */
@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, ResponsiveDataListComponent, FilterBarComponent, BarcodeInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loyalty.component.html',
  styleUrls: ['./loyalty.component.scss']
})
export class LoyaltyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loyaltyService = inject(LoyaltyService);
  private translationService = inject(TranslationService);

  storeId!: number;

  code = '';
  purchaseAmount: number | null = null;

  searching = signal(false);
  searchError = signal<string | null>(null);
  account = signal<LoyaltyAccount | null>(null);

  // ─── Unbekannter Code: Auswahl "Neue Bonuskarte ausgeben" vs. "Bestehendem Kunden zuordnen" ───
  codeNotFound = signal(false);
  issuingCard = signal(false);
  issueCardError = signal<string | null>(null);

  // ─── Kunden-Zuordnung (Registrierung eines neuen Codes ODER Verknüpfung einer bestehenden anonymen Karte) ───
  assigningExistingCustomer = signal(false);
  /** 'register' = neuer Code für bestehenden Kunden (bisheriger Flow); 'link' = anonyme Karte nachträglich verknüpfen ("Kunde verknüpfen") */
  assignMode = signal<'register' | 'link'>('register');
  customerQuery = '';
  customerOptions = signal<LoyaltyCustomerOption[]>([]);
  searchingCustomers = signal(false);
  selectedCustomer = signal<LoyaltyCustomerOption | null>(null);
  registering = signal(false);
  registerError = signal<string | null>(null);

  processingPurchase = signal(false);
  purchaseError = signal<string | null>(null);
  lastPurchase = signal<LoyaltyPurchaseResponse | null>(null);

  // ─── "Bonuskarten"-Übersicht (ResponsiveDataList, siehe responsive-data-list.component.ts) ───
  accounts = signal<LoyaltyAccountListItem[]>([]);
  accountsLoading = signal(false);
  accountsFilter = signal<'ALL' | 'REGISTERED' | 'ANONYMOUS'>('ALL');

  get filteredAccounts(): LoyaltyAccountListItem[] {
    const filter = this.accountsFilter();
    const list = this.accounts();
    if (filter === 'REGISTERED') {
      return list.filter(a => !a.anonymous);
    }
    if (filter === 'ANONYMOUS') {
      return list.filter(a => a.anonymous);
    }
    return list;
  }

  get accountFilterChips(): FilterChip[] {
    return [
      { value: 'ALL', label: this.translationService.translate('loyalty.list.filterAll') },
      { value: 'REGISTERED', label: this.translationService.translate('loyalty.list.filterRegistered') },
      { value: 'ANONYMOUS', label: this.translationService.translate('loyalty.list.filterAnonymous') }
    ];
  }

  accountColumns: ColumnConfig[] = [
    {
      key: 'customerName',
      label: this.translationService.translate('loyalty.list.colCustomer'),
      type: 'text',
      sortable: true,
      formatFn: (v, item: LoyaltyAccountListItem) =>
        item.anonymous ? this.translationService.translate('loyalty.list.notRegistered') : (v || '-')
    },
    {
      key: 'identifier',
      label: this.translationService.translate('loyalty.list.colCode'),
      type: 'text',
      formatFn: (v) => v || '-'
    },
    {
      key: 'pointsBalance',
      label: this.translationService.translate('loyalty.list.colPoints'),
      type: 'number',
      sortable: true
    },
    {
      key: 'createdAt',
      label: this.translationService.translate('loyalty.list.colSince'),
      type: 'text',
      formatFn: (v) => this.formatSince(v)
    },
    {
      key: 'lastPurchaseAt',
      label: this.translationService.translate('loyalty.list.colLastPurchase'),
      type: 'date',
      hideOnMobile: true
    },
    {
      key: 'status',
      label: this.translationService.translate('loyalty.list.colStatus'),
      type: 'badge',
      formatFn: (v) => this.formatIdentifierStatus(v),
      badgeClass: (v) => v === 'ACTIVE' ? 'status-active' : v === 'BLOCKED' ? 'status-inactive' : 'status-archived'
    }
  ];

  accountActions: ActionConfig[] = [
    {
      icon: '👁',
      label: this.translationService.translate('loyalty.list.actionOpen'),
      handler: (item: LoyaltyAccountListItem) => this.openAccountFromList(item)
    },
    {
      icon: '📜',
      label: this.translationService.translate('loyalty.list.actionHistory'),
      handler: (item: LoyaltyAccountListItem) => this.openHistory(item)
    },
    {
      icon: '🔒',
      label: this.translationService.translate('loyalty.list.actionBlock'),
      visible: (item: LoyaltyAccountListItem) => item.status === 'ACTIVE',
      handler: (item: LoyaltyAccountListItem) => this.blockCard(item)
    },
    {
      icon: '🔄',
      label: this.translationService.translate('loyalty.list.actionReplace'),
      visible: (item: LoyaltyAccountListItem) => item.status === 'ACTIVE' || item.status === 'BLOCKED',
      handler: (item: LoyaltyAccountListItem) => this.startReplaceCard(item)
    },
    {
      icon: '⚖️',
      label: this.translationService.translate('loyalty.list.actionAdjust'),
      visible: (item: LoyaltyAccountListItem) => item.status === 'ACTIVE',
      handler: (item: LoyaltyAccountListItem) => this.startAdjustPoints(item)
    },
    {
      icon: '🎁',
      label: this.translationService.translate('loyalty.list.actionRedeem'),
      visible: (item: LoyaltyAccountListItem) => item.status === 'ACTIVE' && item.pointsBalance > 0,
      handler: (item: LoyaltyAccountListItem) => this.startRedeemPoints(item)
    },
    {
      icon: '🔗',
      label: this.translationService.translate('loyalty.list.actionLinkCustomer'),
      visible: (item: LoyaltyAccountListItem) => item.anonymous,
      handler: (item: LoyaltyAccountListItem) => this.linkCustomerFromList(item)
    }
  ];

  // ─── "Punkte korrigieren" (ADJUST, positiv oder negativ, Grund Pflicht) ───
  adjustingAccount = signal<LoyaltyAccountListItem | null>(null);
  adjustPointsValue: number | null = null;
  adjustReason = '';
  adjustLoading = signal(false);
  adjustError = signal<string | null>(null);

  startAdjustPoints(item: LoyaltyAccountListItem): void {
    if (!item.identifier) {
      return;
    }
    this.adjustingAccount.set(item);
    this.adjustPointsValue = null;
    this.adjustReason = '';
    this.adjustError.set(null);
  }

  cancelAdjustPoints(): void {
    this.adjustingAccount.set(null);
    this.adjustPointsValue = null;
    this.adjustReason = '';
    this.adjustError.set(null);
    this.adjustLoading.set(false);
  }

  canConfirmAdjustPoints(): boolean {
    return this.adjustPointsValue != null && this.adjustPointsValue !== 0 && !!this.adjustReason.trim() && !this.adjustLoading();
  }

  confirmAdjustPoints(): void {
    const item = this.adjustingAccount();
    if (!item || !item.identifier || !this.canConfirmAdjustPoints()) {
      return;
    }

    this.adjustError.set(null);
    this.adjustLoading.set(true);

    this.loyaltyService.adjustPoints(this.storeId, {
      identifier: item.identifier,
      points: this.adjustPointsValue!,
      reason: this.adjustReason.trim()
    }).subscribe({
      next: () => {
        this.adjustLoading.set(false);
        this.cancelAdjustPoints();
        this.loadAccounts();
      },
      error: (error) => {
        this.adjustLoading.set(false);
        this.adjustError.set(this.extractErrorMessage(error, 'loyalty.errors.adjustFailed'));
      }
    });
  }

  // ─── "Punkte einlösen" (REDEEM, nur wenn genügend Punkte vorhanden) ───
  redeemingAccount = signal<LoyaltyAccountListItem | null>(null);
  redeemPointsValue: number | null = null;
  redeemLoading = signal(false);
  redeemError = signal<string | null>(null);

  startRedeemPoints(item: LoyaltyAccountListItem): void {
    if (!item.identifier) {
      return;
    }
    this.redeemingAccount.set(item);
    this.redeemPointsValue = null;
    this.redeemError.set(null);
  }

  cancelRedeemPoints(): void {
    this.redeemingAccount.set(null);
    this.redeemPointsValue = null;
    this.redeemError.set(null);
    this.redeemLoading.set(false);
  }

  canConfirmRedeemPoints(): boolean {
    const account = this.redeemingAccount();
    return !!account
      && this.redeemPointsValue != null
      && this.redeemPointsValue > 0
      && this.redeemPointsValue <= account.pointsBalance
      && !this.redeemLoading();
  }

  confirmRedeemPoints(): void {
    const item = this.redeemingAccount();
    if (!item || !item.identifier || !this.canConfirmRedeemPoints()) {
      return;
    }

    this.redeemError.set(null);
    this.redeemLoading.set(true);

    this.loyaltyService.redeemPoints(this.storeId, {
      identifier: item.identifier,
      points: this.redeemPointsValue!
    }).subscribe({
      next: () => {
        this.redeemLoading.set(false);
        this.cancelRedeemPoints();
        this.loadAccounts();
      },
      error: (error) => {
        this.redeemLoading.set(false);
        this.redeemError.set(this.extractErrorMessage(error, 'loyalty.errors.redeemFailed'));
      }
    });
  }

  // ─── "Karte sperren" ───
  blockingCardId = signal<number | null>(null);

  blockCard(item: LoyaltyAccountListItem): void {
    if (!item.loyaltyIdentifierId || this.blockingCardId()) {
      return;
    }
    const confirmed = window.confirm(this.translationService.translate('loyalty.list.confirmBlock'));
    if (!confirmed) {
      return;
    }

    this.blockingCardId.set(item.loyaltyIdentifierId);
    this.loyaltyService.blockIdentifier(this.storeId, item.loyaltyIdentifierId).subscribe({
      next: () => {
        this.blockingCardId.set(null);
        this.loadAccounts();
      },
      error: (error) => {
        this.blockingCardId.set(null);
        alert(this.extractErrorMessage(error, 'loyalty.errors.blockFailed'));
      }
    });
  }

  // ─── "Karte ersetzen" (bestehender Input-/Form-Flow, wiederverwendet BarcodeInputComponent) ───
  replacingCard = signal<LoyaltyAccountListItem | null>(null);
  newIdentifierCode = '';
  replacingCardLoading = signal(false);
  replaceCardError = signal<string | null>(null);

  startReplaceCard(item: LoyaltyAccountListItem): void {
    if (!item.loyaltyIdentifierId) {
      return;
    }
    this.replacingCard.set(item);
    this.newIdentifierCode = '';
    this.replaceCardError.set(null);
  }

  cancelReplaceCard(): void {
    this.replacingCard.set(null);
    this.newIdentifierCode = '';
    this.replaceCardError.set(null);
    this.replacingCardLoading.set(false);
  }

  confirmReplaceCard(): void {
    const item = this.replacingCard();
    const trimmedNewCode = this.newIdentifierCode.trim();
    if (!item || !item.loyaltyIdentifierId || !trimmedNewCode || this.replacingCardLoading()) {
      return;
    }

    this.replaceCardError.set(null);
    this.replacingCardLoading.set(true);

    this.loyaltyService.replaceIdentifier(this.storeId, item.loyaltyIdentifierId, trimmedNewCode).subscribe({
      next: () => {
        this.replacingCardLoading.set(false);
        this.cancelReplaceCard();
        this.loadAccounts();
      },
      error: (error) => {
        this.replacingCardLoading.set(false);
        this.replaceCardError.set(this.extractErrorMessage(error, 'loyalty.errors.replaceFailed'));
      }
    });
  }

  // ─── Transaktionshistorie (ResponsiveDataList + FilterBar, siehe openHistory()) ───
  historyAccount = signal<LoyaltyAccountListItem | null>(null);
  historyTransactions = signal<LoyaltyTransaction[]>([]);
  historyLoading = signal(false);
  historyFilter = signal<'ALL' | 'EARN' | 'REDEEM' | 'ADJUST'>('ALL');

  get filteredHistoryTransactions(): LoyaltyTransaction[] {
    const filter = this.historyFilter();
    const list = this.historyTransactions();
    return filter === 'ALL' ? list : list.filter(t => t.type === filter);
  }

  get historyFilterChips(): FilterChip[] {
    return [
      { value: 'ALL', label: this.translationService.translate('loyalty.list.filterAll') },
      { value: 'EARN', label: this.translationService.translate('loyalty.history.typeEarn') },
      { value: 'REDEEM', label: this.translationService.translate('loyalty.history.typeRedeem') },
      { value: 'ADJUST', label: this.translationService.translate('loyalty.history.typeAdjust') }
    ];
  }

  historyColumns: ColumnConfig[] = [
    {
      key: 'createdAt',
      label: this.translationService.translate('loyalty.history.colDate'),
      type: 'date',
      sortable: true
    },
    {
      key: 'type',
      label: this.translationService.translate('loyalty.history.colType'),
      type: 'badge',
      formatFn: (v) => this.formatTransactionType(v),
      badgeClass: (v) => v === 'EARN' ? 'status-active' : v === 'REDEEM' ? 'status-processing' : 'status-draft'
    },
    {
      key: 'points',
      label: this.translationService.translate('loyalty.history.colPoints'),
      type: 'number',
      sortable: true,
      formatFn: (v) => (v > 0 ? '+' : '') + v
    },
    {
      key: 'amount',
      label: this.translationService.translate('loyalty.history.colAmount'),
      type: 'text',
      hideOnMobile: true,
      formatFn: (v) => v != null ? Number(v).toFixed(2) : '-'
    },
    {
      key: 'resultingBalance',
      label: this.translationService.translate('loyalty.history.colBalance'),
      type: 'number',
      sortable: true
    },
    {
      key: 'note',
      label: this.translationService.translate('loyalty.history.colNote'),
      type: 'text',
      hideOnMobile: true,
      formatFn: (v) => v || '-'
    }
  ];

  openHistory(item: LoyaltyAccountListItem): void {
    if (!item.loyaltyAccountId) {
      return;
    }
    this.historyAccount.set(item);
    this.historyFilter.set('ALL');
    this.historyTransactions.set([]);
    this.historyLoading.set(true);

    this.loyaltyService.getTransactionHistory(this.storeId, item.loyaltyAccountId).subscribe({
      next: (transactions) => {
        this.historyTransactions.set(transactions);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyTransactions.set([]);
        this.historyLoading.set(false);
      }
    });
  }

  onHistoryFilterChange(value: string): void {
    this.historyFilter.set(value as 'ALL' | 'EARN' | 'REDEEM' | 'ADJUST');
  }

  closeHistory(): void {
    this.historyAccount.set(null);
    this.historyTransactions.set([]);
  }

  private formatTransactionType(type: string): string {
    if (type === 'EARN') {
      return this.translationService.translate('loyalty.history.typeEarn');
    }
    if (type === 'REDEEM') {
      return this.translationService.translate('loyalty.history.typeRedeem');
    }
    if (type === 'ADJUST') {
      return this.translationService.translate('loyalty.history.typeAdjust');
    }
    return type;
  }

  ngOnInit(): void {
    this.extractStoreId();
    this.loadAccounts();
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
    this.resetAssignFlow();
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
          // Code existiert nicht → Auswahl anbieten: neue Karte ausgeben ODER bestehendem Kunden zuordnen
          this.codeNotFound.set(true);
        }
      }
    });
  }

  onCodeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchCustomer();
    }
  }

  // ─── "Neue Bonuskarte ausgeben" (anonymer LoyaltyAccount, kein CustomerProfile) ───

  issueNewCard(): void {
    const trimmedCode = this.code.trim();
    if (!trimmedCode || this.issuingCard()) {
      return;
    }

    this.issueCardError.set(null);
    this.issuingCard.set(true);

    this.loyaltyService.issueCard(this.storeId, { identifier: trimmedCode }).subscribe({
      next: (account) => {
        this.issuingCard.set(false);
        this.account.set(account);
        this.codeNotFound.set(false);
        this.searchError.set(null);
        this.resetAssignFlow();
        this.loadAccounts();
      },
      error: (error) => {
        this.issuingCard.set(false);
        this.issueCardError.set(this.extractErrorMessage(error, 'loyalty.errors.issueCardFailed'));
      }
    });
  }

  // ─── "Bestehendem Kunden zuordnen" (neuer Code registrieren) ───

  startAssignExistingCustomer(): void {
    this.assignMode.set('register');
    this.assigningExistingCustomer.set(true);
    this.registerError.set(null);
    this.loadCustomerOptions('');
  }

  // ─── "Kunde verknüpfen" (bestehende anonyme Karte nachträglich zuordnen) ───

  startLinkCustomer(): void {
    if (!this.account()?.anonymous) {
      return;
    }
    this.assignMode.set('link');
    this.assigningExistingCustomer.set(true);
    this.registerError.set(null);
    this.loadCustomerOptions('');
  }

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

  confirmAssignCustomer(): void {
    const customer = this.selectedCustomer();
    if (!customer || this.registering()) {
      return;
    }

    if (this.assignMode() === 'link') {
      const account = this.account();
      if (!account) {
        return;
      }
      this.registerError.set(null);
      this.registering.set(true);

      this.loyaltyService.linkCustomer(this.storeId, {
        loyaltyAccountId: account.loyaltyAccountId,
        customerProfileId: customer.customerProfileId
      }).subscribe({
        next: (updatedAccount) => {
          this.registering.set(false);
          this.account.set(updatedAccount);
          this.resetAssignFlow();
          this.loadAccounts();
        },
        error: (error) => {
          this.registering.set(false);
          this.registerError.set(this.extractErrorMessage(error, 'loyalty.errors.linkFailed'));
        }
      });
      return;
    }

    const trimmedCode = this.code.trim();
    if (!trimmedCode) {
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
        this.codeNotFound.set(false);
        this.resetAssignFlow();
        this.loadAccounts();
      },
      error: (error) => {
        this.registering.set(false);
        this.registerError.set(this.extractErrorMessage(error, 'loyalty.errors.registerFailed'));
      }
    });
  }

  cancelAssignCustomer(): void {
    this.resetAssignFlow();
    if (this.assignMode() === 'register') {
      this.searchError.set(null);
      this.codeNotFound.set(false);
    }
  }

  private resetAssignFlow(): void {
    this.codeNotFound.set(false);
    this.assigningExistingCustomer.set(false);
    this.assignMode.set('register');
    this.customerQuery = '';
    this.customerOptions.set([]);
    this.selectedCustomer.set(null);
    this.registering.set(false);
    this.registerError.set(null);
    this.issueCardError.set(null);
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
        this.loadAccounts();
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
    this.resetAssignFlow();
  }

  private extractErrorMessage(error: any, fallbackKey: string): string {
    if (error?.error && typeof error.error === 'string') {
      return error.error;
    }
    return fallbackKey;
  }

  // ─── "Bonuskarten"-Übersicht ───

  loadAccounts(): void {
    if (!this.storeId) {
      return;
    }
    this.accountsLoading.set(true);
    this.loyaltyService.listAccounts(this.storeId).subscribe({
      next: (list) => {
        this.accounts.set(list);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accounts.set([]);
        this.accountsLoading.set(false);
      }
    });
  }

  onAccountsFilterChange(value: string): void {
    this.accountsFilter.set(value as 'ALL' | 'REGISTERED' | 'ANONYMOUS');
  }

  formatSince(value: string): string {
    if (!value) {
      return '-';
    }
    const created = new Date(value).getTime();
    if (isNaN(created)) {
      return '-';
    }
    const days = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
    if (days === 0) {
      return this.translationService.translate('loyalty.list.sinceToday');
    }
    if (days === 1) {
      return this.translationService.translate('loyalty.list.sinceOneDay');
    }
    return this.translationService.translate('loyalty.list.sinceDays', { days: String(days) });
  }

  private formatIdentifierStatus(status: string | null): string {
    if (status === 'ACTIVE') {
      return this.translationService.translate('loyalty.list.statusActive');
    }
    if (status === 'BLOCKED') {
      return this.translationService.translate('loyalty.list.statusBlocked');
    }
    if (status === 'REPLACED') {
      return this.translationService.translate('loyalty.list.statusReplaced');
    }
    return '-';
  }

  openAccountFromList(item: LoyaltyAccountListItem): void {
    if (!item.identifier) {
      return;
    }
    this.code = item.identifier;
    this.searchCustomer();
  }

  linkCustomerFromList(item: LoyaltyAccountListItem): void {
    if (!item.identifier) {
      return;
    }
    this.code = item.identifier;
    this.searchError.set(null);
    this.purchaseError.set(null);
    this.lastPurchase.set(null);
    this.resetAssignFlow();
    this.searching.set(true);

    this.loyaltyService.lookup(this.storeId, item.identifier).subscribe({
      next: (account) => {
        this.searching.set(false);
        this.account.set(account);
        this.startLinkCustomer();
      },
      error: (error) => {
        this.searching.set(false);
        this.account.set(null);
        this.searchError.set(this.extractErrorMessage(error, 'loyalty.errors.notFound'));
      }
    });
  }
}

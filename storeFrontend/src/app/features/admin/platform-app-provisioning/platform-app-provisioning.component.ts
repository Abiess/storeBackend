import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AppProvisioningService,
  AdminUserSummary,
  AdminUserEntitlements,
  AdminEntitlement,
  AdminStoreSummary
} from '@app/core/services/app-provisioning.service';
import { AppKey, AppAccessMode } from '@app/core/models';
import { APP_REGISTRY, APP_REGISTRY_ORDER, AppRegistryEntry } from '@app/core/config/app-registry';
import { TranslatePipe, TranslationService } from '@app/core/i18n.exports';

/**
 * App Provisioning Phase 1 (Platform Administration).
 *
 * Bewusst AUSSERHALB von `/apps/...` (siehe ARCHITECTURE_APP_FACTORY.md
 * Abschnitt 14/15) - dies ist ein Platform-Verwaltungswerkzeug, KEIN App
 * Factory-Consumer. Verwendet daher weder `AppContextSelectorComponent`
 * noch `AppNavigationComponent`.
 *
 * App-Metadaten (Titel/Icon) kommen bewusst 1:1 aus dem bestehenden
 * `APP_REGISTRY` - keine erneute Hartkodierung von App-Namen/Icons hier.
 */
@Component({
  selector: 'app-platform-app-provisioning',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslatePipe,
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './platform-app-provisioning.component.html',
  styleUrls: ['./platform-app-provisioning.component.scss']
})
export class PlatformAppProvisioningComponent implements OnInit {
  readonly AppAccessMode = AppAccessMode;
  readonly apps: AppRegistryEntry[] = APP_REGISTRY_ORDER.map(key => APP_REGISTRY[key]);

  searchQuery = '';
  users = signal<AdminUserSummary[]>([]);
  searching = signal(false);
  searchError = signal<string | null>(null);

  selectedUser = signal<AdminUserSummary | null>(null);
  entitlementsData = signal<AdminUserEntitlements | null>(null);
  loadingEntitlements = signal(false);

  stores = signal<AdminStoreSummary[]>([]);

  /** Je STORE-App die aktuell im "Store hinzufügen"-Picker gewählte storeId. */
  newStoreSelection: Partial<Record<AppKey, number | null>> = {};

  /** LEGACY→MANAGED-Warnhinweis: Aktion wird erst nach expliziter Bestätigung ausgeführt. */
  pendingLegacyAction: (() => void) | null = null;
  showLegacyWarning = false;

  saving = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private appProvisioningService: AppProvisioningService,
    private snackBar: MatSnackBar,
    private translationService: TranslationService
  ) {}

  /** Anzeigename einer App fürs Snackbar-Feedback (nutzt bestehende i18n-Keys aus dem APP_REGISTRY). */
  private appDisplayName(app: AppKey): string {
    return this.translationService.translate(APP_REGISTRY[app].titleKey);
  }

  private notify(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3500, panelClass: 'platform-snackbar' });
  }

  storeName(storeId: number): string {
    return this.stores().find(s => s.id === storeId)?.name ?? `Store ${storeId}`;
  }

  ngOnInit(): void {
    // Store-Liste für die Context-Picker (Phase 1: einmalig geladen, max. 50 - siehe Backend).
    this.appProvisioningService.searchStores('').subscribe({
      next: stores => this.stores.set(stores),
      error: () => this.stores.set([])
    });
  }

  search(): void {
    this.searching.set(true);
    this.searchError.set(null);
    this.appProvisioningService.searchUsers(this.searchQuery).subscribe({
      next: users => {
        this.users.set(users);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Fehler bei der Benutzersuche.');
        this.searching.set(false);
      }
    });
  }

  selectUser(user: AdminUserSummary): void {
    this.selectedUser.set(user);
    this.entitlementsData.set(null);
    this.errorMessage.set(null);
    this.showLegacyWarning = false;
    this.pendingLegacyAction = null;
    this.newStoreSelection = {};
    this.loadEntitlements(user.id);
  }

  private loadEntitlements(userId: number): void {
    this.loadingEntitlements.set(true);
    this.appProvisioningService.getUserEntitlements(userId).subscribe({
      next: data => {
        this.entitlementsData.set(data);
        this.loadingEntitlements.set(false);
      },
      error: () => {
        this.errorMessage.set('Entitlements konnten nicht geladen werden.');
        this.loadingEntitlements.set(false);
      }
    });
  }

  entitlementsForApp(app: AppKey): AdminEntitlement[] {
    return this.entitlementsData()?.entitlements.filter(e => e.app === app) ?? [];
  }

  /** GLOBAL-Apps besitzen höchstens ein Entitlement (kein Store-Kontext). */
  globalEntitlement(app: AppKey): AdminEntitlement | undefined {
    return this.entitlementsForApp(app)[0];
  }

  activeStoreCount(app: AppKey): number {
    return this.entitlementsForApp(app).filter(e => e.enabled).length;
  }

  /** MatSlideToggle-Handler für GLOBAL-Apps: legt Entitlement an oder togglet das bestehende. */
  onGlobalToggle(app: AppKey, existing: AdminEntitlement | undefined, event: MatSlideToggleChange): void {
    if (existing) {
      this.toggleEntitlement(existing);
    } else if (event.checked) {
      this.activateGlobalApp(app);
    }
  }

  /** Ob ein User aktuell (noch) gar keine Entitlements hat, d.h. LEGACY-weit auf alles zugreift. */
  get isCurrentlyLegacyWithoutEntitlements(): boolean {
    const data = this.entitlementsData();
    return !!data && data.appAccessMode === AppAccessMode.LEGACY && data.entitlements.length === 0;
  }

  /**
   * Führt `action` aus - sofern der User bereits MANAGED ist oder bereits
   * mindestens ein Entitlement besitzt, sofort; andernfalls (erstes
   * Entitlement für einen LEGACY-User) wird zunächst der Warnhinweis
   * gezeigt und `action` erst nach expliziter Bestätigung ausgeführt (siehe
   * ARCHITECTURE_APP_FACTORY.md - LEGACY→MANAGED-Sicherheitsnetz).
   */
  private runGuarded(action: () => void): void {
    if (this.isCurrentlyLegacyWithoutEntitlements) {
      this.pendingLegacyAction = action;
      this.showLegacyWarning = true;
      return;
    }
    action();
  }

  confirmLegacyTransition(): void {
    const action = this.pendingLegacyAction;
    this.showLegacyWarning = false;
    this.pendingLegacyAction = null;
    if (action) {
      action();
    }
  }

  cancelLegacyTransition(): void {
    this.showLegacyWarning = false;
    this.pendingLegacyAction = null;
  }

  /** GLOBAL-App aktivieren (storeId muss null bleiben, siehe AppKey.getScope()). */
  activateGlobalApp(app: AppKey): void {
    this.runGuarded(() => this.upsert(app, null, true));
  }

  /** STORE-App: neuen Store für die gewählte App freischalten. */
  addStoreEntitlement(app: AppKey): void {
    const storeId = this.newStoreSelection[app];
    if (!storeId) {
      this.errorMessage.set('Bitte zuerst einen Store auswählen.');
      return;
    }
    this.runGuarded(() => this.upsert(app, storeId, true));
  }

  /** Bestehendes Entitlement togglen (Soft-Disable/-Enable via PATCH). */
  toggleEntitlement(entitlement: AdminEntitlement): void {
    const user = this.selectedUser();
    if (!user) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    const willEnable = !entitlement.enabled;
    this.appProvisioningService.patchEntitlement(user.id, entitlement.id, willEnable).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadEntitlements(user.id);
        const appName = this.appDisplayName(entitlement.app);
        const context = entitlement.scope === 'STORE' && entitlement.storeId
          ? ` für ${this.storeName(entitlement.storeId)}`
          : '';
        this.notify(willEnable ? `${appName}${context} aktiviert` : `${appName}${context} deaktiviert`);
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set('Entitlement konnte nicht aktualisiert werden.');
      }
    });
  }

  private upsert(app: AppKey, storeId: number | null, enabled: boolean): void {
    const user = this.selectedUser();
    if (!user) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.appProvisioningService.upsertEntitlement(user.id, { app, storeId, enabled }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newStoreSelection[app] = null;
        this.loadEntitlements(user.id);
        // AppAccessMode des Users in der Suchliste ist jetzt ggf. veraltet (LEGACY -> MANAGED).
        this.refreshSelectedUserSummary();
        const appName = this.appDisplayName(app);
        this.notify(storeId ? `${appName} für ${this.storeName(storeId)} freigeschaltet` : `${appName} aktiviert`);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.error || 'Entitlement konnte nicht gespeichert werden.');
      }
    });
  }

  private refreshSelectedUserSummary(): void {
    const current = this.selectedUser();
    const data = this.entitlementsData();
    if (current && data) {
      this.selectedUser.set({ ...current, appAccessMode: data.appAccessMode });
    }
  }

  trackByAppKey(_index: number, entry: AppRegistryEntry): AppKey {
    return entry.key;
  }

  trackByEntitlementId(_index: number, entitlement: AdminEntitlement): number {
    return entitlement.id;
  }
}

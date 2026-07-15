import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ToastService } from '@app/core/services/toast.service';
import {
  WooCommerceService,
  WooCommerceConfig,
  WooCommerceConfigRequest,
  WooCommerceTestResponse,
  WooCommercePreviewResponse,
  WooCommerceProductPreview,
  WooCommerceImportRequest,
  WooCommerceImportResponse,
  CleanDescriptionsResponse,
  ProductCleanupPreview
} from '@app/core/services/woocommerce.service';

/**
 * WooCommerce Import UI.
 * 
 * 4-Schritte-Wizard + Cleanup-Tab:
 * 1. Verbindung (Config speichern)
 * 2. Test (Connection testen)
 * 3. Preview (Produkte laden)
 * 4. Import (noch nicht aktiv - disabled)
 * 5. Cleanup (Beschreibungen bereinigen)
 * 
 * Security:
 * - Consumer Secret wird NIEMALS angezeigt
 * - Leer lassen = bestehendes Secret behalten
 */
@Component({
  selector: 'app-woocommerce-import',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './woocommerce-import.component.html',
  styleUrls: ['./woocommerce-import.component.scss']
})
export class WooCommerceImportComponent implements OnInit {
  storeId!: number;

  // Tab State
  activeTab: 'import' | 'cleanup' = 'import';

  // Wizard State
  currentStep: 'config' | 'test' | 'preview' | 'import' = 'config';

  // Config Form
  shopUrl: string = '';
  consumerKey: string = '';
  consumerSecret: string = '';
  enabled: boolean = false;
  consumerSecretConfigured: boolean = false;

  // Loading States
  savingConfig: boolean = false;
  testingConnection: boolean = false;
  loadingPreview: boolean = false;

  // Test Result
  testResult: WooCommerceTestResponse | null = null;

  // Preview Result
  previewResult: WooCommercePreviewResponse | null = null;

  // Import State
  importing: boolean = false;
  importResult: WooCommerceImportResponse | null = null;

  // Cleanup State
  cleaningDescriptions: boolean = false;
  cleanupPreview: CleanDescriptionsResponse | null = null;
  cleanupResult: CleanDescriptionsResponse | null = null;
  showCleanupConfirmDialog: boolean = false;

  // Error
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private wooCommerceService: WooCommerceService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Extract storeId from route parameter
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (!idParam) {
      this.toastService.error('Store ID fehlt in der URL');
      return;
    }

    this.storeId = Number(idParam);
    
    if (!this.storeId || Number.isNaN(this.storeId)) {
      this.toastService.error('Ungültige Store ID');
      return;
    }

    this.loadConfig();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Config
  // ─────────────────────────────────────────────────────────────────────────

  loadConfig(): void {
    this.wooCommerceService.getConfig(this.storeId).subscribe({
      next: (config: WooCommerceConfig) => {
        this.shopUrl = config.shopUrl || '';
        this.consumerKey = config.consumerKey || '';
        this.enabled = config.enabled || false;
        this.consumerSecretConfigured = config.consumerSecretConfigured || false;
        this.consumerSecret = ''; // NIEMALS das echte Secret laden!
      },
      error: (err) => {
        console.error('Failed to load WooCommerce config:', err);
      }
    });
  }

  saveConfig(): void {
    // Validierung
    if (!this.shopUrl || !this.consumerKey) {
      this.toastService.error('woocommerce.error.missingFields');
      return;
    }

    // Consumer Secret nur prüfen wenn noch nicht konfiguriert
    if (!this.consumerSecretConfigured && !this.consumerSecret) {
      this.toastService.error('woocommerce.error.secretRequired');
      return;
    }

    this.savingConfig = true;
    this.errorMessage = null;

    const request: WooCommerceConfigRequest = {
      shopUrl: this.shopUrl.trim(),
      consumerKey: this.consumerKey.trim(),
      consumerSecret: this.consumerSecret.trim(),
      enabled: this.enabled,
      keepExistingSecret: !this.consumerSecret && this.consumerSecretConfigured
    };

    this.wooCommerceService.saveConfig(this.storeId, request).subscribe({
      next: (response) => {
        this.savingConfig = false;
        this.consumerSecretConfigured = response.consumerSecretConfigured;
        this.consumerSecret = ''; // Clear nach Save
        this.toastService.success('woocommerce.config.saved');
        this.currentStep = 'test';
      },
      error: (err) => {
        this.savingConfig = false;
        this.errorMessage = err.error?.messageKey || 'woocommerce.error.unknown';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Test Connection
  // ─────────────────────────────────────────────────────────────────────────

  testConnection(): void {
    this.testingConnection = true;
    this.errorMessage = null;
    this.testResult = null;

    this.wooCommerceService.testConnection(this.storeId).subscribe({
      next: (response: WooCommerceTestResponse) => {
        this.testingConnection = false;
        this.testResult = response;

        if (response.success) {
          this.toastService.success('woocommerce.connectionSuccess');
          // Auto-advance nach 2 Sekunden
          setTimeout(() => {
            this.currentStep = 'preview';
          }, 2000);
        } else {
          this.toastService.error(response.messageKey || 'woocommerce.connectionFailed');
        }
      },
      error: (err) => {
        this.testingConnection = false;
        this.errorMessage = err.error?.messageKey || 'woocommerce.error.unknown';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3: Preview
  // ─────────────────────────────────────────────────────────────────────────

  loadPreview(): void {
    this.loadingPreview = true;
    this.errorMessage = null;
    this.previewResult = null;

    this.wooCommerceService.loadPreview(this.storeId).subscribe({
      next: (response: WooCommercePreviewResponse) => {
        this.loadingPreview = false;
        this.previewResult = response;
        this.toastService.success('woocommerce.previewLoaded');
      },
      error: (err) => {
        this.loadingPreview = false;
        this.errorMessage = err.error?.messageKey || 'woocommerce.error.unknown';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step Navigation
  // ─────────────────────────────────────────────────────────────────────────

  goToStep(step: 'config' | 'test' | 'preview' | 'import'): void {
    this.currentStep = step;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 4: Import
  // ─────────────────────────────────────────────────────────────────────────

  startImport(): void {
    if (!this.previewResult || this.importing) {
      return;
    }

    this.importing = true;
    this.errorMessage = null;
    this.importResult = null;

    const request: WooCommerceImportRequest = {
      importImages: true,
      skipExisting: true
    };

    this.wooCommerceService.startImport(this.storeId, request).subscribe({
      next: (response: WooCommerceImportResponse) => {
        this.importing = false;
        this.importResult = response;

        if (response.status === 'COMPLETED') {
          // Success toast with details
          const message = `Import abgeschlossen: ${response.importedCount} importiert, ${response.skippedCount} übersprungen, ${response.failedCount} Fehler`;
          this.toastService.success(message);

          // Show warnings if any
          if (response.warnings && response.warnings.length > 0) {
            response.warnings.forEach(warning => {
              this.toastService.warning(warning);
            });
          }

          this.currentStep = 'import';
        } else {
          this.toastService.error(response.messageKey || 'woocommerce.import.failed');
        }
      },
      error: (err) => {
        this.importing = false;
        this.errorMessage = err.error?.messageKey || 'woocommerce.error.unknown';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  isStepActive(step: string): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: string): boolean {
    const steps = ['config', 'test', 'preview', 'import'];
    const currentIndex = steps.indexOf(this.currentStep);
    const stepIndex = steps.indexOf(step);
    return stepIndex < currentIndex;
  }

  getProductBadgeClass(product: WooCommerceProductPreview): string {
    if (product.alreadyImported) return 'status-draft';
    if (product.hasVariantLimitWarning) return 'status-processing';
    return 'status-active';
  }

  getProductBadgeText(product: WooCommerceProductPreview): string {
    if (product.alreadyImported) return 'woocommerce.alreadyImported';
    if (product.hasVariantLimitWarning) return 'woocommerce.variantLimitWarning';
    return product.status;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tab Navigation
  // ─────────────────────────────────────────────────────────────────────────

  switchTab(tab: 'import' | 'cleanup'): void {
    this.activeTab = tab;
    // Reset error when switching tabs
    this.errorMessage = null;
    // Close any open dialogs
    this.showCleanupConfirmDialog = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup: WooCommerce Description Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  startCleanupPreview(): void {
    // Prevent double-click
    if (this.cleaningDescriptions) {
      return;
    }

    // Reset previous results and errors
    this.cleanupPreview = null;
    this.cleanupResult = null;
    this.errorMessage = null;
    this.cleaningDescriptions = true;

    this.wooCommerceService.cleanDescriptions(this.storeId, true).subscribe({
      next: (response: CleanDescriptionsResponse) => {
        this.cleaningDescriptions = false;
        this.cleanupPreview = response;

        if (response.affected === 0) {
          this.toastService.success('woocommerce.cleanup.noAffectedProducts');
        } else {
          this.toastService.success('woocommerce.cleanup.previewSuccess');
        }
      },
      error: (err) => {
        this.cleaningDescriptions = false;
        
        // Handle 401 and 403
        if (err.status === 401) {
          this.errorMessage = 'woocommerce.cleanup.unauthenticated';
          this.toastService.error(this.errorMessage);
          return;
        }

        if (err.status === 403) {
          this.errorMessage = 'woocommerce.cleanup.accessDenied';
          this.toastService.error(this.errorMessage);
          return;
        }

        this.errorMessage = err.error?.messageKey || 'woocommerce.error.unknown';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  confirmCleanup(): void {
    if (!this.cleanupPreview || this.cleanupPreview.affected === 0) {
      return;
    }

    this.showCleanupConfirmDialog = true;
  }

  cancelCleanup(): void {
    this.showCleanupConfirmDialog = false;
  }

  executeCleanup(): void {
    // Can only execute after successful dry-run
    if (!this.cleanupPreview || this.cleaningDescriptions) {
      return;
    }

    this.showCleanupConfirmDialog = false;
    this.cleaningDescriptions = true;
    this.errorMessage = null;

    this.wooCommerceService.cleanDescriptions(this.storeId, false).subscribe({
      next: (response: CleanDescriptionsResponse) => {
        this.cleaningDescriptions = false;
        this.cleanupResult = response;
        
        // Clear preview to prevent re-execution
        this.cleanupPreview = null;

        if (response.updated > 0) {
          this.toastService.success(`woocommerce.cleanup.cleanupSuccess: ${response.updated} Produkte bereinigt`);
        } else {
          this.toastService.info('woocommerce.cleanup.noChanges');
        }
      },
      error: (err) => {
        this.cleaningDescriptions = false;
        
        if (err.status === 401) {
          this.errorMessage = 'woocommerce.cleanup.unauthenticated';
          this.toastService.error(this.errorMessage);
          return;
        }

        if (err.status === 403) {
          this.errorMessage = 'woocommerce.cleanup.accessDenied';
          this.toastService.error(this.errorMessage);
          return;
        }

        this.errorMessage = err.error?.messageKey || 'woocommerce.cleanup.cleanupFailed';
        if (this.errorMessage) {
          this.toastService.error(this.errorMessage);
        }
      }
    });
  }

  truncateText(text: string | null | undefined, maxLength: number = 300): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

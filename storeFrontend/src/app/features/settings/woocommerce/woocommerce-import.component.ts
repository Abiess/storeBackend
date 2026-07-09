import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ToastService } from '@app/core/services/toast.service';
import {
  WooCommerceService,
  WooCommerceConfig,
  WooCommerceConfigRequest,
  WooCommerceTestResponse,
  WooCommercePreviewResponse,
  WooCommerceProductPreview
} from '@app/core/services/woocommerce.service';

/**
 * WooCommerce Import UI.
 * 
 * 4-Schritte-Wizard:
 * 1. Verbindung (Config speichern)
 * 2. Test (Connection testen)
 * 3. Preview (Produkte laden)
 * 4. Import (noch nicht aktiv - disabled)
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
  @Input() storeId!: number;

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

  // Error
  errorMessage: string | null = null;

  constructor(
    private wooCommerceService: WooCommerceService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
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
}

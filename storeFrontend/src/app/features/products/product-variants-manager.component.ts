import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '@app/core/services/product.service';
import { DropshippingService } from '@app/core/services/dropshipping.service';
import { MediaService } from '@app/core/services/media.service';
import { StoreContextService } from '@app/core/services/store-context.service';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { ProductVariant } from '@app/core/models';
import { DropshippingSource, formatMargin } from '@app/core/models/dropshipping.model';
import { SupplierLinkFormComponent } from './supplier-link-form.component';
import { ImageUploadComponent, UploadedImage } from '@app/shared/components/image-upload/image-upload.component';
import { Subscription } from 'rxjs';

interface ProductOption {
  id?: number;
  name: string;
  values: string[];
  sortOrder: number;
}


@Component({
  selector: 'app-product-variants-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MatDialogModule, ImageUploadComponent],
  template: `
    <div class="vm-root">

      <!-- HEADER -->
      <div class="vm-header">
        <div class="vm-header-left">
          <h2 class="vm-title">🎨 {{ 'product.variants.title' | translate }}</h2>
          <p class="vm-subtitle">Konfiguriere Varianten wie Farbe, Größe oder Material</p>
        </div>
        <div class="vm-header-right" *ngIf="variants.length > 0">
          <span class="vm-badge">{{ variants.length }} Varianten</span>
        </div>
      </div>

      <!-- STEP PROGRESS -->
      <div class="vm-stepper">
        <div class="step" [class.done]="options.length > 0">
          <div class="step-circle">
            <span *ngIf="options.length === 0">1</span>
            <span *ngIf="options.length > 0">✓</span>
          </div>
          <span class="step-label">Optionen</span>
        </div>
        <div class="step-line" [class.done]="options.length > 0 && variants.length > 0"></div>
        <div class="step" [class.done]="variants.length > 0">
          <div class="step-circle">
            <span *ngIf="variants.length === 0">2</span>
            <span *ngIf="variants.length > 0">✓</span>
          </div>
          <span class="step-label">Generieren</span>
        </div>
        <div class="step-line" [class.done]="variants.length > 0"></div>
        <div class="step" [class.active]="variants.length > 0">
          <div class="step-circle">3</div>
          <span class="step-label">Bearbeiten</span>
        </div>
      </div>

      <!-- SCHRITT 1: OPTIONS -->
      <div class="vm-card">
        <div class="vm-card-header">
          <div class="vm-card-header-left">
            <span class="vm-step-badge">Schritt 1</span>
            <h3 class="vm-card-title">{{ 'product.variants.defineOptions' | translate }}</h3>
          </div>
          <p class="vm-card-hint">{{ 'product.variants.optionsHint' | translate }}</p>
        </div>

        <div class="options-list">
          <div *ngFor="let option of options; let i = index" class="option-card" [style.border-left-color]="optionColors[i % optionColors.length]">
            <div class="option-card-header">
              <div class="option-color-dot" [style.background]="optionColors[i % optionColors.length]"></div>
              <input
                type="text"
                [(ngModel)]="option.name"
                [placeholder]="'product.variants.optionName' | translate"
                class="option-name-input"
              />
              <span class="option-value-count">{{ getValidValueCount(option) }} Werte</span>
              <button type="button" class="btn-delete" (click)="removeOption(i)" title="Option löschen">🗑️</button>
            </div>

            <div class="tag-editor">
              <div *ngFor="let value of option.values; let j = index; trackBy: trackByIndex" class="tag-chip">
                <input
                  type="text"
                  [value]="option.values[j]"
                  (input)="updateValue(i, j, $event)"
                  class="tag-input"
                  placeholder="z.B. Rot"
                />
                <button type="button" class="tag-remove" (click)="removeValue(i, j)">×</button>
              </div>
              <button type="button" class="tag-add" (click)="addValue(i)">
                ＋ {{ 'product.variants.addValue' | translate }}
              </button>
            </div>
          </div>

          <button type="button" class="btn-add-option" (click)="addOption()">
            <span>＋</span>
            {{ 'product.variants.addOption' | translate }}
          </button>
        </div>
      </div>

      <!-- SCHRITT 2: GENERIEREN -->
      <div class="vm-card" *ngIf="options.length > 0">
        <div class="vm-card-header">
          <div class="vm-card-header-left">
            <span class="vm-step-badge step2">Schritt 2</span>
            <h3 class="vm-card-title">{{ 'product.variants.generateTitle' | translate }}</h3>
          </div>
        </div>

        <div class="generate-row">
          <div class="gen-field">
            <label class="gen-label">💶 {{ 'product.variants.basePrice' | translate }}</label>
            <div class="gen-input-wrap">
              <input type="number" [(ngModel)]="basePrice" step="0.01" min="0" placeholder="0.00" class="gen-input" />
              <span class="gen-unit">€</span>
            </div>
          </div>

          <div class="gen-field">
            <label class="gen-label">📦 {{ 'product.variants.baseStock' | translate }}</label>
            <div class="gen-input-wrap">
              <input type="number" [(ngModel)]="baseStock" min="0" placeholder="0" class="gen-input" />
              <span class="gen-unit">Stk</span>
            </div>
          </div>

          <div class="gen-preview" *ngIf="calculateCombinationsCount() > 0">
            <span class="gen-preview-num">{{ calculateCombinationsCount() }}</span>
            <span class="gen-preview-label">Varianten werden erstellt</span>
          </div>

          <button type="button" class="btn-generate" (click)="generateVariants()" [disabled]="!canGenerate() || generating">
            {{ generating ? '⏳' : '⚡' }}
            {{ generating ? ('common.generating' | translate) : ('product.variants.generate' | translate) }}
          </button>
        </div>

        <!-- Kombinationsvorschau -->
        <div class="combo-matrix" *ngIf="calculateCombinationsCount() > 0 && calculateCombinationsCount() <= 30">
          <p class="combo-matrix-title">Vorschau der Kombinationen:</p>
          <div class="combo-chips">
            <span class="combo-chip" *ngFor="let combo of getComboPreview()">{{ combo }}</span>
          </div>
        </div>
      </div>

      <!-- SCHRITT 3: VARIANTEN BEARBEITEN -->
      <div class="vm-card variants-card" *ngIf="variants.length > 0">
        <div class="vm-card-header">
          <div class="vm-card-header-left">
            <span class="vm-step-badge step3">Schritt 3</span>
            <h3 class="vm-card-title">{{ 'product.variants.generatedVariants' | translate }} ({{ variants.length }})</h3>
          </div>
          <span class="variant-toolbar-hint">Klicke auf eine Variante zum Bearbeiten</span>
        </div>

        <!-- Bulk-Toolbar -->
        <div class="bulk-toolbar">
          <span class="bulk-label">Alle auf einmal setzen:</span>
          <div class="bulk-field">
            <input type="number" [(ngModel)]="bulkPrice" step="0.01" min="0" placeholder="Preis €" class="bulk-input" />
            <button type="button" class="bulk-btn" (click)="applyBulkPrice()" [disabled]="!bulkPrice">Preis setzen</button>
          </div>
          <div class="bulk-field">
            <input type="number" [(ngModel)]="bulkStock" min="0" placeholder="Lager" class="bulk-input" />
            <button type="button" class="bulk-btn" (click)="applyBulkStock()" [disabled]="bulkStock === null || bulkStock === undefined">Lager setzen</button>
          </div>
        </div>

        <!-- Varianten-Accordion -->
        <div class="variants-accordion">
          <div *ngFor="let variant of variants; let i = index"
               class="variant-row"
               [class.expanded]="expandedVariantIndex === i"
               [class.inactive]="variant.isActive === false">

            <!-- Kompakte Zeile -->
            <div class="variant-row-summary" (click)="toggleVariant(i)">
              <div class="variant-row-left">
                <div class="variant-thumb" *ngIf="variant.imageUrl">
                  <img [src]="variant.imageUrl" [alt]="variant.sku" />
                </div>
                <div class="variant-thumb variant-thumb-placeholder" *ngIf="!variant.imageUrl">📦</div>
                <div class="variant-row-info">
                  <div class="variant-row-name">
                    <span *ngIf="variant.option1">{{ variant.option1 }}</span>
                    <span *ngIf="variant.option1 && variant.option2" class="vattr-sep"> / </span>
                    <span *ngIf="variant.option2">{{ variant.option2 }}</span>
                    <span *ngIf="variant.option2 && variant.option3" class="vattr-sep"> / </span>
                    <span *ngIf="variant.option3">{{ variant.option3 }}</span>
                    <!-- Fallback: attributes aus attributesJson -->
                    <span *ngIf="!variant.option1 && !variant.option2 && !variant.option3 && getAttributeLabel(variant)">
                      {{ getAttributeLabel(variant) }}
                    </span>
                    <!-- Letzter Fallback: SKU -->
                    <span *ngIf="!variant.option1 && !variant.option2 && !variant.option3 && !getAttributeLabel(variant)" class="vattr-fallback">
                      {{ variant.sku || 'Variante #' + (i+1) }}
                    </span>
                  </div>
                  <div class="variant-row-sku" *ngIf="variant.sku">SKU: {{ variant.sku }}</div>
                </div>
              </div>

              <div class="variant-row-right">
                <div class="variant-row-price">{{ (variant.price || 0) | number:'1.2-2' }} €</div>
                <div class="variant-stock-pill"
                     [class.pill-green]="variant.stockQuantity > 0"
                     [class.pill-red]="!variant.stockQuantity || variant.stockQuantity === 0">
                  {{ variant.stockQuantity > 0 ? variant.stockQuantity + ' Stk' : 'Ausverkauft' }}
                </div>
                <span *ngIf="hasSupplierLink(variant)" class="ds-indicator" title="Dropshipping">🚚</span>
                <span *ngIf="variant.isActive === false" class="inactive-badge">Inaktiv</span>
                <span class="expand-btn">{{ expandedVariantIndex === i ? '▲' : '▼' }}</span>
              </div>
            </div>

            <!-- Ausgeklapptes Formular -->
            <div class="variant-detail" *ngIf="expandedVariantIndex === i">
              <!-- Bilder -->
              <div class="detail-section-title">📸 Bilder</div>
              <app-image-upload
                [images]="getVariantImages(variant)"
                [multiple]="true"
                (imagesChange)="onVariantImagesChange(variant, $event)"
              ></app-image-upload>

              <!-- Felder -->
              <div class="detail-fields">
                <div class="detail-field">
                  <label>SKU</label>
                  <input type="text" [(ngModel)]="variant.sku" class="df-input" placeholder="Varianten-SKU" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.barcode' | translate }}</label>
                  <input type="text" [(ngModel)]="variant.barcode" class="df-input" placeholder="EAN/Barcode" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.price' | translate }} (€) *</label>
                  <input type="number" [(ngModel)]="variant.price" step="0.01" min="0" class="df-input" placeholder="0.00" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.comparePrice' | translate }} (€)</label>
                  <input type="number" [(ngModel)]="variant.comparePrice" step="0.01" min="0" class="df-input" placeholder="0.00" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.costPrice' | translate }} (€)</label>
                  <input type="number" [(ngModel)]="variant.costPrice" step="0.01" min="0" class="df-input" placeholder="0.00" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.stock' | translate }}</label>
                  <input type="number" [(ngModel)]="variant.stockQuantity" min="0" class="df-input" placeholder="0" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.weight' | translate }} (kg)</label>
                  <input type="number" [(ngModel)]="variant.weight" step="0.001" min="0" class="df-input" placeholder="0.000" />
                </div>
                <div class="detail-field">
                  <label>{{ 'product.variants.active' | translate }}</label>
                  <select [(ngModel)]="variant.isActive" class="df-input">
                    <option [value]="true">{{ 'common.yes' | translate }}</option>
                    <option [value]="false">{{ 'common.no' | translate }}</option>
                  </select>
                </div>
              </div>

              <!-- Aktionen -->
              <div class="detail-actions">
                <button type="button" class="btn-ds" [class.btn-ds-active]="hasSupplierLink(variant)" (click)="openSupplierLinkDialog(variant)">
                  🚚 {{ hasSupplierLink(variant) ? 'Dropshipping bearbeiten' : 'Dropshipping hinzufügen' }}
                  <span *ngIf="getSupplierLink(variant) as src" class="ds-margin">
                    {{ formatMargin(src.marginPercentage || 0) }} Marge
                  </span>
                </button>
                <button type="button" class="btn-delete-variant" (click)="removeVariant(i)">
                  🗑️ Variante löschen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Speichern -->
        <div class="save-bar">
          <button type="button" class="btn-save-all" (click)="saveAllVariants()" [disabled]="saving">
            {{ saving ? '⏳' : '💾' }}
            {{ saving ? ('common.saving' | translate) : ('product.variants.saveAll' | translate) }}
          </button>
        </div>
      </div>

      <!-- LEERER ZUSTAND -->
      <div class="empty-state" *ngIf="variants.length === 0 && options.length === 0">
        <div class="empty-icon">🎨</div>
        <h3>Noch keine Varianten</h3>
        <p>Füge Optionen wie <strong>Farbe</strong> oder <strong>Größe</strong> hinzu und generiere automatisch alle Kombinationen.</p>
      </div>

      <!-- STATUS -->
      <div class="vm-toast vm-toast-success" *ngIf="successMessage" (click)="successMessage = ''">
        ✅ {{ successMessage }} <span class="toast-close">×</span>
      </div>
      <div class="vm-toast vm-toast-error" *ngIf="errorMessage" (click)="errorMessage = ''">
        ❌ {{ errorMessage }} <span class="toast-close">×</span>
      </div>
    </div>
  `,
  styles: [`
    .vm-root { display: flex; flex-direction: column; gap: 1.5rem; }

    /* Header */
    .vm-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
    .vm-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #222; }
    .vm-subtitle { margin: 0.2rem 0 0; font-size: 0.875rem; color: #999; }
    .vm-badge { padding: 0.4rem 1rem; background: #f0f4ff; border: 1.5px solid #c5d0ff; color: #667eea; border-radius: 20px; font-weight: 700; font-size: 0.875rem; }

    /* Stepper */
    .vm-stepper { display: flex; align-items: center; padding: 1.25rem 1.5rem; background: white; border-radius: 14px; border: 1px solid #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .step-circle { width: 36px; height: 36px; border-radius: 50%; background: #f0f0f0; color: #aaa; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; transition: all 0.3s; }
    .step.done .step-circle { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .step.active .step-circle { background: white; border: 2.5px solid #667eea; color: #667eea; }
    .step-label { font-size: 0.75rem; font-weight: 600; color: #bbb; white-space: nowrap; }
    .step.done .step-label, .step.active .step-label { color: #667eea; }
    .step-line { flex: 1; height: 3px; background: #eee; margin: 0 0.5rem 1.4rem; border-radius: 2px; transition: background 0.3s; }
    .step-line.done { background: linear-gradient(90deg, #667eea, #764ba2); }

    /* Card */
    .vm-card { background: white; border-radius: 14px; border: 1px solid #eee; box-shadow: 0 2px 12px rgba(0,0,0,0.05); overflow: hidden; }
    .vm-card-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #f3f3f3; background: #fafafa; gap: 1rem; flex-wrap: wrap; }
    .vm-card-header-left { display: flex; align-items: center; gap: 0.75rem; }
    .vm-step-badge { padding: 0.2rem 0.65rem; background: #667eea; color: white; border-radius: 12px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .vm-step-badge.step2 { background: #20c997; }
    .vm-step-badge.step3 { background: #764ba2; }
    .vm-card-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #333; }
    .vm-card-hint { margin: 0; font-size: 0.825rem; color: #999; }

    /* Options */
    .options-list { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .option-card { border: 1.5px solid #eaeaea; border-left-width: 4px; border-radius: 10px; padding: 1.25rem; background: #fdfdfd; transition: box-shadow 0.2s; }
    .option-card:hover { box-shadow: 0 4px 16px rgba(102,126,234,0.1); }
    .option-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .option-color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .option-name-input { flex: 1; padding: 0.6rem 0.9rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; font-weight: 600; color: #333; transition: border-color 0.2s; }
    .option-name-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.12); }
    .option-value-count { font-size: 0.75rem; color: #bbb; white-space: nowrap; }
    .btn-delete { background: none; border: none; cursor: pointer; padding: 0.35rem; border-radius: 6px; opacity: 0.5; transition: opacity 0.2s, background 0.2s; }
    .btn-delete:hover { opacity: 1; background: #ffeef0; }

    .tag-editor { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .tag-chip { display: flex; align-items: center; background: #f0f4ff; border: 1.5px solid #c5d0ff; border-radius: 20px; overflow: hidden; transition: border-color 0.2s; }
    .tag-chip:focus-within { border-color: #667eea; box-shadow: 0 0 0 2px rgba(102,126,234,0.15); }
    .tag-input { border: none; background: transparent; padding: 0.35rem 0.6rem; font-size: 0.875rem; font-weight: 600; color: #3a4ba0; width: 90px; }
    .tag-input:focus { outline: none; }
    .tag-remove { background: rgba(102,126,234,0.15); border: none; cursor: pointer; padding: 0.3rem 0.5rem; font-size: 1rem; color: #667eea; line-height: 1; transition: background 0.2s; }
    .tag-remove:hover { background: #e53935; color: white; }
    .tag-add { display: flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.85rem; border: 1.5px dashed #667eea; background: transparent; color: #667eea; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .tag-add:hover { background: #f0f4ff; border-style: solid; }
    .btn-add-option { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem; border: 2px dashed #c5c5c5; background: #fafafa; color: #888; border-radius: 10px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; }
    .btn-add-option:hover { border-color: #667eea; color: #667eea; background: #f0f4ff; }

    /* Generate */
    .generate-row { display: flex; align-items: flex-end; gap: 1rem; padding: 1.5rem; flex-wrap: wrap; }
    .gen-field { display: flex; flex-direction: column; gap: 0.4rem; min-width: 140px; }
    .gen-label { font-size: 0.8rem; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    .gen-input-wrap { display: flex; align-items: center; border: 1.5px solid #ddd; border-radius: 8px; overflow: hidden; background: white; }
    .gen-input-wrap:focus-within { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.12); }
    .gen-input { flex: 1; border: none; padding: 0.65rem 0.75rem; font-size: 0.95rem; font-weight: 600; width: 100px; }
    .gen-input:focus { outline: none; }
    .gen-unit { padding: 0 0.75rem; font-size: 0.8rem; color: #aaa; font-weight: 600; background: #f8f8f8; border-left: 1px solid #eee; align-self: stretch; display: flex; align-items: center; }
    .gen-preview { display: flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1.1rem; background: #f0f4ff; border-radius: 8px; border: 1.5px solid #c5d0ff; }
    .gen-preview-num { font-size: 1.4rem; font-weight: 800; color: #667eea; }
    .gen-preview-label { font-size: 0.8rem; color: #667eea; font-weight: 600; }
    .btn-generate { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.75rem; background: linear-gradient(135deg, #20c997, #12b886); color: white; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .btn-generate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(32,201,151,0.35); }
    .btn-generate:disabled { opacity: 0.55; cursor: not-allowed; }
    .combo-matrix { padding: 0 1.5rem 1.5rem; }
    .combo-matrix-title { font-size: 0.8rem; font-weight: 600; color: #aaa; margin: 0 0 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .combo-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .combo-chip { padding: 0.25rem 0.65rem; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 0.78rem; color: #555; }

    /* Variants */
    .variant-toolbar-hint { font-size: 0.8rem; color: #bbb; font-style: italic; }
    .bulk-toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; background: #f9fafb; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
    .bulk-label { font-size: 0.8rem; font-weight: 700; color: #888; white-space: nowrap; }
    .bulk-field { display: flex; align-items: center; gap: 0.4rem; }
    .bulk-input { padding: 0.4rem 0.65rem; border: 1.5px solid #ddd; border-radius: 7px; font-size: 0.85rem; width: 90px; }
    .bulk-input:focus { outline: none; border-color: #667eea; }
    .bulk-btn { padding: 0.4rem 0.85rem; background: #667eea; color: white; border: none; border-radius: 7px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .bulk-btn:hover:not(:disabled) { background: #5a6fd6; }
    .bulk-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .variants-accordion { display: flex; flex-direction: column; }
    .variant-row { border-bottom: 1px solid #f0f0f0; transition: background 0.15s; }
    .variant-row:last-child { border-bottom: none; }
    .variant-row.inactive { opacity: 0.55; }

    .variant-row-summary { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.5rem; cursor: pointer; gap: 1rem; transition: background 0.15s; }
    .variant-row-summary:hover { background: #f9f9ff; }
    .variant-row.expanded .variant-row-summary { background: #f3f4ff; }
    .variant-row-left { display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0; }
    .variant-thumb { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; border: 1.5px solid #eee; display: flex; align-items: center; justify-content: center; }
    .variant-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .variant-thumb-placeholder { background: #f3f4f6; font-size: 1.2rem; }
    .variant-row-info { min-width: 0; }
    .variant-row-name { font-size: 0.95rem; font-weight: 700; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vattr-sep { color: #ccc; margin: 0 0.2rem; }
    .vattr-fallback { color: #999; font-weight: 600; }
    .variant-row-sku { font-size: 0.75rem; color: #bbb; margin-top: 0.15rem; }
    .variant-row-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    .variant-row-price { font-size: 1rem; font-weight: 700; color: #333; white-space: nowrap; }
    .variant-stock-pill { padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .pill-green { background: #d4edda; color: #155724; }
    .pill-red { background: #f8d7da; color: #721c24; }
    .ds-indicator { font-size: 1rem; }
    .inactive-badge { padding: 0.2rem 0.55rem; background: #f0f0f0; color: #999; border-radius: 10px; font-size: 0.72rem; font-weight: 700; }
    .expand-btn { font-size: 0.75rem; color: #bbb; padding: 0.2rem 0.4rem; }

    .variant-detail { padding: 1.5rem; background: #f9faff; border-top: 1px solid #e8ecff; display: flex; flex-direction: column; gap: 1.5rem; animation: slideDown 0.2s ease; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .detail-section-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 0.75rem; }
    .detail-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1rem; }
    .detail-field { display: flex; flex-direction: column; gap: 0.3rem; }
    .detail-field label { font-size: 0.72rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
    .df-input { padding: 0.55rem 0.75rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.875rem; background: white; transition: border-color 0.2s; }
    .df-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.12); }
    .detail-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn-ds { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.1rem; border: 1.5px dashed #ccc; background: white; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; color: #555; transition: all 0.2s; }
    .btn-ds:hover { border-color: #667eea; color: #667eea; background: #f0f4ff; }
    .btn-ds.btn-ds-active { border-style: solid; border-color: #20c997; background: #f0fdf8; color: #0d7057; }
    .ds-margin { font-size: 0.8rem; padding: 0.15rem 0.5rem; background: #d4f5ec; border-radius: 10px; color: #0d7057; font-weight: 700; }
    .btn-delete-variant { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.1rem; border: 1.5px solid #ffd0d0; background: white; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 600; color: #c62828; transition: all 0.2s; }
    .btn-delete-variant:hover { background: #ffeef0; border-color: #e53935; }

    .save-bar { padding: 1.25rem 1.5rem; border-top: 1px solid #eee; display: flex; justify-content: flex-end; background: #fafafa; }
    .btn-save-all { display: flex; align-items: center; gap: 0.6rem; padding: 0.85rem 2.5rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-save-all:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(102,126,234,0.4); }
    .btn-save-all:disabled { opacity: 0.55; cursor: not-allowed; }

    .empty-state { text-align: center; padding: 3rem 2rem; background: white; border-radius: 14px; border: 2px dashed #e5e7eb; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .empty-state h3 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #555; }
    .empty-state p { margin: 0; font-size: 0.875rem; color: #999; line-height: 1.6; }

    .vm-toast { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.9rem; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .vm-toast-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
    .vm-toast-error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    .toast-close { margin-left: auto; opacity: 0.6; font-size: 1.2rem; }

    @media (max-width: 640px) {
      .vm-stepper { padding: 1rem; }
      .step-label { display: none; }
      .generate-row { flex-direction: column; align-items: stretch; }
      .btn-generate { justify-content: center; }
      .variant-row-summary { padding: 0.75rem 1rem; }
      .detail-fields { grid-template-columns: 1fr 1fr; }
      .bulk-toolbar { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class ProductVariantsManagerComponent implements OnInit, OnDestroy {
  @Input() productId!: number;
  
  private storeId: number | null = null;
  private storeIdSubscription?: Subscription;

  options: ProductOption[] = [];
  variants: ProductVariant[] = [];

  // Dropshipping: Cache für Supplier-Links
  supplierLinks = new Map<number, DropshippingSource>();

  basePrice: number = 0;
  baseStock: number = 0;

  // Neue UX Properties
  expandedVariantIndex: number | null = null;
  bulkPrice: number | null = null;
  bulkStock: number | null = null;
  readonly optionColors = ['#667eea', '#20c997', '#fd7e14', '#e91e63', '#9c27b0', '#2196f3'];

  generating = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private dropshippingService: DropshippingService,
    private mediaService: MediaService,
    private dialog: MatDialog,
    private storeContext: StoreContextService
  ) {}

  ngOnInit() {
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      if (id !== null) {
        this.storeId = id;
        this.loadExistingData();
        this.loadSupplierLinks();
      }
    });
  }

  ngOnDestroy() {
    this.storeIdSubscription?.unsubscribe();
  }

  loadExistingData() {
    // Lade existierende Options und Varianten
    if (this.productId && this.storeId) {
      this.productService.getProductOptions(this.storeId, this.productId).subscribe({
        next: (options) => {
          this.options = options;
        },
        error: (err) => console.error('Error loading options:', err)
      });

      this.productService.getProductVariants(this.storeId, this.productId).subscribe({
        next: (variants) => {
          this.variants = variants;
        },
        error: (err) => console.error('Error loading variants:', err)
      });
    }
  }

  addOption() {
    this.options.push({
      name: '',
      values: [''],
      sortOrder: this.options.length
    });
  }

  removeOption(index: number) {
    this.options.splice(index, 1);
  }

  addValue(optionIndex: number) {
    this.options[optionIndex].values.push('');
  }

  removeValue(optionIndex: number, valueIndex: number) {
    this.options[optionIndex].values.splice(valueIndex, 1);
  }

  /**
   * TrackBy-Funktion für ngFor um unnötiges Re-Rendering zu vermeiden
   */
  trackByIndex(index: number, item: any): number {
    return index;
  }

  /**
   * Aktualisiert einen Value ohne ngModel (verhindert Focus-Verlust)
   */
  updateValue(optionIndex: number, valueIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.options[optionIndex].values[valueIndex] = input.value;
  }

  canGenerate(): boolean {
    if (!this.options || this.options.length === 0) return false;

    for (const option of this.options) {
      if (!option || !option.name || option.name.trim() === '') return false;
      if (!option.values || option.values.length === 0) return false;
      for (const value of option.values) {
        if (!value || value.trim() === '') return false;
      }
    }

    return this.basePrice > 0;
  }

  calculateCombinationsCount(): number {
    if (!this.options || this.options.length === 0) return 0;

    let count = 1;
    for (const option of this.options) {
      if (!option || !option.values || option.values.length === 0) {
        return 0;
      }
      const validValues = option.values.filter(v => v && v.trim() !== '');
      if (validValues.length === 0) {
        return 0;
      }
      count *= validValues.length;
    }
    return count;
  }

  generateVariants() {
    if (!this.canGenerate()) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      return;
    }

    if (this.storeId === null) {
      this.errorMessage = 'Fehler: Store-Kontext nicht verfügbar';
      return;
    }

    this.generating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = {
      productId: this.productId,
      basePrice: this.basePrice,
      baseStock: this.baseStock,
      options: this.options
    };

    this.productService.generateVariants(this.storeId, this.productId, request).subscribe({
      next: (variants) => {
        this.variants = variants;
        this.successMessage = `${variants.length} Varianten erfolgreich generiert!`;
        this.generating = false;

        // Speichere auch die Options
        this.saveOptions();
      },
      error: (err) => {
        console.error('Error generating variants:', err);
        this.errorMessage = 'Fehler beim Generieren der Varianten: ' + (err.error?.message || err.message);
        this.generating = false;
      }
    });
  }

  saveOptions() {
    if (this.storeId === null) return;

    // Speichere oder aktualisiere jede Option
    this.options.forEach((option, index) => {
      option.sortOrder = index;

      if (option.id && this.storeId !== null) {
        // Update existing
        this.productService.updateProductOption(this.storeId, this.productId, option.id, option).subscribe({
          error: (err) => console.error('Error updating option:', err)
        });
      } else if (this.storeId !== null) {
        // Create new
        this.productService.createProductOption(this.storeId, this.productId, option).subscribe({
          next: (created) => {
            option.id = created.id;
          },
          error: (err) => console.error('Error creating option:', err)
        });
      }
    });
  }

  saveAllVariants() {
    if (this.storeId === null) {
      this.errorMessage = 'Fehler: Store-Kontext nicht verfügbar';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const storeId = this.storeId; // Capture for use in closures

    const updates = this.variants.map((variant) => {
      if (variant.id) {
        return this.productService.updateProductVariant(
          storeId,
          this.productId,
          variant.id,
          variant
        );
      } else {
        return this.productService.createProductVariant(
          storeId,
          this.productId,
          variant
        );
      }
    });

    // Warte auf alle Updates
    Promise.all(updates.map(obs => obs.toPromise()))
      .then(() => {
        this.successMessage = 'Alle Varianten erfolgreich gespeichert!';
        this.saving = false;
        setTimeout(() => this.successMessage = '', 3000);
      })
      .catch((err) => {
        console.error('Error saving variants:', err);
        this.errorMessage = 'Fehler beim Speichern der Varianten: ' + (err.error?.message || err.message);
        this.saving = false;
      });
  }

  removeVariant(index: number) {
    const variant = this.variants[index];

    if (variant.id && this.storeId !== null) {
      // Lösche vom Server
      this.productService.deleteProductVariant(this.storeId, this.productId, variant.id).subscribe({
        next: () => {
          this.variants.splice(index, 1);
          this.successMessage = 'Variante gelöscht!';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (err) => {
          console.error('Error deleting variant:', err);
          this.errorMessage = 'Fehler beim Löschen: ' + (err.error?.message || err.message);
        }
      });
    } else {
      // Nur lokal entfernen
      this.variants.splice(index, 1);
    }
  }

  getAttributesArray(attributes: { [key: string]: string } | undefined): Array<{ key: string, value: string }> {
    return Object.entries(attributes || {}).map(([key, value]) => ({ key, value }));
  }

  /** Gibt Anzahl der gültigen Werte einer Option zurück (für Template) */
  getValidValueCount(option: ProductOption): number {
    return option.values.filter(v => v && v.trim() !== '').length;
  }

  /**
   * Gibt Anzeige-Label aus attributes zurück wenn option1/2/3 nicht gesetzt sind.
   * Fallback für Varianten die über generateVariants mit attributesJson erstellt wurden.
   */
  getAttributeLabel(variant: ProductVariant): string {
    if (variant.attributes && Object.keys(variant.attributes).length > 0) {
      return Object.values(variant.attributes).join(' / ');
    }
    // Fallback: attributesJson manuell parsen
    if (variant.attributesJson) {
      try {
        const attrs = JSON.parse(variant.attributesJson) as Record<string, string>;
        return Object.values(attrs).join(' / ');
      } catch { /* ignorieren */ }
    }
    return '';
  }

  /** Accordion Toggle */
  toggleVariant(index: number): void {
    this.expandedVariantIndex = this.expandedVariantIndex === index ? null : index;
  }

  /** Preis bulk für alle Varianten setzen */
  applyBulkPrice(): void {
    if (this.bulkPrice === null || this.bulkPrice === undefined) return;
    this.variants.forEach(v => v.price = this.bulkPrice!);
    this.successMessage = `Preis ${this.bulkPrice} € auf alle Varianten gesetzt`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  /** Lager bulk für alle Varianten setzen */
  applyBulkStock(): void {
    if (this.bulkStock === null || this.bulkStock === undefined) return;
    this.variants.forEach(v => v.stockQuantity = this.bulkStock!);
    this.successMessage = `Lager ${this.bulkStock} Stk auf alle Varianten gesetzt`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  /** Vorschau aller Kombinationen für die Matrix */
  getComboPreview(): string[] {
    if (!this.options || this.options.length === 0) return [];
    const validOptions = this.options
      .map(o => o.values.filter(v => v && v.trim() !== ''))
      .filter(vals => vals.length > 0);
    if (validOptions.length === 0) return [];

    let combos: string[] = [''];
    for (const values of validOptions) {
      const newCombos: string[] = [];
      for (const existing of combos) {
        for (const val of values) {
          newCombos.push(existing ? `${existing} / ${val}` : val);
        }
      }
      combos = newCombos;
    }
    return combos.slice(0, 30); // max 30 anzeigen
  }

  // ==================================================================================
  // DROPSHIPPING METHODS
  // ==================================================================================

  /**
   * Lädt Supplier-Links für alle Varianten
   */
  loadSupplierLinks() {
    if (!this.productId) return;

    this.dropshippingService.getSupplierLinksForProduct(this.productId).subscribe({
      next: (sources) => {
        // Cache in Map für schnellen Zugriff
        sources.forEach(source => {
          if (source.variantId) {
            this.supplierLinks.set(source.variantId, source);
          }
        });
      },
      error: (err) => {
        // Kein Fehler anzeigen - 404 ist normal wenn keine Links vorhanden
        if (err.status !== 404) {
          console.error('Error loading supplier links:', err);
        }
      }
    });
  }

  /**
   * Prüft ob Variant einen Supplier-Link hat
   */
  hasSupplierLink(variant: ProductVariant): boolean {
    return variant.id ? this.supplierLinks.has(variant.id) : false;
  }

  /**
   * Holt Supplier-Link für Variant
   */
  getSupplierLink(variant: ProductVariant): DropshippingSource | undefined {
    return variant.id ? this.supplierLinks.get(variant.id) : undefined;
  }

  /**
   * Öffnet Supplier-Link Dialog
   */
  openSupplierLinkDialog(variant: ProductVariant) {
    if (!variant.id) {
      alert('Bitte speichere die Variante zuerst, bevor du einen Supplier-Link hinzufügst.');
      return;
    }

    const existingSource = this.getSupplierLink(variant);

    const dialogRef = this.dialog.open(SupplierLinkFormComponent, {
      width: '600px',
      data: {
        variantId: variant.id,
        variantPrice: variant.price,
        existingSource: existingSource
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'deleted') {
        // Entferne aus Cache
        if (variant.id) {
          this.supplierLinks.delete(variant.id);
        }
        this.successMessage = 'Supplier-Link gelöscht';
        setTimeout(() => this.successMessage = '', 3000);
      } else if (result) {
        // Update Cache
        if (variant.id) {
          this.supplierLinks.set(variant.id, result);
        }
        this.successMessage = 'Supplier-Link gespeichert';
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }

  /**
   * Formatiert Marge für Anzeige
   */
  formatMargin(margin: number): string {
    return formatMargin(margin);
  }

  /**
   * Holt die Bilder einer Variante für die Image-Upload-Komponente
   */
  getVariantImages(variant: ProductVariant): UploadedImage[] {
    if (!variant.images) {
      return [];
    }

    const imageUrls = variant.images || [];
    return imageUrls.map((url, index) => ({
      mediaId: index + 1,
      url,
      filename: url.split('/').pop() || `variant-image-${index}`,
      file: undefined,
      uploadProgress: 100,
      isPrimary: index === 0
    }));
  }

  /**
   * Wird aufgerufen, wenn sich die Bilder einer Variante ändern
   */
  onVariantImagesChange(variant: ProductVariant, images: UploadedImage[]): void {
    console.log('📸 Variant images changed:', { variantId: variant.id, imageCount: images.length });

    // Extrahiere URLs aus UploadedImage
    const imageUrls = images
      .filter(img => img.url)
      .map(img => img.url as string);

    // Aktualisiere die Variante (einheitlich über images)
    variant.images = imageUrls;

    // Wenn ein Bild vorhanden ist, setze das erste als Haupt-Bild
    if (imageUrls.length > 0) {
      variant.imageUrl = imageUrls[0];
    } else {
      variant.imageUrl = undefined;
    }

    console.log('✅ Variant updated with images:', { 
      variantId: variant.id, 
      imageCount: imageUrls.length,
      mainImage: variant.imageUrl 
    });
  }
}



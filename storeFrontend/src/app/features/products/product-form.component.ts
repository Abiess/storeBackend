import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { MediaService } from '@app/core/services/media.service';
import { ProductOptionService } from '@app/core/services/product-option.service';
import { StoreContextService } from '@app/core/services/store-context.service';
import { Category, ProductStatus, AiProductSuggestion, AiProductSuggestionV2 } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { ProductVariantsManagerComponent } from './product-variants-manager.component';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { ImageUploadComponent, UploadedImage } from '@app/shared/components/image-upload/image-upload.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, ProductVariantsManagerComponent, PageHeaderComponent, ImageUploadComponent],
  template: `
    <!-- Fixed Top-Right Loading Indicator -->
    <div class="ai-loading-overlay" *ngIf="aiGenerating || uploadingImages">
      <span class="spinner-pulse"></span>
      <span class="loading-text">
        <span class="dot-animation" *ngIf="aiGenerating">KI analysiert Ihr Bild</span>
        <span class="dot-animation" *ngIf="uploadingImages">Bilder werden hochgeladen</span>
        <span class="dots">
          <span class="dot">.</span>
          <span class="dot">.</span>
          <span class="dot">.</span>
        </span>
      </span>
    </div>

    <div class="product-form-container">
      <app-page-header
        [title]="isEditMode ? 'product.edit' : 'product.new'"
        [breadcrumbs]="breadcrumbItems"
        [showBackButton]="true"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <div 
          *ngFor="let tab of tabs" 
          class="tab-item"
          [class.active]="activeTab === tab.id"
          (click)="setActiveTab(tab.id)"
          [title]="tab.label"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label | translate }}</span>
        </div>
      </div>

      <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="product-form">
        
        <!-- Basisinformationen (Tab: Basic Info) -->
        <div class="form-card" *ngIf="activeTab === 'basic'">
          <h2>{{ 'product.info' | translate }}</h2>
          
          <div class="form-group">
            <label for="title">{{ 'product.name' | translate }} *</label>
            <input 
              id="title"
              type="text" 
              formControlName="title"
              [placeholder]="'product.placeholder.name' | translate"
              [class.error]="productForm.get('title')?.invalid && productForm.get('title')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('title')?.invalid && productForm.get('title')?.touched">
              {{ 'product.required.name' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="sku">{{ 'product.sku' | translate }}</label>
            <input 
              id="sku"
              type="text" 
              formControlName="sku"
              [placeholder]="'product.placeholder.sku' | translate"
              [class.error]="productForm.get('sku')?.invalid && productForm.get('sku')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('sku')?.invalid && productForm.get('sku')?.touched">
              {{ 'product.required.sku' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="description">{{ 'product.description' | translate }} *</label>
            <textarea 
              id="description"
              formControlName="description"
              rows="4"
              [placeholder]="'product.placeholder.description' | translate"
              [class.error]="productForm.get('description')?.invalid && productForm.get('description')?.touched"
            ></textarea>
            <div class="error-message" *ngIf="productForm.get('description')?.invalid && productForm.get('description')?.touched">
              {{ 'product.required.description' | translate }}
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="basePrice">{{ 'product.price' | translate }} (â‚¬) *</label>
              <input 
                id="basePrice"
                type="number" 
                formControlName="basePrice"
                step="0.01"
                min="0"
                placeholder="0.00"
                [class.error]="productForm.get('basePrice')?.invalid && productForm.get('basePrice')?.touched"
              />
              <div class="error-message" *ngIf="productForm.get('basePrice')?.invalid && productForm.get('basePrice')?.touched">
                {{ 'product.required.price' | translate }}
              </div>
            </div>

            <div class="form-group">
              <label for="status">{{ 'product.status' | translate }}</label>
              <select id="status" formControlName="status">
                <option value="DRAFT">{{ 'status.draft' | translate }}</option>
                <option value="ACTIVE">{{ 'status.active' | translate }}</option>
                <option value="ARCHIVED">{{ 'status.archived' | translate }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="categoryId">{{ 'product.category' | translate }} *</label>
            <select id="categoryId" formControlName="categoryId" [class.error]="productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched">
              <option [ngValue]="null">{{ 'category.select' | translate }}</option>
              <option *ngFor="let category of categories" [ngValue]="category.id">
                {{ category.name }}
              </option>
            </select>
            <div class="error-message" *ngIf="productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched">
              {{ 'validation.required' | translate }}
            </div>
          </div>
        </div>

        <!-- KI-Assistent (Tab: AI) - Nutzt image-upload.component im AI-Mode -->
        <div class="form-card ai-assistant-card" *ngIf="activeTab === 'ai'">
          <h2>🤖 KI-Assistent (Multi-Bild)</h2>
          
          <div class="ai-intro">
            <p>✨ <strong>Mehrfach-Bild KI-Analyse:</strong> Laden Sie mehrere Produktfotos hoch und die KI generiert automatisch Produktdaten für jedes Bild.</p>
            <ul>
              <li>📸 Laden Sie ein oder mehrere Produktfotos hoch</li>
              <li>🤖 KI analysiert jedes Bild automatisch (mehrsprachig: de/en/ar)</li>
              <li>✅ Wählen Sie die gewünschten Vorschläge aus</li>
              <li>💾 Ausgewählte Bilder werden beim Speichern dem Produkt zugeordnet</li>
            </ul>
          </div>

          <!-- NEU: AI Model Auswahl -->
          <div class="ai-model-selection">
            <label for="aiModelSelect">🤖 KI-Modell:</label>
            <select 
              id="aiModelSelect" 
              [(ngModel)]="selectedAiModel"
              class="model-select"
            >
              <option 
                *ngFor="let model of availableAiModels" 
                [value]="model.value"
              >
                {{ model.label }}
              </option>
            </select>
            <span class="model-info">
              ℹ️ {{ selectedAiModel === 'zai-org/GLM-4.5V' ? 'Premium Modell (Standard)' : 'Kostenloses Modell' }}
            </span>
          </div>

          <!-- Wiederverwendung der image-upload Komponente im AI-Modus -->
          <div class="ai-upload-section">
            <h3>1. Produktbilder hochladen</h3>
            
            <app-image-upload
              [aiMode]="true"
              [multiple]="true"
              [showPrimary]="false"
              [showSelection]="true"
              [showAiGenerate]="true"
              [maxSizeMb]="10"
              uploadLabel="📷 Bilder auswählen (mehrere möglich)"
              emptyLabel="Noch keine Bilder für KI-Analyse ausgewählt"
              [(images)]="aiImages"
              (aiGenerateRequest)="onAiGenerateRequest($event)"
              (selectionChanged)="onAiSelectionChanged($event)"
              (uploadError)="aiError = $event"
            ></app-image-upload>

            <!-- Generate All Button -->
            <button 
              type="button" 
              class="btn-ai-generate-all"
              [disabled]="aiImages.length === 0 || isAnyImageGenerating()"
              (click)="generateAiSuggestionsForAll()"
            >
              <span class="btn-content">
                <span class="btn-icon">🚀</span>
                <span class="btn-text">KI-Analyse für alle Bilder starten</span>
              </span>
            </button>
          </div>

          <!-- AI Error Message -->
          <div class="ai-error" *ngIf="aiError">
            ⚠️ {{ aiError }}
          </div>

          <!-- Selected AI Suggestion Details -->
          <div class="ai-result-section" *ngIf="aiImages.length > 0 && getSelectedAiSuggestion()">
            <h3>2. Ausgewählter KI-Vorschlag (Vorschau)</h3>
            
            <div class="ai-result-card ai-result-v2">
              <div class="ai-result-grid">
                <div class="ai-result-field">
                  <label>📝 Produkttitel</label>
                  <div class="ai-result-value">{{ getSelectedAiSuggestion()?.title }}</div>
                </div>

                <div class="ai-result-field">
                  <label>🏷️ Kategorie</label>
                  <div class="ai-result-value">{{ getSelectedAiSuggestion()?.category || 'Keine' }}</div>
                </div>

                <div class="ai-result-field">
                  <label>💰 Preisempfehlung</label>
                  <div class="ai-result-value ai-price">{{ getSelectedAiSuggestion()?.suggestedPrice ? (getSelectedAiSuggestion()!.suggestedPrice | number:'1.2-2') + ' €' : 'Keine' }}</div>
                </div>

                <div class="ai-result-field full-width">
                  <label>📄 Beschreibung</label>
                  <div class="ai-result-value ai-description">{{ getSelectedAiSuggestion()?.description }}</div>
                </div>

                <div class="ai-result-field">
                  <label>🏷️ Tags</label>
                  <div class="ai-result-value ai-tags">
                    <span class="tag" *ngFor="let tag of getSelectedAiSuggestion()?.tags">{{ tag }}</span>
                    <span *ngIf="!getSelectedAiSuggestion()?.tags || getSelectedAiSuggestion()!.tags.length === 0" class="no-data">Keine Tags</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="ai-actions">
              <button type="button" class="btn-use-suggestion" 
                      (click)="useSelectedAiSuggestions()"
                      [disabled]="getSelectedImagesCount() === 0">
                ✅ {{ getSelectedImagesCount() > 0 ? getSelectedImagesCount() + ' Bild(er)' : 'Bilder' }} übernehmen
              </button>
              <button type="button" class="btn-regenerate" (click)="generateAiSuggestionsForAll()">
                🔄 Alle neu generieren
              </button>
            </div>
          </div>

          <div class="ai-info-note">
            💡 <strong>Hinweis:</strong> Wählen Sie die gewünschten Bilder aus (Checkbox). Die ausgewählten Bilder und der beste KI-Vorschlag werden beim Speichern übernommen.
          </div>
        </div>

        <!-- Foto-Upload Bereich (Tab: Media) -->
        <div class="form-card" *ngIf="activeTab === 'media'">
          <h2>📷 {{ 'product.images' | translate }}</h2>

          <app-image-upload
            mediaType="PRODUCT_IMAGE"
            [multiple]="true"
            [showPrimary]="true"
            uploadLabel="{{ 'media.uploadImages' | translate }}"
            emptyLabel="{{ 'media.noMedia' | translate }}"
            [(images)]="uploadedImages"
            (uploadError)="errorMessage = $event"
          ></app-image-upload>
        </div>

        <!-- Varianten Konfiguration (Tab: Varianten) -->
        <div class="form-card" *ngIf="activeTab === 'variants'">
          <h2>🎨 Produktvarianten</h2>
          
          <p class="variants-hint">
            💡 Verwalten Sie hier Ihre Produktvarianten. Passen Sie Preise, SKUs und LagerbestÃ¤nde individuell an.
          </p>

          <!-- Verwende die funktionierende ProductVariantsManagerComponent -->
          <app-product-variants-manager 
            *ngIf="productId"
            [productId]="productId">
          </app-product-variants-manager>

          <!-- Hinweis im Create-Modus -->
          <div *ngIf="!productId" class="info-banner">
            ℹ️ <strong>Hinweis</strong>
            <p>Bitte speichern Sie zuerst das Produkt. Danach kÃ¶nnen Sie Varianten hinzufÃ¼gen.</p>
          </div>
        </div>

        <!-- Preis & Lager (Tab: Pricing) -->
        <div class="form-card" *ngIf="activeTab === 'pricing'">
          <h2>💰 Preis & Lager</h2>
          
          <div class="form-group">
            <label for="basePrice">{{ 'product.price' | translate }} (â‚¬) *</label>
            <input 
              id="basePrice"
              type="number" 
              formControlName="basePrice"
              step="0.01"
              min="0"
              placeholder="0.00"
              [class.error]="productForm.get('basePrice')?.invalid && productForm.get('basePrice')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('basePrice')?.invalid && productForm.get('basePrice')?.touched">
              {{ 'product.required.price' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="stock">{{ 'product.stock' | translate }}</label>
            <input 
              id="stock"
              type="number" 
              formControlName="stock"
              min="0"
              placeholder="0"
              [class.error]="productForm.get('stock')?.invalid && productForm.get('stock')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('stock')?.invalid && productForm.get('stock')?.touched">
              {{ 'product.required.stock' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="sku">{{ 'product.sku' | translate }}</label>
            <input 
              id="sku"
              type="text" 
              formControlName="sku"
              [placeholder]="'product.placeholder.sku' | translate"
              [class.error]="productForm.get('sku')?.invalid && productForm.get('sku')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('sku')?.invalid && productForm.get('sku')?.touched">
              {{ 'product.required.sku' | translate }}
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="goBack()">
            {{ 'common.cancel' | translate }}</button>
          <button 
            type="submit" 
            class="btn-primary"
            [disabled]="productForm.invalid || saving"
          >
            {{ saving ? ('common.saving' | translate) : ((isEditMode ? 'product.update' : 'product.create') | translate) }}
          </button>
        </div>

        <div class="success-message" *ngIf="successMessage">
          {{ successMessage }}
        </div>
        <div class="error-banner" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .product-form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    /* Page header styles are now in PageHeaderComponent */

    .product-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-card h2 {
      margin: 0 0 1.5rem;
      font-size: 1.25rem;
      color: #333;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #f0f0f0;
    }

    /* Tab Navigation */
    .tab-navigation {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .tab-item {
      flex: 1;
      padding: 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      background: #f8f9fa;
      color: #333;
      font-weight: 500;
    }

    .tab-item.active {
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      font-weight: 600;
    }

    .tab-icon {
      font-size: 1.25rem;
    }


    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s;
      font-family: inherit;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input.error,
    .form-group textarea.error,
    .form-group select.error {
      border-color: #dc3545;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 100px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1rem;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.875rem 2rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #333;
      border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover {
      background: #f8f9fa;
      border-color: #667eea;
      color: #667eea;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      border: 1px solid #c3e6cb;
    }

    .error-banner {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      border: 1px solid #f5c6cb;
    }


    /* Varianten Info/Hint */
    .variants-hint {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin-bottom: 1.5rem;
      color: #555;
    }

    .existing-variants-info {
      margin-bottom: 1.5rem;
    }

    .existing-variants-warning {
      margin-bottom: 1.5rem;
    }

    .info-banner {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 1.5rem;
      border-radius: 8px;
      color: #1565c0;
    }

    .warning-banner {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 1.5rem;
      border-radius: 8px;
      color: #e65100;
    }

    .info-banner strong,
    .warning-banner strong {
      color: inherit;
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .info-banner p,
    .warning-banner p {
      margin: 0.5rem 0;
    }

    .info-banner p {
      color: #1976d2;
    }

    .warning-banner p {
      color: #f57c00;
    }

    .info-banner ul,
    .warning-banner ul {
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .info-banner li,
    .warning-banner li {
      margin: 0.5rem 0;
    }

    .info-banner li {
      color: #1976d2;
    }

    .warning-banner li {
      color: #f57c00;
    }

    .info-banner .hint-text,
    .warning-banner .hint-text {
      margin-top: 1rem;
      padding-top: 1rem;
      font-size: 0.9rem;
      font-style: italic;
    }

    .info-banner .hint-text {
      border-top: 1px solid rgba(33, 150, 243, 0.3);
    }

    .warning-banner .hint-text {
      border-top: 1px solid rgba(255, 152, 0, 0.3);
    }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .option-card {
      background: #f8f9fa;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .option-header {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .option-name-input {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
    }

    .option-name-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-remove-option {
      background: #dc3545;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.2s;
    }

    .btn-remove-option:hover {
      background: #c82333;
      transform: scale(1.1);
    }

    .option-values {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .value-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      border: 2px solid #667eea;
      font-weight: 500;
      color: #667eea;
    }

    .btn-remove-value {
      background: transparent;
      border: none;
      color: #dc3545;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .btn-remove-value:hover {
      background: #dc3545;
      color: white;
    }

    .add-value-input {
      display: flex;
      gap: 0.5rem;
      flex: 1;
      min-width: 300px;
    }

    .value-input {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 20px;
      font-size: 0.9375rem;
    }

    .value-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-add-value {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 500;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .btn-add-value:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-add-value:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-add-option {
      width: 100%;
      background: white;
      border: 2px dashed #667eea;
      color: #667eea;
      padding: 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-add-option:hover {
      background: #f5f7ff;
      border-color: #5568d3;
    }

    .variants-preview {
      margin-top: 1.5rem;
      padding: 1.5rem;
      background: #f5f7ff;
      border-radius: 12px;
      border: 2px solid #d0d7ff;
    }

    .variants-preview h3 {
      margin: 0 0 1rem;
      color: #333;
      font-size: 1rem;
    }

    .preview-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 1rem;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .preview-sku {
      font-weight: 500;
      color: #555;
    }

    .preview-price {
      font-weight: 600;
      color: #667eea;
    }

    .preview-note {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      margin: 0;
      font-size: 0.875rem;
      color: #555;
    }

    /* ============================================ */
    /* AI ASSISTANT STYLES */
    /* ============================================ */

    .ai-assistant-card {
      background: linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%);
    }

    .ai-intro {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-left: 4px solid #667eea;
    }

    .ai-intro p {
      margin: 0 0 1rem;
      color: #555;
      font-size: 1rem;
    }

    .ai-intro ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ai-intro li {
      padding: 0.5rem 0;
      color: #666;
    }

    .ai-upload-section,
    .ai-result-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-upload-section h3,
    .ai-result-section h3 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      color: #333;
      font-weight: 600;
    }

    .ai-upload-area {
      border: 3px dashed #d0d7ff;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      transition: all 0.3s;
      background: #f8f9ff;
      margin-bottom: 1.5rem;
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ai-upload-area.has-image {
      border-color: #667eea;
      background: white;
    }

    .upload-placeholder {
      cursor: pointer;
      padding: 2rem;
      transition: all 0.3s;
    }

    .upload-placeholder:hover {
      transform: scale(1.05);
    }

    .upload-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .upload-placeholder p {
      margin: 0.5rem 0;
      color: #555;
      font-size: 1rem;
      font-weight: 500;
    }

    .upload-hint {
      color: #999 !important;
      font-size: 0.875rem !important;
      font-weight: 400 !important;
    }

    .ai-image-preview {
      position: relative;
      max-width: 500px;
      margin: 0 auto;
    }

    .ai-image-preview img {
      width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .btn-remove-ai-image {
      position: absolute;
      top: -10px;
      right: -10px;
      background: #dc3545;
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.25rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
      transition: all 0.2s;
    }

    .btn-remove-ai-image:hover {
      background: #c82333;
      transform: scale(1.1);
    }

    .btn-ai-generate {
      width: 100%;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }

    .btn-ai-generate:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-ai-generate:disabled {
      opacity: 0.9;
      cursor: not-allowed;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-icon {
      font-size: 1.25rem;
      animation: rocket-shake 0.5s ease-in-out infinite;
    }

    @keyframes rocket-shake {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .btn-ai-generate:hover .btn-icon {
      animation: rocket-launch 0.6s ease-in-out;
    }

    @keyframes rocket-launch {
      0% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-10px) scale(1.2); }
      100% { transform: translateY(0) scale(1); }
    }

    .generating-indicator {
      display: flex;
      align-items: center;
      gap: 1rem;
      animation: pulse-fade 1.5s ease-in-out infinite;
    }

    @keyframes pulse-fade {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .spinner-pulse {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin-pulse 0.8s linear infinite;
    }

    @keyframes spin-pulse {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }

    .generating-text {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 600;
    }

    .dots {
      display: inline-flex;
      gap: 2px;
    }

    .dot {
      animation: dot-bounce 1.4s ease-in-out infinite;
    }

    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes dot-bounce {
      0%, 80%, 100% { 
        opacity: 0;
        transform: translateY(0);
      }
      40% { 
        opacity: 1;
        transform: translateY(-5px);
      }
    }

    /* Fixed Top-Right Loading Indicator */
    .ai-loading-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 1rem;
      animation: slide-in-right 0.3s ease-out;
    }

    @keyframes slide-in-right {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .ai-loading-overlay .spinner-pulse {
      width: 20px;
      height: 20px;
    }

    .ai-loading-overlay .loading-text {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .ai-error {
      background: #fee;
      border-left: 4px solid #dc3545;
      color: #721c24;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }

    .ai-result-card {
      background: #f8f9ff;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .ai-result-field {
      margin-bottom: 1.5rem;
    }

    .ai-result-field:last-child {
      margin-bottom: 0;
    }

    .ai-result-field label {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .ai-result-value {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      color: #333;
      line-height: 1.6;
    }

    .ai-result-value.ai-description {
      white-space: pre-wrap;
      min-height: 100px;
    }

    .ai-result-value.ai-caption {
      font-style: italic;
      color: #666;
      background: #fafafa;
    }

    .ai-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-use-suggestion,
    .btn-regenerate {
      flex: 1;
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1rem;
    }

    .btn-use-suggestion {
      background: #28a745;
      color: white;
    }

    .btn-use-suggestion:hover {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .btn-regenerate {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }

    .btn-regenerate:hover {
      background: #f5f7ff;
      border-color: #5568d3;
    }

    .ai-info-note {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: #1565c0;
      line-height: 1.6;
    }

    .ai-info-note strong {
      color: #0d47a1;
    }

    /* AI Model Selection */
    .ai-model-selection {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-model-selection label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
      color: #333;
      font-size: 1rem;
    }

    .model-select {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s;
      font-family: inherit;
      background: white;
      cursor: pointer;
    }

    .model-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .model-info {
      display: block;
      margin-top: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f8f9ff;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #667eea;
      font-weight: 500;
      border-left: 3px solid #667eea;
    }

    /* AI Upload Section */
    .ai-upload-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-upload-section h3 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      color: #333;
      font-weight: 600;
    }

    /* Generate All Button */
    .btn-ai-generate-all {
      width: 100%;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .btn-ai-generate-all:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-ai-generate-all:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-ai-generate-all .btn-icon {
      font-size: 1.25rem;
    }

    /* AI Result Section */
    .ai-result-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .ai-result-section h3 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      color: #333;
      font-weight: 600;
    }

    .ai-result-card {
      background: #f8f9ff;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .ai-result-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .ai-result-field {
      display: flex;
      flex-direction: column;
    }

    .ai-result-field.full-width {
      grid-column: 1 / -1;
    }

    .ai-result-field label {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .ai-result-value {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      color: #333;
      line-height: 1.6;
    }

    .ai-result-value.ai-description {
      white-space: pre-wrap;
      min-height: 100px;
    }

    .ai-result-value.ai-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    .ai-result-value .tag {
      background: #667eea;
      color: white;
      padding: 0.4rem 0.8rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .ai-result-value .no-data {
      color: #999;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .ai-result-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ============================================
       MULTI-IMAGE AI STYLES - REDUZIERT (nutzt jetzt image-upload.component)
       ============================================ */
  `]
})
export class ProductFormComponent implements OnInit, OnDestroy {
  productForm: FormGroup;
  categories: Category[] = [];
  private storeId: number | null = null;
  productId?: number;
  isEditMode = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  headerActions: HeaderAction[] = [];
  breadcrumbItems: BreadcrumbItem[] = [];

  uploadedImages: UploadedImage[] = [];

  // NEU: AI Images verwenden jetzt UploadedImage[] für Kompatibilität mit image-upload.component
  aiImages: UploadedImage[] = [];

  // Legacy single image properties (für Abwärtskompatibilität)
  aiImageFile: File | null = null;
  aiImagePreview: string | null = null;
  aiGenerating = false;
  uploadingImages = false; // Flag for image upload during save
  aiSuggestion: AiProductSuggestion | null = null;
  aiSuggestionV2: AiProductSuggestionV2 | null = null;
  aiError = '';
  aiMode: 'v1' | 'v2' = 'v2'; // Default to V2 (structured JSON)
  
  // AI Model Selection
  selectedAiModel: string = '';
  availableAiModels: Array<{value: string, label: string}> = [];

  // Multi-image AI settings
  selectedSuggestionIndex = 0;
  activeTab: 'basic' | 'ai' | 'media' | 'variants' | 'pricing' = 'basic';

  tabs: Array<{ id: 'basic' | 'ai' | 'media' | 'variants' | 'pricing', label: string, icon: string }> = [
    { id: 'basic', label: 'Basis Info', icon: '📝' },
    { id: 'ai', label: 'KI-Assistent', icon: '🤖' },
    { id: 'media', label: 'Bilder', icon: '📷' },
    { id: 'variants', label: 'Varianten', icon: '🎨' },
    { id: 'pricing', label: 'Preis & Lager', icon: '💰' }
  ];

  private storeIdSubscription?: Subscription;

  constructor(
      private fb: FormBuilder,
      private route: ActivatedRoute,
      private router: Router,
      private productService: ProductService,
      private categoryService: CategoryService,
      private mediaService: MediaService,
      private translationService: TranslationService,
      private productOptionService: ProductOptionService,
      private storeContext: StoreContextService
  ) {
    this.productForm = this.fb.group({
      title: ['', Validators.required],
      sku: [''],
      description: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0.01)]],
      stock: [0, [Validators.min(0)]],
      status: [ProductStatus.DRAFT],
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    // productId ist nur gesetzt bei Edit-Routen (/products/:productId/edit)
    // WICHTIG: Zuerst productId setzen, bevor storeId abonniert wird!
    const productIdParam = this.route.snapshot.paramMap.get('productId');
    this.productId = productIdParam ? Number(productIdParam) : undefined;
    this.isEditMode = !!this.productId;

    console.log('🔧 Product Form ngOnInit:', {
      productIdParam,
      productId: this.productId,
      isEditMode: this.isEditMode
    });

    // storeId aus Context Service abonnieren
    this.storeIdSubscription = this.storeContext.storeId$.subscribe(id => {
      if (id !== null) {
        this.storeId = id;
        this.initializeComponent();
      }
    });

    // AI Modelle für den Auswahl-Input laden
    this.loadAiModels();
  }

  private initializeComponent(): void {
    if (this.storeId === null) return;

    console.log('📦 Product Form Init:', {
      storeId: this.storeId,
      productId: this.productId,
      isEditMode: this.isEditMode,
      route: window.location.pathname
    });

    // Kategorien immer laden (auch wenn von Kategorie-Erstellung zurÃ¼ckgekehrt)
    this.loadCategories();

    // Breadcrumbs initialisieren
    this.breadcrumbItems = [
      { label: 'navigation.dashboard', route: '/dashboard', icon: '🏠' },
      { label: 'navigation.store', route: ['/dashboard/stores', this.storeId], icon: '🏪' },
      { label: 'navigation.products', route: ['/dashboard/stores', this.storeId, 'products'], icon: '📦' },
      { label: this.isEditMode ? 'product.edit' : 'product.new' }
    ];

    if (this.isEditMode && this.productId) {
      this.loadProduct(this.productId);
      this.loadProductImages(this.productId);
    }

    // Kategorien neu laden, wenn die Seite wieder im Fokus ist
    // (z.B. nach RÃ¼ckkehr von Kategorie-Erstellung)
    window.addEventListener('focus', () => {
      this.loadCategories();
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
    // Event Listener aufrÃ¤umen
    window.removeEventListener('focus', () => {
      this.loadCategories();
    });
  }

  loadCategories(): void {
    if (this.storeId === null) return;

    this.categoryService.getCategories(this.storeId).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error(this.translationService.translate('category.error.load'), error);
        this.errorMessage = this.translationService.translate('category.error.load');
      }
    });
  }

  loadProduct(productId: number): void {
    if (this.storeId === null) return;

    console.log('📥 Loading product for edit:', {
      storeId: this.storeId,
      productId: productId
    });

    this.productService.getProduct(this.storeId, productId).subscribe({
      next: (product) => {
        console.log('✅ Product loaded successfully:', product);

        this.productForm.patchValue({
          title: product.title,
          sku: product.sku,
          description: product.description,
          basePrice: product.basePrice,
          status: product.status,
          categoryId: product.categoryId || null
        });

        console.log('✅ Form patched with values:', this.productForm.value);
      },
      error: (error) => {
        console.error('❌ Fehler beim Laden des Produkts:', error);
        this.errorMessage = this.translationService.translate('product.error.load');
      }
    });
  }


  loadProductImages(productId: number): void {
    if (this.storeId === null) return;

    this.mediaService.getProductMedia(this.storeId, productId).subscribe({
      next: (media) => {
        console.log('📸 Loaded product media:', media);

        // Konvertiere die API-Response in das richtige Format
        this.uploadedImages = media.map((m: any) => {
          // Handle verschiedene API-Response Formate
          const mediaObj = m.media || m;
          const url = mediaObj.url || m.url || '';
          const filename = mediaObj.filename || m.filename || 'image.jpg';

          return {
            mediaId: mediaObj.id || m.mediaId || m.id,
            url: url,
            filename: filename,
            preview: url, // Verwende URL auch als Preview
            isPrimary: m.isPrimary || false
          };
        }).filter(img => img.mediaId && img.url); // Filtere ungÃ¼ltige EintrÃ¤ge

        console.log('✅ Processed images:', this.uploadedImages);
      },
      error: (error) => {
        console.error('❌ Error loading product images:', error);
        this.errorMessage = this.translationService.translate('media.uploadError');
        // Zeige trotzdem die MÃ¶glichkeit neue Bilder hochzuladen
        this.uploadedImages = [];
      }
    });
  }


  onSubmit(): void {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (this.storeId === null) {
      this.errorMessage = 'Fehler: Store-Kontext nicht verfügbar';
      return;
    }

    this.saving = true;
    this.uploadingImages = true; // Show loading indicator in top right
    this.errorMessage = '';
    this.successMessage = '';

    const formData = {
      ...this.productForm.value,
      storeId: this.storeId
    };

    if (this.isEditMode && this.productId) {
      this.updateProduct(formData);
    } else {
      this.createProduct(formData);
    }
  }

  createProduct(formData: any): void {
    if (this.storeId === null) return;

    console.log('📦 Creating product with data:', formData);

    this.productService.createProduct(this.storeId, formData).subscribe({
      next: (product) => {
        console.log('✅ Produkt erstellt:', product);

        // VerknÃ¼pfe Bilder mit Produkt
        if (this.uploadedImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.uploadingImages = false;
          this.successMessage = this.translationService.translate('product.created');
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
        this.uploadingImages = false;
        this.errorMessage = this.translationService.translate('product.error.create');
        console.error(error);
      }
    });
  }

  updateProduct(formData: any): void {
    if (this.storeId === null) return;

    // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
    const updateData = {
      title: formData.title,
      description: formData.description,
      basePrice: formData.basePrice,
      status: formData.status || 'DRAFT',
      categoryId: formData.categoryId || null,
      storeId: this.storeId
    };

    console.log('📝 Updating product with data:', updateData);

    this.productService.updateProduct(this.storeId, this.productId!, updateData).subscribe({
      next: (product) => {
        console.log('✅ Produkt aktualisiert:', product);

        // VerknÃ¼pfe neue Bilder (nur wenn welche hochgeladen wurden)
        const newImages = this.uploadedImages.filter(img => img.file && img.mediaId > 0);
        if (newImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.uploadingImages = false;
          this.successMessage = this.translationService.translate('product.updated');
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
        this.uploadingImages = false;
        console.error('❌ Update error:', error);
        this.errorMessage = this.translationService.translate('product.error.update');
      }
    });
  }

  linkImagesToProduct(productId: number): void {
    if (this.storeId === null) return;

    // Separate images: those with mediaId (already uploaded) and those with file (need upload)
    const imagesToLink = this.uploadedImages.filter(img => img.mediaId > 0);
    const imagesToUpload = this.uploadedImages.filter(img => img.file && img.mediaId === 0);

    console.log(`📸 Images to link: ${imagesToLink.length}, images to upload: ${imagesToUpload.length}`);

    // Step 1: Upload new images first
    if (imagesToUpload.length > 0) {
      this.uploadNewImagesAndLink(productId, imagesToUpload, imagesToLink);
    } else if (imagesToLink.length > 0) {
      // No new uploads, just link existing
      this.linkExistingImages(productId, imagesToLink);
    } else {
      // No images at all
      this.saving = false;
      this.successMessage = this.translationService.translate('product.created');
      setTimeout(() => this.goBack(), 1500);
    }
  }

  private uploadNewImagesAndLink(productId: number, imagesToUpload: UploadedImage[], imagesToLink: UploadedImage[]): void {
    if (this.storeId === null) return;

    let uploadCompleted = 0;
    const totalUploads = imagesToUpload.length;
    const allImagesToLink: UploadedImage[] = [];

    imagesToUpload.forEach((img, index) => {
      const file = img.file;
      if (!file) {
        uploadCompleted++;
        return;
      }

      console.log(`📤 Uploading image ${index + 1}/${totalUploads}: ${file.name}`);

      this.mediaService.uploadMedia(this.storeId!, file, 'PRODUCT_IMAGE').subscribe({
        next: (media) => {
          console.log(`✅ Image uploaded: ${media.filename}, mediaId: ${media.mediaId}`);

          // Update uploadedImage with mediaId
          img.mediaId = media.mediaId;
          img.url = media.url;
          allImagesToLink.push(img);

          uploadCompleted++;

          // When all uploads complete, link all images
          if (uploadCompleted === totalUploads) {
            const allImages = [...allImagesToLink, ...imagesToLink];
            this.linkExistingImages(productId, allImages);
          }
        },
        error: (error: any) => {
          console.error(`❌ Failed to upload image ${file.name}:`, error);
          uploadCompleted++;

          if (uploadCompleted === totalUploads) {
            const allImages = [...allImagesToLink, ...imagesToLink];
            if (allImages.length > 0) {
              this.linkExistingImages(productId, allImages);
            } else {
              this.saving = false;
              this.uploadingImages = false;
              this.errorMessage = 'Fehler beim Hochladen der Bilder.';
            }
          }
        }
      });
    });
  }

  private linkExistingImages(productId: number, images: UploadedImage[]): void {
    if (this.storeId === null) return;

    let completed = 0;
    const total = images.length;

    if (total === 0) {
      this.saving = false;
      this.uploadingImages = false;
      this.successMessage = this.translationService.translate('product.created');
      setTimeout(() => this.goBack(), 1500);
      return;
    }

    images.forEach((img, index) => {
      if (img.mediaId > 0 && this.storeId !== null) {
        this.mediaService.addMediaToProduct(this.storeId, productId, {
          mediaId: img.mediaId,
          isPrimary: img.isPrimary,
          sortOrder: index
        }).subscribe({
          next: () => {
            completed++;
            console.log(`✅ Image ${completed}/${total} linked to product`);

            if (completed === total) {
              this.saving = false;
              this.uploadingImages = false;
              this.successMessage = this.translationService.translate('product.created');
              setTimeout(() => this.goBack(), 1500);
            }
          },
          error: (error) => {
            console.error('❌ Error linking image:', error);
            completed++;

            if (completed === total) {
              this.saving = false;
              this.uploadingImages = false;
              this.successMessage = this.translationService.translate('product.created');
              setTimeout(() => this.goBack(), 2000);
            }
          }
        });
      }
    });
  }

  goBack(): void {
    if (this.storeId === null) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.router.navigate(['/dashboard/stores', this.storeId, 'products']);
  }


  setActiveTab(tab: 'basic' | 'ai' | 'media' | 'variants' | 'pricing'): void {
    this.activeTab = tab;
  }


  // ============================================
  // AI ASSISTANT METHODS - Nutzt image-upload.component
  // ============================================

  /**
   * NEU: Wird aufgerufen wenn image-upload Komponente AI-Generation anfordert
   */
  onAiGenerateRequest(event: { file: File; index: number }): void {
    this.generateAiSuggestionForImage(event.index);
  }

  /**
   * NEU: Wird aufgerufen wenn Auswahl sich ändert
   */
  onAiSelectionChanged(selectedImages: UploadedImage[]): void {
    console.log(`📋 Selection changed: ${selectedImages.length} images selected`);
    // Könnte hier zusätzliche Logik hinzugefügt werden
  }

  /**
   * Generiert AI-Suggestions für alle Bilder
   */
  generateAiSuggestionsForAll(): void {
    if (this.aiImages.length === 0 || this.storeId === null) {
      this.aiError = 'Bitte wählen Sie zuerst mindestens ein Bild aus.';
      return;
    }

    this.aiError = '';
    console.log(`🤖 Starting AI generation for ${this.aiImages.length} images with model: ${this.selectedAiModel}`);

    // Generate for each image
    this.aiImages.forEach((imgData, index) => {
      this.generateAiSuggestionForImage(index);
    });
  }

  /**
   * Generiert AI-Suggestion für ein einzelnes Bild
   */
  generateAiSuggestionForImage(index: number): void {
    if (this.storeId === null) return;

    const imgData = this.aiImages[index];
    if (!imgData.file) return;

    // Setze Status auf "generierend"
    imgData.aiGenerating = true;
    imgData.aiError = '';
    imgData.aiSuggestion = null;

    console.log(`🤖 Generating AI suggestion for image ${index + 1}/${this.aiImages.length}: ${imgData.filename}`);
    console.log(`🤖 Using AI Model: ${this.selectedAiModel}`);

    // Übergebe ausgewähltes Modell an Service
    this.productService.generateAiProductSuggestionV2(this.storeId, imgData.file, this.selectedAiModel).subscribe({
      next: (suggestion: AiProductSuggestionV2) => {
        console.log(`✅ AI suggestion received for image ${index + 1}:`, suggestion);
        imgData.aiSuggestion = suggestion;
        imgData.aiGenerating = false;

        // Auto-select first generated suggestion for preview
        if (index === 0) {
          this.selectedSuggestionIndex = 0;
        }
      },
      error: (error: any) => {
        console.error(`❌ AI generation failed for image ${index + 1}:`, error);
        imgData.aiGenerating = false;

        let errorMsg = 'Fehler beim Generieren des KI-Vorschlags.';
        if (error.error?.error) {
          errorMsg = error.error.error;
        } else if (error.message) {
          errorMsg = error.message;
        }

        imgData.aiError = errorMsg;
      }
    });
  }

  /**
   * Gibt den aktuell zur Vorschau ausgewählten AI-Vorschlag zurück
   */
  getSelectedAiSuggestion(): AiProductSuggestionV2 | null {
    // Finde das erste Bild mit einer Suggestion (für Vorschau)
    const imgWithSuggestion = this.aiImages.find(img => img.aiSuggestion);
    return imgWithSuggestion?.aiSuggestion || null;
  }

  /**
   * Legacy: Kompatibilität mit altem Code
   */
  getSelectedSuggestion(): AiProductSuggestionV2 | null {
    return this.getSelectedAiSuggestion();
  }

  /**
   * Prüft ob irgendein Bild gerade generiert wird
   */
  isAnyImageGenerating(): boolean {
    return this.aiImages.some(img => img.aiGenerating);
  }

  /**
   * Gibt die Anzahl ausgewählter Bilder zurück
   */
  getSelectedImagesCount(): number {
    return this.aiImages.filter(img => img.isSelected).length;
  }

  /**
   * Legacy: Kompatibilität
   */
  getSelectedCount(): number {
    return this.getSelectedImagesCount();
  }

  /**
   * Legacy: Kompatibilität
   */
  hasAnyGeneratedSuggestions(): boolean {
    return this.aiImages.some(img => img.aiSuggestion !== null);
  }

  /**
   * Legacy: Kompatibilität
   */
  areAllSelected(): boolean {
    const imagesWithSuggestions = this.aiImages.filter(img => img.aiSuggestion !== null);
    if (imagesWithSuggestions.length === 0) return false;
    return imagesWithSuggestions.every(img => img.isSelected);
  }

  /**
   * Legacy: Kompatibilität
   */
  toggleSelectAll(): void {
    const allSelected = this.areAllSelected();
    this.aiImages.forEach(img => {
      if (img.aiSuggestion) {
        img.isSelected = !allSelected;
      }
    });
  }

  /**
   * Übernimmt die ausgewählten AI-Suggestions
   */
  useSelectedAiSuggestions(): void {
    if (this.aiImages.length === 0) {
      this.aiError = 'Keine AI-Vorschläge verfügbar.';
      return;
    }

    const selectedImages = this.aiImages.filter(img => img.isSelected);
    if (selectedImages.length === 0) {
      this.aiError = 'Bitte wählen Sie mindestens ein Bild aus.';
      return;
    }

    // Verwende ersten ausgewählten Vorschlag für Formular
    const firstSuggestion = selectedImages[0].aiSuggestion;
    if (firstSuggestion) {
      this.productForm.patchValue({
        title: firstSuggestion.title,
        description: firstSuggestion.description,
        basePrice: firstSuggestion.suggestedPrice || 0
      });
    }

    // Füge ausgewählte Bilder zu uploadedImages hinzu
    selectedImages.forEach((imgData, idx) => {
      const uploadedImg: UploadedImage = {
        mediaId: 0,
        url: '',
        filename: imgData.filename,
        preview: imgData.preview || '',
        isPrimary: idx === 0 && this.uploadedImages.length === 0,
        file: imgData.file
      };

      // Prüfe ob nicht bereits vorhanden
      if (!this.uploadedImages.find(img => img.filename === uploadedImg.filename)) {
        this.uploadedImages.push(uploadedImg);
      }
    });

    // Wechsel zum Media-Tab
    this.activeTab = 'media';
    this.successMessage = `✅ KI-Vorschlag übernommen! ${selectedImages.length} Bild(er) hinzugefügt.`;
    setTimeout(() => this.successMessage = '', 5000);
    console.log(`✅ AI suggestions applied with ${selectedImages.length} selected images`);
  }

  /**
   * Legacy: Kompatibilität
   */
  useSelectedAiSuggestion(): void {
    this.useSelectedAiSuggestions();
  }

  // ============================================
  // AI ASSISTANT METHODS - LEGACY SINGLE IMAGE
  // ============================================

  onAiImageSelect(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.aiError = 'Bitte wÃ¤hlen Sie eine gÃ¼ltige Bilddatei aus.';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.aiError = 'Die Datei ist zu groÃŸ. Maximale GrÃ¶ÃŸe: 10MB';
      return;
    }

    this.aiImageFile = file;
    this.aiError = '';
    this.aiSuggestion = null;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.aiImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);

    console.log('✅ AI image selected:', file.name, file.size, 'bytes');
  }

  removeAiImage(): void {
    this.aiImageFile = null;
    this.aiImagePreview = null;
    this.aiSuggestion = null;
    this.aiError = '';
  }

  generateAiSuggestion(): void {
    if (!this.aiImageFile || this.storeId === null) {
      this.aiError = 'Bitte wÃ¤hlen Sie zuerst ein Bild aus.';
      return;
    }

    this.aiGenerating = true;
    this.aiError = '';
    this.aiSuggestion = null;
    this.aiSuggestionV2 = null;

    console.log(`🤖 Generating AI suggestion (${this.aiMode.toUpperCase()}) for:`, this.aiImageFile.name);

    // Choose API based on mode
    if (this.aiMode === 'v2') {
      this.productService.generateAiProductSuggestionV2(this.storeId, this.aiImageFile).subscribe({
        next: (suggestion: AiProductSuggestionV2) => {
          console.log(`✅ AI suggestion V2 received:`, suggestion);
          this.aiSuggestionV2 = suggestion;
          this.aiGenerating = false;
          this.successMessage = 'KI-Vorschlag V2 erfolgreich generiert!';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error: any) => {
          console.error(`❌ AI generation V2 failed:`, error);
          this.aiGenerating = false;

          let errorMsg = 'Fehler beim Generieren des KI-Vorschlags.';
          if (error.error?.error) {
            errorMsg = error.error.error;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.aiError = errorMsg;
        }
      });
    } else {
      this.productService.generateAiProductSuggestion(this.storeId, this.aiImageFile).subscribe({
        next: (suggestion: AiProductSuggestion) => {
          console.log(`✅ AI suggestion V1 received:`, suggestion);
          this.aiSuggestion = suggestion;
          this.aiGenerating = false;
          this.successMessage = 'KI-Vorschlag V1 erfolgreich generiert!';
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error: any) => {
          console.error(`❌ AI generation V1 failed:`, error);
          this.aiGenerating = false;

          let errorMsg = 'Fehler beim Generieren des KI-Vorschlags.';
          if (error.error?.error) {
            errorMsg = error.error.error;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.aiError = errorMsg;
        }
      });
    }
  }

  useAiSuggestion(): void {
    // Handle V1 suggestion
    if (this.aiSuggestion && this.aiMode === 'v1') {
      this.productForm.patchValue({
        title: this.aiSuggestion.title,
        description: this.aiSuggestion.description
      });

      this.activeTab = 'basic';
      this.successMessage = 'KI-Vorschlag wurde in das Formular Ã¼bernommen. Sie kÃ¶nnen die Daten jetzt anpassen.';
      setTimeout(() => this.successMessage = '', 5000);
      console.log('✅ AI suggestion V1 applied to form');
      return;
    }

    // Handle V2 suggestion
    if (this.aiSuggestionV2 && this.aiMode === 'v2') {
      this.productForm.patchValue({
        title: this.aiSuggestionV2.title,
        description: this.aiSuggestionV2.description,
        basePrice: this.aiSuggestionV2.suggestedPrice || 0
      });

      this.activeTab = 'basic';
      this.successMessage = 'Erweiterter KI-Vorschlag wurde in das Formular Ã¼bernommen. Sie kÃ¶nnen die Daten jetzt anpassen.';
      setTimeout(() => this.successMessage = '', 5000);
      console.log('✅ AI suggestion V2 applied to form');
      return;
    }
  }

  loadAiModels(): void {
    // Lade verfügbare AI-Modelle vom ProductService
    const models = this.productService.getAvailableAiModels();
    this.availableAiModels = models.map(modelName => ({
      value: modelName,
      label: this.getModelDisplayName(modelName)
    }));

    // Setze Default-Modell
    this.selectedAiModel = this.productService.getDefaultAiModel();
  }

  /**
   * Hilfsmethode für benutzerfreundliche Model-Namen
   */
  private getModelDisplayName(modelName: string): string {
    const displayNames: {[key: string]: string} = {
      'zai-org/GLM-4.5V': 'GLM-4.5V (Premium)',
      'Salesforce/blip-image-captioning-large': 'BLIP (Kostenlos)'
    };
    return displayNames[modelName] || modelName;
  }
}



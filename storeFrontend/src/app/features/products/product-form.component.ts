import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { MediaService } from '@app/core/services/media.service';
import { ProductOptionService } from '@app/core/services/product-option.service';
import { StoreContextService } from '@app/core/services/store-context.service';
import { Category, ProductStatus } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { PageHeaderComponent, HeaderAction } from '@app/shared/components/page-header.component';
import { BreadcrumbItem } from '@app/shared/components/breadcrumb.component';
import { ImageUploadComponent, UploadedImage } from '@app/shared/components/image-upload/image-upload.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, PageHeaderComponent, ImageUploadComponent],
  template: `
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
              <label for="basePrice">{{ 'product.price' | translate }} (€) *</label>
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
            💡 Definieren Sie Optionen wie Größe, Farbe, Material. Nach dem Speichern können Sie Varianten mit spezifischen Preisen und Lagerbeständen verwalten.
          </p>

          <!-- Optionen-Liste (für Create UND Edit) -->
          <div class="options-list">
              <div *ngFor="let option of variantOptions; let i = index" class="option-card">
                <div class="option-header">
                  <input 
                    type="text" 
                    [(ngModel)]="option.name" 
                    [ngModelOptions]="{standalone: true}"
                    placeholder="z.B. Farbe, Größe, Material"
                    class="option-name-input"
                  />
                  <button 
                    type="button" 
                    class="btn-remove-option"
                    (click)="removeOption(i)"
                    title="Option entfernen"
                  >
                    ✕
                  </button>
                </div>
                
                <div class="option-values">
                  <div *ngFor="let value of option.values; let j = index" class="value-chip">
                    <span>{{ value }}</span>
                    <button 
                      type="button" 
                      (click)="removeOptionValue(i, j)"
                      class="btn-remove-value"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div class="add-value-input">
                    <input 
                      type="text" 
                      [(ngModel)]="option.newValue"
                      [ngModelOptions]="{standalone: true}"
                      (keydown.enter)="addOptionValue(i); $event.preventDefault()"
                      placeholder="Wert hinzufügen (z.B. Rot, S, Baumwolle)"
                      class="value-input"
                    />
                    <button 
                      type="button"
                      class="btn-add-value"
                      (click)="addOptionValue(i)"
                      [disabled]="!option.newValue?.trim()"
                    >
                      + Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              class="btn-add-option"
              (click)="addOption()"
            >
              + Neue Option hinzufügen
            </button>

            <!-- Varianten-Vorschau -->
            <div *ngIf="getVariantCombinations().length > 0" class="variants-preview">
              <h3>📋 Vorschau: {{ getVariantCombinations().length }} Varianten werden erstellt</h3>
              <div class="preview-list">
                <div *ngFor="let combo of getVariantCombinations()" class="preview-item">
                  <span class="preview-sku">{{ productForm.get('title')?.value || 'Produkt' }}-{{ combo }}</span>
                  <span class="preview-price">{{ productForm.get('basePrice')?.value || 0 }}€</span>
                </div>
              </div>
              <p class="preview-note">
                ℹ️ Nach dem Speichern können Sie für jede Variante individuell Preis, SKU und Lagerbestand anpassen.
              </p>
            </div>
        </div>

        <!-- Preis & Lager (Tab: Pricing) -->
        <div class="form-card" *ngIf="activeTab === 'pricing'">
          <h2>💰 Preis & Lager</h2>
          
          <div class="form-group">
            <label for="basePrice">{{ 'product.price' | translate }} (€) *</label>
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

    @media (max-width: 768px) {
      .form-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .form-card {
        padding: 1.5rem;
      }

      .images-preview {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }

      .form-actions {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }
    }
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

  // Varianten-Optionen für Create-Modus
  variantOptions: Array<{
    name: string;
    values: string[];
    newValue?: string;
  }> = [];

  // Tab Navigation
  activeTab: 'basic' | 'media' | 'variants' | 'pricing' = 'basic';

  tabs = [
    { id: 'basic' as const, label: 'Basis Info', icon: '📝' },
    { id: 'media' as const, label: 'Bilder', icon: '📷' },
    { id: 'variants' as const, label: 'Varianten', icon: '🎨' },
    { id: 'pricing' as const, label: 'Preis & Lager', icon: '💰' }
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
  }

  private initializeComponent(): void {
    if (this.storeId === null) return;

    console.log('📦 Product Form Init:', {
      storeId: this.storeId,
      productId: this.productId,
      isEditMode: this.isEditMode,
      route: window.location.pathname
    });

    // Kategorien immer laden (auch wenn von Kategorie-Erstellung zurückgekehrt)
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
    // (z.B. nach Rückkehr von Kategorie-Erstellung)
    window.addEventListener('focus', () => {
      this.loadCategories();
    });
  }

  ngOnDestroy(): void {
    this.storeIdSubscription?.unsubscribe();
    // Event Listener aufräumen
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
        }).filter(img => img.mediaId && img.url); // Filtere ungültige Einträge

        console.log('✅ Processed images:', this.uploadedImages);
      },
      error: (error) => {
        console.error('❌ Error loading product images:', error);
        this.errorMessage = this.translationService.translate('media.uploadError');
        // Zeige trotzdem die Möglichkeit neue Bilder hochzuladen
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

    // Bereite Varianten-Optionen vor
    const variantOptions = this.variantOptions
      .filter(opt => opt.name.trim() && opt.values.length > 0)
      .map(opt => ({
        name: opt.name.trim(),
        values: opt.values
      }));

    const requestData = {
      ...formData,
      variantOptions: variantOptions
    };

    console.log('📦 Creating product with data:', requestData);

    this.productService.createProduct(this.storeId, requestData).subscribe({
      next: (product) => {
        console.log('✅ Produkt erstellt:', product);

        // Verknüpfe Bilder mit Produkt
        if (this.uploadedImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.successMessage = this.translationService.translate('product.created');
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
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

        // Verknüpfe neue Bilder (nur wenn welche hochgeladen wurden)
        const newImages = this.uploadedImages.filter(img => img.file && img.mediaId > 0);
        if (newImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.successMessage = this.translationService.translate('product.updated');
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
        console.error('❌ Update error:', error);
        this.errorMessage = this.translationService.translate('product.error.update');
      }
    });
  }

  linkImagesToProduct(productId: number): void {
    if (this.storeId === null) return;

    let completed = 0;
    const total = this.uploadedImages.filter(img => img.mediaId > 0).length;

    if (total === 0) {
      this.saving = false;
      this.successMessage = this.translationService.translate('product.created');
      setTimeout(() => this.goBack(), 1500);
      return;
    }

    this.uploadedImages.forEach((img, index) => {
      if (img.mediaId > 0 && this.storeId !== null) {
        this.mediaService.addMediaToProduct(this.storeId, productId, {
          mediaId: img.mediaId,
          isPrimary: img.isPrimary,
          sortOrder: index
        }).subscribe({
          next: () => {
            completed++;
            console.log(`✅ Bild ${completed}/${total} verknüpft`);

            if (completed === total) {
              this.saving = false;
              this.successMessage = this.translationService.translate('product.created');
              setTimeout(() => this.goBack(), 1500);
            }
          },
          error: (error) => {
            console.error('❌ Fehler beim Verknüpfen:', error);
            completed++;

            if (completed === total) {
              this.saving = false;
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

  // ============ Varianten-Management (Create-Modus) ============

  addOption(): void {
    this.variantOptions.push({
      name: '',
      values: [],
      newValue: ''
    });
  }

  removeOption(index: number): void {
    this.variantOptions.splice(index, 1);
  }

  addOptionValue(optionIndex: number): void {
    const option = this.variantOptions[optionIndex];
    const value = option.newValue?.trim();

    if (value && !option.values.includes(value)) {
      option.values.push(value);
      option.newValue = '';
    }
  }

  removeOptionValue(optionIndex: number, valueIndex: number): void {
    this.variantOptions[optionIndex].values.splice(valueIndex, 1);
  }

  getVariantCombinations(): string[] {
    // Filtere nur Optionen mit Namen und Werten
    const validOptions = this.variantOptions.filter(
      opt => opt.name.trim() && opt.values.length > 0
    );

    if (validOptions.length === 0) {
      return [];
    }

    // Erzeuge alle Kombinationen
    const combinations: string[] = [];

    const generate = (current: string[], depth: number) => {
      if (depth === validOptions.length) {
        combinations.push(current.join('-'));
        return;
      }

      const option = validOptions[depth];
      for (const value of option.values) {
        generate([...current, value], depth + 1);
      }
    };

    generate([], 0);
    return combinations;
  }

  setActiveTab(tab: 'basic' | 'media' | 'variants' | 'pricing'): void {
    this.activeTab = tab;
  }

  hasTabError(tab: string): boolean {
    const form = this.productForm;
    if (!form.touched) return false;

    switch (tab) {
      case 'basic':
        return !!(form.get('title')?.invalid || form.get('description')?.invalid || form.get('categoryId')?.invalid);
      case 'pricing':
        return !!form.get('basePrice')?.invalid;
      default:
        return false;
    }
  }
}

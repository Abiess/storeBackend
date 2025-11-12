import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { Category, ProductStatus } from '@app/core/models';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="product-form-container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'تعديل المنتج' : 'منتج جديد' }}</h1>
        <button class="btn-back" (click)="goBack()">← رجوع</button>
      </div>

      <form [formGroup]="productForm" (ngSubmit)="onSubmit()" class="product-form">
        <div class="form-card">
          <h2>معلومات المنتج</h2>
          
          <div class="form-group">
            <label for="title">اسم المنتج *</label>
            <input 
              id="title"
              type="text" 
              formControlName="title"
              placeholder="مثل: هاتف ذكي XYZ"
              [class.error]="productForm.get('title')?.invalid && productForm.get('title')?.touched"
            />
            <div class="error-message" *ngIf="productForm.get('title')?.invalid && productForm.get('title')?.touched">
              اسم المنتج مطلوب
            </div>
          </div>

          <div class="form-group">
            <label for="description">الوصف *</label>
            <textarea 
              id="description"
              formControlName="description"
              rows="4"
              placeholder="اوصف منتجك..."
              [class.error]="productForm.get('description')?.invalid && productForm.get('description')?.touched"
            ></textarea>
            <div class="error-message" *ngIf="productForm.get('description')?.invalid && productForm.get('description')?.touched">
              الوصف مطلوب
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="basePrice">السعر (€) *</label>
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
                يجب أن يكون السعر أكبر من 0
              </div>
            </div>

            <div class="form-group">
              <label for="status">الحالة</label>
              <select id="status" formControlName="status">
                <option value="DRAFT">مسودة</option>
                <option value="ACTIVE">نشط</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-card" *ngIf="categories.length > 0">
          <h2>الفئات</h2>
          <div class="categories-list">
            <label *ngFor="let category of categories" class="category-checkbox">
              <input 
                type="checkbox" 
                [checked]="selectedCategories.has(category.id)"
                (change)="toggleCategory(category.id)"
              />
              <span>{{ category.name }}</span>
            </label>
          </div>
          <p class="hint" *ngIf="categories.length === 0">
            لا توجد فئات متاحة. أنشئ فئة أولاً.
          </p>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="goBack()">
            إلغاء
          </button>
          <button 
            type="submit" 
            class="btn-primary"
            [disabled]="productForm.invalid || saving"
          >
            {{ saving ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التغييرات' : 'إنشاء المنتج') }}
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

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .form-header h1 {
      margin: 0;
      color: #333;
      font-size: 1.875rem;
    }

    .btn-back {
      background: white;
      border: 1px solid #ddd;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-back:hover {
      background: #f8f9fa;
      border-color: #667eea;
      color: #667eea;
    }

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
    .form-group textarea.error {
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

    .hint {
      color: #666;
      font-size: 0.875rem;
      margin: 0;
      font-style: italic;
    }

    .categories-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .category-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .category-checkbox:hover {
      background: #e9ecef;
    }

    .category-checkbox input[type="checkbox"] {
      width: auto;
      cursor: pointer;
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

    @media (max-width: 768px) {
      .form-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .form-card {
        padding: 1.5rem;
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
export class ProductFormComponent implements OnInit {
  productForm: FormGroup;
  categories: Category[] = [];
  selectedCategories = new Set<number>();
  storeId!: number;
  productId?: number;
  isEditMode = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {
    this.productForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0.01)]],
      status: [ProductStatus.DRAFT]
    });
  }

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.productId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : undefined;

    this.isEditMode = !!this.productId;

    this.loadCategories();

    if (this.isEditMode && this.productId) {
      this.loadProduct(this.productId);
    }
  }

  loadCategories(): void {
    this.categoryService.getCategories(this.storeId).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('خطأ في تحميل الفئات:', error);
      }
    });
  }

  loadProduct(productId: number): void {
    this.productService.getProduct(this.storeId, productId).subscribe({
      next: (product) => {
        this.productForm.patchValue({
          title: product.title,
          description: product.description,
          basePrice: product.basePrice,
          status: product.status
        });

        if (product.categories) {
          product.categories.forEach(cat => this.selectedCategories.add(cat.id));
        }
      },
      error: (error) => {
        console.error('خطأ في تحميل المنتج:', error);
        this.errorMessage = 'تعذر تحميل المنتج';
      }
    });
  }

  toggleCategory(categoryId: number): void {
    if (this.selectedCategories.has(categoryId)) {
      this.selectedCategories.delete(categoryId);
    } else {
      this.selectedCategories.add(categoryId);
    }
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = this.productForm.value;

    if (this.isEditMode && this.productId) {
      this.productService.updateProduct(this.storeId, this.productId, formData).subscribe({
        next: (product) => {
          this.saving = false;
          this.successMessage = 'تم تحديث المنتج بنجاح!';
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = 'خطأ في تحديث المنتج';
          console.error(error);
        }
      });
    } else {
      this.productService.createProduct(this.storeId, formData).subscribe({
        next: (product) => {
          this.saving = false;
          this.successMessage = 'تم إنشاء المنتج بنجاح!';
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = 'خطأ في إنشاء المنتج';
          console.error(error);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'products']);
  }
}


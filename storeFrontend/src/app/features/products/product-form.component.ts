import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { MediaService, UploadMediaResponse } from '@app/core/services/media.service';
import { Category, ProductStatus } from '@app/core/models';

interface UploadedImage {
  mediaId: number;
  url: string;
  filename: string;
  file?: File;
  preview?: string;
  uploadProgress?: number;
  isPrimary: boolean;
}

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
        
        <!-- Foto-Upload Bereich -->
        <div class="form-card">
          <h2>📷 صور المنتج</h2>
          
          <div class="upload-area">
            <input 
              #fileInput
              type="file" 
              accept="image/*"
              multiple
              (change)="onFileSelected($event)"
              style="display: none"
            />
            
            <button 
              type="button" 
              class="btn-upload"
              (click)="fileInput.click()"
              [disabled]="uploading"
            >
              <span class="upload-icon">📁</span>
              {{ uploading ? 'جاري الرفع...' : 'اختر صورًا' }}
            </button>
            
            <p class="upload-hint">PNG, JPG, WEBP حتى 5MB</p>
          </div>

          <!-- Bildvorschau -->
          <div class="images-preview" *ngIf="uploadedImages.length > 0">
            <div 
              *ngFor="let img of uploadedImages; let i = index" 
              class="image-preview-card"
              [class.primary]="img.isPrimary"
            >
              <div class="image-container">
                <img [src]="img.preview || img.url" [alt]="img.filename" />
                
                <!-- Upload-Fortschritt -->
                <div class="upload-progress" *ngIf="img.uploadProgress !== undefined && img.uploadProgress < 100">
                  <div class="progress-bar" [style.width.%]="img.uploadProgress"></div>
                  <span class="progress-text">{{ img.uploadProgress }}%</span>
                </div>
                
                <!-- Primär-Badge -->
                <div class="primary-badge" *ngIf="img.isPrimary">
                  ⭐ الصورة الرئيسية
                </div>
              </div>
              
              <div class="image-actions">
                <button 
                  type="button" 
                  class="btn-icon"
                  (click)="setPrimaryImage(i)"
                  [disabled]="img.isPrimary"
                  title="اجعلها الصورة الرئيسية"
                >
                  ⭐
                </button>
                <button 
                  type="button" 
                  class="btn-icon btn-danger"
                  (click)="removeImage(i)"
                  title="حذف"
                >
                  🗑️
                </button>
              </div>
              
              <p class="image-name">{{ img.filename }}</p>
            </div>
          </div>

          <div class="upload-info" *ngIf="uploadedImages.length === 0">
            <p>لم يتم رفع أي صورة بعد</p>
          </div>
        </div>

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

          <div class="form-group">
            <label for="categoryId">الفئة *</label>
            <select id="categoryId" formControlName="categoryId" [class.error]="productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched">
              <option value="">اختر فئة</option>
              <option *ngFor="let category of categories" [value]="category.id">
                {{ category.name }}
              </option>
            </select>
            <div class="error-message" *ngIf="productForm.get('categoryId')?.invalid && productForm.get('categoryId')?.touched">
              الفئة مطلوبة
            </div>
          </div>
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

    /* Upload-Bereich */
    .upload-area {
      text-align: center;
      padding: 2rem;
      border: 2px dashed #e0e0e0;
      border-radius: 12px;
      background: #fafafa;
      transition: all 0.3s;
    }

    .upload-area:hover {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .btn-upload {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-upload:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-upload:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .upload-icon {
      font-size: 1.25rem;
    }

    .upload-hint {
      margin: 0.75rem 0 0;
      color: #666;
      font-size: 0.875rem;
    }

    /* Bildvorschau */
    .images-preview {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .image-preview-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;
      background: white;
    }

    .image-preview-card.primary {
      border-color: #ffc107;
      box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
    }

    .image-preview-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .image-container {
      position: relative;
      width: 100%;
      padding-top: 100%;
      background: #f8f9fa;
    }

    .image-container img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .upload-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.7);
      padding: 0.5rem;
    }

    .progress-bar {
      height: 4px;
      background: #667eea;
      border-radius: 2px;
      transition: width 0.3s;
    }

    .progress-text {
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      display: block;
      text-align: center;
      margin-top: 0.25rem;
    }

    .primary-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: #ffc107;
      color: #333;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .image-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .btn-icon {
      flex: 1;
      background: white;
      border: 1px solid #ddd;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.25rem;
      transition: all 0.2s;
    }

    .btn-icon:hover:not(:disabled) {
      background: #667eea;
      border-color: #667eea;
      transform: scale(1.1);
    }

    .btn-icon:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon.btn-danger:hover:not(:disabled) {
      background: #dc3545;
      border-color: #dc3545;
    }

    .image-name {
      margin: 0;
      padding: 0.5rem;
      font-size: 0.75rem;
      color: #666;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .upload-info {
      text-align: center;
      padding: 2rem;
      color: #999;
      font-style: italic;
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
  storeId!: number;
  productId?: number;
  isEditMode = false;
  saving = false;
  uploading = false;
  successMessage = '';
  errorMessage = '';

  uploadedImages: UploadedImage[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private mediaService: MediaService
  ) {
    this.productForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0.01)]],
      status: [ProductStatus.DRAFT],
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.productId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : undefined;

    this.isEditMode = !!this.productId;

    // Kategorien immer laden (auch wenn von Kategorie-Erstellung zurückgekehrt)
    this.loadCategories();

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
    // Event Listener aufräumen
    window.removeEventListener('focus', () => {
      this.loadCategories();
    });
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
          status: product.status,
          categoryId: product.categoryId || null
        });
      },
      error: (error) => {
        console.error('خطأ في تحميل المنتج:', error);
        this.errorMessage = 'تعذر تحميل المنتج';
      }
    });
  }

  loadProductImages(productId: number): void {
    this.mediaService.getProductMedia(this.storeId, productId).subscribe({
      next: (media) => {
        this.uploadedImages = media.map((m: any) => ({
          mediaId: m.media.id,
          url: m.media.url,
          filename: m.media.filename,
          isPrimary: m.isPrimary || false
        }));
      },
      error: (error) => {
        console.error('خطأ في تحميل الصور:', error);
      }
    });
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.uploading = true;

    Array.from(files).forEach((file, index) => {
      // Validierung
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'يرجى رفع صور فقط';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'حجم الصورة يجب أن يكون أقل من 5MB';
        return;
      }

      // Vorschau erstellen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const tempImage: UploadedImage = {
          mediaId: 0,
          url: '',
          filename: file.name,
          file: file,
          preview: e.target.result,
          uploadProgress: 0,
          isPrimary: this.uploadedImages.length === 0 && index === 0
        };

        this.uploadedImages.push(tempImage);

        // Upload starten
        this.uploadImage(file, this.uploadedImages.length - 1);
      };
      reader.readAsDataURL(file);
    });

    // Input zurücksetzen
    event.target.value = '';
  }

  uploadImage(file: File, index: number): void {
    this.mediaService.uploadMediaWithProgress(this.storeId, file, 'PRODUCT_IMAGE').subscribe({
      next: (event) => {
        if (event.progress !== undefined) {
          this.uploadedImages[index].uploadProgress = event.progress;
        }

        if (event.response) {
          this.uploadedImages[index].mediaId = event.response.mediaId;
          this.uploadedImages[index].url = event.response.url;
          this.uploadedImages[index].uploadProgress = 100;

          console.log('✅ Bild hochgeladen:', event.response);
        }
      },
      error: (error) => {
        console.error('❌ Upload-Fehler:', error);
        this.errorMessage = 'Fehler beim Hochladen des Bildes';
        this.uploadedImages.splice(index, 1);
      },
      complete: () => {
        this.uploading = false;
      }
    });
  }

  setPrimaryImage(index: number): void {
    this.uploadedImages.forEach((img, i) => {
      img.isPrimary = i === index;
    });
  }

  removeImage(index: number): void {
    if (confirm('Möchten Sie dieses Bild wirklich entfernen?')) {
      const removedImage = this.uploadedImages[index];

      // Falls es das Hauptbild war, setze ein neues
      if (removedImage.isPrimary && this.uploadedImages.length > 1) {
        const newIndex = index === 0 ? 1 : 0;
        this.uploadedImages[newIndex].isPrimary = true;
      }

      this.uploadedImages.splice(index, 1);
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
    this.productService.createProduct(this.storeId, formData).subscribe({
      next: (product) => {
        console.log('✅ Produkt erstellt:', product);

        // Verknüpfe Bilder mit Produkt
        if (this.uploadedImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.successMessage = 'تم إنشاء المنتج بنجاح!';
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = 'خطأ في إنشاء المنتج';
        console.error(error);
      }
    });
  }

  updateProduct(formData: any): void {
    this.productService.updateProduct(this.storeId, this.productId!, formData).subscribe({
      next: (product) => {
        console.log('✅ Produkt aktualisiert:', product);

        // Verknüpfe neue Bilder
        const newImages = this.uploadedImages.filter(img => img.file);
        if (newImages.length > 0) {
          this.linkImagesToProduct(product.id);
        } else {
          this.saving = false;
          this.successMessage = 'تم تحديث المنتج بنجاح!';
          setTimeout(() => this.goBack(), 1500);
        }
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = 'خطأ في تحديث المنتج';
        console.error(error);
      }
    });
  }

  linkImagesToProduct(productId: number): void {
    let completed = 0;
    const total = this.uploadedImages.filter(img => img.mediaId > 0).length;

    if (total === 0) {
      this.saving = false;
      this.successMessage = 'تم حفظ المنتج بنجاح!';
      setTimeout(() => this.goBack(), 1500);
      return;
    }

    this.uploadedImages.forEach((img, index) => {
      if (img.mediaId > 0) {
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
              this.successMessage = 'تم حفظ المنتج والصور بنجاح!';
              setTimeout(() => this.goBack(), 1500);
            }
          },
          error: (error) => {
            console.error('❌ Fehler beim Verknüpfen:', error);
            completed++;

            if (completed === total) {
              this.saving = false;
              this.successMessage = 'تم حفظ المنتج (بعض الصور قد فشلت)';
              setTimeout(() => this.goBack(), 2000);
            }
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'products']);
  }
}

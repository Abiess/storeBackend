import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '@app/core/services/category.service';
import { Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="category-form-container">
      <div class="form-header">
        <h1>{{ (isEditMode ? 'category.edit' : 'category.new') | translate }}</h1>
        <button class="btn-back" (click)="goBack()">{{ 'common.back' | translate }}</button>
      </div>

      <form [formGroup]="categoryForm" (ngSubmit)="onSubmit()" class="category-form">
        <div class="form-card">
          <h2>{{ 'category.info' | translate }}</h2>
          
          <div class="form-group">
            <label for="name">{{ 'category.name' | translate }} *</label>
            <input 
              id="name"
              type="text" 
              formControlName="name"
              [placeholder]="'category.placeholder.name' | translate"
              [class.error]="categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched"
            />
            <div class="error-message" *ngIf="categoryForm.get('name')?.invalid && categoryForm.get('name')?.touched">
              {{ 'category.required.name' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="slug">{{ 'category.slug' | translate }} *</label>
            <input 
              id="slug"
              type="text" 
              formControlName="slug"
              [placeholder]="'category.placeholder.slug' | translate"
              [class.error]="categoryForm.get('slug')?.invalid && categoryForm.get('slug')?.touched"
            />
            <p class="hint">{{ 'category.hint.slug' | translate }}</p>
            <div class="error-message" *ngIf="categoryForm.get('slug')?.invalid && categoryForm.get('slug')?.touched">
              {{ 'category.required.slug' | translate }}
            </div>
          </div>

          <div class="form-group">
            <label for="description">{{ 'category.description' | translate }}</label>
            <textarea 
              id="description"
              formControlName="description"
              rows="3"
              [placeholder]="'category.placeholder.description' | translate"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="parentId">{{ 'category.parent' | translate }}</label>
              <select id="parentId" formControlName="parentId">
                <option [value]="null">{{ 'category.parent.none' | translate }}</option>
                <option *ngFor="let cat of availableParentCategories" [value]="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="sortOrder">{{ 'category.sortOrder' | translate }}</label>
              <input 
                id="sortOrder"
                type="number" 
                formControlName="sortOrder"
                min="0"
                placeholder="0"
              />
              <p class="hint">{{ 'category.hint.sortOrder' | translate }}</p>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="goBack()">
            {{ 'common.cancel' | translate }}
          </button>
          <button 
            type="submit" 
            class="btn-primary"
            [disabled]="categoryForm.invalid || saving"
          >
            {{ saving ? ('common.saving' | translate) : ((isEditMode ? 'category.update' : 'category.create') | translate) }}
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
    .category-form-container {
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

    .category-form {
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
      min-height: 80px;
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
      margin: 0.25rem 0 0;
      font-style: italic;
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
export class CategoryFormComponent implements OnInit {
  categoryForm: FormGroup;
  availableParentCategories: Category[] = [];
  storeId!: number;
  categoryId?: number;
  isEditMode = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private translationService: TranslationService
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      parentId: [null],
      sortOrder: [0, [Validators.min(0)]]
    });

    this.categoryForm.get('name')?.valueChanges.subscribe(name => {
      if (!this.isEditMode && name) {
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        this.categoryForm.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('storeId'));
    this.categoryId = this.route.snapshot.paramMap.get('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : undefined;

    this.isEditMode = !!this.categoryId;
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getCategories(this.storeId).subscribe({
      next: (categories) => {
        this.availableParentCategories = categories.filter(
          cat => !this.categoryId || cat.id !== this.categoryId
        );

        if (this.isEditMode && this.categoryId) {
          this.loadCategory(this.categoryId);
        }
      },
      error: (error) => {
        console.error(this.translationService.translate('category.error.load'), error);
        this.errorMessage = this.translationService.translate('category.error.load');
      }
    });
  }

  loadCategory(categoryId: number): void {
    // Lade die Kategorie direkt vom Service, nicht aus der gefilterten Liste
    this.categoryService.getCategory(this.storeId, categoryId).subscribe({
      next: (category) => {
        this.categoryForm.patchValue({
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          sortOrder: category.sortOrder
        });
      },
      error: (error) => {
        console.error('Fehler beim Laden der Kategorie:', error);
        this.errorMessage = this.translationService.translate('category.error.load');
      }
    });
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      Object.keys(this.categoryForm.controls).forEach(key => {
        this.categoryForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = {
      ...this.categoryForm.value,
      parentId: this.categoryForm.value.parentId || undefined
    };

    if (this.isEditMode && this.categoryId) {
      this.categoryService.updateCategory(this.storeId, this.categoryId, formData).subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = this.translationService.translate('category.updated');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.translationService.translate('category.error.update');
          console.error(error);
        }
      });
    } else {
      this.categoryService.createCategory(this.storeId, formData).subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = this.translationService.translate('category.created');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = this.translationService.translate('category.error.create');
          console.error(error);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/stores', this.storeId, 'categories']);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <div class="category-list-container">
      <div class="header">
        <h1>{{ 'navigation.categories' | translate }}</h1>
        <button class="btn-primary" (click)="createCategory()">
          + {{ 'category.addCategory' | translate }}
        </button>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ 'loading.categories' | translate }}</p>
      </div>

      <div *ngIf="!loading && categories.length === 0" class="empty-state">
        <div class="empty-icon">🏷️</div>
        <h2>{{ 'category.noCategories' | translate }}</h2>
        <p>{{ 'category.noCategoriesAvailable' | translate }}</p>
        <button class="btn-primary" (click)="createCategory()">
          {{ 'category.createCategory' | translate }}
        </button>
      </div>

      <div *ngIf="!loading && categories.length > 0" class="categories-grid">
        <div *ngFor="let category of categories" class="category-card">
          <div class="category-header">
            <h3>{{ category.name }}</h3>
            <span class="product-count" *ngIf="category.productCount !== undefined">
              {{ category.productCount }} {{ 'navigation.products' | translate }}
            </span>
          </div>
          
          <p class="category-description" *ngIf="category.description">
            {{ category.description }}
          </p>
          
          <div class="category-actions">
            <button class="btn-secondary" (click)="editCategory(category.id)">
              ✏️ {{ 'common.edit' | translate }}
            </button>
            <button class="btn-danger" (click)="deleteCategory(category)">
              🗑️ {{ 'common.delete' | translate }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
    </div>
  `,
  styles: [`
    .category-list-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .loading-state {
      text-align: center;
      padding: 3rem;
    }

    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #f9fafb;
      border-radius: 1rem;
      margin-top: 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
      color: #111827;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .category-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      transition: box-shadow 0.2s;
    }

    .category-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
    }

    .category-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
    }

    .product-count {
      background: #f3f4f6;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .category-description {
      color: #6b7280;
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .category-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-secondary {
      flex: 1;
      background: #f3f4f6;
      color: #374151;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-danger {
      flex: 1;
      background: #fee2e2;
      color: #dc2626;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-danger:hover {
      background: #fecaca;
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }
  `]
})
export class CategoryListComponent implements OnInit {
  storeId!: number;
  categories: Category[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private translationService: TranslationService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.storeId = +params['storeId'];
      this.loadCategories();
    });
  }

  loadCategories() {
    this.loading = true;
    this.error = null;

    const url = `${environment.apiUrl}/api/stores/${this.storeId}/categories`;

    this.http.get<Category[]>(url).subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
        console.log('✅ Kategorien geladen:', data);
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden der Kategorien:', err);
        this.error = this.translationService.translate('category.error.load');
        this.loading = false;
      }
    });
  }

  createCategory() {
    this.router.navigate(['/dashboard/stores', this.storeId, 'categories', 'new']);
  }

  editCategory(categoryId: number) {
    this.router.navigate(['/dashboard/stores', this.storeId, 'categories', categoryId, 'edit']);
  }

  deleteCategory(category: Category) {
    const confirmMessage = this.translationService.translate('messages.confirmDelete');
    if (!confirm(`${confirmMessage}`)) {
      return;
    }

    const url = `${environment.apiUrl}/api/stores/${this.storeId}/categories/${category.id}`;

    this.http.delete(url).subscribe({
      next: () => {
        console.log('✅ Kategorie gelöscht');
        this.loadCategories();
      },
      error: (err) => {
        console.error('❌ Fehler beim Löschen:', err);
        this.error = this.translationService.translate('category.error.delete');
      }
    });
  }
}

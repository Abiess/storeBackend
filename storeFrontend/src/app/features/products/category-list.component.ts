import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  productCount?: number;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  sortOrder?: number;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, StoreNavigationComponent],
  template: `
    <div class="category-list-container">
      <!-- Einheitliche Navigation -->
      <app-store-navigation 
        [storeId]="storeId" 
        [currentPage]="'navigation.categories' | translate">
      </app-store-navigation>

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
        <!-- Hauptkategorien (ohne parent) -->
        <ng-container *ngFor="let category of rootCategories">
          <div class="category-card" [class.is-parent]="hasChildren(category)">
            <div class="category-header">
              <div class="category-title-row">
                <span class="category-icon">📁</span>
                <h3>{{ category.name }}</h3>
              </div>
              <span class="product-count" *ngIf="category.productCount !== undefined">
                {{ category.productCount }} {{ 'navigation.products' | translate }}
              </span>
            </div>
            
            <p class="category-description" *ngIf="category.description">
              {{ category.description }}
            </p>
            
            <!-- Unterkategorien anzeigen -->
            <div *ngIf="hasChildren(category)" class="subcategories-section">
              <h4 class="subcategories-title">📂 Unterkategorien:</h4>
              <div class="subcategories-list">
                <div *ngFor="let child of getChildren(category)" class="subcategory-item">
                  <span class="subcategory-icon">└─</span>
                  <span class="subcategory-name">{{ child.name }}</span>
                  <div class="subcategory-actions">
                    <button class="btn-icon" (click)="editCategory(child.id)" title="Bearbeiten">
                      ✏️
                    </button>
                    <button class="btn-icon btn-danger-icon" (click)="deleteCategory(child)" title="Löschen">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="category-actions">
              <button class="btn-secondary" (click)="editCategory(category.id)">
                ✏️ {{ 'common.edit' | translate }}
              </button>
              <button class="btn-danger" (click)="deleteCategory(category)">
                🗑️ {{ 'common.delete' | translate }}
              </button>
            </div>
          </div>
        </ng-container>

        <!-- Unterkategorien ohne zugewiesene Hauptkategorie (orphans) -->
        <ng-container *ngFor="let category of orphanCategories">
          <div class="category-card orphan-category">
            <div class="category-header">
              <div class="category-title-row">
                <span class="category-icon">⚠️</span>
                <h3>{{ category.name }}</h3>
                <span class="orphan-badge">Keine Hauptkategorie</span>
              </div>
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
        </ng-container>
      </div>

      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
    </div>
  `,
  styles: [`
    .category-list-container {
      padding: 2rem;
      max-width: 1400px;
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
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .category-card {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      transition: all 0.2s;
    }

    .category-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-color: #d1d5db;
    }

    .category-card.is-parent {
      border-color: #3b82f6;
      background: linear-gradient(to bottom, #ffffff, #f0f9ff);
    }

    .category-card.orphan-category {
      border-color: #fbbf24;
      background: #fffbeb;
    }

    .category-header {
      margin-bottom: 1rem;
    }

    .category-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .category-icon {
      font-size: 1.5rem;
    }

    .category-title-row h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      flex: 1;
    }

    .orphan-badge {
      background: #fbbf24;
      color: #78350f;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .product-count {
      background: #f3f4f6;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.875rem;
      color: #6b7280;
      white-space: nowrap;
    }

    .category-description {
      color: #6b7280;
      margin-bottom: 1rem;
      line-height: 1.5;
      font-size: 0.9375rem;
    }

    /* Unterkategorien-Sektion */
    .subcategories-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .subcategories-title {
      margin: 0 0 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #374151;
    }

    .subcategories-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .subcategory-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      transition: background 0.2s;
    }

    .subcategory-item:hover {
      background: #f9fafb;
    }

    .subcategory-icon {
      color: #9ca3af;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .subcategory-name {
      flex: 1;
      font-size: 0.9375rem;
      color: #374151;
      font-weight: 500;
    }

    .subcategory-actions {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      background: transparent;
      border: none;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-radius: 0.25rem;
      transition: background 0.2s;
    }

    .btn-icon:hover {
      background: #f3f4f6;
    }

    .btn-danger-icon:hover {
      background: #fee2e2;
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

    @media (max-width: 768px) {
      .categories-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CategoryListComponent implements OnInit {
  storeId!: number;
  categories: Category[] = [];
  rootCategories: Category[] = [];
  orphanCategories: Category[] = [];
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
            const storeIdParam = params['storeId'];
            this.storeId = storeIdParam ? Number(storeIdParam) : 0;

            if (!this.storeId || isNaN(this.storeId)) {
                console.error('❌ Ungültige Store-ID:', storeIdParam);
                this.router.navigate(['/dashboard']);
                return;
            }

            console.log('✅ Store-ID geladen:', this.storeId);
            this.loadCategories();
        });
    }


    loadCategories() {
    this.loading = true;
    this.error = null;

    const url = `${environment.apiUrl}/stores/${this.storeId}/categories`;

    this.http.get<Category[]>(url).subscribe({
      next: (data) => {
        this.categories = data;

        // Organisiere Kategorien in Hierarchie
        this.organizeCategories(data);

        this.loading = false;
        console.log('✅ Kategorien geladen:', data);
        console.log('📁 Hauptkategorien:', this.rootCategories.length);
        console.log('📂 Unterkategorien (orphans):', this.orphanCategories.length);
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden der Kategorien:', err);
        this.error = this.translationService.translate('category.error.load');
        this.loading = false;
      }
    });
  }

  organizeCategories(categories: Category[]): void {
    // Erstelle eine Map für schnellen Zugriff
    const categoryMap = new Map<number, Category>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Baue Hierarchie auf
    const roots: Category[] = [];
    const orphans: Category[] = [];

    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;

      if (!cat.parentId) {
        // Hauptkategorie (keine parentId)
        roots.push(category);
      } else {
        // Unterkategorie
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          // Parent existiert - als child hinzufügen
          if (!parent.children) parent.children = [];
          parent.children.push(category);
        } else {
          // Parent existiert nicht - als orphan markieren
          orphans.push(category);
        }
      }
    });

    this.rootCategories = roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    this.orphanCategories = orphans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  hasChildren(category: Category): boolean {
    return !!(category.children && category.children.length > 0);
  }

  getChildren(category: Category): Category[] {
    return category.children || [];
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

    const url = `${environment.apiUrl}/stores/${this.storeId}/categories/${category.id}`;

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

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToProducts() {
    this.router.navigate(['/dashboard/stores', this.storeId, 'products']);
  }
}

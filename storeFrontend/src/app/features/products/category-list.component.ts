import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { TranslationService } from '@app/core/services/translation.service';
import { StoreNavigationComponent } from '@app/shared/components/store-navigation.component';
import { ResponsiveDataListComponent, ColumnConfig, ActionConfig } from '@app/shared/components/responsive-data-list/responsive-data-list.component';

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
  imports: [CommonModule, RouterModule, TranslatePipe, StoreNavigationComponent, ResponsiveDataListComponent],
  template: `
    <div class="category-list-container">
      <app-store-navigation [currentPage]="'navigation.categories' | translate"></app-store-navigation>

      <div class="header">
        <h1>{{ 'navigation.categories' | translate }}</h1>
        <button class="btn-primary" (click)="createCategory()">
          + {{ 'category.new' | translate }}
        </button>
      </div>

      <app-responsive-data-list
        [items]="flatCategories"
        [columns]="columns"
        [actions]="actions"
        [loading]="loading"
        [rowClickable]="true"
        [searchable]="true"
        searchPlaceholder="Kategorie suchen..."
        [emptyMessage]="'storeDetail.noCategories' | translate"
        emptyIcon="🏷️"
        (rowClick)="editCategory($event.id)">
      </app-responsive-data-list>

      <div *ngIf="error" class="error-message">{{ error }}</div>
    </div>
  `,
  styles: [`
    .category-list-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .header h1 { margin: 0; font-size: 1.875rem; font-weight: 700; color: #1e293b; }
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white; border: none; padding: .75rem 1.5rem;
      border-radius: 8px; font-weight: 600; cursor: pointer; transition: all .3s;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,.3); }
    .error-message { background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 8px; margin-top: 1rem; }
    @media (max-width: 768px) {
      .category-list-container { padding: 1rem; }
      .header { flex-direction: column; align-items: stretch; gap: 1rem; }
      .btn-primary { width: 100%; }
    }
  `]
})
export class CategoryListComponent implements OnInit {
  storeId!: number;
  categories: Category[] = [];
  flatCategories: any[] = [];
  loading = false;
  error: string | null = null;

  columns: ColumnConfig[] = [
    {
      key: 'icon',
      label: 'Typ',
      type: 'text',
      width: '60px',
      formatFn: (_, item) => item.parentId ? '📂' : (item.childCount > 0 ? '📁' : '🏷️')
    },
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      sortable: true,
      formatFn: (v, item) => item.parentName ? `↳ ${v}` : v
    },
    {
      key: 'parentName',
      label: 'Hauptkategorie',
      type: 'text',
      sortable: true,
      formatFn: (v) => v || '—',
      hideOnMobile: true
    },
    {
      key: 'productCount',
      label: 'Produkte',
      type: 'number',
      sortable: true,
      formatFn: (v) => v !== undefined ? String(v) : '—'
    },
    {
      key: 'description',
      label: 'Beschreibung',
      type: 'text',
      hideOnMobile: true,
      formatFn: (v) => v ? (v.length > 50 ? v.substring(0, 50) + '…' : v) : '—'
    }
  ];

  actions: ActionConfig[] = [
    {
      icon: '✏️',
      label: 'Bearbeiten',
      handler: (cat) => this.editCategory(cat.id)
    },
    {
      icon: '🗑️',
      label: 'Löschen',
      class: 'danger',
      handler: (cat) => this.deleteCategory(cat)
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private translationService: TranslationService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const p = params['storeId'] || params['id'];
      if (p) this.storeId = Number(p);
    });
    if (!this.storeId && this.route.parent) {
      this.route.parent.params.subscribe(params => {
        const p = params['id'] || params['storeId'];
        if (p && !this.storeId) this.storeId = Number(p);
      });
    }
    if (!this.storeId) {
      const m = this.router.url.match(/\/stores\/(\d+)/);
      if (m) this.storeId = +m[1];
    }
    if (!this.storeId || isNaN(this.storeId)) {
      this.router.navigate(['/dashboard']); return;
    }
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.error = null;
    this.http.get<Category[]>(`${environment.apiUrl}/stores/${this.storeId}/categories`).subscribe({
      next: (data) => {
        this.categories = data;
        this.flatCategories = this.buildFlatList(data);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = this.translationService.translate('category.error.load');
        this.loading = false;
      }
    });
  }

  buildFlatList(categories: Category[]): any[] {
    const map = new Map<number, Category>();
    categories.forEach(c => map.set(c.id, c));

    const roots = categories.filter(c => !c.parentId);
    const result: any[] = [];

    roots.forEach(root => {
      const children = categories.filter(c => c.parentId === root.id);
      result.push({
        ...root,
        parentName: null,
        childCount: children.length,
        icon: children.length > 0 ? '📁' : '🏷️'
      });
      children.forEach(child => {
        result.push({
          ...child,
          parentName: root.name,
          childCount: 0,
          icon: '📂'
        });
      });
    });

    // Orphans (parentId gesetzt, aber Parent existiert nicht)
    categories.filter(c => c.parentId && !map.has(c.parentId)).forEach(orphan => {
      result.push({ ...orphan, parentName: '⚠️ Unbekannt', childCount: 0, icon: '⚠️' });
    });

    return result;
  }

  createCategory() { this.router.navigate([`/stores/${this.storeId}`, 'categories', 'new']); }
  editCategory(id: number) { this.router.navigate([`/stores/${this.storeId}`, 'categories', id, 'edit']); }

  deleteCategory(category: any) {
    if (!confirm(`Kategorie "${category.name}" wirklich löschen?`)) return;
    this.http.delete(`${environment.apiUrl}/stores/${this.storeId}/categories/${category.id}`).subscribe({
      next: () => this.loadCategories(),
      error: (err) => {
        console.error(err);
        this.error = this.translationService.translate('category.error.delete');
      }
    });
  }
}

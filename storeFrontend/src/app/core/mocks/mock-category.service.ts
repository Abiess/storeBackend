import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Category, CreateCategoryRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MockCategoryService {
  private categories: Category[] = [
    {
      id: 1,
      name: 'إلكترونيات',
      slug: 'electronics',
      description: 'الأجهزة الإلكترونية والإكسسوارات',
      parentId: undefined,
      sortOrder: 1,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      name: 'هواتف ذكية',
      slug: 'smartphones',
      description: 'الهواتف المحمولة والهواتف الذكية',
      parentId: 1,
      sortOrder: 1,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: 3,
      name: 'أجهزة كمبيوتر محمولة',
      slug: 'laptops',
      description: 'أجهزة الكمبيوتر المحمولة واللابتوب',
      parentId: 1,
      sortOrder: 2,
      createdAt: '2024-01-15T11:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z'
    },
    {
      id: 4,
      name: 'ملابس',
      slug: 'clothing',
      description: 'ملابس للرجال والنساء',
      parentId: undefined,
      sortOrder: 2,
      createdAt: '2024-01-16T09:00:00Z',
      updatedAt: '2024-01-16T09:00:00Z'
    },
    {
      id: 5,
      name: 'ملابس رجالية',
      slug: 'mens-clothing',
      description: 'ملابس للرجال',
      parentId: 4,
      sortOrder: 1,
      createdAt: '2024-01-16T09:30:00Z',
      updatedAt: '2024-01-16T09:30:00Z'
    },
    {
      id: 6,
      name: 'ملابس نسائية',
      slug: 'womens-clothing',
      description: 'ملابس للنساء',
      parentId: 4,
      sortOrder: 2,
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z'
    },
    {
      id: 7,
      name: 'منزل ومطبخ',
      slug: 'home-kitchen',
      description: 'أدوات منزلية ومطبخ',
      parentId: undefined,
      sortOrder: 3,
      createdAt: '2024-01-17T08:00:00Z',
      updatedAt: '2024-01-17T08:00:00Z'
    },
    {
      id: 8,
      name: 'رياضة وترفيه',
      slug: 'sports-leisure',
      description: 'مستلزمات رياضية وترفيهية',
      parentId: undefined,
      sortOrder: 4,
      createdAt: '2024-01-18T08:00:00Z',
      updatedAt: '2024-01-18T08:00:00Z'
    },
    {
      id: 9,
      name: 'كتب وقرطاسية',
      slug: 'books-stationery',
      description: 'كتب ومواد قرطاسية',
      parentId: undefined,
      sortOrder: 5,
      createdAt: '2024-01-19T08:00:00Z',
      updatedAt: '2024-01-19T08:00:00Z'
    },
    {
      id: 10,
      name: 'مجوهرات وإكسسوارات',
      slug: 'jewelry-accessories',
      description: 'مجوهرات وإكسسوارات',
      parentId: undefined,
      sortOrder: 6,
      createdAt: '2024-01-20T08:00:00Z',
      updatedAt: '2024-01-20T08:00:00Z'
    },
    {
      id: 11,
      name: 'ألعاب أطفال',
      slug: 'toys',
      description: 'ألعاب وأنشطة للأطفال',
      parentId: undefined,
      sortOrder: 7,
      createdAt: '2024-01-21T08:00:00Z',
      updatedAt: '2024-01-21T08:00:00Z'
    },
    {
      id: 12,
      name: 'جمال وعناية شخصية',
      slug: 'beauty-personal-care',
      description: 'منتجات التجميل والعناية الشخصية',
      parentId: undefined,
      sortOrder: 8,
      createdAt: '2024-01-22T08:00:00Z',
      updatedAt: '2024-01-22T08:00:00Z'
    }
  ];

  private nextId = 13;

  getCategories(storeId: number): Observable<Category[]> {
    console.log('🎭 Mock: Loading categories for store', storeId);
    return of([...this.categories]).pipe(delay(300));
  }

  getRootCategories(storeId: number): Observable<Category[]> {
    console.log('🎭 Mock: Loading root categories for store', storeId);
    const rootCategories = this.categories.filter(cat => !cat.parentId);
    return of([...rootCategories]).pipe(delay(300));
  }

  getSubcategories(storeId: number, categoryId: number): Observable<Category[]> {
    console.log('🎭 Mock: Loading subcategories for category', categoryId);
    const subcategories = this.categories.filter(cat => cat.parentId === categoryId);
    return of([...subcategories]).pipe(delay(300));
  }

  getCategory(storeId: number, categoryId: number): Observable<Category> {
    console.log('🎭 Mock: Loading category', categoryId);
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) {
      return throwError(() => new Error('Kategorie nicht gefunden'));
    }
    return of({ ...category }).pipe(delay(300));
  }

  createCategory(storeId: number, request: CreateCategoryRequest): Observable<Category> {
    console.log('🎭 Mock: Creating category', request);
    const newCategory: Category = {
      id: this.nextId++,
      name: request.name,
      slug: request.slug,
      description: request.description,
      parentId: request.parentId,
      sortOrder: request.sortOrder || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.categories.push(newCategory);
    return of({ ...newCategory }).pipe(delay(500));
  }

  updateCategory(storeId: number, categoryId: number, request: Partial<CreateCategoryRequest>): Observable<Category> {
    console.log('🎭 Mock: Updating category', categoryId, request);
    const index = this.categories.findIndex(c => c.id === categoryId);
    if (index === -1) {
      return throwError(() => new Error('Kategorie nicht gefunden'));
    }

    const updatedCategory: Category = {
      ...this.categories[index],
      ...request,
      updatedAt: new Date().toISOString()
    };
    this.categories[index] = updatedCategory;
    return of({ ...updatedCategory }).pipe(delay(500));
  }

  deleteCategory(storeId: number, categoryId: number): Observable<void> {
    console.log('🎭 Mock: Deleting category', categoryId);
    const index = this.categories.findIndex(c => c.id === categoryId);
    if (index === -1) {
      return throwError(() => new Error('Kategorie nicht gefunden'));
    }

    // Check if category has subcategories
    const hasSubcategories = this.categories.some(c => c.parentId === categoryId);
    if (hasSubcategories) {
      return throwError(() => new Error('Kategorie kann nicht gelöscht werden, da sie Unterkategorien enthält'));
    }

    this.categories.splice(index, 1);
    return of(void 0).pipe(delay(300));
  }
}

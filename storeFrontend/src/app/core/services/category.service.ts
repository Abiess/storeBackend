import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Category, CreateCategoryRequest } from '../models';
import { MockCategoryService } from '../mocks/mock-category.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private mockService = new MockCategoryService();

  constructor(private http: HttpClient) {}

  getCategories(storeId: number): Observable<Category[]> {
    if (environment.useMockData) {
      return this.mockService.getCategories(storeId);
    }
    return this.http.get<Category[]>(`${environment.apiUrl}/stores/${storeId}/categories`);
  }

  getRootCategories(storeId: number): Observable<Category[]> {
    if (environment.useMockData) {
      return this.mockService.getRootCategories(storeId);
    }
    return this.http.get<Category[]>(`${environment.apiUrl}/stores/${storeId}/categories/root`);
  }

  getSubcategories(storeId: number, categoryId: number): Observable<Category[]> {
    if (environment.useMockData) {
      return this.mockService.getSubcategories(storeId, categoryId);
    }
    return this.http.get<Category[]>(`${environment.apiUrl}/stores/${storeId}/categories/${categoryId}/subcategories`);
  }

  getCategory(storeId: number, categoryId: number): Observable<Category> {
    if (environment.useMockData) {
      return this.mockService.getCategory(storeId, categoryId);
    }
    return this.http.get<Category>(`${environment.apiUrl}/stores/${storeId}/categories/${categoryId}`);
  }

  createCategory(storeId: number, request: CreateCategoryRequest): Observable<Category> {
    if (environment.useMockData) {
      return this.mockService.createCategory(storeId, request);
    }
    return this.http.post<Category>(`${environment.apiUrl}/stores/${storeId}/categories`, request);
  }

  updateCategory(storeId: number, categoryId: number, request: Partial<CreateCategoryRequest>): Observable<Category> {
    if (environment.useMockData) {
      return this.mockService.updateCategory(storeId, categoryId, request);
    }
    return this.http.put<Category>(`${environment.apiUrl}/stores/${storeId}/categories/${categoryId}`, request);
  }

  deleteCategory(storeId: number, categoryId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteCategory(storeId, categoryId);
    }
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/categories/${categoryId}`);
  }
}

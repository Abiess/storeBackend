import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Product, CreateProductRequest, ProductVariant } from '../models';
import { MockProductService } from '../mocks/mock-product.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private mockService = new MockProductService();

  constructor(private http: HttpClient) {}

  getProducts(storeId: number, status?: string): Observable<Product[]> {
    if (environment.useMockData) {
      return this.mockService.getProducts(storeId, status);
    }
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Product[]>(`${environment.apiUrl}/stores/${storeId}/products`, { params });
  }

  getProduct(storeId: number, productId: number): Observable<Product> {
    if (environment.useMockData) {
      return this.mockService.getProduct(storeId, productId);
    }
    return this.http.get<Product>(`${environment.apiUrl}/stores/${storeId}/products/${productId}`);
  }

  createProduct(storeId: number, request: CreateProductRequest): Observable<Product> {
    if (environment.useMockData) {
      return this.mockService.createProduct(storeId, request);
    }
    return this.http.post<Product>(`${environment.apiUrl}/stores/${storeId}/products`, request);
  }

  updateProduct(storeId: number, productId: number, request: Partial<CreateProductRequest>): Observable<Product> {
    if (environment.useMockData) {
      return this.mockService.updateProduct(storeId, productId, request);
    }
    return this.http.put<Product>(`${environment.apiUrl}/stores/${storeId}/products/${productId}`, request);
  }

  deleteProduct(storeId: number, productId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteProduct(storeId, productId);
    }
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}`);
  }

  // Variants
  getVariants(storeId: number, productId: number): Observable<ProductVariant[]> {
    if (environment.useMockData) {
      return this.mockService.getVariants(storeId, productId);
    }
    return this.http.get<ProductVariant[]>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants`);
  }

  createVariant(storeId: number, productId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    if (environment.useMockData) {
      return this.mockService.createVariant(storeId, productId, variant);
    }
    return this.http.post<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants`, variant);
  }

  updateVariant(storeId: number, productId: number, variantId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    if (environment.useMockData) {
      return this.mockService.updateVariant(storeId, productId, variantId, variant);
    }
    return this.http.put<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`, variant);
  }

  deleteVariant(storeId: number, productId: number, variantId: number): Observable<void> {
    if (environment.useMockData) {
      return this.mockService.deleteVariant(storeId, productId, variantId);
    }
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`);
  }

  // Featured/Top Products - Öffentliche Endpoints
  getFeaturedProducts(storeId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/featured`);
  }

  getTopProducts(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/top`, { params });
  }

  getTrendingProducts(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/trending`, { params });
  }

  getNewArrivals(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/new`, { params });
  }

  trackProductView(storeId: number, productId: number): Observable<void> {
    return this.http.post<void>(`${environment.publicApiUrl}/stores/${storeId}/products/${productId}/view`, {});
  }

  // Admin: Set Featured Product
  setFeatured(storeId: number, productId: number, featured: boolean, order?: number): Observable<Product> {
    const body = { featured, order };
    return this.http.post<Product>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/featured`, body);
  }

  // Product Options
  getProductOptions(storeId: number, productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/options`);
  }

  createProductOption(storeId: number, productId: number, option: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/options`, option);
  }

  updateProductOption(storeId: number, productId: number, optionId: number, option: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`, option);
  }

  deleteProductOption(storeId: number, productId: number, optionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/options/${optionId}`);
  }

  // Generate Variants
  generateVariants(storeId: number, productId: number, request: any): Observable<ProductVariant[]> {
    return this.http.post<ProductVariant[]>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/generate`, request);
  }

  // Product Variants
  getProductVariants(storeId: number, productId: number): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants`);
  }

  createProductVariant(storeId: number, productId: number, variant: any): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants`, variant);
  }

  updateProductVariant(storeId: number, productId: number, variantId: number, variant: any): Observable<ProductVariant> {
    return this.http.put<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`, variant);
  }

  deleteProductVariant(storeId: number, productId: number, variantId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { Product, CreateProductRequest, ProductVariant, AiProductSuggestion, AiProductSuggestionV2 } from '../models';
import { MockProductService } from '../mocks/mock-product.service';
import { toDate } from '../utils/date.utils';

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
    return this.http.get<Product[]>(`${environment.apiUrl}/stores/${storeId}/products`, { params }).pipe(
      map(products => products.map(p => this.convertProductDates(p)))
    );
  }

  getProduct(storeId: number, productId: number): Observable<Product> {
    if (environment.useMockData) {
      return this.mockService.getProduct(storeId, productId);
    }
    return this.http.get<Product>(`${environment.apiUrl}/stores/${storeId}/products/${productId}`).pipe(
      map(p => this.convertProductDates(p))
    );
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
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/featured`).pipe(
      map(products => products.map(p => this.convertProductDates(p)))
    );
  }

  getTopProducts(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/top`, { params }).pipe(
      map(products => products.map(p => this.convertProductDates(p)))
    );
  }

  getTrendingProducts(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/trending`, { params }).pipe(
      map(products => products.map(p => this.convertProductDates(p)))
    );
  }

  getNewArrivals(storeId: number, limit: number = 10): Observable<Product[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Product[]>(`${environment.publicApiUrl}/stores/${storeId}/products/new`, { params }).pipe(
      map(products => products.map(p => this.convertProductDates(p)))
    );
  }

  // ✅ Helper: Konvertiere Date-Arrays für ein Produkt
  private convertProductDates(product: Product): Product {
    product.createdAt = toDate(product.createdAt) as any;
    product.updatedAt = toDate(product.updatedAt) as any;
    return product;
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

  // Product Variants - PUBLIC für Storefront
  getProductVariants(storeId: number, productId: number): Observable<ProductVariant[]> {
    // Im Storefront-Kontext verwenden wir die PUBLIC API
    return this.http.get<ProductVariant[]>(`${environment.publicApiUrl}/stores/${storeId}/products/${productId}/variants`);
  }

  // Product Options - PUBLIC für Storefront
  getPublicProductOptions(storeId: number, productId: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.publicApiUrl}/stores/${storeId}/products/${productId}/options`);
  }

  // ADMIN: Product Variants Management
  createProductVariant(storeId: number, productId: number, variant: any): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants`, variant);
  }

  updateProductVariant(storeId: number, productId: number, variantId: number, variant: any): Observable<ProductVariant> {
    return this.http.put<ProductVariant>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`, variant);
  }

  deleteProductVariant(storeId: number, productId: number, variantId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/stores/${storeId}/products/${productId}/variants/${variantId}`);
  }

  // AI Product Suggestion
  generateAiProductSuggestion(storeId: number, imageFile: File, modelName?: string): Observable<AiProductSuggestion> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (modelName) {
      formData.append('model', modelName); // NEU: Optional model parameter
    }
    return this.http.post<AiProductSuggestion>(`${environment.apiUrl}/stores/${storeId}/products/ai-suggest`, formData);
  }

  // AI Product Suggestion V2 (structured JSON)
  generateAiProductSuggestionV2(storeId: number, imageFile: File, modelName?: string): Observable<AiProductSuggestionV2> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (modelName) {
      formData.append('model', modelName); // NEU: Optional model parameter
    }
    return this.http.post<AiProductSuggestionV2>(`${environment.apiUrl}/stores/${storeId}/products/ai-suggest-v2`, formData);
  }

  /**
   * NEU: Hole verfügbare AI-Modelle
   */
  getAvailableAiModels(): string[] {
    return [
      'zai-org/GLM-4.5V',  // Bestehendes Modell (Default)
      'Salesforce/blip-image-captioning-large'  // Neues kostenloses Modell
    ];
  }

  /**
   * NEU: Hole Default AI-Modell
   */
  getDefaultAiModel(): string {
    return 'zai-org/GLM-4.5V';
  }
}

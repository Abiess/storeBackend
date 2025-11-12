import { Observable, of, delay } from 'rxjs';
import { Product, CreateProductRequest, ProductVariant, ProductStatus } from '../models';
import { MOCK_PRODUCTS } from './mock-data';

export class MockProductService {
  private products: Product[] = [...MOCK_PRODUCTS];

  getProducts(storeId: number, status?: string): Observable<Product[]> {
    let filtered = this.products;
    if (status) {
      filtered = this.products.filter(p => p.status === status);
    }
    return of(filtered).pipe(delay(500));
  }

  getProduct(storeId: number, productId: number): Observable<Product> {
    const product = this.products.find(p => p.id === productId);
    return of(product!).pipe(delay(300));
  }

  createProduct(storeId: number, request: CreateProductRequest): Observable<Product> {
    const newProduct: Product = {
      id: this.products.length + 1,
      title: request.title,
      description: request.description,
      basePrice: request.basePrice,
      status: request.status || ProductStatus.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variants: []
    };
    this.products.push(newProduct);
    return of(newProduct).pipe(delay(500));
  }

  updateProduct(storeId: number, productId: number, request: Partial<CreateProductRequest>): Observable<Product> {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      if (request.title) product.title = request.title;
      if (request.description) product.description = request.description;
      if (request.basePrice) product.basePrice = request.basePrice;
      if (request.status) product.status = request.status;
      product.updatedAt = new Date().toISOString();
    }
    return of(product!).pipe(delay(500));
  }

  deleteProduct(storeId: number, productId: number): Observable<void> {
    this.products = this.products.filter(p => p.id !== productId);
    return of(void 0).pipe(delay(500));
  }

  getVariants(storeId: number, productId: number): Observable<ProductVariant[]> {
    const product = this.products.find(p => p.id === productId);
    return of(product?.variants || []).pipe(delay(300));
  }

  createVariant(storeId: number, productId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    const newVariant: ProductVariant = {
      id: Math.floor(Math.random() * 10000),
      sku: variant.sku || '',
      price: variant.price || 0,
      stockQuantity: variant.stockQuantity || 0,
      attributesJson: variant.attributesJson || '{}'
    };
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.variants = product.variants || [];
      product.variants.push(newVariant);
    }
    return of(newVariant).pipe(delay(500));
  }

  updateVariant(storeId: number, productId: number, variantId: number, variant: Partial<ProductVariant>): Observable<ProductVariant> {
    const product = this.products.find(p => p.id === productId);
    if (product && product.variants) {
      const v = product.variants.find(v => v.id === variantId);
      if (v) {
        if (variant.sku) v.sku = variant.sku;
        if (variant.price !== undefined) v.price = variant.price;
        if (variant.stockQuantity !== undefined) v.stockQuantity = variant.stockQuantity;
        if (variant.attributesJson) v.attributesJson = variant.attributesJson;
        return of(v).pipe(delay(500));
      }
    }
    return of({} as ProductVariant);
  }

  deleteVariant(storeId: number, productId: number, variantId: number): Observable<void> {
    const product = this.products.find(p => p.id === productId);
    if (product && product.variants) {
      product.variants = product.variants.filter(v => v.id !== variantId);
    }
    return of(void 0).pipe(delay(500));
  }
}


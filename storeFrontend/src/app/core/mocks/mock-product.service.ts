import { Observable, of, delay } from 'rxjs';
import { Product, CreateProductRequest, ProductVariant, ProductStatus } from '../models';
import { MOCK_PRODUCTS } from './mock-data';

export class MockProductService {
  private products: Product[] = [...MOCK_PRODUCTS];
  private nextProductId = 1;
  private nextVariantId = 1;

  getProducts(storeId: number, status?: string): Observable<Product[]> {
    console.log('🎭 Mock: Loading products for store', storeId, 'with status filter:', status);

    // Zuerst nach Store-ID filtern
    let filtered = this.products.filter(p => p.storeId === storeId);
    console.log('🎭 Mock: Found', filtered.length, 'products for store', storeId);

    // Dann nach Status filtern, falls angegeben
    if (status) {
      // Akzeptiere sowohl 'ACTIVE' als auch 'PUBLISHED' für die Storefront
      if (status === 'ACTIVE' || status === 'PUBLISHED') {
        filtered = filtered.filter(p => p.status === ProductStatus.PUBLISHED);
      } else {
        filtered = filtered.filter(p => p.status === status);
      }
      console.log('🎭 Mock: After status filter:', filtered.length, 'products');
    }

    return of(filtered).pipe(delay(500));
  }

  getProduct(storeId: number, productId: number): Observable<Product> {
    const product = this.products.find(p => p.id === productId);
    return of(product!).pipe(delay(300));
  }

  createProduct(storeId: number, request: CreateProductRequest): Observable<Product> {
    const newProduct: Product = {
      id: this.nextProductId++,
      storeId: storeId,
      name: request.name,
      title: request.title || 'New Product',
      description: request.description,
      price: request.price,
      basePrice: request.basePrice || 0,
      stock: request.stock,
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
      id: this.nextVariantId++,
      productId: productId,
      name: variant.name || 'Variant',
      sku: 'VAR-' + this.nextVariantId,
      price: variant.price || 0,
      stock: variant.stock || variant.stockQuantity || 0,
      stockQuantity: variant.stockQuantity || variant.stock || 0,
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
      const v = product.variants.find((v: ProductVariant) => v.id === variantId);
      if (v) {
        if (variant.name) v.name = variant.name;
        if (variant.price) v.price = variant.price;
        if (variant.sku) v.sku = variant.sku;
        if (variant.stockQuantity !== undefined) v.stockQuantity = variant.stockQuantity;
        if (variant.attributesJson) v.attributesJson = variant.attributesJson;
      }
      return of(v!).pipe(delay(500));
    }
    return of(null as any).pipe(delay(500));
  }

  deleteVariant(storeId: number, productId: number, variantId: number): Observable<void> {
    const product = this.products.find(p => p.id === productId);
    if (product && product.variants) {
      product.variants = product.variants.filter((v: ProductVariant) => v.id !== variantId);
    }
    return of(void 0).pipe(delay(500));
  }
}

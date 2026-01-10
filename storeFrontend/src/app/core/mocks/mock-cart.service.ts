import { Observable, of, delay, throwError } from 'rxjs';
import { Cart, CartItem, AddToCartRequest } from '../services/cart.service';
import { MOCK_PRODUCTS } from './mock-data';

// Erweitertes Interface für Mock-Carts mit zusätzlichen Eigenschaften
interface MockCart extends Cart {
  id: number;
  sessionId: string;
  expiresAt: string;
}

let mockCarts: MockCart[] = [];
let nextCartId = 1;
let nextItemId = 1;

export class MockCartService {
  getCart(storeId: number): Observable<Cart> {
    // Da wir keine sessionId haben, verwenden wir storeId als Identifikator
    let cart = mockCarts.find(c => c.storeId === storeId);

    if (!cart) {
      cart = {
        id: nextCartId++,
        sessionId: `store_${storeId}_${Date.now()}`,
        cartId: nextCartId,
        storeId: storeId,
        items: [],
        itemCount: 0,
        subtotal: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      mockCarts.push(cart);
    }

    return of(cart).pipe(delay(300));
  }

  addItem(request: AddToCartRequest): Observable<any> {
    let cart = mockCarts.find(c => c.storeId === request.storeId);

    if (!cart) {
      cart = {
        id: nextCartId++,
        sessionId: `store_${request.storeId}_${Date.now()}`,
        cartId: nextCartId,
        storeId: request.storeId,
        items: [],
        itemCount: 0,
        subtotal: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      mockCarts.push(cart);
    }

    const product = MOCK_PRODUCTS.find(p => p.id === request.productId);

    if (!product) {
      return throwError(() => new Error('Product not found'));
    }

    const price = product.basePrice || 0;

    // Prüfe ob Item bereits im Warenkorb ist
    const existingItem = cart.items.find(item => item.productId === request.productId);

    if (existingItem) {
      existingItem.quantity += request.quantity;
      this.updateCartTotals(cart);
      return of({
        productName: existingItem.productTitle,
        variantName: 'Standard',
        ...existingItem
      }).pipe(delay(300));
    }

    const newItem: CartItem = {
      id: nextItemId++,
      productId: request.productId,
      productTitle: product.title || product.name || 'Unknown Product',
      productDescription: product.description,
      variantId: request.productId, // Verwende productId als variantId
      variantSku: `SKU-${request.productId}`,
      quantity: request.quantity,
      priceSnapshot: price,
      imageUrl: product.imageUrl || '/assets/placeholder.jpg'
    };

    cart.items.push(newItem);
    this.updateCartTotals(cart);

    return of({
      productName: newItem.productTitle,
      variantName: 'Standard',
      ...newItem
    }).pipe(delay(300));
  }

  updateItem(itemId: number, quantity: number): Observable<any> {
    for (const cart of mockCarts) {
      const item = cart.items.find(i => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        this.updateCartTotals(cart);
        return of(item).pipe(delay(200));
      }
    }
    return throwError(() => new Error('Item not found'));
  }

  removeItem(itemId: number): Observable<void> {
    for (const cart of mockCarts) {
      const index = cart.items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        cart.items.splice(index, 1);
        this.updateCartTotals(cart);
        return of(void 0).pipe(delay(200));
      }
    }
    return throwError(() => new Error('Item not found'));
  }

  clearCart(storeId: number): Observable<void> {
    const cart = mockCarts.find(c => c.storeId === storeId);
    if (cart) {
      cart.items = [];
      this.updateCartTotals(cart);
    }
    return of(void 0).pipe(delay(200));
  }

  getCartItemCount(storeId: number, _sessionId: string): Observable<number> {
    const cart = mockCarts.find(c => c.storeId === storeId);
    const count = cart ? cart.itemCount : 0;
    return of(count).pipe(delay(200));
  }

  private updateCartTotals(cart: MockCart): void {
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0);
  }
}

import { Observable, of, delay, throwError } from 'rxjs';
import { Cart, CartItem, AddToCartRequest } from '../services/cart.service';
import { MOCK_PRODUCTS } from './mock-data';

let mockCarts: Cart[] = [];
let nextCartId = 1;
let nextItemId = 1;

export class MockCartService {
  getCart(sessionId: string): Observable<Cart> {
    let cart = mockCarts.find(c => c.sessionId === sessionId);

    if (!cart) {
      cart = {
        id: nextCartId++,
        sessionId,
        storeId: 1,
        items: [],
        itemCount: 0,
        subtotal: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      mockCarts.push(cart);
    }

    return of(cart).pipe(delay(300));
  }

  addItem(request: AddToCartRequest): Observable<CartItem> {
    let cart = mockCarts.find(c => c.sessionId === request.sessionId);

    if (!cart) {
      cart = {
        id: nextCartId++,
        sessionId: request.sessionId,
        storeId: request.storeId,
        items: [],
        itemCount: 0,
        subtotal: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      mockCarts.push(cart);
    }

    // Finde das Produkt und die Variante
    const product = MOCK_PRODUCTS.find(p =>
      p.variants?.some(v => v.id === request.variantId)
    );

    if (!product) {
      return throwError(() => new Error('Product not found'));
    }

    const variant = product.variants?.find(v => v.id === request.variantId);
    if (!variant) {
      return throwError(() => new Error('Variant not found'));
    }

    // Prüfe ob Item bereits im Warenkorb ist
    const existingItem = cart.items.find(item => item.variantId === request.variantId);

    if (existingItem) {
      existingItem.quantity += request.quantity;
      this.updateCartTotals(cart);
      return of(existingItem).pipe(delay(300));
    }

    const newItem = {
      id: nextItemId++,
      variantId: request.variantId,
      productName: product.name || 'Unknown Product',
      variantName: variant.name || 'Default Variant',
      quantity: request.quantity,
      price: variant.price,
      priceSnapshot: variant.price,
      imageUrl: product.imageUrl || '/assets/placeholder.jpg'
    };

    cart.items.push(newItem);
    this.updateCartTotals(cart);

    return of(newItem).pipe(delay(300));
  }

  updateItem(itemId: number, quantity: number): Observable<CartItem> {
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

  clearCart(sessionId: string): Observable<void> {
    const cart = mockCarts.find(c => c.sessionId === sessionId);
    if (cart) {
      cart.items = [];
      this.updateCartTotals(cart);
    }
    return of(void 0).pipe(delay(200));
  }

  getCartItemCount(storeId: number, sessionId: string): Observable<number> {
    const cart = mockCarts.find(c => c.sessionId === sessionId && c.storeId === storeId);
    const count = cart ? cart.itemCount : 0;
    return of(count).pipe(delay(200));
  }

  private updateCartTotals(cart: Cart): void {
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.priceSnapshot * item.quantity), 0);
  }
}

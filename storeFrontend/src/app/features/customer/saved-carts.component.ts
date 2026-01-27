import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SavedCartService, SavedCart, SavedCartItem } from '../../core/services/saved-cart.service';
import { CartService, Cart, CartItem } from '../../core/services/cart.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-saved-carts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './saved-carts.component.html',
  styleUrls: ['./saved-carts.component.scss']
})
export class SavedCartsComponent implements OnInit {
  savedCarts: SavedCart[] = [];
  loading = false;
  showSaveDialog = false;
  newCartName = '';
  newCartDescription = '';
  storeId = 1; // TODO: Get from context/route

  constructor(
    private savedCartService: SavedCartService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadSavedCarts();
  }

  loadSavedCarts(): void {
    this.loading = true;
    this.savedCartService.getSavedCarts(this.storeId).subscribe({
      next: (carts) => {
        this.savedCarts = carts;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der gespeicherten Warenkörbe:', error);
        this.loading = false;
      }
    });
  }

  openSaveDialog(): void {
    this.showSaveDialog = true;
    this.newCartName = '';
    this.newCartDescription = '';
  }

  closeSaveDialog(): void {
    this.showSaveDialog = false;
    this.newCartName = '';
    this.newCartDescription = '';
  }

  saveCurrentCart(): void {
    if (!this.newCartName.trim()) return;

    // CartService.getCart() gibt ein Observable<Cart> zurück
    this.cartService.getCart().pipe(
      take(1)
    ).subscribe((currentCart: Cart) => {
      const items: SavedCartItem[] = currentCart.items?.map((item: CartItem) => ({
        id: 0,
        savedCartId: 0,
        productId: item.productId,
        variantId: item.variantId || 0,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        productTitle: item.productTitle,
        productImageUrl: item.imageUrl,
        createdAt: new Date()
      })) || [];

      this.savedCartService.saveCart(
        this.storeId,
        this.newCartName.trim(),
        this.newCartDescription.trim(),
        items
      ).subscribe({
        next: () => {
          console.log('✅ Warenkorb gespeichert');
          this.closeSaveDialog();
          this.loadSavedCarts();
        },
        error: (error) => {
          console.error('Fehler beim Speichern:', error);
          alert('Fehler beim Speichern des Warenkorbs');
        }
      });
    });
  }

  restoreCart(cart: SavedCart, addToExisting: boolean): void {
    const message = addToExisting
      ? 'Möchten Sie diese Artikel zum aktuellen Warenkorb hinzufügen?'
      : 'Möchten Sie diesen Warenkorb wiederherstellen? Ihr aktueller Warenkorb wird ersetzt.';

    if (confirm(message)) {
      // API unterstützt nur restore ohne addToExisting Parameter
      this.savedCartService.restoreSavedCart(cart.id).subscribe({
        next: () => {
          console.log('✅ Warenkorb wiederhergestellt');
          alert('Warenkorb wurde erfolgreich wiederhergestellt!');
        },
        error: (error) => {
          console.error('Fehler beim Wiederherstellen:', error);
          alert('Fehler beim Wiederherstellen des Warenkorbs.');
        }
      });
    }
  }

  deleteCart(cart: SavedCart): void {
    if (confirm('Möchten Sie diesen gespeicherten Warenkorb wirklich löschen?')) {
      this.savedCartService.deleteSavedCart(cart.id).subscribe({
        next: () => {
          console.log('✅ Warenkorb gelöscht');
          this.loadSavedCarts();
        },
        error: (error) => {
          console.error('Fehler beim Löschen:', error);
          alert('Fehler beim Löschen des Warenkorbs');
        }
      });
    }
  }

  getProductImage(item: SavedCartItem): string {
    return item.productImageUrl || '/assets/placeholder.png';
  }

  isExpired(cart: SavedCart): boolean {
    if (!cart.expiresAt) return false;
    return new Date(cart.expiresAt) < new Date();
  }
}

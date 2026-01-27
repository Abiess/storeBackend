import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { WishlistService, Wishlist, WishlistItem } from '../../core/services/wishlist.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss']
})
export class WishlistComponent implements OnInit {
  wishlist: Wishlist | null = null;
  wishlists: Wishlist[] = [];
  currentWishlist: Wishlist | null = null;
  loading = false;
  showShareModal = false;
  shareToken: string | null = null;
  storeId = 1; // TODO: Get from context/route

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.loading = true;
    this.wishlistService.getDefaultWishlist(this.storeId).subscribe({
      next: (wishlist) => {
        this.wishlist = wishlist;
        this.currentWishlist = wishlist;
        this.wishlists = [wishlist];
        this.shareToken = wishlist.shareToken || null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Fehler beim Laden der Wunschliste:', error);
        this.loading = false;
      }
    });
  }

  selectWishlist(wishlist: Wishlist): void {
    this.currentWishlist = wishlist;
  }

  addAllToCart(): void {
    if (!this.currentWishlist || !this.currentWishlist.items) return;

    const addedCount = this.currentWishlist.items.filter(item => {
      if (item.inStock) {
        this.addToCart(item);
        return true;
      }
      return false;
    }).length;

    if (addedCount > 0) {
      console.log(`✅ ${addedCount} Artikel zum Warenkorb hinzugefügt`);
    }
  }

  addToCart(item: WishlistItem): void {
    this.cartService.addItem({
      storeId: this.storeId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: 1
    });

    console.log('✅ Artikel zum Warenkorb hinzugefügt:', item.productTitle);
  }

  viewProduct(item: WishlistItem): void {
    if (item.productId) {
      this.router.navigate(['/storefront/product', item.productId]);
    }
  }

  removeFromWishlist(item: WishlistItem): void {
    if (!this.currentWishlist || !item.id) return;

    if (confirm('Möchten Sie dieses Produkt aus Ihrer Wunschliste entfernen?')) {
      this.wishlistService.removeFromWishlist(this.currentWishlist.id, item.id).subscribe({
        next: () => {
          console.log('✅ Artikel aus Wunschliste entfernt');
          this.loadWishlist();
        },
        error: (error) => console.error('Fehler beim Entfernen:', error)
      });
    }
  }

  getProductImage(item: WishlistItem): string {
    return item.productImageUrl || '/assets/placeholder.png';
  }

  getProductPrice(item: WishlistItem): number {
    return item.productPrice || 0;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority.toLowerCase()}`;
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'HIGH': 'fas fa-star',
      'MEDIUM': 'fas fa-star-half-alt',
      'LOW': 'far fa-star'
    };
    return icons[priority] || 'far fa-star';
  }

  shareWishlist(): void {
    if (!this.wishlist) return;

    this.wishlistService.shareWishlist(this.wishlist.id, true).subscribe({
      next: (response) => {
        this.shareToken = response.shareToken;
        this.showShareModal = true;
      },
      error: (error) => console.error('Fehler beim Teilen:', error)
    });
  }

  getShareUrl(): string {
    return `${window.location.origin}/storefront/wishlist/shared/${this.shareToken}`;
  }

  copyShareLink(input: HTMLInputElement): void {
    input.select();
    document.execCommand('copy');
    alert('Link wurde in die Zwischenablage kopiert!');
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'HIGH': '⭐⭐⭐',
      'MEDIUM': '⭐⭐',
      'LOW': '⭐'
    };
    return labels[priority] || priority;
  }
}

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProductService } from '@app/core/services/product.service';
import { CategoryService } from '@app/core/services/category.service';
import { PosCartService } from '@app/core/services/pos-cart.service';
import { PosService, PosOrderRequest, PosOrderResponse } from '@app/core/services/pos.service';
import { Product, Category } from '@app/core/models';
import { TranslatePipe } from '@app/core/pipes/translate.pipe';
import { BarcodeInputComponent } from '@app/shared/components/barcode-input/barcode-input.component';
import { PosReceiptComponent } from './pos-receipt/pos-receipt.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, BarcodeInputComponent, PosReceiptComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  public posCart = inject(PosCartService);
  private posService = inject(PosService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  storeId!: number;
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];
  selectedCategoryId: number | null = null;
  searchQuery = '';
  barcodeInput = '';
  loading = signal(false);
  showMobileCart = signal(false);
  barcodeNotFound = signal(false);
  
  // Payment State
  showPaymentDialog = signal(false);
  paymentMethod: 'CASH' | 'CARD_EXTERNAL' | 'PAY_LATER' | null = null;
  cashReceived = 0;
  payLaterCode = '';
  paymentTotal = 0;
  currentCartTotal = 0; // Track current cart total for checkout button
  
  // Sale Processing State
  processingPayment = signal(false);
  saleCompleted = signal(false);
  saleError = signal<string | null>(null);
  lastSaleResponse: PosOrderResponse | null = null;
  
  // Receipt State
  showReceipt = signal(false);
  receiptOrderId: number | null = null;

  cartItems$ = this.posCart.items$;
  cartTotal$ = this.posCart.cartTotal$;
  cartTaxTotal$ = this.posCart.cartTaxTotal$;
  itemCount$ = this.posCart.itemCount$;

  ngOnInit(): void {
    this.extractStoreId();
    this.setupSearch();
    this.loadCategories();
    this.loadProducts();
    
    // Track cart total for checkout
    this.cartTotal$.pipe(takeUntil(this.destroy$)).subscribe(total => {
      this.currentCartTotal = total;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractStoreId(): void {
    const id = this.route.snapshot.paramMap.get('storeId') || this.route.parent?.snapshot.paramMap.get('id');
    this.storeId = id ? parseInt(id, 10) : 0;
  }

  private setupSearch(): void {
    this.searchSubject.pipe(debounceTime(100), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => this.applyFilters());
  }

  private loadCategories(): void {
    this.categoryService.getCategories(this.storeId).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories.filter(c => !c.parentId); // Only root categories
        },
        error: () => {
          this.categories = [];
        }
      });
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts(this.storeId, 'PUBLISHED').pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFilters();
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onCategorySelect(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.applyFilters();
  }

  private applyFilters(): void {
    let products = [...this.allProducts];

    // Category filter
    if (this.selectedCategoryId !== null) {
      products = products.filter(p => p.categoryId === this.selectedCategoryId);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p =>
        p.title?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
      );
    }

    this.filteredProducts = products;
  }

  private filterProducts(query: string): void {
    if (!query.trim()) {
      this.filteredProducts = this.allProducts;
      return;
    }
    const q = query.toLowerCase();
    this.filteredProducts = this.allProducts.filter(p =>
      p.title?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    );
  }

  onBarcodeScanned(barcode: string): void {
    if (!barcode?.trim()) return;
    const product = this.allProducts.find(p => p.barcode === barcode);
    if (product) {
      this.posCart.addProduct(product);
      this.barcodeNotFound.set(false);
      this.barcodeInput = ''; // Clear after successful scan
    } else {
      this.barcodeNotFound.set(true);
      setTimeout(() => this.barcodeNotFound.set(false), 3000);
      this.barcodeInput = ''; // Clear after failed scan
    }
  }

  onProductClick(product: Product): void {
    this.posCart.addProduct(product);
  }

  toggleMobileCart(): void {
    this.showMobileCart.update(v => !v);
  }

  // ════════ PAYMENT METHODS ════════
  
  onCheckoutClick(total: number): void {
    this.paymentTotal = total;
    this.paymentMethod = null;
    this.cashReceived = 0;
    this.payLaterCode = '';
    this.showPaymentDialog.set(true);
  }

  selectPaymentMethod(method: 'CASH' | 'CARD_EXTERNAL' | 'PAY_LATER'): void {
    this.paymentMethod = method;
    if (method === 'CASH') {
      this.cashReceived = 0;
    }
    if (method === 'PAY_LATER') {
      this.payLaterCode = '';
    }
  }

  setCashReceived(amount: number): void {
    this.cashReceived = Math.round(amount * 100) / 100; // Avoid floating point errors
  }

  getChange(): number {
    if (this.paymentMethod !== 'CASH') return 0;
    const change = this.cashReceived - this.paymentTotal;
    return change > 0 ? Math.round(change * 100) / 100 : 0;
  }

  canCompletePayment(): boolean {
    if (!this.paymentMethod) return false;
    if (this.paymentMethod === 'CASH') {
      return this.cashReceived >= this.paymentTotal;
    }
    if (this.paymentMethod === 'PAY_LATER') {
      return !!this.payLaterCode.trim();
    }
    return true; // CARD_EXTERNAL: always ready
  }

  completePayment(): void {
    if (!this.canCompletePayment() || this.processingPayment()) return;
    
    // Reset error state
    this.saleError.set(null);
    this.saleCompleted.set(false);
    this.processingPayment.set(true);

    // Build POS Order Request
    const request: PosOrderRequest = {
      paymentMethod: this.paymentMethod!,
      cashReceived: this.paymentMethod === 'CASH' ? this.cashReceived : undefined,
      loyaltyCode: this.paymentMethod === 'PAY_LATER' ? this.payLaterCode.trim() : undefined,
      items: this.posCart.getCurrentItems().map(item => ({
        productId: item.product.id!,
        quantity: item.quantity
      }))
    };

    console.log('📤 Submitting POS order:', request);

    // API Call
    this.posService.createPosOrder(this.storeId, request).subscribe({
      next: (response: PosOrderResponse) => {
        console.log('✅ POS order created:', response);
        this.lastSaleResponse = response;
        this.saleCompleted.set(true);
        this.processingPayment.set(false);
        
        // Clear cart ONLY after successful save
        this.posCart.clearCart();
        
        // Keep payment dialog open to show success message
        // Will be closed by user clicking on success screen
      },
      error: (error) => {
        console.error('❌ POS order failed:', error);
        this.processingPayment.set(false);
        
        // Extract error message
        let errorMsg = 'pos.sale.error';
        if (error.error && typeof error.error === 'string') {
          if (error.error.includes('Insufficient stock')) {
            errorMsg = 'pos.sale.insufficientStock';
          } else if (error.error.includes('Access denied')) {
            errorMsg = 'pos.sale.permissionDenied';
          } else {
            errorMsg = error.error;
          }
        } else if (error.status === 403) {
          errorMsg = 'pos.sale.permissionDenied';
        }
        
        this.saleError.set(errorMsg);
        
        // Do NOT clear cart on error - user might want to retry
      }
    });
  }

  closePaymentDialog(): void {
    // Payment Dialog schließen, aber lastSaleResponse für Receipt behalten
    this.showPaymentDialog.set(false);
    this.paymentMethod = null;
    this.cashReceived = 0;
    this.payLaterCode = '';
    this.paymentTotal = 0;
    this.processingPayment.set(false);
    // saleCompleted und lastSaleResponse bleiben für Receipt
  }
  
  startNewSale(): void {
    // Komplett neue Transaktion: alle States zurücksetzen
    this.saleCompleted.set(false);
    this.saleError.set(null);
    this.lastSaleResponse = null;
    this.showPaymentDialog.set(false);
    this.paymentMethod = null;
    this.cashReceived = 0;
    this.payLaterCode = '';
    this.paymentTotal = 0;
  }
  
  viewReceipt(): void {
    if (this.lastSaleResponse?.orderId) {
      this.receiptOrderId = this.lastSaleResponse.orderId;
      this.showReceipt.set(true);
    }
  }
  
  printReceipt(): void {
    if (this.lastSaleResponse?.orderId) {
      this.receiptOrderId = this.lastSaleResponse.orderId;
      this.showReceipt.set(true);
      // Receipt Component ruft window.print() automatisch auf
      setTimeout(() => {
        window.print();
      }, 600);
    }
  }
  
  closeReceipt(): void {
    this.showReceipt.set(false);
  }

  getQuickAmounts(): number[] {
    const total = this.paymentTotal;
    return [
      total,
      Math.ceil(total / 5) * 5,  // Next 5€
      Math.ceil(total / 10) * 10, // Next 10€
      Math.ceil(total / 50) * 50  // Next 50€
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
  }

  trackByProductId(_: number, product: Product): number {
    return product.id;
  }

  trackByCategoryId(_: number, category: Category): number {
    return category.id;
  }

  getProductImage(product: Product): string {
    return product.primaryImageUrl || product.imageUrl || 'assets/images/product-placeholder.svg';
  }
}

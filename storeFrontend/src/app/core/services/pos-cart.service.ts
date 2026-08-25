import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product, TaxCategory } from '../models';

/**
 * POS Warenkorb-Position
 */
export interface PosCartItem {
  product: Product;
  quantity: number;
  lineSubtotal: number;    // quantity * basePrice (Bruttopreis inkl. MwSt.)
  lineTax?: number;        // nur wenn taxRate vorhanden
  lineTotal: number;       // = lineSubtotal (tax bereits inkl.)
}

/**
 * POS Cart Service für lokalen Warenkorb in Phase 1A
 * 
 * - Kein Backend-Persistieren
 * - Bei Reload geht Cart verloren (OK für Phase 1A)
 * - MwSt. nur berechnen wenn Product.taxRate vorhanden
 * - basePrice ist maßgeblicher Verkaufspreis (Bruttopreis)
 */
@Injectable({
  providedIn: 'root'
})
export class PosCartService {
  private itemsSubject = new BehaviorSubject<PosCartItem[]>([]);

  /** Warenkorb-Items */
  public readonly items$: Observable<PosCartItem[]> = this.itemsSubject.asObservable();
  
  /** Get current items synchronously (for POS checkout) */
  public getCurrentItems(): PosCartItem[] {
    return this.itemsSubject.getValue();
  }

  /** Anzahl Artikel im Warenkorb */
  public readonly itemCount$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.quantity, 0))
  );

  /** Gesamtsumme (Bruttopreis, MwSt. inkl.) */
  public readonly cartTotal$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.lineTotal, 0))
  );

  /**
   * Gesamt-MwSt. Betrag
   * null = nicht alle Produkte haben taxRate → keine MwSt.-Berechnung möglich
   */
  public readonly cartTaxTotal$: Observable<number | null> = this.items$.pipe(
    map(items => {
      // Wenn auch nur 1 Produkt ohne taxRate → keine MwSt. berechenbar
      const hasUnknownTax = items.some(item => !this.hasTaxRate(item.product));
      if (hasUnknownTax) {
        return null;
      }

      // Alle Produkte haben taxRate → summiere lineTax
      return items.reduce((sum, item) => sum + (item.lineTax ?? 0), 0);
    })
  );

  constructor() {}

  /**
   * Produkt zum Warenkorb hinzufügen
   * Wenn bereits vorhanden → Menge +1
   */
  addProduct(product: Product): void {
    const currentItems = this.itemsSubject.value;
    const existingIndex = currentItems.findIndex(item => item.product.id === product.id);

    if (existingIndex >= 0) {
      // Produkt bereits im Warenkorb → Menge erhöhen
      this.incrementQuantity(product.id);
    } else {
      // Neues Produkt
      const newItem = this.createCartItem(product, 1);
      this.itemsSubject.next([...currentItems, newItem]);
    }
  }

  /**
   * Menge erhöhen (+1)
   */
  incrementQuantity(productId: number): void {
    const currentItems = this.itemsSubject.value;
    const updated = currentItems.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + 1;
        return this.createCartItem(item.product, newQuantity);
      }
      return item;
    });
    this.itemsSubject.next(updated);
  }

  /**
   * Menge reduzieren (-1)
   * Bei Menge === 1 → removeItem()
   */
  decrementQuantity(productId: number): void {
    const currentItems = this.itemsSubject.value;
    const item = currentItems.find(i => i.product.id === productId);

    if (!item) {
      return;
    }

    if (item.quantity <= 1) {
      this.removeItem(productId);
    } else {
      const updated = currentItems.map(i => {
        if (i.product.id === productId) {
          const newQuantity = i.quantity - 1;
          return this.createCartItem(i.product, newQuantity);
        }
        return i;
      });
      this.itemsSubject.next(updated);
    }
  }

  /**
   * Position aus Warenkorb entfernen
   */
  removeItem(productId: number): void {
    const currentItems = this.itemsSubject.value;
    const filtered = currentItems.filter(item => item.product.id !== productId);
    this.itemsSubject.next(filtered);
  }

  /**
   * Warenkorb komplett leeren
   */
  clearCart(): void {
    this.itemsSubject.next([]);
  }

  /**
   * Erstellt eine PosCartItem aus Product + Menge
   * Berechnet lineSubtotal, lineTax (wenn möglich), lineTotal
   */
  private createCartItem(product: Product, quantity: number): PosCartItem {
    // basePrice = Bruttopreis (MwSt. inkl.)
    const basePrice = product.basePrice;
    const lineSubtotal = this.roundCurrency(basePrice * quantity);

    // MwSt. nur berechnen wenn taxRate vorhanden
    let lineTax: number | undefined;

    if (this.hasTaxRate(product)) {
      const taxRate = product.taxRate!;
      // Berechne MwSt. aus Bruttopreis: tax = gross - (gross / (1 + rate/100))
      const lineTaxAmount = lineSubtotal - (lineSubtotal / (1 + taxRate / 100));
      lineTax = this.roundCurrency(lineTaxAmount);
    }

    return {
      product,
      quantity,
      lineSubtotal,
      lineTax,
      lineTotal: lineSubtotal // lineTotal = lineSubtotal (MwSt. bereits inkl.)
    };
  }

  /**
   * Prüft ob Produkt einen gültigen Steuersatz hat
   */
  private hasTaxRate(product: Product): boolean {
    // Expliziter taxRate vorhanden
    if (typeof product.taxRate === 'number' && product.taxRate >= 0) {
      return true;
    }

    // TaxCategory ZERO oder EXEMPT → 0% (berechenbar)
    if (product.taxCategory === 'ZERO' || product.taxCategory === 'EXEMPT') {
      return true;
    }

    return false;
  }

  /**
   * Rundet Währungsbeträge auf 2 Nachkommastellen
   * Rechnet intern in Cent um Floating-Point-Fehler zu vermeiden
   */
  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Gibt aktuelle Items (synchron)
   */
  getItems(): PosCartItem[] {
    return this.itemsSubject.value;
  }

  /**
   * Anzahl Items (synchron)
   */
  getItemCount(): number {
    return this.itemsSubject.value.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Gesamtsumme (synchron)
   */
  getCartTotal(): number {
    return this.itemsSubject.value.reduce((sum, item) => sum + item.lineTotal, 0);
  }
}

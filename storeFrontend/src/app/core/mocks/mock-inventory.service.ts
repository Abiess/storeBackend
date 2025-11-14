import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { InventoryLog, AdjustInventoryRequest, AdjustInventoryResponse } from '../services/inventory.service';
import { MOCK_USER, MOCK_PRODUCTS } from './mock-data';

let mockInventoryLogs: InventoryLog[] = [
  {
    id: 1,
    variantId: 1,
    productName: 'Premium Laptop',
    variantName: 'Silver 512GB',
    quantityChange: 10,
    quantityBefore: 5,
    quantityAfter: 15,
    reason: 'Restock',
    notes: 'Neue Lieferung eingetroffen',
    userId: 1,
    userName: 'Demo User',
    createdAt: '2024-03-01T10:00:00'
  },
  {
    id: 2,
    variantId: 1,
    productName: 'Premium Laptop',
    variantName: 'Silver 512GB',
    quantityChange: -1,
    quantityBefore: 15,
    quantityAfter: 14,
    reason: 'Sale',
    notes: 'Verkauf über Webshop',
    userId: 1,
    userName: 'System',
    createdAt: '2024-03-02T14:30:00'
  },
  {
    id: 3,
    variantId: 3,
    productName: 'Wireless Mouse',
    variantName: 'Black',
    quantityChange: 25,
    quantityBefore: 25,
    quantityAfter: 50,
    reason: 'Restock',
    notes: 'Lagerbestand aufgefüllt',
    userId: 1,
    userName: 'Demo User',
    createdAt: '2024-03-05T09:15:00'
  }
];

let nextLogId = 4;

export class MockInventoryService {
  getStoreLogs(storeId: number): Observable<InventoryLog[]> {
    return of(mockInventoryLogs).pipe(delay(300));
  }

  getVariantLogs(storeId: number, productId: number, variantId: number): Observable<InventoryLog[]> {
    const logs = mockInventoryLogs.filter(log => log.variantId === variantId);
    return of(logs).pipe(delay(300));
  }

  adjustInventory(
    storeId: number,
    productId: number,
    variantId: number,
    request: AdjustInventoryRequest
  ): Observable<AdjustInventoryResponse> {
    // Finde das Produkt und die Variante
    const product = MOCK_PRODUCTS.find(p => p.id === productId);
    const variant = product?.variants?.find(v => v.id === variantId);

    if (!product || !variant) {
      throw new Error('Product or variant not found');
    }

    const quantityBefore = variant.stock;
    const quantityAfter = quantityBefore + request.quantityChange;

    // Update den Stock
    variant.stock = quantityAfter;

    // Erstelle neuen Log-Eintrag
    const newLog: InventoryLog = {
      id: nextLogId++,
      variantId,
      productName: product.name || product.title,
      variantName: variant.name || 'Default',
      quantityChange: request.quantityChange,
      quantityBefore,
      quantityAfter,
      reason: request.reason,
      notes: request.notes,
      userId: MOCK_USER.id,
      userName: MOCK_USER.name || 'Demo User',
      createdAt: new Date().toISOString()
    };

    mockInventoryLogs.unshift(newLog);

    const response: AdjustInventoryResponse = {
      success: true,
      log: newLog,
      message: 'Inventory adjusted successfully'
    };

    return of(response).pipe(delay(500));
  }
}


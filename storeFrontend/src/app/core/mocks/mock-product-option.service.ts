import { Observable, of, delay } from 'rxjs';
import { ProductOption, CreateProductOptionRequest, RegenerateResponse } from '../services/product-option.service';

let mockOptions: ProductOption[] = [
  {
    id: 1,
    productId: 1,
    name: 'Farbe',
    values: ['Silber', 'Schwarz'],
    sortOrder: 1
  },
  {
    id: 2,
    productId: 1,
    name: 'Speicher',
    values: ['512GB', '1TB'],
    sortOrder: 2
  }
];

let nextOptionId = 3;

export class MockProductOptionService {
  getOptions(storeId: number, productId: number): Observable<ProductOption[]> {
    const options = mockOptions.filter(opt => opt.productId === productId);
    return of(options).pipe(delay(300));
  }

  createOption(storeId: number, productId: number, request: CreateProductOptionRequest): Observable<ProductOption> {
    const newOption: ProductOption = {
      id: nextOptionId++,
      productId,
      name: request.name,
      values: request.values || [],
      sortOrder: request.sortOrder || 0
    };

    mockOptions.push(newOption);
    return of(newOption).pipe(delay(300));
  }

  updateOption(storeId: number, productId: number, optionId: number, updates: Partial<ProductOption>): Observable<ProductOption> {
    const option = mockOptions.find(opt => opt.id === optionId);
    if (option) {
      Object.assign(option, updates);
      return of(option).pipe(delay(300));
    }
    throw new Error('Option not found');
  }

  deleteOption(storeId: number, productId: number, optionId: number): Observable<void> {
    const index = mockOptions.findIndex(opt => opt.id === optionId);
    if (index !== -1) {
      mockOptions.splice(index, 1);
    }
    return of(void 0).pipe(delay(300));
  }

  regenerateVariants(storeId: number, productId: number): Observable<RegenerateResponse> {
    // Berechne Anzahl der Varianten aus Mock-Optionen
    const options = mockOptions.filter(opt => opt.productId === productId);
    const variantCount = options.reduce((acc, opt) => acc * (opt.values?.length || 1), 1);

    return of({
      variantCount,
      message: `${variantCount} Varianten wurden erfolgreich regeneriert (Mock)`
    }).pipe(delay(500));
  }
}


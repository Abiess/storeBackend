import { Observable, of, delay } from 'rxjs';
import { ProductOption, CreateProductOptionRequest } from '../services/product-option.service';

let mockOptions: ProductOption[] = [
  {
    id: 1,
    productId: 1,
    name: 'color',
    displayName: 'Farbe',
    type: 'SELECT',
    required: true,
    sortOrder: 1,
    values: [
      {
        id: 1,
        optionId: 1,
        value: 'silver',
        displayValue: 'Silber',
        priceAdjustment: 0,
        sortOrder: 1
      },
      {
        id: 2,
        optionId: 1,
        value: 'black',
        displayValue: 'Schwarz',
        priceAdjustment: 0,
        sortOrder: 2
      }
    ]
  },
  {
    id: 2,
    productId: 1,
    name: 'storage',
    displayName: 'Speicher',
    type: 'RADIO',
    required: true,
    sortOrder: 2,
    values: [
      {
        id: 3,
        optionId: 2,
        value: '512gb',
        displayValue: '512 GB',
        priceAdjustment: 0,
        sortOrder: 1
      },
      {
        id: 4,
        optionId: 2,
        value: '1tb',
        displayValue: '1 TB',
        priceAdjustment: 200,
        sortOrder: 2
      }
    ]
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
      displayName: request.displayName,
      type: request.type,
      required: request.required,
      sortOrder: request.sortOrder,
      values: []
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
}


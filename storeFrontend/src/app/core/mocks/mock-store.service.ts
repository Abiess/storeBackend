import { Observable, of, delay } from 'rxjs';
import { Store, CreateStoreRequest, StoreStatus } from '../models';
import { MOCK_STORES } from './mock-data';

export class MockStoreService {
  private stores: Store[] = [...MOCK_STORES];
  private nextStoreId = this.stores.length + 1;

  getMyStores(): Observable<Store[]> {
    return of(this.stores).pipe(delay(500));
  }

  createStore(request: CreateStoreRequest): Observable<Store> {
    const newStore: Store = {
      id: this.nextStoreId++,
      name: request.name,
      slug: request.slug || request.name.toLowerCase().replace(/\s+/g, '-'),
      description: request.description,
      status: StoreStatus.ACTIVE,
      ownerId: 1,
      userId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.stores.push(newStore);
    return of(newStore).pipe(delay(500));
  }

  getStoreById(storeId: number): Observable<Store> {
    const store = this.stores.find(s => s.id === storeId);
    return of(store!).pipe(delay(300));
  }

  updateStore(storeId: number, request: Partial<CreateStoreRequest>): Observable<Store> {
    const store = this.stores.find(s => s.id === storeId);
    if (store) {
      if (request.name) store.name = request.name;
      if (request.slug) store.slug = request.slug;
      store.updatedAt = new Date().toISOString();
    }
    return of(store!).pipe(delay(500));
  }

  deleteStore(storeId: number): Observable<void> {
    this.stores = this.stores.filter(s => s.id !== storeId);
    return of(void 0).pipe(delay(500));
  }
}

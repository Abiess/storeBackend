import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { StoreService } from '../services/store.service';

/**
 * Guard für `/settings` Route.
 * 
 * Problem: `/settings` hat keine Store-ID in der URL → Sidebar zeigt "Kein Store ausgewählt"
 * 
 * Lösung: User automatisch zu `/stores/:id/settings` redirecten:
 * - Genau 1 Store → `/stores/121/settings`
 * - Mehrere Stores → `/stores/:lastUsedOrFirst/settings` (aus localStorage oder erster Store)
 * - Keine Stores → `/store-wizard` (Store erstellen)
 */
export const settingsRedirectGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const storeService = inject(StoreService);

  return storeService.getMyStores().pipe(
    take(1),
    map(stores => {
      // Keine Stores → zu Store-Wizard
      if (stores.length === 0) {
        console.log('⚠️ settingsRedirectGuard: Keine Stores gefunden, redirect zu Store-Wizard');
        return router.createUrlTree(['/store-wizard']);
      }
      
      // Genau 1 Store → zu /stores/:id/settings redirecten
      if (stores.length === 1) {
        console.log('✅ settingsRedirectGuard: Auto-redirect zu Store', stores[0].id);
        return router.createUrlTree(['/stores', stores[0].id, 'settings']);
      }
      
      // Mehrere Stores → zuletzt verwendeten Store aus localStorage oder ersten Store nehmen
      const lastStoreId = localStorage.getItem('lastActiveStoreId');
      const targetStore = lastStoreId 
        ? stores.find(s => s.id.toString() === lastStoreId) || stores[0]
        : stores[0];
      
      console.log('✅ settingsRedirectGuard: Mehrere Stores gefunden, redirect zu Store', targetStore.id);
      return router.createUrlTree(['/stores', targetStore.id, 'settings']);
    })
  );
};

import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';

/**
 * Zentraler Service, der die aktuelle storeId aus der Route extrahiert.
 * Alle Komponenten können sich darauf abonnieren, anstatt storeId als @Input zu benötigen.
 */
@Injectable({
  providedIn: 'root'
})
export class StoreContextService {
  private storeIdSubject = new BehaviorSubject<number | null>(null);
  
  /** Observable mit der aktuellen storeId aus der Route */
  public storeId$: Observable<number | null> = this.storeIdSubject.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.initRouteListener();
  }

  /**
   * Initialisiert den Listener für Routen-Änderungen und extrahiert storeId
   */
  private initRouteListener(): void {
    // Initial storeId aus aktueller Route holen
    this.updateStoreIdFromRoute();

    // Bei jeder Navigation die storeId aktualisieren
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateStoreIdFromRoute();
    });
  }

  /**
   * Extrahiert storeId aus der aktuellen Route (alle Ebenen durchsuchen)
   */
  private updateStoreIdFromRoute(): void {
    let route = this.activatedRoute;
    let storeId: number | null = null;

    // Durch alle Route-Ebenen iterieren (root -> child -> child -> ...)
    while (route) {
      // Prüfe 'storeId' param
      const storeIdParam = route.snapshot.paramMap.get('storeId');
      if (storeIdParam) {
        storeId = Number(storeIdParam);
        break;
      }

      // Fallback: 'id' param (für alte Routes wie /stores/:id)
      const idParam = route.snapshot.paramMap.get('id');
      if (idParam && route.snapshot.url.some(segment => segment.path === 'stores')) {
        storeId = Number(idParam);
        break;
      }

      // Gehe zur ersten Child-Route
      if (route.firstChild) {
        route = route.firstChild;
      } else {
        break;
      }
    }

    // Nur updaten wenn sich die storeId geändert hat
    if (storeId !== this.storeIdSubject.value) {
      console.log('🏪 StoreContext: storeId updated:', storeId);
      this.storeIdSubject.next(storeId);
    }
  }

  /**
   * Gibt die aktuelle storeId synchron zurück (oder null)
   */
  getCurrentStoreId(): number | null {
    return this.storeIdSubject.value;
  }

  /**
   * Gibt die aktuelle storeId zurück und wirft einen Fehler, falls keine vorhanden
   */
  getRequiredStoreId(): number {
    const storeId = this.storeIdSubject.value;
    if (storeId === null) {
      throw new Error('StoreContextService: storeId is required but not available in route');
    }
    return storeId;
  }
}


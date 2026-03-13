import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

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
      // Prüfe 'storeId' param (dashboard/stores/:storeId/...)
      const storeIdParam = route.snapshot.paramMap.get('storeId');
      if (storeIdParam && !isNaN(Number(storeIdParam))) {
        storeId = Number(storeIdParam);
        break;
      }

      // Prüfe 'id' param (stores/:id/...)
      const idParam = route.snapshot.paramMap.get('id');
      if (idParam && !isNaN(Number(idParam))) {
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

    // Fallback: URL direkt parsen (z.B. /stores/5/products/17)
    if (storeId === null) {
      const urlPath = window.location.pathname;
      const storesMatch = urlPath.match(/\/stores\/(\d+)/);
      if (storesMatch) {
        storeId = Number(storesMatch[1]);
      }
      // Auch /dashboard/stores/:storeId/...
      const dashboardMatch = urlPath.match(/\/dashboard\/stores\/(\d+)/);
      if (dashboardMatch) {
        storeId = Number(dashboardMatch[1]);
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


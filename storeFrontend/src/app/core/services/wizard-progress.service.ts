import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WizardProgressData {
  storeName?: string;
  storeSlug?: string;
  description?: string;
  selectedCategories?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
}

export interface WizardProgress {
  id?: number;
  userId?: number;
  currentStep: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  data?: WizardProgressData;
  completedSteps: number[];
  lastUpdated?: string;
  storeCreated?: boolean;
  createdStoreId?: number;
}

/**
 * Service für Store-Creation-Wizard Fortschritt
 * Speichert und lädt Wizard-State in/aus der Datenbank
 */
@Injectable({
  providedIn: 'root'
})
export class WizardProgressService {
  private readonly API = `${environment.apiUrl}/wizard-progress`;
  
  // Observable für Echtzeit-Updates
  private progressSubject = new BehaviorSubject<WizardProgress | null>(null);
  public progress$ = this.progressSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Lade gespeicherten Wizard-Fortschritt
   */
  loadProgress(): Observable<WizardProgress> {
    return this.http.get<WizardProgress>(this.API).pipe(
      tap(progress => {
        console.log('📂 Wizard progress loaded:', progress);
        this.progressSubject.next(progress);
      })
    );
  }

  /**
   * Speichere Wizard-Fortschritt
   */
  saveProgress(progress: WizardProgress): Observable<WizardProgress> {
    console.log('💾 Saving wizard progress:', progress);
    return this.http.post<WizardProgress>(this.API, progress).pipe(
      tap(saved => {
        console.log('✅ Wizard progress saved:', saved);
        this.progressSubject.next(saved);
      })
    );
  }

  /**
   * Markiere Wizard als übersprungen
   */
  skipWizard(): Observable<void> {
    console.log('⏭️ Skipping wizard');
    return this.http.post<void>(`${this.API}/skip`, {}).pipe(
      tap(() => {
        const current = this.progressSubject.value;
        if (current) {
          this.progressSubject.next({ ...current, status: 'SKIPPED' });
        }
      })
    );
  }

  /**
   * Markiere Wizard als abgeschlossen
   */
  completeWizard(storeId: number): Observable<void> {
    console.log('✅ Completing wizard for store:', storeId);
    return this.http.post<void>(`${this.API}/complete`, null, {
      params: { storeId: storeId.toString() }
    }).pipe(
      tap(() => {
        const current = this.progressSubject.value;
        if (current) {
          this.progressSubject.next({
            ...current,
            status: 'COMPLETED',
            storeCreated: true,
            createdStoreId: storeId
          });
        }
      })
    );
  }

  /**
   * Lösche Wizard-Fortschritt
   */
  deleteProgress(): Observable<void> {
    console.log('🗑️ Deleting wizard progress');
    return this.http.delete<void>(this.API).pipe(
      tap(() => this.progressSubject.next(null))
    );
  }

  /**
   * Prüfe ob aktiver Fortschritt vorhanden ist
   */
  hasActiveProgress(): Observable<boolean> {
    return this.http.get<boolean>(`${this.API}/has-active`);
  }

  /**
   * Hole aktuellen Fortschritt aus dem Subject (synchron)
   */
  getCurrentProgress(): WizardProgress | null {
    return this.progressSubject.value;
  }

  /**
   * Setze Fortschritt manuell (für lokale Updates)
   */
  setProgress(progress: WizardProgress | null): void {
    this.progressSubject.next(progress);
  }

  /**
   * Reset Service (z.B. bei Logout)
   */
  reset(): void {
    this.progressSubject.next(null);
  }
}


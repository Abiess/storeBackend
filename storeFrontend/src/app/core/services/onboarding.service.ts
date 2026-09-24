import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  /** i18n-Key für den Titel (überschreibt `title` im Template) */
  titleKey?: string;
  /** i18n-Key für die Beschreibung (überschreibt `description` im Template) */
  descKey?: string;
  icon: string;
  completed: boolean;
  route: string;
  priority: number;
}

export interface OnboardingProgress {
  storeId: number;
  completedSteps: string[];
  currentStep: string | null;
  completionPercentage: number;
  lastUpdated?: string;
}

/**
 * Service for tracking user onboarding progress
 * Manages checklist state and completion tracking
 */
@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  // Korrekte URL: /api/stores/{storeId}/onboarding (Backend-Konvention)
  private readonly API = `${environment.apiUrl}/stores`;

  private progressSubject = new BehaviorSubject<OnboardingProgress | null>(null);
  public progress$ = this.progressSubject.asObservable();

  // Default checklist – Routen mit storeId werden dynamisch ersetzt
  private defaultChecklist: ChecklistItem[] = [
    {
      id: 'product',
      title: 'Erstes Produkt hinzufügen',
      titleKey: 'onboarding.steps.product.title',
      description: 'Beginne mit dem Verkauf durch Hinzufügen deiner ersten Produkte',
      descKey: 'onboarding.steps.product.desc',
      icon: 'Package',
      completed: false,
      route: '/products/new',
      priority: 10
    },
    {
      id: 'theme',
      title: 'Design & Template wählen',
      titleKey: 'onboarding.steps.theme.title',
      description: 'Wähle ein professionelles Layout für deinen Shop',
      descKey: 'onboarding.steps.theme.desc',
      icon: 'Palette',
      completed: false,
      route: '/theme',
      priority: 9
    },
    {
      id: 'branding',
      title: 'Logo & Branding einrichten',
      titleKey: 'onboarding.steps.branding.title',
      description: 'Lade dein Logo hoch und passe Farben & Typografie an',
      descKey: 'onboarding.steps.branding.desc',
      icon: 'Store',
      completed: false,
      route: '/brand',
      priority: 8
    },
    // Telegram-Schritt entfernt – optionales Feature, kein Onboarding-Pflichtschritt
  ];

  constructor(private http: HttpClient) {}

  /**
   * Load onboarding progress for a store
   */
  loadProgress(storeId: number): Observable<OnboardingProgress | null> {
    return this.http.get<any>(`${this.API}/${storeId}/onboarding`).pipe(
      tap(response => {
        // Backend liefert steps mit echten completed-Flags
        const progress: OnboardingProgress = {
          storeId: response.storeId,
          completedSteps: response.completedSteps || [],
          currentStep: response.currentStep,
          completionPercentage: response.completionPercentage || 25
        };
        // Steps aus Backend übernehmen falls vorhanden
        if (response.steps) {
          this.defaultChecklist = response.steps;
        }
        this.progressSubject.next(progress);
      }),
      map(response => ({
        storeId: response.storeId,
        completedSteps: response.completedSteps || [],
        currentStep: response.currentStep,
        completionPercentage: response.completionPercentage || 25
      })),
      catchError(err => {
        console.warn('⚠️ Could not load onboarding progress:', err.status);
        return of(this.createDefaultProgress(storeId));
      })
    );
  }

  /**
   * Mark a checklist item as completed
   */
  completeStep(storeId: number, stepId: string): Observable<OnboardingProgress | null> {
    return this.http.post<any>(`${this.API}/${storeId}/onboarding/complete/${stepId}`, {}).pipe(
      tap(response => {
        const progress: OnboardingProgress = {
          storeId: response.storeId,
          completedSteps: response.completedSteps || [],
          currentStep: response.currentStep,
          completionPercentage: response.completionPercentage || 25
        };
        this.progressSubject.next(progress);
        this.celebrateCompletion(stepId);
      }),
      map(response => ({
        storeId: response.storeId,
        completedSteps: response.completedSteps || [],
        currentStep: response.currentStep,
        completionPercentage: response.completionPercentage || 25
      })),
      catchError(err => {
        console.warn('⚠️ Could not mark step as completed:', err.status);
        const current = this.progressSubject.value;
        if (current && !current.completedSteps.includes(stepId)) {
          current.completedSteps.push(stepId);
          current.completionPercentage = this.calculatePercentage(current.completedSteps.length);
          this.progressSubject.next({ ...current });
        }
        return of(current);
      })
    );
  }

  /**
   * Get checklist with current completion status, routes with storeId aufgelöst
   */
  getChecklist(storeId: number): ChecklistItem[] {
    const progress = this.progressSubject.value;
    const completed = progress?.completedSteps || [];

    return this.defaultChecklist.map(item => ({
      ...item,
      // Route mit storeId-Präfix /stores/:id/ aufbauen
      route: item.route.startsWith('/') && !item.route.startsWith('/stores/')
        ? `/stores/${storeId}${item.route}`
        : item.route,
      completed: completed.includes(item.id)
    })).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get next recommended action
   */
  getNextAction(storeId: number): ChecklistItem | null {
    const checklist = this.getChecklist(storeId);
    return checklist.find(item => !item.completed) || null;
  }

  /**
   * Calculate completion percentage
   */
  private calculatePercentage(completedCount: number): number {
    const baseProgress = 80; // Store created = 80%
    const remaining = 20;
    const total = this.defaultChecklist.length;
    
    return Math.round(baseProgress + (remaining * completedCount / total));
  }

  /**
   * Create default progress object
   */
  private createDefaultProgress(storeId: number): OnboardingProgress {
    return {
      storeId,
      completedSteps: [],
      currentStep: 'product',
      completionPercentage: 80
    };
  }

  /**
   * Visual feedback when step is completed
   */
  private celebrateCompletion(stepId: string): void {
    console.log(`🎉 Step completed: ${stepId}`);
    
    // Could trigger:
    // - Confetti animation
    // - Toast notification
    // - Sound effect
    // - Analytics event
  }

  /**
   * Reset progress (for testing)
   */
  reset(): void {
    this.progressSubject.next(null);
  }
}


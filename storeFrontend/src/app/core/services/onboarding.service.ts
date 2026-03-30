import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
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
  private readonly API = `${environment.apiUrl}/onboarding`;
  
  private progressSubject = new BehaviorSubject<OnboardingProgress | null>(null);
  public progress$ = this.progressSubject.asObservable();

  // Default checklist
  private defaultChecklist: ChecklistItem[] = [
    {
      id: 'product',
      title: 'Add your first product',
      description: 'Start selling by adding products to your store',
      icon: '📦',
      completed: false,
      route: '/products/new',
      priority: 10
    },
    {
      id: 'payment',
      title: 'Setup payments',
      description: 'Connect payment provider to accept orders',
      icon: '💳',
      completed: false,
      route: '/settings/payments',
      priority: 9
    },
    {
      id: 'logo',
      title: 'Upload your logo',
      description: 'Make your store recognizable with a custom logo',
      icon: '🎨',
      completed: false,
      route: '/settings/branding',
      priority: 5
    },
    {
      id: 'theme',
      title: 'Choose a theme',
      description: 'Pick a design that matches your brand',
      icon: '🖌️',
      completed: false,
      route: '/settings/theme',
      priority: 3
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Load onboarding progress for a store
   */
  loadProgress(storeId: number): Observable<OnboardingProgress | null> {
    return this.http.get<OnboardingProgress>(`${this.API}/${storeId}`).pipe(
      tap(progress => {
        console.log('📂 Onboarding progress loaded:', progress);
        this.progressSubject.next(progress);
      }),
      catchError(err => {
        console.warn('⚠️ Could not load onboarding progress:', err.status);
        // Return default progress
        return of(this.createDefaultProgress(storeId));
      })
    );
  }

  /**
   * Mark a checklist item as completed
   */
  completeStep(storeId: number, stepId: string): Observable<OnboardingProgress | null> {
    console.log(`✅ Marking step '${stepId}' as completed for store ${storeId}`);
    
    return this.http.post<OnboardingProgress>(`${this.API}/${storeId}/complete/${stepId}`, {}).pipe(
      tap(progress => {
        this.progressSubject.next(progress);
        this.celebrateCompletion(stepId);
      }),
      catchError(err => {
        console.warn('⚠️ Could not mark step as completed:', err.status);
        // Update locally
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
   * Get checklist with current completion status
   */
  getChecklist(storeId: number): ChecklistItem[] {
    const progress = this.progressSubject.value;
    const completed = progress?.completedSteps || [];

    return this.defaultChecklist.map(item => ({
      ...item,
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

